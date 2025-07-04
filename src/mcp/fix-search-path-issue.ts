import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSearchPathIssue() {
  console.log('🚨 FIXING SEARCH_PATH ISSUE');
  console.log('===============================================');
  console.log('🎯 Problem: search_path="" is too restrictive, breaking table access');
  console.log('🛡️ Solution: Change search_path to "public" for security without breaking functionality');
  console.log('');

  // Get all functions that we just "fixed" with search_path=""
  console.log('🔍 Getting functions with search_path=""...');
  
  try {
    const { data, error } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as signature,
            array_to_string(p.proconfig, ', ') as current_config
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.prokind = 'f'
          AND p.proconfig IS NOT NULL
          AND array_to_string(p.proconfig, ', ') LIKE '%search_path=%'
          ORDER BY p.proname
        ` 
      });

    if (error) {
      console.log('❌ Error getting functions:', error.message);
      return;
    }

    if (!data || !data.success || !data.data) {
      console.log('❌ No data returned');
      return;
    }

    const functions = data.data;
    console.log(`📊 Found ${functions.length} functions with search_path configuration`);
    console.log('');

    let fixedCount = 0;
    let errorCount = 0;

    console.log('🔧 Fixing search_path from "" to "public"...');
    
    for (const func of functions) {
      try {
        const functionCall = func.signature ? 
          `${func.function_name}(${func.signature})` : 
          `${func.function_name}()`;
        
        const sql = `ALTER FUNCTION ${functionCall} SET search_path = 'public'`;
        
        console.log(`🔒 Fixing: ${functionCall}`);
        
        const { data: fixData, error: fixError } = await supabase
          .rpc('exec_security_fix', { sql_command: sql });

        if (fixError) {
          console.log(`   ❌ Error: ${fixError.message}`);
          errorCount++;
        } else if (fixData && fixData.success) {
          console.log(`   ✅ Fixed: ${fixData.message}`);
          fixedCount++;
        } else if (fixData && !fixData.success) {
          console.log(`   ❌ Failed: ${fixData.error}`);
          errorCount++;
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (e) {
        console.log(`   ❌ Exception: ${e}`);
        errorCount++;
      }
    }

    console.log('');
    console.log('🎉 SEARCH_PATH FIX COMPLETE!');
    console.log('===============================================');
    console.log(`✅ Successfully fixed: ${fixedCount} functions`);
    console.log(`❌ Errors encountered: ${errorCount} functions`);
    
    // Verify the fix
    console.log('');
    console.log('🧪 VERIFICATION:');
    console.log('===============================================');
    
    const { data: verifyData, error: verifyError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as signature,
            array_to_string(p.proconfig, ', ') as current_config
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.proname = 'get_recent_activity'
          AND p.prokind = 'f'
          ORDER BY p.proname
        ` 
      });

    if (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
    } else if (verifyData && verifyData.success && verifyData.data) {
      console.log('✅ Verification results for get_recent_activity:');
      verifyData.data.forEach((func: any) => {
        console.log(`   Function: ${func.function_name}(${func.signature})`);
        console.log(`   Config: ${func.current_config}`);
      });
    }

  } catch (e) {
    console.log('❌ Exception:', e);
  }
}

// Execute the fix
fixSearchPathIssue(); 