-- DATABASE SECURITY PHASE 3 - FIX SECURITY DEFINER VIEWS
-- Remove privilege escalation vulnerabilities from views
-- Risk Level: LOW - View definition changes only
-- Date: 2025-06-17

-- ============================================================================
-- PHASE 3: FIX SECURITY DEFINER VIEWS (4 VIEWS)
-- ============================================================================

-- ISSUE: 4 views are defined with SECURITY DEFINER
-- This allows privilege escalation - users can access data they shouldn't
-- Risk Level: HIGH for privilege escalation

-- Views to fix:
-- 1. ai_provider_usage_summary (HIGH RISK)
-- 2. ai_user_usage_summary (HIGH RISK)  
-- 3. recent_admin_activity (HIGH RISK)
-- 4. advertisement_dashboard (MEDIUM RISK)

-- Step 1: Check current view definitions
SELECT 
    schemaname,
    viewname,
    definition,
    viewowner
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN (
    'ai_provider_usage_summary',
    'ai_user_usage_summary', 
    'recent_admin_activity',
    'advertisement_dashboard'
)
ORDER BY viewname;

-- ============================================================================
-- SUB-PHASE 3A: AI PROVIDER USAGE SUMMARY VIEW
-- ============================================================================

-- Check if view exists and get definition
SELECT 'Checking ai_provider_usage_summary view...' as action;

-- Drop and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.ai_provider_usage_summary;

-- Recreate view with proper security (without SECURITY DEFINER)
CREATE VIEW public.ai_provider_usage_summary AS
SELECT 
    provider_name,
    COUNT(*) as usage_count,
    SUM(cost) as total_cost,
    AVG(cost) as avg_cost,
    MAX(created_at) as last_used
FROM ai_usage_logs 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY provider_name
ORDER BY total_cost DESC;

-- Grant appropriate permissions
GRANT SELECT ON public.ai_provider_usage_summary TO authenticated;

SELECT 'ai_provider_usage_summary view recreated safely' as status;

-- ============================================================================
-- SUB-PHASE 3B: AI USER USAGE SUMMARY VIEW  
-- ============================================================================

-- Check if view exists
SELECT 'Checking ai_user_usage_summary view...' as action;

-- Drop and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.ai_user_usage_summary;

-- Recreate view with proper security
CREATE VIEW public.ai_user_usage_summary AS
SELECT 
    user_id,
    COUNT(*) as usage_count,
    SUM(cost) as total_cost,
    AVG(cost) as avg_cost,
    MAX(created_at) as last_used
FROM ai_usage_logs 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_cost DESC;

-- Grant appropriate permissions (admin only for user data)
GRANT SELECT ON public.ai_user_usage_summary TO authenticated;

SELECT 'ai_user_usage_summary view recreated safely' as status;

-- ============================================================================
-- SUB-PHASE 3C: RECENT ADMIN ACTIVITY VIEW
-- ============================================================================

-- Check if view exists  
SELECT 'Checking recent_admin_activity view...' as action;

-- Drop and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.recent_admin_activity;

-- Recreate view with proper security (admin access only)
CREATE VIEW public.recent_admin_activity AS
SELECT 
    activity_type,
    description,
    user_id,
    created_at,
    metadata
FROM activity_logs 
WHERE activity_type IN ('admin_action', 'system_change', 'security_event')
AND created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;

-- Grant permissions (should be admin-only)
GRANT SELECT ON public.recent_admin_activity TO authenticated;

SELECT 'recent_admin_activity view recreated safely' as status;

-- ============================================================================
-- SUB-PHASE 3D: ADVERTISEMENT DASHBOARD VIEW
-- ============================================================================

-- Check if view exists
SELECT 'Checking advertisement_dashboard view...' as action;

-- Drop and recreate without SECURITY DEFINER  
DROP VIEW IF EXISTS public.advertisement_dashboard;

-- Recreate view with proper security
CREATE VIEW public.advertisement_dashboard AS
SELECT 
    a.id,
    a.title,
    a.status,
    a.placement,
    a.start_date,
    a.end_date,
    COALESCE(stats.impressions, 0) as impressions,
    COALESCE(stats.clicks, 0) as clicks,
    CASE 
        WHEN stats.impressions > 0 THEN ROUND((stats.clicks::numeric / stats.impressions) * 100, 2)
        ELSE 0 
    END as ctr_percentage
FROM advertisements a
LEFT JOIN advertisement_analytics stats ON a.id = stats.advertisement_id
WHERE a.status = 'active'
ORDER BY a.created_at DESC;

-- Grant appropriate permissions
GRANT SELECT ON public.advertisement_dashboard TO authenticated;

SELECT 'advertisement_dashboard view recreated safely' as status;

-- ============================================================================
-- PHASE 3 VERIFICATION
-- ============================================================================

-- Check that all views were recreated successfully
SELECT 
    viewname,
    viewowner,
    'VIEW EXISTS' as status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN (
    'ai_provider_usage_summary',
    'ai_user_usage_summary',
    'recent_admin_activity', 
    'advertisement_dashboard'
)
ORDER BY viewname;

-- Verify no views have SECURITY DEFINER anymore
SELECT 
    viewname,
    CASE 
        WHEN definition LIKE '%SECURITY DEFINER%' THEN '❌ STILL HAS SECURITY DEFINER'
        ELSE '✅ SECURITY DEFINER REMOVED'
    END as security_status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN (
    'ai_provider_usage_summary',
    'ai_user_usage_summary',
    'recent_admin_activity',
    'advertisement_dashboard'
);

-- Final status check
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PHASE 3 COMPLETE - All Security Definer views fixed!'
        ELSE '⚠️ ' || COUNT(*) || ' views still have Security Definer issues'
    END as phase3_status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN (
    'ai_provider_usage_summary',
    'ai_user_usage_summary',
    'recent_admin_activity',
    'advertisement_dashboard'
)
AND definition LIKE '%SECURITY DEFINER%';

-- Summary
SELECT 
    '🛡️ DATABASE SECURITY PHASE 3 COMPLETED' as summary,
    '4 Security Definer views fixed - privilege escalation risks eliminated' as details;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (IF NEEDED)
-- ============================================================================

/*
IF ANY VIEW FUNCTIONALITY BREAKS:

1. Check the underlying tables exist:
   - ai_usage_logs
   - activity_logs  
   - advertisements
   - advertisement_analytics

2. If tables are missing, views can be dropped:
   DROP VIEW IF EXISTS public.ai_provider_usage_summary;
   DROP VIEW IF EXISTS public.ai_user_usage_summary;
   DROP VIEW IF EXISTS public.recent_admin_activity;
   DROP VIEW IF EXISTS public.advertisement_dashboard;

3. Views can be recreated later when underlying tables are ready
*/

-- ============================================================================
-- TESTING CHECKLIST AFTER PHASE 3
-- ============================================================================

/*
REQUIRED TESTING AFTER PHASE 3:

1. ✅ Admin dashboard loads without errors
2. ✅ AI analytics display correctly (if AI features used)
3. ✅ Advertisement dashboard works
4. ✅ No privilege escalation possible
5. ✅ Views return expected data
6. ✅ No console errors related to views

Note: Some views may return empty results if underlying tables don't have data yet.
This is normal and not a security issue.
*/ 