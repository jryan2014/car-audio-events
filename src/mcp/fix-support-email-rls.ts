import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function fixSupportEmailRLS() {
  console.log('🔧 Fixing Support Email RLS Issue...\n');

  try {
    // Create a function to queue emails with elevated privileges
    console.log('📋 Step 1: Creating queue_support_email function...');
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql_command: `
        -- Drop existing function if it exists
        DROP FUNCTION IF EXISTS public.queue_support_email CASCADE;
        
        -- Create function to queue support emails with elevated privileges
        CREATE OR REPLACE FUNCTION public.queue_support_email(
          p_to_email text,
          p_subject text,
          p_html_content text,
          p_priority integer DEFAULT 1,
          p_template_id uuid DEFAULT NULL,
          p_metadata jsonb DEFAULT NULL
        )
        RETURNS uuid
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = 'public', 'pg_catalog', 'pg_temp'
        AS $$
        DECLARE
          v_email_id uuid;
        BEGIN
          -- Insert into email queue with elevated privileges
          INSERT INTO public.email_queue (
            to_email,
            subject,
            html_content,
            priority,
            status,
            created_at,
            template_id,
            metadata
          ) VALUES (
            p_to_email,
            p_subject,
            p_html_content,
            p_priority,
            'pending',
            NOW(),
            p_template_id,
            p_metadata
          )
          RETURNING id INTO v_email_id;
          
          RETURN v_email_id;
        END;
        $$;
        
        -- Grant execute permission to authenticated users
        GRANT EXECUTE ON FUNCTION public.queue_support_email TO authenticated;
        
        -- Add function comment
        COMMENT ON FUNCTION public.queue_support_email IS 'Queue support email notifications with elevated privileges to bypass RLS';
      `
    });

    if (functionError) {
      console.error('❌ Error creating function:', functionError);
      throw functionError;
    }
    console.log('✅ Function created successfully');

    // Verify the function exists
    console.log('\n📋 Step 2: Verifying function exists...');
    const { data: funcCheck, error: checkError } = await supabase.rpc('exec_sql', {
      sql_command: `
        SELECT 
          p.proname as function_name,
          r.rolname as owner,
          p.prosecdef as security_definer
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        JOIN pg_roles r ON p.proowner = r.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'queue_support_email';
      `
    });

    if (checkError) {
      console.error('❌ Error checking function:', checkError);
    } else {
      console.log('✅ Function verification:', funcCheck);
    }

    console.log('\n✅ Support email RLS fix completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Update supportEmailService to use the new queue_support_email function');
    console.log('2. Test creating a support ticket to verify emails are queued');
    
  } catch (error) {
    console.error('❌ Error fixing support email RLS:', error);
    process.exit(1);
  }
}

fixSupportEmailRLS();