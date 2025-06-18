-- ============================================================================
-- DATABASE SECURITY PHASE 2 - RLS ENABLEMENT ANALYSIS
-- ============================================================================
-- Step-by-step analysis to identify tables with existing policies but RLS disabled
-- Risk Level: MEDIUM - Enabling RLS may affect application functionality
-- Following proper protocol - analyze before proceeding
-- ============================================================================

-- Step 1: Check tables with existing RLS policies
SELECT 
    'Tables with existing RLS policies:' as info;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Step 2: Check RLS enablement status for tables with policies
SELECT 
    'RLS enablement status for tables with policies:' as info;

SELECT DISTINCT
    p.schemaname,
    p.tablename,
    CASE 
        WHEN c.relrowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as rls_status,
    COUNT(*) as policy_count
FROM pg_policies p
JOIN pg_class c ON c.relname = p.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = p.schemaname
WHERE p.schemaname = 'public'
GROUP BY p.schemaname, p.tablename, c.relrowsecurity
ORDER BY p.tablename;

-- Step 3: Identify tables that need RLS enablement (have policies but RLS disabled)
SELECT 
    'Tables needing RLS enablement (have policies but RLS disabled):' as info;

SELECT DISTINCT
    p.tablename,
    COUNT(*) as policy_count
FROM pg_policies p
JOIN pg_class c ON c.relname = p.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = p.schemaname
WHERE p.schemaname = 'public'
AND c.relrowsecurity = false  -- RLS is disabled
GROUP BY p.tablename
ORDER BY p.tablename;

-- Step 4: Check tables with RLS enabled but no policies (potential issues)
SELECT 
    'Tables with RLS enabled but no policies (potential access issues):' as info;

SELECT 
    c.relname as table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relkind = 'r'  -- regular tables only
AND c.relrowsecurity = true  -- RLS enabled
AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.tablename = c.relname 
    AND p.schemaname = 'public'
)
ORDER BY c.relname;

-- Step 5: Summary statistics
SELECT 
    'Summary - Tables in public schema:' as info;

SELECT 
    COUNT(*) as total_tables
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relkind = 'r';

SELECT 
    COUNT(DISTINCT tablename) as tables_with_policies
FROM pg_policies 
WHERE schemaname = 'public';

SELECT 
    COUNT(*) as tables_with_rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relkind = 'r'
AND c.relrowsecurity = true;

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run this analysis script in Supabase SQL Editor
-- 2. Review which tables have policies but RLS disabled
-- 3. Share results so I can create safe enablement plan
-- 4. Then proceed with step-by-step RLS enablement
-- ============================================================================ 