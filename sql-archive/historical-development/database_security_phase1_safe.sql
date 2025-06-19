-- DATABASE SECURITY PHASE 1 - SAFE COMPLETION
-- Dynamically fix search_path for functions that actually exist
-- Risk Level: ZERO - Pure security improvement, no functionality impact
-- Date: 2025-06-17

-- ============================================================================
-- PHASE 1: SAFE FUNCTION SEARCH_PATH FIXES
-- ============================================================================

-- Step 1: Show current status
SELECT 
    'CURRENT STATUS: Functions needing search_path fix' as info,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NULL;

-- Step 2: Fix all functions that exist and need search_path (dynamic approach)
-- This will only attempt to fix functions that actually exist

-- Common functions that typically exist (we'll fix these one by one safely)
DO $$
DECLARE
    func_record RECORD;
    fix_count INTEGER := 0;
BEGIN
    -- Get all functions in public schema that need search_path fix
    FOR func_record IN 
        SELECT 
            proname,
            pg_get_function_identity_arguments(oid) as args
        FROM pg_proc 
        WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND proconfig IS NULL
        AND proname IN (
            'get_logo_settings',
            'log_user_registration', 
            'handle_new_user_registration',
            'get_admin_setting',
            'get_contact_settings',
            'get_stripe_settings',
            'get_email_settings',
            'log_user_activity',
            'get_system_stats',
            'log_event_creation',
            'update_event_stats',
            'log_directory_view',
            'calculate_member_stats',
            'log_page_view',
            'get_dashboard_stats',
            'update_navigation_menu_items_updated_at'
        )
    LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = ''''', 
                          func_record.proname, 
                          func_record.args);
            fix_count := fix_count + 1;
            RAISE NOTICE 'Fixed function: %(%)', func_record.proname, func_record.args;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not fix function % - %', func_record.proname, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Successfully fixed % functions', fix_count;
END $$;

-- Step 3: Verification - show what was fixed
SELECT 
    'AFTER FIX: Functions with search_path configured' as info,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NOT NULL
AND 'search_path=' = ANY(proconfig);

-- Step 4: Show remaining functions that still need fixing
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    'STILL NEEDS FIX' as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NULL
ORDER BY proname;

-- Step 5: Generate ALTER statements for any remaining functions
SELECT 
    'ALTER FUNCTION public.' || proname || '(' || pg_get_function_identity_arguments(oid) || ') SET search_path = '''';' as remaining_fixes
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NULL
ORDER BY proname;

-- ============================================================================
-- COMPLETION CHECK
-- ============================================================================

-- Final verification
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PHASE 1 COMPLETE - All functions secured!'
        ELSE '⚠️ ' || COUNT(*) || ' functions still need search_path fixes'
    END as phase1_status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NULL; 