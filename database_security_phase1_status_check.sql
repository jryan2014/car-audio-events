-- ============================================================================
-- DATABASE SECURITY PHASE 1 - SIMPLE STATUS CHECK
-- ============================================================================
-- Run each query separately to see results clearly
-- ============================================================================

-- Query 1: Total functions count
SELECT 
    COUNT(*) as total_functions
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- DATABASE SECURITY PHASE 1 - CURRENT STATUS CHECK
-- ============================================================================
-- Step-by-step approach to identify what still needs to be fixed
-- Following proper protocol - check before proceeding
-- ============================================================================

-- Step 1: Check total functions in public schema
SELECT 
    'Total functions in public schema:' as description,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Step 2: Check functions that still need search_path fix
SELECT 
    'Functions needing search_path fix:' as description,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NULL;

-- Step 3: Check functions already with search_path configured
SELECT 
    'Functions with search_path configured:' as description,
    COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NOT NULL
AND 'search_path=' = ANY(proconfig);

-- Step 4: List specific functions that still need fixing
SELECT 
    'Functions that still need search_path fix:' as status;

SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    CASE WHEN prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NULL
ORDER BY proname;

-- Step 5: Show functions that have been fixed already
SELECT 
    'Functions already secured with search_path:' as status;

SELECT 
    proname as function_name,
    array_to_string(proconfig, ', ') as config
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proconfig IS NOT NULL
AND 'search_path=' = ANY(proconfig)
ORDER BY proname
LIMIT 10;

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run this script in Supabase SQL Editor first
-- 2. Review the results to understand current status
-- 3. Share the results so I can create the appropriate fix script
-- 4. Then proceed with step-by-step fixes
-- ============================================================================ 