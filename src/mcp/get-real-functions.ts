import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getRealFunctions() {
  console.log('🔍 GETTING REAL DATABASE FUNCTIONS');
  console.log('===============================================');

  try {
    // Get all functions in the public schema with their current search_path config
    const { data, error } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            p.proname as function_name,
            pg_get_function_arguments(p.oid) as arguments,
            CASE 
              WHEN p.proconfig IS NULL THEN 'No search_path set (VULNERABLE)'
              WHEN array_to_string(p.proconfig, ', ') LIKE '%search_path%' THEN 'search_path configured'
              ELSE 'Other config: ' || array_to_string(p.proconfig, ', ')
            END as security_status
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.prokind = 'f'
          AND p.proname NOT LIKE 'exec_%'
          ORDER BY p.proname
        ` 
      });

    if (error) {
      console.log('❌ Error getting functions:', error.message);
    } else if (data && data.success && data.data) {
      console.log('✅ Successfully retrieved function list');
      console.log(`📊 Found ${data.row_count} functions`);
      console.log('');
      
      const functions = data.data;
      let vulnerableCount = 0;
      const vulnerableFunctions: string[] = [];
      
      console.log('🔍 FUNCTION SECURITY ANALYSIS:');
      console.log('===============================================');
      
      functions.forEach((func: any) => {
        const isVulnerable = func.security_status.includes('VULNERABLE');
        if (isVulnerable) {
          vulnerableCount++;
          vulnerableFunctions.push(func.function_name);
          console.log(`❌ ${func.function_name}(${func.arguments}) - ${func.security_status}`);
        } else {
          console.log(`✅ ${func.function_name}(${func.arguments}) - ${func.security_status}`);
        }
      });
      
      console.log('');
      console.log('🎯 SECURITY SUMMARY:');
      console.log('===============================================');
      console.log(`Total functions: ${functions.length}`);
      console.log(`Vulnerable functions: ${vulnerableCount}`);
      console.log(`Secure functions: ${functions.length - vulnerableCount}`);
      
      if (vulnerableCount > 0) {
        console.log('');
        console.log('⚠️ VULNERABLE FUNCTIONS TO FIX:');
        vulnerableFunctions.forEach(name => console.log(`   - ${name}`));
        
        // Save the vulnerable functions list for the fix script
        console.log('');
        console.log('📋 READY TO EXECUTE FIXES FOR THESE FUNCTIONS:');
        console.log(JSON.stringify(vulnerableFunctions, null, 2));
      } else {
        console.log('');
        console.log('🎉 ALL FUNCTIONS ARE SECURE!');
      }
      
    } else {
      console.log('⚠️ Unexpected result:', data);
    }

  } catch (e) {
    console.log('❌ Exception:', e);
  }
}

// Execute
getRealFunctions(); 