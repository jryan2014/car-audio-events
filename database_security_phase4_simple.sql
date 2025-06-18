-- DATABASE SECURITY PHASE 4 - Simple High-Risk Tables Analysis
-- Run this single query to identify tables that need RLS enabled

SELECT 
    t.table_name,
    CASE 
        WHEN c.relrowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as rls_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t.table_name)
        THEN 'HAS POLICIES'
        ELSE 'NO POLICIES'
    END as policy_status
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
AND c.relrowsecurity = false  -- Only show tables with RLS disabled
ORDER BY t.table_name; 