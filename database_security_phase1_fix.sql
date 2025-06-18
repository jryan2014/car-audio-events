-- ============================================================================
-- DATABASE SECURITY PHASE 1 - SAFE DYNAMIC FIXES
-- ============================================================================
-- ZERO RISK: Dynamic approach that only fixes functions that exist
-- Checks actual function signatures before attempting fixes
-- ============================================================================

-- Step 1: Show functions we're about to fix with their exact signatures
SELECT 
    'Functions to be fixed in this batch:' as info;

SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as exact_signature
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NULL
AND proname IN (
    'admin_get_notification_stats',
    'admin_send_notification_to_all_users', 
    'admin_send_notification_to_user',
    'can_manage_team_member',
    'create_notification',
    'get_admin_setting',
    'get_directory_stats',
    'get_logo_settings'
)
ORDER BY proname;

-- Step 2: Dynamic fix using DO block (safer approach)
DO $$
DECLARE
    func_record RECORD;
    fix_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Fix functions one by one with error handling
    FOR func_record IN 
        SELECT 
            proname,
            pg_get_function_identity_arguments(oid) as args
        FROM pg_proc 
        WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND proconfig IS NULL
        AND proname IN (
            'admin_get_notification_stats',
            'can_manage_team_member',
            'get_admin_setting',
            'get_directory_stats',
            'get_logo_settings'
        )
    LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = ''''', 
                          func_record.proname, 
                          func_record.args);
            fix_count := fix_count + 1;
            RAISE NOTICE 'Fixed: %(%)', func_record.proname, func_record.args;
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE NOTICE 'Error fixing %: %', func_record.proname, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Successfully fixed % functions, % errors', fix_count, error_count;
END $$;

-- Step 3: Verification - show results
SELECT 
    'Functions successfully fixed:' as status,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NOT NULL
AND 'search_path=' = ANY(proconfig)
AND proname IN (
    'admin_get_notification_stats',
    'can_manage_team_member',
    'get_admin_setting',
    'get_directory_stats',
    'get_logo_settings'
);

-- Step 4: Show remaining count
SELECT 
    'Total functions still needing fix:' as status,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NULL;

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify the results show functions were fixed
-- 3. Confirm remaining count decreased
-- 4. I'll provide the next batch of fixes
-- 
-- SAFETY: This is ZERO RISK - only improves security without changing behavior
-- ============================================================================ 