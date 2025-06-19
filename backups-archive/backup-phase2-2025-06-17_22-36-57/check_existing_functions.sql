-- CHECK EXISTING FUNCTIONS FOR SEARCH_PATH FIXES
-- This script identifies which functions actually exist and need search_path fixes
-- Date: 2025-06-17

-- ============================================================================
-- STEP 1: Check all functions in public schema
-- ============================================================================

SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    array_to_string(proconfig, ',') as current_config,
    CASE 
        WHEN proconfig IS NULL THEN 'NEEDS FIX'
        WHEN 'search_path=' = ANY(proconfig) THEN 'ALREADY FIXED'
        ELSE 'CHECK MANUALLY'
    END as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- ============================================================================
-- STEP 2: Check functions from our target list that actually exist
-- ============================================================================

WITH target_functions AS (
    SELECT unnest(ARRAY[
        'trigger_update_listing_rating',
        'update_member_hierarchy_level',
        'get_logo_settings',
        'update_listing_rating',
        'log_user_registration',
        'record_listing_view',
        'get_directory_stats',
        'update_advertisement_stats',
        'calculate_advertisement_roi',
        'log_activity',
        'get_recent_activity',
        'get_advertisement_metrics',
        'can_manage_team_member',
        'update_navigation_menu_items_updated_at',
        'get_navigation_for_membership',
        'handle_new_user_registration',
        'get_admin_setting',
        'get_contact_settings',
        'get_stripe_settings',
        'get_email_settings',
        'log_user_activity',
        'get_system_stats',
        'track_backup_creation',
        'log_event_creation',
        'update_event_stats',
        'log_directory_view',
        'calculate_member_stats',
        'get_user_analytics',
        'update_user_last_login',
        'get_navigation_analytics',
        'track_advertisement_click',
        'log_page_view',
        'calculate_engagement_metrics',
        'get_dashboard_stats'
    ]) as function_name
)
SELECT 
    tf.function_name,
    CASE 
        WHEN p.proname IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING'
    END as exists_status,
    CASE 
        WHEN p.proname IS NOT NULL AND p.proconfig IS NULL THEN 'NEEDS FIX'
        WHEN p.proname IS NOT NULL AND 'search_path=' = ANY(p.proconfig) THEN 'ALREADY FIXED'
        WHEN p.proname IS NOT NULL THEN 'CHECK MANUALLY'
        ELSE 'N/A'
    END as fix_status,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM target_functions tf
LEFT JOIN pg_proc p ON p.proname = tf.function_name 
    AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY tf.function_name;

-- ============================================================================
-- STEP 3: Generate ALTER statements for functions that actually exist and need fixes
-- ============================================================================

WITH existing_functions AS (
    SELECT 
        proname,
        oid,
        pg_get_function_identity_arguments(oid) as args
    FROM pg_proc 
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND proconfig IS NULL
    AND proname IN (
        'trigger_update_listing_rating',
        'update_member_hierarchy_level',
        'get_logo_settings',
        'update_listing_rating',
        'log_user_registration',
        'record_listing_view',
        'get_directory_stats',
        'update_advertisement_stats',
        'calculate_advertisement_roi',
        'log_activity',
        'get_recent_activity',
        'get_advertisement_metrics',
        'can_manage_team_member',
        'update_navigation_menu_items_updated_at',
        'get_navigation_for_membership',
        'handle_new_user_registration',
        'get_admin_setting',
        'get_contact_settings',
        'get_stripe_settings',
        'get_email_settings',
        'log_user_activity',
        'get_system_stats',
        'track_backup_creation',
        'log_event_creation',
        'update_event_stats',
        'log_directory_view',
        'calculate_member_stats',
        'track_advertisement_click',
        'log_page_view',
        'calculate_engagement_metrics',
        'get_dashboard_stats'
    )
)
SELECT 
    'ALTER FUNCTION public.' || proname || '(' || args || ') SET search_path = '''';' as alter_statement
FROM existing_functions
ORDER BY proname;

-- ============================================================================
-- STEP 4: Count summary
-- ============================================================================

SELECT 
    'Total functions in public schema' as description,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

SELECT 
    'Functions needing search_path fix' as description,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NULL;

SELECT 
    'Functions already with search_path configured' as description,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NOT NULL
AND 'search_path=' = ANY(proconfig); 