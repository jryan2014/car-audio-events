import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAvailableFunctions() {
  console.log('🔍 CHECKING AVAILABLE SUPABASE FUNCTIONS');
  console.log('===============================================');

  try {
    // Check what functions are available
    const { data, error } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('pronamespace', '2200') // public schema
      .like('proname', '%sql%');

    if (error) {
      console.log('❌ Could not query pg_proc directly');
      console.log('Error:', error.message);
    } else {
      console.log('📊 Functions with "sql" in name:');
      console.log(data);
    }

    // Try different approaches to execute SQL
    console.log('\n🧪 TESTING SQL EXECUTION METHODS');
    console.log('===============================================');

    // Method 1: Direct query
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(5);

      if (error) {
        console.log('❌ Method 1 (direct query) failed:', error.message);
      } else {
        console.log('✅ Method 1 (direct query) works!');
        console.log('Sample tables:', data?.map(t => t.table_name));
      }
    } catch (e) {
      console.log('❌ Method 1 exception:', e);
    }

    // Method 2: Raw SQL query
    try {
      const { data, error } = await supabase
        .rpc('exec', { sql: 'SELECT current_database()' });

      if (error) {
        console.log('❌ Method 2 (exec rpc) failed:', error.message);
      } else {
        console.log('✅ Method 2 (exec rpc) works!');
        console.log('Result:', data);
      }
    } catch (e) {
      console.log('❌ Method 2 exception:', e);
    }

    // Method 3: Try different RPC names
    const rpcNames = ['sql', 'exec_sql', 'execute_sql', 'run_sql', 'query'];
    
    for (const rpcName of rpcNames) {
      try {
        const { data, error } = await supabase
          .rpc(rpcName, { query: 'SELECT 1 as test' });

        if (error) {
          console.log(`❌ Method 3 (${rpcName}) failed:`, error.message);
        } else {
          console.log(`✅ Method 3 (${rpcName}) works!`);
          console.log('Result:', data);
          break;
        }
      } catch (e) {
        console.log(`❌ Method 3 (${rpcName}) exception:`, e);
      }
    }

    // Method 4: Check if we need to create an exec function
    console.log('\n🔧 CHECKING IF WE NEED TO CREATE EXEC FUNCTION');
    console.log('===============================================');

    try {
      // Try to create a simple SQL execution function
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS json
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result json;
        BEGIN
          EXECUTE sql;
          RETURN '{"success": true}'::json;
        END;
        $$;
      `;

      const { data, error } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'exec_sql');

      if (error) {
        console.log('Could not check for exec_sql function');
      } else {
        if (data && data.length > 0) {
          console.log('✅ exec_sql function already exists!');
        } else {
          console.log('❌ exec_sql function does not exist - we need to create it');
          console.log('SQL to create it:');
          console.log(createFunctionSQL);
        }
      }
    } catch (e) {
      console.log('Exception checking exec function:', e);
    }

  } catch (error) {
    console.error('❌ FUNCTION CHECK FAILED:', error);
  }
}

// Execute the check
checkAvailableFunctions(); 