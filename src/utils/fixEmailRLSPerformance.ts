import { supabase } from '../lib/supabase';

export async function fixEmailRLSPerformance() {
  try {
    const migration = `
      -- Fix RLS performance warnings for email routing tables
      -- Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation for each row
      -- This addresses Supabase Performance Advisor warnings

      -- =====================================================
      -- STEP 1: Fix email_routing_rules policies
      -- =====================================================

      -- Drop existing policies
      DROP POLICY IF EXISTS "Admin can manage email routing rules" ON email_routing_rules;
      DROP POLICY IF EXISTS "Admins can manage email routing rules" ON email_routing_rules;
      DROP POLICY IF EXISTS "admin_all" ON email_routing_rules;
      DROP POLICY IF EXISTS "Users can view email routing rules" ON email_routing_rules;

      -- Create optimized policy using subquery for auth.uid()
      CREATE POLICY "Admin can manage email routing rules" ON email_routing_rules
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = (SELECT auth.uid()) 
            AND users.membership_type = 'admin'
            AND users.status = 'active'
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = (SELECT auth.uid()) 
            AND users.membership_type = 'admin'
            AND users.status = 'active'
          )
        );

      -- =====================================================
      -- STEP 2: Fix email_providers policies  
      -- =====================================================

      -- Drop existing policies
      DROP POLICY IF EXISTS "Admin can manage email providers" ON email_providers;
      DROP POLICY IF EXISTS "Admins can manage email providers" ON email_providers;
      DROP POLICY IF EXISTS "admin_all" ON email_providers;
      DROP POLICY IF EXISTS "Users can view email providers" ON email_providers;

      -- Create optimized policy using subquery for auth.uid()
      CREATE POLICY "Admin can manage email providers" ON email_providers
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = (SELECT auth.uid()) 
            AND users.membership_type = 'admin'
            AND users.status = 'active'
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = (SELECT auth.uid()) 
            AND users.membership_type = 'admin'
            AND users.status = 'active'
          )
        );

      -- =====================================================
      -- STEP 3: Fix email_addresses policies
      -- =====================================================

      -- Drop existing policies  
      DROP POLICY IF EXISTS "Admin can manage email addresses" ON email_addresses;
      DROP POLICY IF EXISTS "Admins can manage email addresses" ON email_addresses;
      DROP POLICY IF EXISTS "admin_all" ON email_addresses;
      DROP POLICY IF EXISTS "Users can view email addresses" ON email_addresses;

      -- Create optimized policy using subquery for auth.uid()
      CREATE POLICY "Admin can manage email addresses" ON email_addresses
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = (SELECT auth.uid()) 
            AND users.membership_type = 'admin'
            AND users.status = 'active'
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = (SELECT auth.uid()) 
            AND users.membership_type = 'admin'
            AND users.status = 'active'
          )
        );

      -- Add read-only access for authenticated users to view email addresses
      CREATE POLICY "Users can view email addresses" ON email_addresses
        FOR SELECT TO authenticated
        USING ((SELECT auth.uid()) IS NOT NULL);

      -- =====================================================
      -- STEP 4: Grant necessary table permissions
      -- =====================================================

      GRANT SELECT ON email_routing_rules TO authenticated;
      GRANT SELECT ON email_providers TO authenticated; 
      GRANT SELECT ON email_addresses TO authenticated;

      -- Grant to anon for public visibility if needed
      GRANT SELECT ON email_addresses TO anon;

      -- =====================================================
      -- STEP 5: Add performance monitoring
      -- =====================================================

      -- Function to check if email policies are optimized
      CREATE OR REPLACE FUNCTION check_email_policy_optimization()
      RETURNS TABLE (
        table_name text,
        policy_name text,
        uses_subquery boolean,
        performance_status text
      )
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      SET search_path = 'public', 'pg_catalog', 'pg_temp'
      AS $$
        SELECT 
          p.tablename::text,
          p.policyname::text,
          (p.qual LIKE '%(SELECT auth.uid())%' OR p.with_check LIKE '%(SELECT auth.uid())%')::boolean,
          CASE 
            WHEN p.qual LIKE '%(SELECT auth.uid())%' OR p.with_check LIKE '%(SELECT auth.uid())%' THEN 'OPTIMIZED'
            WHEN p.qual LIKE '%auth.uid()%' AND p.qual NOT LIKE '%(SELECT auth.uid())%' THEN 'NEEDS_OPTIMIZATION' 
            ELSE 'OK'
          END::text
        FROM pg_policies p
        WHERE p.schemaname = 'public'
          AND p.tablename IN ('email_routing_rules', 'email_providers', 'email_addresses')
        ORDER BY p.tablename, p.policyname;
      $$;

      GRANT EXECUTE ON FUNCTION check_email_policy_optimization() TO authenticated;
    `;

    // Execute the migration using exec_sql RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_command: migration
    });

    if (error) {
      console.error('Email RLS Performance Fix error:', error);
      return { success: false, error: error.message };
    }

    // Now check the optimization status
    const { data: checkData, error: checkError } = await supabase.rpc('check_email_policy_optimization');
    
    if (checkError) {
      console.warn('Could not verify optimization status:', checkError);
    } else {
      console.log('Email Policy Optimization Status:', checkData);
    }

    console.log('Email RLS performance optimization applied successfully');
    return { 
      success: true, 
      message: 'Email RLS performance optimization applied successfully', 
      result: data,
      optimizationCheck: checkData
    };

  } catch (error) {
    console.error('Function error:', error);
    return { success: false, error: error.message };
  }
}

// Run if this file is directly executed
if (import.meta.url === new URL(import.meta.url).href) {
  fixEmailRLSPerformance().then(result => {
    console.log(result);
  });
}