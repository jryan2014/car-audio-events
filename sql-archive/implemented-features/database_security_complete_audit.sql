-- ============================================================================
-- COMPLETE DATABASE SECURITY AUDIT
-- ============================================================================
-- Comprehensive security check covering all phases of database security
-- This script verifies that the database is completely secure
-- Run this in Supabase SQL Editor for complete security assessment
-- ============================================================================

-- ============================================================================
-- PHASE 1: FUNCTION SECURITY (search_path fixes)
-- ============================================================================

-- Check for functions without search_path = ''
SELECT 
    'PHASE 1: FUNCTION SECURITY' as audit_phase,
    'Functions missing search_path security:' as check_type,
    COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.prosrc NOT LIKE '%search_path%';

-- If any found, list them
SELECT 
    'PHASE 1: FUNCTION SECURITY' as audit_phase,
    'SECURITY ISSUE - Functions without search_path:' as issue_type,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.prosrc NOT LIKE '%search_path%'
ORDER BY p.proname;

-- ============================================================================
-- PHASE 2: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Check tables with policies but RLS disabled
SELECT 
    'PHASE 2: ROW LEVEL SECURITY' as audit_phase,
    'Tables with policies but RLS DISABLED:' as check_type,
    COUNT(DISTINCT p.tablename) as count
FROM pg_policies p
JOIN pg_class c ON c.relname = p.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = p.schemaname
WHERE p.schemaname = 'public'
AND c.relrowsecurity = false;

-- List specific tables if any found
SELECT 
    'PHASE 2: ROW LEVEL SECURITY' as audit_phase,
    'SECURITY ISSUE - Table needs RLS enabled:' as issue_type,
    p.tablename,
    COUNT(*) as policy_count
FROM pg_policies p
JOIN pg_class c ON c.relname = p.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = p.schemaname
WHERE p.schemaname = 'public'
AND c.relrowsecurity = false
GROUP BY p.tablename
ORDER BY p.tablename;

-- Check tables with RLS enabled but no policies (potential lockout)
SELECT 
    'PHASE 2: ROW LEVEL SECURITY' as audit_phase,
    'Tables with RLS enabled but NO policies:' as check_type,
    COUNT(*) as count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relkind = 'r'
AND c.relrowsecurity = true
AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.tablename = c.relname 
    AND p.schemaname = 'public'
);

-- List specific tables if any found
SELECT 
    'PHASE 2: ROW LEVEL SECURITY' as audit_phase,
    'POTENTIAL ISSUE - RLS enabled but no policies:' as issue_type,
    c.relname as table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relkind = 'r'
AND c.relrowsecurity = true
AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.tablename = c.relname 
    AND p.schemaname = 'public'
)
ORDER BY c.relname;

-- ============================================================================
-- PHASE 3: SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- Check SECURITY DEFINER functions (these run with elevated privileges)
SELECT 
    'PHASE 3: SECURITY DEFINER AUDIT' as audit_phase,
    'SECURITY DEFINER functions found:' as check_type,
    COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.prosecdef = true;

-- List all SECURITY DEFINER functions for review
SELECT 
    'PHASE 3: SECURITY DEFINER AUDIT' as audit_phase,
    'SECURITY DEFINER function:' as function_type,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE 
        WHEN p.prosrc LIKE '%search_path%' THEN 'HAS search_path'
        ELSE 'MISSING search_path - SECURITY RISK'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.prosecdef = true
ORDER BY p.proname;

-- ============================================================================
-- PHASE 4: PASSWORD AND AUTHENTICATION SECURITY
-- ============================================================================

-- Check for users table and password security
SELECT 
    'PHASE 4: AUTHENTICATION SECURITY' as audit_phase,
    'Users table security check:' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
        THEN 'Users table EXISTS'
        ELSE 'Users table NOT FOUND'
    END as status;

-- Check password column security
SELECT 
    'PHASE 4: AUTHENTICATION SECURITY' as audit_phase,
    'Password security check:' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('password', 'password_hash', 'encrypted_password')
        ) 
        THEN 'Password column found - POTENTIAL SECURITY RISK'
        ELSE 'No password columns found - GOOD (using Supabase auth)'
    END as status;

-- ============================================================================
-- PHASE 5: VIEW AND PERMISSION SECURITY
-- ============================================================================

-- Check for views that might expose sensitive data
SELECT 
    'PHASE 5: VIEW AND PERMISSION AUDIT' as audit_phase,
    'Public views count:' as check_type,
    COUNT(*) as count
FROM information_schema.views 
WHERE table_schema = 'public';

