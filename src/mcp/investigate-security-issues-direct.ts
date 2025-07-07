import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function investigateSecurityIssuesDirectly() {
  console.log('🔍 INVESTIGATING SECURITY ISSUES DIRECTLY');
  console.log('===============================================');
  
  try {
    // Step 1: Check if views exist and their definitions
    console.log('📊 Step 1: Checking view definitions...');
    
    const { data: viewCheck, error: viewError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            c.relname as view_name,
            pg_get_viewdef(c.oid, true) as definition,
            CASE 
              WHEN pg_get_viewdef(c.oid, true) ILIKE '%SECURITY DEFINER%' THEN 'HAS_SECURITY_DEFINER'
              ELSE 'NO_SECURITY_DEFINER'
            END as security_status
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'public'
          AND c.relname IN ('competition_results', 'payment_history')
          AND c.relkind = 'v'
          ORDER BY c.relname
        ` 
      });

    if (viewError) {
      console.log('❌ Error checking views:', viewError.message);
    } else if (viewCheck?.success && viewCheck?.data) {
      console.log(`✅ Found ${viewCheck.data.length} views:`);
      viewCheck.data.forEach((view: any) => {
        console.log(`\n📋 ${view.view_name}:`);
        console.log(`   Status: ${view.security_status}`);
        console.log(`   Definition: ${view.definition.substring(0, 200)}...`);
        
        if (view.security_status === 'HAS_SECURITY_DEFINER') {
          console.log('   ⚠️  SECURITY DEFINER DETECTED - NEEDS FIXING');
        } else {
          console.log('   ✅ No SECURITY DEFINER found');
        }
      });
    } else {
      console.log('❌ No views found');
    }

    console.log('\n');

    // Step 2: Check subscription_history table RLS status
    console.log('📋 Step 2: Checking subscription_history RLS...');
    
    const { data: rlsCheck, error: rlsError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            c.relname as table_name,
            c.relrowsecurity as rls_enabled,
            c.relforcerowsecurity as rls_forced,
            (
              SELECT COUNT(*) 
              FROM pg_policy p 
              WHERE p.polrelid = c.oid
            ) as policy_count
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'public'
          AND c.relname = 'subscription_history'
          AND c.relkind = 'r'
        ` 
      });

    if (rlsError) {
      console.log('❌ Error checking RLS:', rlsError.message);
    } else if (rlsCheck?.success && rlsCheck?.data?.[0]) {
      const table = rlsCheck.data[0];
      console.log(`✅ Table: ${table.table_name}`);
      console.log(`   RLS Enabled: ${table.rls_enabled}`);
      console.log(`   RLS Forced: ${table.rls_forced}`);
      console.log(`   Policy Count: ${table.policy_count}`);
      
      if (!table.rls_enabled) {
        console.log('   ⚠️  RLS IS DISABLED - NEEDS FIXING');
      } else {
        console.log('   ✅ RLS is properly enabled');
      }
    } else {
      console.log('❌ subscription_history table not found');
    }

    console.log('\n');

    // Step 3: Test current accessibility
    console.log('🧪 Step 3: Testing current accessibility...');
    
    // Test competition_results
    try {
      const { data: compTest, error: compError } = await supabase
        .from('competition_results')
        .select('*')
        .limit(1);
      
      if (compError) {
        console.log('❌ competition_results access failed:', compError.message);
      } else {
        console.log('✅ competition_results is accessible');
      }
    } catch (e) {
      console.log('❌ competition_results test exception:', e);
    }

    // Test payment_history
    try {
      const { data: payTest, error: payError } = await supabase
        .from('payment_history')
        .select('*')
        .limit(1);
      
      if (payError) {
        console.log('❌ payment_history access failed:', payError.message);
      } else {
        console.log('✅ payment_history is accessible');
      }
    } catch (e) {
      console.log('❌ payment_history test exception:', e);
    }

    // Test subscription_history
    try {
      const { data: subTest, error: subError } = await supabase
        .from('subscription_history')
        .select('*')
        .limit(1);
      
      if (subError) {
        console.log('❌ subscription_history access failed:', subError.message);
      } else {
        console.log('✅ subscription_history is accessible');
      }
    } catch (e) {
      console.log('❌ subscription_history test exception:', e);
    }

    console.log('\n');
    console.log('🎯 INVESTIGATION COMPLETE');
    console.log('===============================================');
    console.log('Next steps:');
    console.log('1. Fix SECURITY DEFINER views by recreating them');
    console.log('2. Enable RLS on subscription_history table');
    console.log('3. Create appropriate RLS policies');
    console.log('4. Verify security linter shows no errors');

  } catch (e) {
    console.log('❌ Exception during investigation:', e);
  }
}

// Run the investigation
investigateSecurityIssuesDirectly().catch(console.error); 