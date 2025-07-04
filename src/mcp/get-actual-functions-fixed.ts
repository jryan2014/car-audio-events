import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getActualFunctions() {
  console.log('🔍 GETTING ACTUAL DATABASE FUNCTIONS');
  console.log('===============================================');

  try {
    // Use exec_sql for queries (not exec_security_fix)
    const { data, error } = await supabase
      .rpc('exec_sql', { 
        sql_command: `
          SELECT 
            p.proname as function_name,
            pg_get_function_arguments(p.oid) as arguments,
            CASE 
              WHEN p.proconfig IS NULL THEN 'No search_path set'
              ELSE array_to_string(p.proconfig, ', ')
            END as current_config
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.prokind = 'f'
          ORDER BY p.proname
        ` 
      });

    if (error) {
      console.log('❌ Error getting functions:', error.message);
    } else if (data && data.success) {
      console.log('✅ Successfully retrieved function list');
      console.log('Result:', data);
    } else {
      console.log('⚠️ Unexpected result:', data);
    }

  } catch (e) {
    console.log('❌ Exception:', e);
  }
}

// Execute
getActualFunctions(); 