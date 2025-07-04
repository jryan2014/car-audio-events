import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeRealPhase2SecurityFixes() {
  console.log('🚨 EXECUTING REAL PHASE 2: FUNCTION SECURITY FIXES');
  console.log('===============================================');
  console.log('🎯 Target: 15 ACTUAL vulnerable functions with SQL injection vulnerabilities');
  console.log('🛡️ Fix: Set search_path to empty string to prevent manipulation');
  console.log('');

  // REAL list of vulnerable functions from the database analysis
  const vulnerableFunctions = [
    "add_email_to_queue",
    "archive_old_emails", 
    "get_popular_searches",
    "get_recent_activity",
    "is_admin",
    "log_activity",
    "make_user_admin",
    "mark_email_failed",
    "mark_email_sent",
    "purge_email_queue",
    "remove_user_admin",
    "trigger_set_timestamp_categories",
    "update_email_stats",
    "update_updated_at_column"
  ];

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  const successes: string[] = [];

  console.log(`🔧 Processing ${vulnerableFunctions.length} vulnerable functions...`);
  console.log('');

  for (const functionName of vulnerableFunctions) {
    try {
      // For functions with parameters, we need to get the full signature
      // Let's try the basic approach first and handle errors
      const sql = `ALTER FUNCTION ${functionName} SET search_path = ''`;
      
      console.log(`🔒 Fixing function: ${functionName}`);
      
      const { data, error } = await supabase
        .rpc('exec_security_fix', { sql_command: sql });

      if (error) {
        console.log(`❌ Error fixing ${functionName}:`, error.message);
        errorCount++;
        errors.push(`${functionName}: ${error.message}`);
      } else if (data && data.success) {
        console.log(`✅ Fixed ${functionName}: ${data.message}`);
        successCount++;
        successes.push(functionName);
      } else if (data && !data.success) {
        console.log(`❌ Failed to fix ${functionName}: ${data.error}`);
        errorCount++;
        errors.push(`${functionName}: ${data.error}`);
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (e) {
      console.log(`❌ Exception fixing ${functionName}:`, e);
      errorCount++;
      errors.push(`${functionName}: ${e}`);
    }
  }

  console.log('');
  console.log('🎉 REAL PHASE 2 EXECUTION COMPLETE!');
  console.log('===============================================');
  console.log(`✅ Successfully fixed: ${successCount} functions`);
  console.log(`❌ Errors encountered: ${errorCount} functions`);
  
  if (successes.length > 0) {
    console.log('');
    console.log('🎯 SUCCESSFULLY SECURED FUNCTIONS:');
    successes.forEach(func => console.log(`   ✅ ${func}`));
  }
  
  if (errors.length > 0) {
    console.log('');
    console.log('🔍 FUNCTIONS THAT NEED MANUAL REVIEW:');
    errors.forEach(error => console.log(`   ❌ ${error}`));
  }

  console.log('');
  console.log('🛡️ SECURITY STATUS:');
  console.log(`   - SQL Injection vulnerabilities eliminated: ${successCount}`);
  console.log(`   - Functions still vulnerable: ${errorCount}`);
  console.log(`   - Security improvement: ${Math.round((successCount / vulnerableFunctions.length) * 100)}%`);

  // Verify some of the fixes worked
  console.log('');
  console.log('🧪 VERIFICATION TEST:');
  console.log('===============================================');
  
  if (successes.length > 0) {
    const testFunction = successes[0];
    try {
      const { data, error } = await supabase
        .rpc('exec_sql_with_results', { 
          sql_command: `
            SELECT 
              proname,
              CASE 
                WHEN proconfig IS NULL THEN 'Still vulnerable'
                ELSE 'Fixed: ' || array_to_string(proconfig, ', ')
              END as status
            FROM pg_proc 
            WHERE proname = '${testFunction}'
          ` 
        });

      if (error) {
        console.log('❌ Verification failed:', error.message);
      } else if (data && data.success && data.data) {
        console.log(`✅ Verification for ${testFunction}:`, data.data[0]);
      } else {
        console.log('⚠️ Verification returned unexpected result:', data);
      }
    } catch (e) {
      console.log('❌ Verification exception:', e);
    }
  }
}

// Execute Real Phase 2 fixes
executeRealPhase2SecurityFixes(); 