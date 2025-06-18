-- ============================================================================
-- DATABASE SECURITY PHASE 1 - STEP 2
-- ============================================================================
-- Fixing the next batch of functions with correct signatures
-- Current status: 40 functions remaining after Step 1 success
-- ============================================================================

-- Step 1: Fix the next batch of functions with exact signatures
-- Prioritizing SECURITY DEFINER functions first

-- Notification functions (SECURITY DEFINER - highest priority)
ALTER FUNCTION public.admin_send_notification_to_all_users(
    notification_type_name text, 
    notification_title text, 
    notification_message text, 
    action_url text, 
    notification_metadata jsonb, 
    notification_priority integer, 
    expires_in_days integer
) SET search_path = '';

ALTER FUNCTION public.admin_send_notification_to_user(
    target_user_id uuid, 
    notification_type_name text, 
    notification_title text, 
    notification_message text, 
    action_url text, 
    notification_metadata jsonb, 
    notification_priority integer, 
    expires_in_days integer
) SET search_path = '';

ALTER FUNCTION public.create_notification(
    p_user_id uuid, 
    p_notification_type text, 
    p_title text, 
    p_message text, 
    p_action_url text, 
    p_metadata jsonb, 
    p_priority integer, 
    p_expires_at timestamp with time zone
) SET search_path = '';

ALTER FUNCTION public.create_user_activity(
    p_user_id uuid, 
    p_activity_type text, 
    p_title text, 
    p_description text, 
    p_metadata jsonb, 
    p_entity_type text, 
    p_entity_id text, 
    p_is_public boolean
) SET search_path = '';

ALTER FUNCTION public.dismiss_notification(
    p_notification_id bigint, 
    p_user_id uuid
) SET search_path = '';

ALTER FUNCTION public.duplicate_navigation_context(
    p_source_context text, 
    p_target_context text, 
    p_created_by uuid
) SET search_path = '';

ALTER FUNCTION public.get_community_activity_feed(
    p_limit integer, 
    p_offset integer
) SET search_path = '';

-- Analytics functions (SECURITY INVOKER - lower priority but still important)
ALTER FUNCTION public.calculate_advertisement_roi(ad_id uuid) SET search_path = '';

ALTER FUNCTION public.calculate_competition_results(
    p_event_id integer, 
    p_category text
) SET search_path = '';

ALTER FUNCTION public.get_advertisement_metrics(
    ad_id uuid, 
    start_date date, 
    end_date date
) SET search_path = '';

-- Step 2: Verification - check results
SELECT 
    'Functions fixed in Step 2:' as status,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NOT NULL
AND 'search_path=' = ANY(proconfig)
AND proname IN (
    'admin_send_notification_to_all_users',
    'admin_send_notification_to_user',
    'create_notification',
    'create_user_activity',
    'dismiss_notification',
    'duplicate_navigation_context',
    'get_community_activity_feed',
    'calculate_advertisement_roi',
    'calculate_competition_results',
    'get_advertisement_metrics'
);

-- Step 3: Show total remaining functions
SELECT 
    'Total functions still needing fix:' as status,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NULL;

-- Step 4: Show progress
SELECT 
    'Total functions now secured:' as status,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NOT NULL
AND 'search_path=' = ANY(proconfig); 