-- DATABASE SECURITY PHASE 2 - ENABLE RLS ON CRITICAL TABLES
-- Enable Row Level Security on tables that already have policies
-- Risk Level: MEDIUM - Enforces existing security policies
-- Date: 2025-06-17

-- ============================================================================
-- PHASE 2: ENABLE RLS ON TABLES WITH EXISTING POLICIES
-- ============================================================================

-- CRITICAL ISSUE: 5 tables have security policies but RLS is DISABLED
-- This means the policies are not being enforced - MAJOR SECURITY RISK

-- Step 1: Show current status of critical tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
AND tablename IN ('advertisements', 'event_categories', 'events', 'profiles', 'users')
ORDER BY tablename;

-- Step 2: Show existing policies for these tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('advertisements', 'event_categories', 'events', 'profiles', 'users')
ORDER BY tablename, policyname;

-- ============================================================================
-- SUB-PHASE 2A: START WITH LOWEST RISK TABLE (event_categories)
-- ============================================================================

-- Enable RLS on event_categories first (lowest risk)
SELECT 'Enabling RLS on event_categories...' as action;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

-- Verify event_categories RLS is now enabled
SELECT 
    'event_categories RLS Status:' as table_name,
    CASE WHEN rowsecurity THEN 'ENABLED ✅' ELSE 'DISABLED ❌' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'event_categories';

-- ============================================================================
-- SUB-PHASE 2B: MEDIUM RISK TABLES (advertisements, events)
-- ============================================================================

-- Enable RLS on advertisements
SELECT 'Enabling RLS on advertisements...' as action;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- Verify advertisements RLS
SELECT 
    'advertisements RLS Status:' as table_name,
    CASE WHEN rowsecurity THEN 'ENABLED ✅' ELSE 'DISABLED ❌' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'advertisements';

-- Enable RLS on events
SELECT 'Enabling RLS on events...' as action;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Verify events RLS
SELECT 
    'events RLS Status:' as table_name,
    CASE WHEN rowsecurity THEN 'ENABLED ✅' ELSE 'DISABLED ❌' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'events';

-- ============================================================================
-- SUB-PHASE 2C: HIGH RISK TABLE (profiles)
-- ============================================================================

-- Enable RLS on profiles (user profile data)
SELECT 'Enabling RLS on profiles...' as action;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Verify profiles RLS
SELECT 
    'profiles RLS Status:' as table_name,
    CASE WHEN rowsecurity THEN 'ENABLED ✅' ELSE 'DISABLED ❌' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- ============================================================================
-- SUB-PHASE 2D: CRITICAL TABLE (users) - MOST SENSITIVE
-- ============================================================================

-- Enable RLS on users table (CRITICAL - authentication data)
SELECT 'Enabling RLS on users (CRITICAL)...' as action;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Verify users RLS
SELECT 
    'users RLS Status:' as table_name,
    CASE WHEN rowsecurity THEN 'ENABLED ✅' ELSE 'DISABLED ❌' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- ============================================================================
-- PHASE 2 COMPLETION VERIFICATION
-- ============================================================================

-- Final status check - all 5 tables should now have RLS enabled
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN 'ENABLED ✅' ELSE 'DISABLED ❌' END as rls_status,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
AND tablename IN ('advertisements', 'event_categories', 'events', 'profiles', 'users')
ORDER BY tablename;

-- Check for any remaining critical RLS issues
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PHASE 2 COMPLETE - All critical tables now have RLS enabled!'
        ELSE '⚠️ ' || COUNT(*) || ' critical tables still have RLS disabled'
    END as phase2_status
FROM pg_tables t
WHERE schemaname = 'public' 
AND tablename IN ('advertisements', 'event_categories', 'events', 'profiles', 'users')
AND rowsecurity = false;

-- Summary of what was accomplished
SELECT 
    '🛡️ DATABASE SECURITY PHASE 2 COMPLETED' as summary,
    '5 critical tables now have RLS enabled with existing policies enforced' as details;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (IF NEEDED)
-- ============================================================================

/*
IF ANY FUNCTIONALITY BREAKS, ROLLBACK WITH:

-- Disable RLS on specific table if needed:
ALTER TABLE public.event_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Then investigate policy issues and re-enable properly
*/

-- ============================================================================
-- TESTING CHECKLIST AFTER PHASE 2
-- ============================================================================

/*
REQUIRED TESTING AFTER PHASE 2:

1. ✅ Login functionality works
2. ✅ User registration works  
3. ✅ Profile access works
4. ✅ Event viewing works
5. ✅ Event creation works (admin)
6. ✅ Advertisement viewing works
7. ✅ Admin access works
8. ✅ No console errors
9. ✅ No broken functionality

If any test fails, use rollback commands above.
*/ 