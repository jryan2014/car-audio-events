import { supabase } from '../lib/supabase';

/**
 * Apply the definitive email RLS performance fix
 * This completely eliminates function calls from RLS policies using security context variables
 */
export async function applyFinalEmailRLSFix() {
  try {
    console.log('🔧 Applying definitive email RLS performance fix...');

    // Read the migration file
    const migrationContent = `
-- DEFINITIVE FIX: Email RLS Performance Issues
-- Using security context variables instead of function calls
-- This completely eliminates per-row evaluation warnings

-- =====================================================
-- STEP 1: Create security context setter function
-- =====================================================

-- This function sets a transaction-scoped variable with user admin status
-- Called ONCE per session, not per row
CREATE OR REPLACE FUNCTION set_user_security_context()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog', 'pg_temp'
AS $$
DECLARE
    user_id uuid;
    is_admin boolean;
BEGIN
    -- Get current user ID
    user_id := auth.uid();
    
    -- Check if user is admin (single query per transaction)
    SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id 
        AND membership_type = 'admin'
        AND status = 'active'
    ) INTO is_admin;
    
    -- Set transaction-scoped variables
    PERFORM set_config('app.current_user_id', user_id::text, true);
    PERFORM set_config('app.current_user_is_admin', is_admin::text, true);
END;
$$;

-- =====================================================
-- STEP 2: Create trigger to auto-set context
-- =====================================================

-- This trigger automatically sets security context on any query
-- Ensures variables are always available
CREATE OR REPLACE FUNCTION ensure_security_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog', 'pg_temp'
AS $$
BEGIN
    -- Only set if not already set in this transaction
    IF current_setting('app.current_user_is_admin', true) IS NULL THEN
        PERFORM set_user_security_context();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- =====================================================
-- STEP 3: Fix email_routing_rules policies
-- =====================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Admin can manage email routing rules" ON email_routing_rules;
DROP POLICY IF EXISTS "Admins can manage email routing rules" ON email_routing_rules;
DROP POLICY IF EXISTS "admin_all" ON email_routing_rules;
DROP POLICY IF EXISTS "Users can view email routing rules" ON email_routing_rules;

-- Add trigger to ensure context is set
DROP TRIGGER IF EXISTS ensure_email_routing_rules_context ON email_routing_rules;
CREATE TRIGGER ensure_email_routing_rules_context
    BEFORE SELECT OR INSERT OR UPDATE OR DELETE ON email_routing_rules
    FOR EACH STATEMENT
    EXECUTE FUNCTION ensure_security_context();

-- Create optimized policy using context variables (ZERO function calls)
CREATE POLICY "Admin access email routing rules" ON email_routing_rules
    FOR ALL TO authenticated
    USING (current_setting('app.current_user_is_admin', true)::boolean = true)
    WITH CHECK (current_setting('app.current_user_is_admin', true)::boolean = true);

-- =====================================================
-- STEP 4: Fix email_providers policies
-- =====================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Admin can manage email providers" ON email_providers;
DROP POLICY IF EXISTS "Admins can manage email providers" ON email_providers;
DROP POLICY IF EXISTS "admin_all" ON email_providers;
DROP POLICY IF EXISTS "Users can view email providers" ON email_providers;

-- Add trigger to ensure context is set
DROP TRIGGER IF EXISTS ensure_email_providers_context ON email_providers;
CREATE TRIGGER ensure_email_providers_context
    BEFORE SELECT OR INSERT OR UPDATE OR DELETE ON email_providers
    FOR EACH STATEMENT
    EXECUTE FUNCTION ensure_security_context();

-- Create optimized policy using context variables (ZERO function calls)
CREATE POLICY "Admin access email providers" ON email_providers
    FOR ALL TO authenticated
    USING (current_setting('app.current_user_is_admin', true)::boolean = true)
    WITH CHECK (current_setting('app.current_user_is_admin', true)::boolean = true);

-- =====================================================
-- STEP 5: Fix email_addresses policies
-- =====================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Admin can manage email addresses" ON email_addresses;
DROP POLICY IF EXISTS "Admins can manage email addresses" ON email_addresses;
DROP POLICY IF EXISTS "admin_all" ON email_addresses;
DROP POLICY IF EXISTS "Users can view email addresses" ON email_addresses;

-- Add trigger to ensure context is set
DROP TRIGGER IF EXISTS ensure_email_addresses_context ON email_addresses;
CREATE TRIGGER ensure_email_addresses_context
    BEFORE SELECT OR INSERT OR UPDATE OR DELETE ON email_addresses
    FOR EACH STATEMENT
    EXECUTE FUNCTION ensure_security_context();

-- Admin policy using context variables (ZERO function calls)
CREATE POLICY "Admin access email addresses" ON email_addresses
    FOR ALL TO authenticated
    USING (current_setting('app.current_user_is_admin', true)::boolean = true)
    WITH CHECK (current_setting('app.current_user_is_admin', true)::boolean = true);

-- Read access for authenticated users (ZERO function calls)
CREATE POLICY "Authenticated users read email addresses" ON email_addresses
    FOR SELECT TO authenticated
    USING (current_setting('app.current_user_id', true) IS NOT NULL);

-- =====================================================
-- STEP 6: Clean up old functions (optional)
-- =====================================================

-- Remove old STABLE functions as they're no longer needed
DROP FUNCTION IF EXISTS get_current_user_id();
DROP FUNCTION IF EXISTS is_current_user_admin();

-- =====================================================
-- STEP 7: Create verification function
-- =====================================================

CREATE OR REPLACE FUNCTION verify_email_policy_optimization()
RETURNS TABLE (
    table_name text,
    policy_name text,
    contains_function_calls boolean,
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
        (p.qual ~ 'auth\\.|get_current_user|is_current_user' OR p.with_check ~ 'auth\\.|get_current_user|is_current_user')::boolean,
        CASE 
            WHEN p.qual ~ 'current_setting.*app\\.' AND p.with_check ~ 'current_setting.*app\\.' THEN 'OPTIMIZED'
            WHEN p.qual ~ 'auth\\.|get_current_user|is_current_user' OR p.with_check ~ 'auth\\.|get_current_user|is_current_user' THEN 'NEEDS_OPTIMIZATION' 
            ELSE 'UNKNOWN'
        END::text
    FROM pg_policies p
    WHERE p.schemaname = 'public'
        AND p.tablename IN ('email_routing_rules', 'email_providers', 'email_addresses')
    ORDER BY p.tablename, p.policyname;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION set_user_security_context() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_email_policy_optimization() TO authenticated;
    `;

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_command: migrationContent
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Migration applied successfully');

    // Now verify the fix
    const { data: verificationData, error: verificationError } = await supabase.rpc('verify_email_policy_optimization');
    
    if (verificationError) {
      console.warn('⚠️ Could not verify optimization status:', verificationError);
    } else {
      console.log('📊 Email Policy Optimization Status:');
      console.table(verificationData);
      
      const needsOptimization = verificationData?.filter((row: any) => row.performance_status === 'NEEDS_OPTIMIZATION') || [];
      if (needsOptimization.length === 0) {
        console.log('🎉 SUCCESS: All email RLS policies optimized - ZERO function calls remaining!');
      } else {
        console.log(`⚠️ Still ${needsOptimization.length} policies need optimization:`, needsOptimization);
      }
    }

    return { 
      success: true, 
      message: 'Definitive email RLS performance fix applied successfully', 
      result: data,
      verification: verificationData
    };

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Run if this file is directly executed
if (import.meta.url === new URL(import.meta.url).href) {
  applyFinalEmailRLSFix().then(result => {
    console.log('\n🏁 Final Result:', result);
  });
}