-- Simple check for Phase 2: Tables needing RLS enablement
-- These tables have policies but RLS is disabled

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