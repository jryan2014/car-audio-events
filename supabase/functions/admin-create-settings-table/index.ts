import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // SECURITY: exec_sql removed - return instructions for manual migration
    return new Response(
      JSON.stringify({
        success: false,
        error: 'exec_sql function disabled for security',
        message: 'Please create tables via database migration instead',
        migration_sql: `
-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_activity_log table
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
        `,
        instructions: 'Save the SQL above to a migration file and run: npx supabase db push'
      }),
      { 
        status: 400, 
        headers: corsHeaders 
      }
    )

    if (createError) {
      console.error('Create table error:', createError)
      return new Response(
        JSON.stringify({ error: `Failed to create table: ${createError.message}` }),
        { status: 500, headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin settings table created successfully'
      }),
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Create table function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
}) 