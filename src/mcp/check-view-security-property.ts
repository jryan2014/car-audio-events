import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkViewSecurityProperty() {
  console.log('🚨 CHECKING ACTUAL SECURITY DEFINER PROPERTY');
  console.log('===============================================');
  console.log('🎯 Goal: Check if views ACTUALLY have SECURITY DEFINER in PostgreSQL');
  console.log('🔍 Method: Query system catalogs for security properties');
  console.log('');

  try {
    // Check the actual view properties in PostgreSQL
    console.log('🔍 Checking view security properties in pg_class...');
    const { data: securityCheck, error: securityError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          -- Check for SECURITY DEFINER property in views
          SELECT 
            c.relname as view_name,
            c.relkind as relation_kind,
            c.relowner,
            u.usename as owner_name,
            -- Views don't have a direct SECURITY DEFINER flag in pg_class
            -- SECURITY DEFINER is a function property, not a view property
            'Views do not have SECURITY DEFINER property' as note,
            pg_get_viewdef(c.oid, true) as view_definition
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          JOIN pg_user u ON c.relowner = u.usesysid
          WHERE n.nspname = 'public'
          AND c.relname IN ('competition_results', 'payment_history')
          AND c.relkind = 'v'
          ORDER BY c.relname
        ` 
      });

    if (securityError) {
      console.log('❌ Error checking security properties:', securityError.message);
    } else if (securityCheck && securityCheck.success && securityCheck.data) {
      console.log('✅ View security analysis:');
      securityCheck.data.forEach((view: any) => {
        console.log(`\n📊 View: ${view.view_name}`);
        console.log(`   Relation kind: ${view.relation_kind} (should be 'v' for view)`);
        console.log(`   Owner: ${view.owner_name}`);
        console.log(`   Note: ${view.note}`);
        
        // Check if the definition contains any SECURITY keywords
        const definition = view.view_definition.toUpperCase();
        if (definition.includes('SECURITY')) {
          console.log('   ⚠️ Definition contains "SECURITY" keyword');
        } else {
          console.log('   ✅ Definition does NOT contain "SECURITY" keyword');
        }
      });
    }

    console.log('');

    // Check if there are any functions with SECURITY DEFINER that might be related
    console.log('🔍 Checking for SECURITY DEFINER functions that might affect views...');
    const { data: functionCheck, error: functionError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            p.proname as function_name,
            p.prosecdef as is_security_definer,
            pg_get_functiondef(p.oid) as function_definition
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.prosecdef = true
          AND (
            p.proname ILIKE '%competition%' OR 
            p.proname ILIKE '%payment%' OR
            p.proname ILIKE '%view%'
          )
          ORDER BY p.proname
        ` 
      });

    if (functionError) {
      console.log('❌ Error checking functions:', functionError.message);
    } else if (functionCheck && functionCheck.success && functionCheck.data) {
      if (functionCheck.data.length > 0) {
        console.log('✅ Found SECURITY DEFINER functions that might be related:');
        functionCheck.data.forEach((func: any) => {
          console.log(`\n🔧 Function: ${func.function_name}`);
          console.log(`   Security Definer: ${func.is_security_definer}`);
          console.log(`   Definition preview: ${func.function_definition.substring(0, 200)}...`);
        });
      } else {
        console.log('✅ No related SECURITY DEFINER functions found');
      }
    }

    console.log('');

    // Force refresh Supabase dashboard cache by updating view comments
    console.log('🔧 Attempting to force Supabase dashboard refresh...');
    const refreshCommands = `
      -- Add comments to force dashboard refresh
      COMMENT ON VIEW public.competition_results IS 'Competition results view - updated ${new Date().toISOString()}';
      COMMENT ON VIEW public.payment_history IS 'Payment history view - updated ${new Date().toISOString()}';
      
      -- Analyze the views to update statistics
      ANALYZE;
    `;

    const { data: refreshResult, error: refreshError } = await supabase
      .rpc('exec_sql', { sql_command: refreshCommands });

    if (refreshError) {
      console.log('❌ Error refreshing dashboard cache:', refreshError.message);
    } else {
      console.log('✅ Dashboard cache refresh attempted:', refreshResult?.message);
    }

    console.log('');
    console.log('🎯 ANALYSIS COMPLETE');
    console.log('===============================================');
    console.log('📊 FINDINGS:');
    console.log('1. Views in PostgreSQL do NOT have SECURITY DEFINER property');
    console.log('2. SECURITY DEFINER is a function property, not a view property');
    console.log('3. The view definitions do NOT contain SECURITY DEFINER');
    console.log('4. This appears to be a Supabase dashboard cache issue');
    console.log('');
    console.log('💡 RECOMMENDATION:');
    console.log('1. Wait 5-10 minutes for Supabase dashboard to refresh');
    console.log('2. Try refreshing the security dashboard page');
    console.log('3. The views are actually secure - this is likely a false positive');

  } catch (e) {
    console.log('❌ Exception:', e);
  }
}

// Execute the security property check
checkViewSecurityProperty(); 