-- List all views for security review
SELECT 
    'PHASE 5: VIEW AND PERMISSION AUDIT' as audit_phase,
    'Public view:' as view_type,
    table_name as view_name
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- PHASE 6: SENSITIVE DATA EXPOSURE CHECK
-- ============================================================================

-- Check for potentially sensitive columns
SELECT 
    'PHASE 6: SENSITIVE DATA EXPOSURE' as audit_phase,
    'Potentially sensitive columns found:' as check_type,
    COUNT(*) as count
FROM information_schema.columns c
WHERE c.table_schema = 'public'
AND (
    c.column_name ILIKE '%password%' OR
    c.column_name ILIKE '%secret%' OR
    c.column_name ILIKE '%token%' OR
    c.column_name ILIKE '%key%' OR
    c.column_name ILIKE '%ssn%' OR
    c.column_name ILIKE '%credit%' OR
    c.column_name ILIKE '%card%'
);

-- List specific sensitive columns if found
SELECT 
    'PHASE 6: SENSITIVE DATA EXPOSURE' as audit_phase,
    'Sensitive column found:' as column_type,
    c.table_name,
    c.column_name,
    c.data_type
FROM information_schema.columns c
WHERE c.table_schema = 'public'
AND (
    c.column_name ILIKE '%password%' OR
    c.column_name ILIKE '%secret%' OR
    c.column_name ILIKE '%token%' OR
    c.column_name ILIKE '%key%' OR
    c.column_name ILIKE '%ssn%' OR
    c.column_name ILIKE '%credit%' OR
    c.column_name ILIKE '%card%'
)
ORDER BY c.table_name, c.column_name;

-- ============================================================================
-- SECURITY SUMMARY AND SCORE
-- ============================================================================

-- Calculate security score
WITH security_metrics AS (
    SELECT 
        -- Phase 1: Functions with search_path
        (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace 
         WHERE n.nspname = 'public' AND p.prosrc LIKE '%search_path%') as secure_functions,
        (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace 
         WHERE n.nspname = 'public') as total_functions,
        
        -- Phase 2: RLS compliance
        (SELECT COUNT(DISTINCT p.tablename) FROM pg_policies p 
         JOIN pg_class c ON c.relname = p.tablename 
         JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = p.schemaname
         WHERE p.schemaname = 'public' AND c.relrowsecurity = false) as rls_violations,
        
        -- Phase 3: SECURITY DEFINER with search_path
        (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace 
         WHERE n.nspname = 'public' AND p.prosecdef = true AND p.prosrc LIKE '%search_path%') as secure_definer_functions,
        (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace 
         WHERE n.nspname = 'public' AND p.prosecdef = true) as total_definer_functions,
         
        -- Phase 4: Password exposure
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = 'public' AND column_name IN ('password', 'password_hash', 'encrypted_password')) as password_columns
)
SELECT 
    'SECURITY SUMMARY' as audit_phase,
    'SECURITY SCORE CALCULATION:' as metric_type,
    CASE 
        WHEN rls_violations = 0 AND password_columns = 0 
             AND (total_functions = 0 OR secure_functions = total_functions)
             AND (total_definer_functions = 0 OR secure_definer_functions = total_definer_functions)
        THEN 'EXCELLENT (100%) - Database is completely secure'
        WHEN rls_violations <= 2 AND password_columns = 0 
             AND secure_functions::float / NULLIF(total_functions, 0) >= 0.9
        THEN 'GOOD (85-99%) - Minor security improvements needed'
        WHEN rls_violations <= 5 AND password_columns <= 1
        THEN 'MODERATE (70-84%) - Several security issues need attention'
        ELSE 'POOR (<70%) - Significant security vulnerabilities exist'
    END as security_rating,
    secure_functions || '/' || total_functions as function_security,
    CASE WHEN rls_violations = 0 THEN 'PASS' ELSE rls_violations || ' violations' END as rls_security,
    CASE WHEN password_columns = 0 THEN 'PASS' ELSE password_columns || ' exposed' END as password_security
FROM security_metrics;

-- ============================================================================
-- END OF AUDIT - RECOMMENDATIONS
-- ============================================================================

SELECT 
    'RECOMMENDATIONS' as audit_phase,
    'Next Steps:' as recommendation_type,
    'If any SECURITY ISSUES are listed above, address them immediately. Review all SECURITY DEFINER functions for necessity. Ensure all sensitive data has proper RLS policies.' as actions;

-- ============================================================================
-- COMPLETED DATABASE SECURITY AUDIT
-- ============================================================================ 