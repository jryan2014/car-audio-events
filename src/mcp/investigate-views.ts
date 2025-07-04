import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateViews() {
  console.log('🚨 INVESTIGATING SECURITY DEFINER VIEWS');
  console.log('===============================================');
  console.log('🎯 Goal: Find out why views still have SECURITY DEFINER');
  console.log('🔍 Method: Deep dive into PostgreSQL system catalogs');
  console.log('');

  try {
    // Check the complete view information
    console.log('🔍 Step 1: Complete view information...');
    const { data: viewInfo, error: viewInfoError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            c.relname as view_name,
            c.relowner,
            u.usename as owner_name,
            c.relacl as permissions,
            pg_get_viewdef(c.oid, false) as view_definition_raw,
            pg_get_viewdef(c.oid, true) as view_definition_pretty
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          JOIN pg_user u ON c.relowner = u.usesysid
          WHERE n.nspname = 'public'
          AND c.relname IN ('competition_results', 'payment_history')
          AND c.relkind = 'v'
          ORDER BY c.relname
        ` 
      });

    if (viewInfoError) {
      console.log('❌ Error getting view info:', viewInfoError.message);
    } else if (viewInfo && viewInfo.success && viewInfo.data) {
      console.log('✅ View information:');
      viewInfo.data.forEach((view: any) => {
        console.log(`\n📊 View: ${view.view_name}`);
        console.log(`   Owner: ${view.owner_name}`);
        console.log(`   Permissions: ${view.permissions || 'Default'}`);
        console.log(`   Raw definition: ${view.view_definition_raw}`);
      });
    }

    console.log('');

    // Check pg_rewrite for view rules
    console.log('🔍 Step 2: Checking pg_rewrite for view rules...');
    const { data: rewriteInfo, error: rewriteError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            c.relname as view_name,
            r.rulename,
            r.ev_type,
            r.ev_enabled,
            r.is_instead,
            pg_get_ruledef(r.oid, true) as rule_definition
          FROM pg_rewrite r
          JOIN pg_class c ON r.ev_class = c.oid
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'public'
          AND c.relname IN ('competition_results', 'payment_history')
          ORDER BY c.relname, r.rulename
        ` 
      });

    if (rewriteError) {
      console.log('❌ Error getting rewrite rules:', rewriteError.message);
    } else if (rewriteInfo && rewriteInfo.success && rewriteInfo.data) {
      console.log('✅ View rewrite rules:');
      rewriteInfo.data.forEach((rule: any) => {
        console.log(`\n📋 Rule for ${rule.view_name}:`);
        console.log(`   Rule name: ${rule.rulename}`);
        console.log(`   Type: ${rule.ev_type}, Enabled: ${rule.ev_enabled}, Instead: ${rule.is_instead}`);
        console.log(`   Definition: ${rule.rule_definition}`);
      });
    }

    console.log('');

    // Try to force drop and recreate with explicit ownership
    console.log('🔧 Step 3: Force dropping and recreating with explicit settings...');
    
    for (const viewName of ['competition_results', 'payment_history']) {
      console.log(`\n🔧 Force fixing ${viewName}...`);
      
      // Get the current definition first
      const { data: currentDef, error: currentDefError } = await supabase
        .rpc('exec_sql_with_results', { 
          sql_command: `SELECT pg_get_viewdef('public.${viewName}', true) as definition` 
        });

      if (currentDefError || !currentDef?.success || !currentDef?.data?.[0]) {
        console.log(`❌ Could not get definition for ${viewName}`);
        continue;
      }

      const definition = currentDef.data[0].definition;
      
      // Force drop and recreate
      const forceRecreate = `
        -- Force drop with CASCADE
        DROP VIEW IF EXISTS public.${viewName} CASCADE;
        
        -- Recreate as normal view (explicitly no SECURITY DEFINER)
        CREATE VIEW public.${viewName} AS
        ${definition};
        
        -- Ensure proper ownership (if needed)
        ALTER VIEW public.${viewName} OWNER TO postgres;
      `;
      
      const { data: forceResult, error: forceError } = await supabase
        .rpc('exec_sql', { sql_command: forceRecreate });

      if (forceError) {
        console.log(`❌ Error force-fixing ${viewName}: ${forceError.message}`);
      } else {
        console.log(`✅ Force-fixed ${viewName}: ${forceResult?.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('');

    // Final verification
    console.log('🧪 Step 4: Final verification...');
    const { data: finalCheck, error: finalCheckError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          -- Check if views exist and get their full CREATE statement
          SELECT 
            c.relname as view_name,
            'EXISTS' as status,
            pg_get_viewdef(c.oid, false) as raw_definition
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'public'
          AND c.relname IN ('competition_results', 'payment_history')
          AND c.relkind = 'v'
          ORDER BY c.relname
        ` 
      });

    if (finalCheckError) {
      console.log('❌ Final check failed:', finalCheckError.message);
    } else if (finalCheck && finalCheck.success && finalCheck.data) {
      console.log('✅ Final verification:');
      finalCheck.data.forEach((view: any) => {
        console.log(`\n📊 ${view.view_name}: ${view.status}`);
        console.log(`   Raw definition: ${view.raw_definition}`);
        
        // Check if definition contains SECURITY DEFINER
        if (view.raw_definition.toUpperCase().includes('SECURITY DEFINER')) {
          console.log('   ❌ STILL HAS SECURITY DEFINER!');
        } else {
          console.log('   ✅ No SECURITY DEFINER found');
        }
      });
    }

    console.log('');
    console.log('🎯 INVESTIGATION COMPLETE');
    console.log('===============================================');
    console.log('If views still have SECURITY DEFINER, there may be:');
    console.log('1. A trigger or function automatically adding it');
    console.log('2. The views are being recreated by another process');
    console.log('3. There are dependencies forcing SECURITY DEFINER');

  } catch (e) {
    console.log('❌ Exception:', e);
  }
}

// Execute the investigation
investigateViews(); 