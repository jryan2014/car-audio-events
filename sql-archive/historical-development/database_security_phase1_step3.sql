-- ============================================================================
-- DATABASE SECURITY PHASE 1 - STEP 3
-- ============================================================================
-- Fixing the next batch of 10 SECURITY DEFINER functions
-- Current status: 30 functions remaining (67% complete!)
-- All functions in this batch are SECURITY DEFINER (highest priority)
-- ============================================================================

-- Step 1: Fix the next batch of SECURITY DEFINER functions

-- Navigation and user interface functions
ALTER FUNCTION public.get_navigation_for_membership(
    p_membership_type text, 
    p_subscription_level text, 
    p_user_id uuid
) SET search_path = '';

ALTER FUNCTION public.get_recent_activity(limit_count integer) SET search_path = '';

-- Notification functions
ALTER FUNCTION public.get_unread_notification_count(p_user_id uuid) SET search_path = '';

ALTER FUNCTION public.get_user_notifications(
    p_user_id uuid, 
    p_unread_only boolean, 
    p_limit integer, 
    p_offset integer
) SET search_path = '';

ALTER FUNCTION public.mark_all_notifications_read(p_user_id uuid) SET search_path = '';

ALTER FUNCTION public.mark_notification_read(
    p_notification_id bigint, 
    p_user_id uuid
) SET search_path = '';

-- User activity and stats functions
ALTER FUNCTION public.get_user_activity_feed(
    p_user_id uuid, 
    p_limit integer, 
    p_offset integer
) SET search_path = '';

ALTER FUNCTION public.get_user_competition_stats(user_uuid uuid) SET search_path = '';

-- Core system functions
ALTER FUNCTION public.handle_new_user() SET search_path = '';

ALTER FUNCTION public.log_activity(
    p_activity_type character varying, 
    p_description text, 
    p_metadata jsonb, 
    p_user_id uuid
) SET search_path = '';

-- Step 2: Verification - check remaining count
SELECT 
    'Total functions still needing fix after Step 3:' as status,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NULL;

-- Step 3: Show total progress
SELECT 
    'Total functions now secured:' as status,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NOT NULL;

-- Step 4: Calculate completion percentage
SELECT 
    'Progress Update:' as status,
    ROUND(
        (COUNT(*) FILTER (WHERE proconfig IS NOT NULL) * 100.0) / COUNT(*), 
        1
    ) || '% complete' as completion_percentage
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'); 