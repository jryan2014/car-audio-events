import { supabase } from '../lib/supabase';

export async function applyMigration() {
  try {
    const migration = `
      -- Add missing columns to support_tickets table for analytics

      -- Add first_response_at column to track when the first response was made to a ticket
      ALTER TABLE support_tickets 
      ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;

      -- Add resolved_at column to track when the ticket was resolved
      ALTER TABLE support_tickets 
      ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

      -- Add indexes for performance on frequently queried columns
      CREATE INDEX IF NOT EXISTS idx_support_tickets_first_response_at ON support_tickets(first_response_at);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_resolved_at ON support_tickets(resolved_at);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to_user_id ON support_tickets(assigned_to_user_id);

      -- Create a trigger to automatically set resolved_at when status changes to resolved
      CREATE OR REPLACE FUNCTION update_resolved_at()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Set resolved_at when status changes to 'resolved' or 'closed'
        IF (NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed')) THEN
          NEW.resolved_at = NOW();
        -- Clear resolved_at if ticket is reopened
        ELSIF (OLD.status IN ('resolved', 'closed') AND NEW.status NOT IN ('resolved', 'closed')) THEN
          NEW.resolved_at = NULL;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER
      SET search_path = 'public', 'pg_catalog', 'pg_temp';

      -- Create the trigger
      DROP TRIGGER IF EXISTS support_tickets_update_resolved_at ON support_tickets;
      CREATE TRIGGER support_tickets_update_resolved_at
        BEFORE UPDATE ON support_tickets
        FOR EACH ROW
        EXECUTE FUNCTION update_resolved_at();

      -- Create a trigger to automatically set first_response_at when first message is added
      CREATE OR REPLACE FUNCTION update_first_response_at()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Only update if this is a response from support staff (not the ticket creator)
        -- and if first_response_at is not already set
        IF NEW.user_id IS NOT NULL THEN
          UPDATE support_tickets
          SET first_response_at = COALESCE(first_response_at, NOW())
          WHERE id = NEW.ticket_id
            AND user_id != NEW.user_id  -- Not the ticket creator
            AND first_response_at IS NULL;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER
      SET search_path = 'public', 'pg_catalog', 'pg_temp';

      -- Create the trigger for support_ticket_messages
      DROP TRIGGER IF EXISTS support_ticket_messages_update_first_response ON support_ticket_messages;
      CREATE TRIGGER support_ticket_messages_update_first_response
        AFTER INSERT ON support_ticket_messages
        FOR EACH ROW
        EXECUTE FUNCTION update_first_response_at();

      -- Grant execute permissions
      GRANT EXECUTE ON FUNCTION update_resolved_at() TO authenticated, service_role;
      GRANT EXECUTE ON FUNCTION update_first_response_at() TO authenticated, service_role;
    `;

    // Execute the migration using exec_sql RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_command: migration
    });

    if (error) {
      console.error('Migration error:', error);
      return { success: false, error: error.message };
    }

    console.log('Support tickets migration applied successfully');
    return { success: true, message: 'Support tickets migration applied successfully', result: data };

  } catch (error) {
    console.error('Function error:', error);
    return { success: false, error: error.message };
  }
}

// Run if this file is directly executed
if (import.meta.url === new URL(import.meta.url).href) {
  applyMigration().then(result => {
    console.log(result);
  });
}