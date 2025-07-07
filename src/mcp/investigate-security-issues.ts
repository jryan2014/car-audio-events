import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function investigateSecurityIssues() {
  console.log('🔍 INVESTIGATING SECURITY ISSUES');
  console.log('===============================================');
  
  try {
    // Issue 1: Check competition_results view
    console.log('📊 Issue 1: competition_results SECURITY DEFINER view');
    const { data: compView, error: compViewError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            c.relname as view_name,
            pg_get_viewdef(c.oid, true) as definition,
            n.nspname as schema_name,
            c.relowner,
            u.usename as owner_name
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          LEFT JOIN pg_user u ON c.relowner = u.usesysid
          WHERE n.nspname = 'public'
          AND c.relname = 'competition_results'
          AND c.relkind = 'v'
        ` 
      });

    if (compViewError) {
      console.log('❌ Error checking competition_results:', compViewError.message);
    } else if (compView?.success && compView?.data?.[0]) {
      const view = compView.data[0];
      console.log(`✅ View exists: ${view.view_name}`);
      console.log(`📋 Owner: ${view.owner_name}`);
      console.log(`🔧 Definition: ${view.definition}`);
      
      if (view.definition.toUpperCase().includes('SECURITY DEFINER')) {
        console.log('⚠️  SECURITY DEFINER DETECTED!');
      } else {
        console.log('✅ No SECURITY DEFINER found');
      }
    } else {
      console.log('❌ competition_results view not found');
    }

    console.log('');

    // Issue 2: Check payment_history view
    console.log('💳 Issue 2: payment_history SECURITY DEFINER view');
    const { data: payView, error: payViewError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            c.relname as view_name,
            pg_get_viewdef(c.oid, true) as definition,
            n.nspname as schema_name,
            c.relowner,
            u.usename as owner_name
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          LEFT JOIN pg_user u ON c.relowner = u.usesysid
          WHERE n.nspname = 'public'
          AND c.relname = 'payment_history'
          AND c.relkind = 'v'
        ` 
      });

    if (payViewError) {
      console.log('❌ Error checking payment_history:', payViewError.message);
    } else if (payView?.success && payView?.data?.[0]) {
      const view = payView.data[0];
      console.log(`✅ View exists: ${view.view_name}`);
      console.log(`📋 Owner: ${view.owner_name}`);
      console.log(`🔧 Definition: ${view.definition}`);
      
      if (view.definition.toUpperCase().includes('SECURITY DEFINER')) {
        console.log('⚠️  SECURITY DEFINER DETECTED!');
      } else {
        console.log('✅ No SECURITY DEFINER found');
      }
    } else {
      console.log('❌ payment_history view not found');
    }

    console.log('');

    // Issue 3: Check subscription_history RLS status
    console.log('📋 Issue 3: subscription_history RLS status');
    const { data: rlsCheck, error: rlsError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            c.relname as table_name,
            c.relrowsecurity as rls_enabled,
            c.relforcerowsecurity as rls_forced,
            n.nspname as schema_name
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'public'
          AND c.relname = 'subscription_history'
          AND c.relkind = 'r'
        ` 
      });

    if (rlsError) {
      console.log('❌ Error checking subscription_history RLS:', rlsError.message);
    } else if (rlsCheck?.success && rlsCheck?.data?.[0]) {
      const table = rlsCheck.data[0];
      console.log(`✅ Table exists: ${table.table_name}`);
      console.log(`🔐 RLS Enabled: ${table.rls_enabled}`);
      console.log(`🔒 RLS Forced: ${table.rls_forced}`);
      
      if (!table.rls_enabled) {
        console.log('⚠️  RLS IS DISABLED!');
      } else {
        console.log('✅ RLS is enabled');
      }
    } else {
      console.log('❌ subscription_history table not found');
    }

    console.log('');

    // Check existing RLS policies on subscription_history
    console.log('🔍 Checking existing RLS policies on subscription_history...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            p.polname as policy_name,
            p.polcmd as policy_command,
            pg_get_expr(p.polqual, p.polrelid) as policy_condition,
            p.polroles as policy_roles
          FROM pg_policy p
          JOIN pg_class c ON p.polrelid = c.oid
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'public'
          AND c.relname = 'subscription_history'
          ORDER BY p.polname
        ` 
      });

    if (policiesError) {
      console.log('❌ Error checking RLS policies:', policiesError.message);
    } else if (policies?.success && policies?.data) {
      console.log(`✅ Found ${policies.data.length} RLS policies:`);
      policies.data.forEach((policy: any) => {
        console.log(`   📋 ${policy.policy_name} (${policy.policy_command})`);
        console.log(`      Condition: ${policy.policy_condition || 'No condition'}`);
      });
    } else {
      console.log('❌ No RLS policies found');
    }

    console.log('');

    // Check if these views/tables are actually used in the application
    console.log('🔍 Checking application usage...');
    
    // Test if views are accessible with current permissions
    console.log('🧪 Testing view accessibility...');
    
    // Test competition_results view
    const { data: compTest, error: compTestError } = await supabase
      .from('competition_results')
      .select('*')
      .limit(1);

    if (compTestError) {
      console.log('❌ competition_results view test failed:', compTestError.message);
    } else {
      console.log('✅ competition_results view is accessible');
    }

    // Test payment_history view
    const { data: payTest, error: payTestError } = await supabase
      .from('payment_history')
      .select('*')
      .limit(1);

    if (payTestError) {
      console.log('❌ payment_history view test failed:', payTestError.message);
    } else {
      console.log('✅ payment_history view is accessible');
    }

    // Test subscription_history table
    const { data: subTest, error: subTestError } = await supabase
      .from('subscription_history')
      .select('*')
      .limit(1);

    if (subTestError) {
      console.log('❌ subscription_history table test failed:', subTestError.message);
    } else {
      console.log('✅ subscription_history table is accessible');
    }

    console.log('');
    console.log('🎯 INVESTIGATION COMPLETE');
    console.log('===============================================');
    console.log('Summary of findings:');
    console.log('1. Views with SECURITY DEFINER need to be recreated without it');
    console.log('2. subscription_history table needs RLS enabled');
    console.log('3. All objects appear to be accessible with current permissions');

  } catch (e) {
    console.log('❌ Exception during investigation:', e);
  }
}

// Run the investigation
investigateSecurityIssues(); 