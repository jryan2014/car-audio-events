-- ============================================================================
-- DATABASE SECURITY PHASE 3 - SECURITY DEFINER VIEWS ANALYSIS
-- ============================================================================
-- Identify admin functions that need security definer views
-- Risk Level: LOW - Creating views for safer admin access
-- ============================================================================

-- Step 1: Find admin-related functions that return data
SELECT 
    'Admin functions that could benefit from security definer views:' as analysis_type,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND (
    p.proname ILIKE '%admin%' OR
    p.proname ILIKE '%get_%stats%' OR
    p.proname ILIKE '%get_%count%' OR
    p.proname ILIKE '%manage%' OR
    p.proname ILIKE '%analytics%'
)
AND pg_get_function_result(p.oid) NOT LIKE 'void%'  -- Only functions that return data
ORDER BY p.proname;

-- Step 2: Check current admin-related views
SELECT 
    'Existing admin views:' as analysis_type,
    table_name as view_name,
    view_definition
FROM information_schema.views 
WHERE table_schema = 'public'
AND (
    table_name ILIKE '%admin%' OR
    table_name ILIKE '%stats%' OR
    table_name ILIKE '%analytics%'
)
ORDER BY table_name;

-- Step 3: Identify tables that admin functions typically access
SELECT 
    'Tables commonly accessed by admin functions:' as analysis_type,
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = t.table_name
        ) THEN 'HAS RLS POLICIES'
        ELSE 'NO RLS POLICIES'
    END as rls_status
FROM information_schema.tables t
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
AND (
    t.table_name IN ('users', 'events', 'registrations', 'notifications', 'admin_settings') OR
    t.table_name ILIKE '%admin%' OR
    t.table_name ILIKE '%log%' OR
    t.table_name ILIKE '%audit%'
)
ORDER BY t.table_name; 