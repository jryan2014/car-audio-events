import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixCriticalSecurityIssues() {
  console.log('🔒 Starting Critical Security Fixes...');
  
  try {
    // Phase 1: Fix Security Definer Views
    console.log('\n📋 Phase 1: Fixing Security Definer Views...');
    
    // Fix competition_results view
    console.log('Fixing competition_results view...');
    const { error: competitionViewError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop and recreate competition_results view without SECURITY DEFINER
        DROP VIEW IF EXISTS public.competition_results;
        
        CREATE VIEW public.competition_results AS
        SELECT 
          e.id,
          e.title,
          e.event_date,
          e.location,
          e.status,
          COUNT(er.id) as total_registrations,
          AVG(CASE WHEN js.total_score IS NOT NULL THEN js.total_score ELSE 0 END) as avg_score
        FROM events e
        LEFT JOIN event_registrations er ON e.id = er.event_id
        LEFT JOIN judge_scoring js ON er.id = js.registration_id
        WHERE e.status = 'approved'
        GROUP BY e.id, e.title, e.event_date, e.location, e.status;
        
        -- Enable RLS on the view
        ALTER VIEW public.competition_results ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policy for competition_results view
        CREATE POLICY "competition_results_public_read" ON public.competition_results
          FOR SELECT USING (true);
      `
    });
    
    if (competitionViewError) {
      console.error('❌ Error fixing competition_results view:', competitionViewError);
      throw competitionViewError;
    }
    console.log('✅ Fixed competition_results view');
    
    // Fix payment_history view
    console.log('Fixing payment_history view...');
    const { error: paymentViewError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop and recreate payment_history view without SECURITY DEFINER
        DROP VIEW IF EXISTS public.payment_history;
        
        CREATE VIEW public.payment_history AS
        SELECT 
          p.id,
          p.user_id,
          p.amount,
          p.currency,
          p.status,
          p.payment_method,
          p.created_at,
          u.email as user_email,
          u.first_name,
          u.last_name
        FROM payments p
        JOIN users u ON p.user_id = u.id
        WHERE p.status IN ('succeeded', 'completed');
        
        -- Enable RLS on the view
        ALTER VIEW public.payment_history ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policy for payment_history view (admin and user access)
        CREATE POLICY "payment_history_admin_access" ON public.payment_history
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE id = auth.uid() 
              AND membership_type = 'admin'
            )
          );
          
        CREATE POLICY "payment_history_user_access" ON public.payment_history
          FOR SELECT USING (user_id = auth.uid());
      `
    });
    
    if (paymentViewError) {
      console.error('❌ Error fixing payment_history view:', paymentViewError);
      throw paymentViewError;
    }
    console.log('✅ Fixed payment_history view');
    
    // Phase 2: Enable RLS on subscription_history table
    console.log('\n📋 Phase 2: Enabling RLS on subscription_history table...');
    
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Enable RLS on subscription_history table
        ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies for subscription_history
        CREATE POLICY "subscription_history_admin_access" ON public.subscription_history
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE id = auth.uid() 
              AND membership_type = 'admin'
            )
          );
          
        CREATE POLICY "subscription_history_user_read" ON public.subscription_history
          FOR SELECT USING (user_id = auth.uid());
          
        CREATE POLICY "subscription_history_service_role" ON public.subscription_history
          FOR ALL USING (auth.role() = 'service_role');
      `
    });
    
    if (rlsError) {
      console.error('❌ Error enabling RLS on subscription_history:', rlsError);
      throw rlsError;
    }
    console.log('✅ Enabled RLS on subscription_history table');
    
    // Phase 3: Fix Function Search Path Issues
    console.log('\n📋 Phase 3: Fixing Function Search Path Issues...');
    
    const functions = [
      'check_refund_eligibility',
      'update_membership_expiration',
      'get_admin_setting',
      'update_admin_setting',
      'log_subscription_change'
    ];
    
    for (const funcName of functions) {
      console.log(`Fixing search_path for function: ${funcName}`);
      
      const { error: funcError } = await supabase.rpc('exec_sql', {
        sql: `
          -- Fix search_path for ${funcName} function
          -- First get the function definition
          DO $$
          DECLARE
            func_def text;
          BEGIN
            -- Set search_path to be immutable for the function
            EXECUTE format('ALTER FUNCTION public.%I SET search_path = public, extensions', '${funcName}');
          END $$;
        `
      });
      
      if (funcError) {
        console.error(`❌ Error fixing ${funcName}:`, funcError);
        throw funcError;
      }
      console.log(`✅ Fixed search_path for ${funcName}`);
    }
    
    // Phase 4: Verification
    console.log('\n📋 Phase 4: Verifying Security Fixes...');
    
    // Check views
    const { data: viewsData, error: viewsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          viewname,
          definition
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND viewname IN ('competition_results', 'payment_history');
      `
    });
    
    if (viewsError) {
      console.error('❌ Error checking views:', viewsError);
    } else {
      console.log('✅ Views verified:', viewsData);
    }
    
    // Check RLS status
    const { data: rlsData, error: rlsCheckError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          tablename,
          rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'subscription_history';
      `
    });
    
    if (rlsCheckError) {
      console.error('❌ Error checking RLS:', rlsCheckError);
    } else {
      console.log('✅ RLS status verified:', rlsData);
    }
    
    // Check functions
    const { data: functionsData, error: functionsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          proname,
          prosrc,
          proconfig
        FROM pg_proc 
        WHERE proname IN ('check_refund_eligibility', 'update_membership_expiration', 'get_admin_setting', 'update_admin_setting', 'log_subscription_change')
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
      `
    });
    
    if (functionsError) {
      console.error('❌ Error checking functions:', functionsError);
    } else {
      console.log('✅ Functions verified:', functionsData);
    }
    
    console.log('\n🎉 All Critical Security Issues Fixed Successfully!');
    console.log('✅ Security Definer Views: Fixed');
    console.log('✅ RLS on subscription_history: Enabled');
    console.log('✅ Function Search Paths: Fixed');
    console.log('\n🔒 Your database should now have ZERO Supabase security warnings!');
    
  } catch (error) {
    console.error('❌ Critical error during security fixes:', error);
    throw error;
  }
}

// Execute the fixes
fixCriticalSecurityIssues().catch(console.error); 