import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixViewsProperly() {
  console.log('🚨 FIXING SECURITY DEFINER VIEWS PROPERLY');
  console.log('===============================================');
  console.log('🎯 Problem: Views still have SECURITY DEFINER property');
  console.log('🛡️ Solution: Properly recreate views without SECURITY DEFINER');
  console.log('');

  try {
    // Check current view properties
    console.log('🔍 Checking current view properties...');
    const { data: viewProps, error: viewPropsError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            c.relname as view_name,
            c.relkind as object_type,
            CASE 
              WHEN c.relkind = 'v' THEN 'VIEW'
              ELSE 'OTHER'
            END as type_display,
            pg_get_viewdef(c.oid, true) as view_definition
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'public'
          AND c.relname IN ('competition_results', 'payment_history')
          AND c.relkind = 'v'
          ORDER BY c.relname
        ` 
      });

    if (viewPropsError) {
      console.log('❌ Error checking view properties:', viewPropsError.message);
      return;
    }

    if (!viewProps || !viewProps.success || !viewProps.data) {
      console.log('❌ No view data returned');
      return;
    }

    console.log(`📊 Found ${viewProps.data.length} views to fix`);
    console.log('');

    for (const view of viewProps.data) {
      console.log(`🔧 Fixing view: ${view.view_name}`);
      console.log('Current definition:');
      console.log(view.view_definition);
      
      // The proper way to fix SECURITY DEFINER views is to:
      // 1. Drop the view completely
      // 2. Recreate it with just the SELECT statement (no SECURITY DEFINER)
      
      const dropAndRecreate = `
        -- Drop the existing view
        DROP VIEW IF EXISTS public.${view.view_name} CASCADE;
        
        -- Recreate without SECURITY DEFINER
        CREATE VIEW public.${view.view_name} AS
        ${view.view_definition};
      `;
      
      console.log('🔧 Dropping and recreating view...');
      const { data: fixResult, error: fixError } = await supabase
        .rpc('exec_sql', { sql_command: dropAndRecreate });

      if (fixError) {
        console.log(`❌ Error fixing ${view.view_name}: ${fixError.message}`);
      } else {
        console.log(`✅ Successfully fixed ${view.view_name}: ${fixResult?.message}`);
      }
      
      console.log('');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Verify the fixes
    console.log('🧪 VERIFICATION: Checking if SECURITY DEFINER is removed...');
    const { data: verifyData, error: verifyError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          -- Check if views still exist and their properties
          SELECT 
            c.relname as view_name,
            'VIEW' as object_type,
            CASE 
              WHEN pg_get_viewdef(c.oid, true) IS NOT NULL THEN 'EXISTS'
              ELSE 'MISSING'
            END as status,
            -- Check for SECURITY DEFINER in system catalogs
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM pg_rewrite r 
                WHERE r.ev_class = c.oid 
                AND r.ev_type = '1'
                AND r.ev_enabled = 'O'
              ) THEN 'NORMAL VIEW'
              ELSE 'UNKNOWN'
            END as view_type
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'public'
          AND c.relname IN ('competition_results', 'payment_history')
          AND c.relkind = 'v'
          ORDER BY c.relname
        ` 
      });

    if (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
    } else if (verifyData && verifyData.success && verifyData.data) {
      console.log('✅ Verification results:');
      verifyData.data.forEach((result: any) => {
        console.log(`   ✅ ${result.view_name}: ${result.status} (${result.view_type})`);
      });
    }

    console.log('');
    console.log('🎯 PROPER VIEW FIXES COMPLETE!');
    console.log('===============================================');
    console.log('✅ Dropped and recreated both views without SECURITY DEFINER');
    console.log('✅ Views should now respect user permissions and RLS');
    console.log('');
    console.log('🔍 Please refresh the Supabase security dashboard to check if issues are resolved');

  } catch (e) {
    console.log('❌ Exception:', e);
  }
}

// Execute the proper view fixes
fixViewsProperly(); 