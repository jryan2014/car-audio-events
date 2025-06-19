-- ============================================================================
-- DATABASE SECURITY PHASE 1 - STEP 4
-- ============================================================================
-- Fixing the next batch of 10 functions (3 SECURITY DEFINER + 7 SECURITY INVOKER)
-- Current status: 75% complete, ~20 functions remaining
-- Target: Push to 85-90% completion
-- ============================================================================

-- Step 1: Fix SECURITY DEFINER functions first (highest priority)

-- Directory and analytics functions
ALTER FUNCTION public.record_listing_view(
    p_listing_id uuid, 
    p_user_id uuid, 
    p_ip_address inet, 
    p_user_agent text, 
    p_referrer character varying
) SET search_path = '';

-- Admin settings function
ALTER FUNCTION public.set_admin_setting(
    setting_key text, 
    setting_value text, 
    is_sensitive_setting boolean, 
    setting_description text
) SET search_path = '';

-- Navigation tracking function
ALTER FUNCTION public.track_navigation_click(
    p_menu_item_id uuid, 
    p_user_id uuid, 
    p_membership_type text, 
    p_action_type text, 
    p_session_id text, 
    p_user_agent text, 
    p_ip_address inet, 
    p_referrer text
) SET search_path = '';

-- Step 2: Fix SECURITY INVOKER functions (trigger and tracking functions)

-- Trigger functions (no parameters)
ALTER FUNCTION public.log_cms_page_activity() SET search_path = '';
ALTER FUNCTION public.log_event_creation() SET search_path = '';
ALTER FUNCTION public.log_team_activity() SET search_path = '';
ALTER FUNCTION public.log_user_registration() SET search_path = '';
ALTER FUNCTION public.trigger_update_listing_rating() SET search_path = '';

-- User trial and tracking functions
ALTER FUNCTION public.start_user_trial(
    p_user_id uuid, 
    p_feature_key character varying, 
    p_trial_days integer
) SET search_path = '';

ALTER FUNCTION public.track_upsell_interaction(
    p_user_id uuid, 
    p_navigation_item_id uuid, 
    p_interaction_type character varying, 
    p_user_membership character varying, 
    p_metadata jsonb
) SET search_path = '';

-- Step 3: Verification - check remaining count
SELECT 
    'Total functions still needing fix after Step 4:' as status,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NULL;

-- Step 4: Show total progress
SELECT 
    'Total functions now secured:' as status,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NOT NULL;

-- Step 5: Calculate completion percentage
SELECT 
    'Progress Update:' as status,
    ROUND(
        (COUNT(*) FILTER (WHERE proconfig IS NOT NULL) * 100.0) / COUNT(*), 
        1
    ) || '% complete' as completion_percentage
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Step 6: Show breakdown by security type
SELECT 
    'SECURITY DEFINER functions secured:' as status,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NOT NULL
AND prosecdef = true;

SELECT 
    'SECURITY INVOKER functions secured:' as status,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NOT NULL
AND prosecdef = false; 