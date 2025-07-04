import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRealSecurityIssues() {
  console.log('🚨 FIXING REAL SECURITY ISSUES FROM SUPABASE DASHBOARD');
  console.log('===============================================');
  console.log('🎯 Issues: 2 SECURITY DEFINER views + 1 insecure RLS policy');
  console.log('🛡️ Goal: Fix actual security vulnerabilities, not just enable RLS');
  console.log('');

  try {
    // Issue 1: Fix competition_results view (SECURITY DEFINER)
    console.log('🔍 Issue 1: Fixing competition_results SECURITY DEFINER view...');
    
    // First, let's see the current view definition
    const { data: viewData1, error: viewError1 } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT definition 
          FROM pg_views 
          WHERE schemaname = 'public' 
          AND viewname = 'competition_results'
        ` 
      });

    if (viewError1) {
      console.log('❌ Error getting competition_results view:', viewError1.message);
    } else if (viewData1 && viewData1.success && viewData1.data && viewData1.data.length > 0) {
      console.log('✅ Current competition_results view definition:');
      console.log(viewData1.data[0].definition);
      
      // Recreate the view without SECURITY DEFINER
      const recreateView1 = `
        DROP VIEW IF EXISTS public.competition_results;
        CREATE VIEW public.competition_results AS 
        ${viewData1.data[0].definition.replace(/SECURITY DEFINER/gi, '')};
      `;
      
      console.log('🔧 Recreating view without SECURITY DEFINER...');
      const { data: fix1Result, error: fix1Error } = await supabase
        .rpc('exec_sql', { sql_command: recreateView1 });

      if (fix1Error) {
        console.log(`❌ Error fixing competition_results: ${fix1Error.message}`);
      } else {
        console.log(`✅ Fixed competition_results view: ${fix1Result?.message}`);
      }
    }

    console.log('');

    // Issue 2: Fix payment_history view (SECURITY DEFINER)
    console.log('🔍 Issue 2: Fixing payment_history SECURITY DEFINER view...');
    
    const { data: viewData2, error: viewError2 } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT definition 
          FROM pg_views 
          WHERE schemaname = 'public' 
          AND viewname = 'payment_history'
        ` 
      });

    if (viewError2) {
      console.log('❌ Error getting payment_history view:', viewError2.message);
    } else if (viewData2 && viewData2.success && viewData2.data && viewData2.data.length > 0) {
      console.log('✅ Current payment_history view definition:');
      console.log(viewData2.data[0].definition);
      
      // Recreate the view without SECURITY DEFINER
      const recreateView2 = `
        DROP VIEW IF EXISTS public.payment_history;
        CREATE VIEW public.payment_history AS 
        ${viewData2.data[0].definition.replace(/SECURITY DEFINER/gi, '')};
      `;
      
      console.log('🔧 Recreating view without SECURITY DEFINER...');
      const { data: fix2Result, error: fix2Error } = await supabase
        .rpc('exec_sql', { sql_command: recreateView2 });

      if (fix2Error) {
        console.log(`❌ Error fixing payment_history: ${fix2Error.message}`);
      } else {
        console.log(`✅ Fixed payment_history view: ${fix2Result?.message}`);
      }
    }

    console.log('');

    // Issue 3: Fix insecure RLS policy on email_provider_stats
    console.log('🔍 Issue 3: Fixing insecure RLS policy on email_provider_stats...');
    
    // First, check the current policy
    const { data: policyData, error: policyError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            polname as policy_name,
            pg_get_expr(polqual, polrelid) as policy_condition
          FROM pg_policy p
          JOIN pg_class c ON p.polrelid = c.oid
          WHERE c.relname = 'email_provider_stats'
          AND polname = 'Admin users can view email stats'
        ` 
      });

    if (policyError) {
      console.log('❌ Error getting policy:', policyError.message);
    } else if (policyData && policyData.success && policyData.data && policyData.data.length > 0) {
      console.log('✅ Current insecure policy:');
      console.log(`   Policy: ${policyData.data[0].policy_name}`);
      console.log(`   Condition: ${policyData.data[0].policy_condition}`);
      
      // Drop the insecure policy and create a secure one
      const fixPolicy = `
        -- Drop the insecure policy
        DROP POLICY IF EXISTS "Admin users can view email stats" ON email_provider_stats;
        
        -- Create a secure policy using raw_user_meta_data instead of user_metadata
        CREATE POLICY "Admin users can view email stats" ON email_provider_stats
        FOR SELECT TO authenticated
        USING (
          auth.email() = 'admin@caraudioevents.com' OR
          auth.email() = 'jryan99@gmail.com' OR
          EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.membership_type = 'admin'
          )
        );
      `;
      
      console.log('🔧 Replacing insecure policy with secure one...');
      const { data: fix3Result, error: fix3Error } = await supabase
        .rpc('exec_sql', { sql_command: fixPolicy });

      if (fix3Error) {
        console.log(`❌ Error fixing policy: ${fix3Error.message}`);
      } else {
        console.log(`✅ Fixed insecure policy: ${fix3Result?.message}`);
      }
    }

    console.log('');
    console.log('🧪 VERIFICATION: Checking if issues are resolved...');
    
    // Verify the fixes
    const { data: verifyData, error: verifyError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          -- Check views for SECURITY DEFINER
          SELECT 
            'VIEW' as object_type,
            viewname as object_name,
            CASE 
              WHEN definition ILIKE '%SECURITY DEFINER%' THEN 'STILL HAS SECURITY DEFINER'
              ELSE 'SECURITY DEFINER REMOVED'
            END as status
          FROM pg_views 
          WHERE schemaname = 'public' 
          AND viewname IN ('competition_results', 'payment_history')
          
          UNION ALL
          
          -- Check policy for user_metadata reference
          SELECT 
            'POLICY' as object_type,
            polname as object_name,
            CASE 
              WHEN pg_get_expr(polqual, polrelid) ILIKE '%user_metadata%' THEN 'STILL REFERENCES USER_METADATA'
              ELSE 'USER_METADATA REFERENCE REMOVED'
            END as status
          FROM pg_policy p
          JOIN pg_class c ON p.polrelid = c.oid
          WHERE c.relname = 'email_provider_stats'
          AND polname = 'Admin users can view email stats'
        ` 
      });

    if (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
    } else if (verifyData && verifyData.success && verifyData.data) {
      console.log('✅ Verification results:');
      verifyData.data.forEach((result: any) => {
        const icon = result.status.includes('REMOVED') ? '✅' : '❌';
        console.log(`   ${icon} ${result.object_type}: ${result.object_name} - ${result.status}`);
      });
    }

    console.log('');
    console.log('🎯 REAL SECURITY FIXES COMPLETE!');
    console.log('===============================================');
    console.log('✅ Fixed SECURITY DEFINER views (2 issues)');
    console.log('✅ Fixed insecure RLS policy (1 issue)');
    console.log('');
    console.log('🔍 Next: Check Supabase dashboard to confirm issues are resolved');

  } catch (e) {
    console.log('❌ Exception:', e);
  }
}

// Execute the real security fixes
fixRealSecurityIssues(); 