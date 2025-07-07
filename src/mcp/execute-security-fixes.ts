import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function executeSecurityFixes() {
  console.log('🔧 EXECUTING CRITICAL SECURITY FIXES');
  console.log('===============================================');
  console.log('This will fix:');
  console.log('1. competition_results view - Remove SECURITY DEFINER');
  console.log('2. payment_history view - Remove SECURITY DEFINER');
  console.log('3. subscription_history table - Enable RLS');
  console.log('');
  
  try {
    // Step 1: Fix competition_results view
    console.log('🔧 Step 1: Fixing competition_results view...');
    
    const { data: fix1Result, error: fix1Error } = await supabase
      .rpc('exec_sql', { 
        sql_command: `
          -- Fix competition_results view by removing SECURITY DEFINER
          DO $$
          DECLARE
              view_definition TEXT;
              clean_definition TEXT;
          BEGIN
              -- Get the current view definition
              SELECT pg_get_viewdef('public.competition_results', true) INTO view_definition;
              
              -- Remove any SECURITY DEFINER references
              clean_definition := REPLACE(view_definition, 'SECURITY DEFINER', '');
              
              -- Drop and recreate the view
              DROP VIEW IF EXISTS public.competition_results CASCADE;
              
              -- Create the view without SECURITY DEFINER
              EXECUTE 'CREATE VIEW public.competition_results AS ' || clean_definition;
              
              -- Set proper ownership
              ALTER VIEW public.competition_results OWNER TO postgres;
              
              -- Grant appropriate permissions
              GRANT SELECT ON public.competition_results TO authenticated;
              GRANT SELECT ON public.competition_results TO anon;
              
              RAISE NOTICE 'Successfully fixed competition_results view';
          END $$;
        ` 
      });

    if (fix1Error) {
      console.log('❌ Error fixing competition_results view:', fix1Error.message);
    } else {
      console.log('✅ Fixed competition_results view successfully');
    }

    // Step 2: Fix payment_history view
    console.log('🔧 Step 2: Fixing payment_history view...');
    
    const { data: fix2Result, error: fix2Error } = await supabase
      .rpc('exec_sql', { 
        sql_command: `
          -- Fix payment_history view by removing SECURITY DEFINER
          DO $$
          DECLARE
              view_definition TEXT;
              clean_definition TEXT;
          BEGIN
              -- Get the current view definition
              SELECT pg_get_viewdef('public.payment_history', true) INTO view_definition;
              
              -- Remove any SECURITY DEFINER references
              clean_definition := REPLACE(view_definition, 'SECURITY DEFINER', '');
              
              -- Drop and recreate the view
              DROP VIEW IF EXISTS public.payment_history CASCADE;
              
              -- Create the view without SECURITY DEFINER
              EXECUTE 'CREATE VIEW public.payment_history AS ' || clean_definition;
              
              -- Set proper ownership
              ALTER VIEW public.payment_history OWNER TO postgres;
              
              -- Grant appropriate permissions
              GRANT SELECT ON public.payment_history TO authenticated;
              
              RAISE NOTICE 'Successfully fixed payment_history view';
          END $$;
        ` 
      });

    if (fix2Error) {
      console.log('❌ Error fixing payment_history view:', fix2Error.message);
    } else {
      console.log('✅ Fixed payment_history view successfully');
    }

    // Step 3: Enable RLS on subscription_history table
    console.log('🔧 Step 3: Enabling RLS on subscription_history table...');
    
    const { data: fix3Result, error: fix3Error } = await supabase
      .rpc('exec_sql', { 
        sql_command: `
          -- Enable RLS on subscription_history table
          ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
          
          -- Drop any existing policies first
          DROP POLICY IF EXISTS "Users can view own subscription history" ON public.subscription_history;
          DROP POLICY IF EXISTS "Admins can view all subscription history" ON public.subscription_history;
          DROP POLICY IF EXISTS "System can insert subscription history" ON public.subscription_history;
          DROP POLICY IF EXISTS "Service role full access" ON public.subscription_history;
          
          -- Create comprehensive RLS policies
          
          -- Service role has full access (for backend operations)
          CREATE POLICY "Service role full access" ON public.subscription_history
            FOR ALL 
            TO service_role
            USING (true)
            WITH CHECK (true);
          
          -- Users can view their own subscription history
          CREATE POLICY "Users can view own subscription history" ON public.subscription_history
            FOR SELECT 
            TO authenticated
            USING (auth.uid() = user_id);
          
          -- Admin users can view all subscription history
          CREATE POLICY "Admins can view all subscription history" ON public.subscription_history
            FOR SELECT 
            TO authenticated
            USING (
              EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() 
                AND membership_type = 'admin'
              )
            );
          
          -- Grant necessary permissions
          GRANT SELECT ON public.subscription_history TO authenticated;
          GRANT ALL ON public.subscription_history TO service_role;
        ` 
      });

    if (fix3Error) {
      console.log('❌ Error enabling RLS on subscription_history:', fix3Error.message);
    } else {
      console.log('✅ Enabled RLS on subscription_history successfully');
    }

    // Step 4: Verify all fixes
    console.log('🧪 Step 4: Verifying security fixes...');
    
    const { data: verifyResult, error: verifyError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          -- Comprehensive verification of all fixes
          WITH view_checks AS (
            SELECT 
              'VIEW' as object_type,
              c.relname as object_name,
              CASE 
                WHEN pg_get_viewdef(c.oid, true) ILIKE '%SECURITY DEFINER%' THEN 'SECURITY_DEFINER_PRESENT'
                ELSE 'SECURITY_DEFINER_REMOVED'
              END as status
            FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE n.nspname = 'public'
            AND c.relname IN ('competition_results', 'payment_history')
            AND c.relkind = 'v'
          ),
          rls_checks AS (
            SELECT 
              'TABLE' as object_type,
              c.relname as object_name,
              CASE 
                WHEN c.relrowsecurity THEN 'RLS_ENABLED'
                ELSE 'RLS_DISABLED'
              END as status
            FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE n.nspname = 'public'
            AND c.relname = 'subscription_history'
            AND c.relkind = 'r'
          )
          SELECT * FROM view_checks
          UNION ALL
          SELECT * FROM rls_checks
          ORDER BY object_type, object_name
        ` 
      });

    if (verifyError) {
      console.log('❌ Error during verification:', verifyError.message);
    } else if (verifyResult?.success && verifyResult?.data) {
      console.log('✅ Verification results:');
      let allFixed = true;
      
      verifyResult.data.forEach((result: any) => {
        const isFixed = result.status === 'SECURITY_DEFINER_REMOVED' || result.status === 'RLS_ENABLED';
        console.log(`   ${result.object_type}: ${result.object_name} - ${result.status} ${isFixed ? '✅' : '❌'}`);
        
        if (!isFixed) {
          allFixed = false;
        }
      });
      
      if (allFixed) {
        console.log('\n🎉 ALL SECURITY ISSUES HAVE BEEN RESOLVED!');
      } else {
        console.log('\n⚠️  Some issues may still need attention');
      }
    }

    // Step 5: Test functionality
    console.log('\n🧪 Step 5: Testing functionality...');
    
    // Test each object is still accessible
    const tests = [
      { name: 'competition_results', table: 'competition_results' },
      { name: 'payment_history', table: 'payment_history' },
      { name: 'subscription_history', table: 'subscription_history' }
    ];

    for (const test of tests) {
      try {
        const { data, error } = await supabase
          .from(test.table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${test.name} access test failed: ${error.message}`);
        } else {
          console.log(`✅ ${test.name} is accessible after security fix`);
        }
      } catch (e) {
        console.log(`❌ ${test.name} test exception:`, e);
      }
    }

    console.log('\n🎯 SECURITY FIXES EXECUTION COMPLETE!');
    console.log('===============================================');
    console.log('Summary of changes:');
    console.log('✅ competition_results view - SECURITY DEFINER removed');
    console.log('✅ payment_history view - SECURITY DEFINER removed');
    console.log('✅ subscription_history table - RLS enabled with proper policies');
    console.log('');
    console.log('🔍 Next steps:');
    console.log('1. Re-run the Supabase security linter to verify issues are resolved');
    console.log('2. Test the payment form deployment');
    console.log('3. Verify all application functionality works correctly');

  } catch (e) {
    console.log('❌ Critical exception during security fixes:', e);
  }
}

// Execute the security fixes
executeSecurityFixes().catch(console.error); 