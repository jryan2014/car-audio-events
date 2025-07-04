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
    // Get all functions in the public schema
    const { data, error } = await supabase
      .rpc('exec_security_fix', { 
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
      
      // Try a simpler approach - get function names only
      console.log('🔄 Trying simpler query...');
      
      const { data: simpleData, error: simpleError } = await supabase
        .from('information_schema.routines')
        .select('routine_name')
        .eq('routine_schema', 'public')
        .eq('routine_type', 'FUNCTION');

      if (simpleError) {
        console.log('❌ Simple query also failed:', simpleError.message);
      } else {
        console.log('✅ Found functions via information_schema:');
        console.log(simpleData);
      }
      
    } else if (data && data.success) {
      console.log('✅ Successfully retrieved function list');
      console.log('Raw result:', data);
    } else {
      console.log('⚠️ Unexpected result:', data);
    }

  } catch (e) {
    console.log('❌ Exception:', e);
  }
}

// Execute
getActualFunctions(); 