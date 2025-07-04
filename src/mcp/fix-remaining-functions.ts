import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRemainingFunctions() {
  console.log('🚨 FIXING REMAINING 2 FUNCTIONS WITH OVERLOADS');
  console.log('===============================================');
  console.log('🎯 Target: is_admin and update_email_stats functions');
  console.log('🛡️ Strategy: Get specific signatures and fix each overload');
  console.log('');

  // Step 1: Get the specific signatures for is_admin functions
  console.log('🔍 Step 1: Getting is_admin function signatures...');
  try {
    const { data: isAdminData, error: isAdminError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as signature,
            pg_get_function_arguments(p.oid) as full_args
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.proname = 'is_admin'
          AND p.prokind = 'f'
          ORDER BY p.oid
        ` 
      });

    if (isAdminError) {
      console.log('❌ Error getting is_admin signatures:', isAdminError.message);
    } else if (isAdminData && isAdminData.success && isAdminData.data) {
      console.log('✅ Found is_admin function signatures:');
      isAdminData.data.forEach((func: any, index: number) => {
        console.log(`   ${index + 1}. is_admin(${func.signature}) - Args: ${func.full_args}`);
      });
      
      // Fix each is_admin function
      console.log('');
      console.log('🔒 Fixing is_admin functions...');
      for (const func of isAdminData.data) {
        const sql = `ALTER FUNCTION is_admin(${func.signature}) SET search_path = ''`;
        console.log(`   Executing: ${sql}`);
        
        const { data, error } = await supabase
          .rpc('exec_security_fix', { sql_command: sql });

        if (error) {
          console.log(`   ❌ Error: ${error.message}`);
        } else if (data && data.success) {
          console.log(`   ✅ Fixed: ${data.message}`);
        } else if (data && !data.success) {
          console.log(`   ❌ Failed: ${data.error}`);
        }
      }
    }
  } catch (e) {
    console.log('❌ Exception getting is_admin signatures:', e);
  }

  console.log('');
  
  // Step 2: Get the specific signatures for update_email_stats functions
  console.log('🔍 Step 2: Getting update_email_stats function signatures...');
  try {
    const { data: updateEmailData, error: updateEmailError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as signature,
            pg_get_function_arguments(p.oid) as full_args
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.proname = 'update_email_stats'
          AND p.prokind = 'f'
          ORDER BY p.oid
        ` 
      });

    if (updateEmailError) {
      console.log('❌ Error getting update_email_stats signatures:', updateEmailError.message);
    } else if (updateEmailData && updateEmailData.success && updateEmailData.data) {
      console.log('✅ Found update_email_stats function signatures:');
      updateEmailData.data.forEach((func: any, index: number) => {
        console.log(`   ${index + 1}. update_email_stats(${func.signature}) - Args: ${func.full_args}`);
      });
      
      // Fix each update_email_stats function
      console.log('');
      console.log('🔒 Fixing update_email_stats functions...');
      for (const func of updateEmailData.data) {
        const sql = `ALTER FUNCTION update_email_stats(${func.signature}) SET search_path = ''`;
        console.log(`   Executing: ${sql}`);
        
        const { data, error } = await supabase
          .rpc('exec_security_fix', { sql_command: sql });

        if (error) {
          console.log(`   ❌ Error: ${error.message}`);
        } else if (data && data.success) {
          console.log(`   ✅ Fixed: ${data.message}`);
        } else if (data && !data.success) {
          console.log(`   ❌ Failed: ${data.error}`);
        }
      }
    }
  } catch (e) {
    console.log('❌ Exception getting update_email_stats signatures:', e);
  }

  console.log('');
  console.log('🎉 REMAINING FUNCTION FIXES COMPLETE!');
  console.log('===============================================');
  
  // Final verification
  console.log('🧪 FINAL VERIFICATION:');
  console.log('===============================================');
  
  try {
    const { data, error } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as signature,
            CASE 
              WHEN p.proconfig IS NULL THEN 'Still vulnerable'
              ELSE 'Fixed: ' || array_to_string(p.proconfig, ', ')
            END as security_status
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.proname IN ('is_admin', 'update_email_stats')
          AND p.prokind = 'f'
          ORDER BY p.proname, p.oid
        ` 
      });

    if (error) {
      console.log('❌ Verification failed:', error.message);
    } else if (data && data.success && data.data) {
      console.log('✅ Final verification results:');
      data.data.forEach((func: any) => {
        const status = func.security_status.includes('Still vulnerable') ? '❌' : '✅';
        console.log(`   ${status} ${func.function_name}(${func.signature}) - ${func.security_status}`);
      });
    }
  } catch (e) {
    console.log('❌ Verification exception:', e);
  }
}

// Execute the remaining fixes
fixRemainingFunctions(); 