-- =============================================================================
-- COMPREHENSIVE DATABASE AUDIT SCRIPT
-- This script provides a complete analysis of database schema, security, 
-- data integrity, and relationships for the Car Audio Events platform
-- =============================================================================

\echo '=== STARTING COMPREHENSIVE DATABASE AUDIT ==='
\echo ''

-- =============================================================================
-- 1. BASIC DATABASE INFORMATION
-- =============================================================================
\echo '1. DATABASE OVERVIEW'
\echo '==================='

SELECT 
    current_database() as database_name,
    current_user as current_user,
    session_user as session_user,
    version() as postgresql_version;

\echo ''
\echo '--- Database Size and Statistics ---'
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as public_tables_count,
    (SELECT count(*) FROM information_schema.views WHERE table_schema = 'public') as public_views_count,
    (SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public') as functions_count;

-- =============================================================================
-- 2. TABLE STRUCTURE AND SCHEMA ANALYSIS
-- =============================================================================
\echo ''
\echo '2. TABLE STRUCTURE ANALYSIS'
\echo '============================'

\echo '--- All Public Tables with Row Counts ---'
SELECT 
    schemaname,
    tablename,
    tableowner,
    CASE 
        WHEN has_table_privilege(tablename, 'SELECT') THEN
            (xpath('//text()', query_to_xml(format('SELECT count(*) FROM %I.%I', schemaname, tablename), false, true, '')))[1]::text::bigint
        ELSE -1 
    END as estimated_row_count
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

\echo ''
\echo '--- Table Column Details ---'
SELECT 
    t.table_name,
    t.column_name,
    t.data_type,
    CASE WHEN t.character_maximum_length IS NOT NULL 
         THEN t.data_type || '(' || t.character_maximum_length || ')'
         WHEN t.numeric_precision IS NOT NULL 
         THEN t.data_type || '(' || t.numeric_precision || ',' || t.numeric_scale || ')'
         ELSE t.data_type END as full_data_type,
    t.is_nullable,
    t.column_default,
    CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN 'PK'
         WHEN tc.constraint_type = 'FOREIGN KEY' THEN 'FK'
         WHEN tc.constraint_type = 'UNIQUE' THEN 'UQ'
         ELSE '' END as constraint_type
FROM information_schema.columns t
LEFT JOIN information_schema.key_column_usage kcu ON t.table_name = kcu.table_name AND t.column_name = kcu.column_name
LEFT JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
WHERE t.table_schema = 'public'
ORDER BY t.table_name, t.ordinal_position;

-- =============================================================================
-- 3. CRITICAL TABLES DETAILED ANALYSIS
-- =============================================================================
\echo ''
\echo '3. CRITICAL TABLES ANALYSIS'
\echo '============================'

-- Admin Settings Table
\echo '--- admin_settings table structure ---'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'admin_settings' AND table_schema = 'public'
ORDER BY ordinal_position;

\echo '--- admin_settings sample data (first 5 rows) ---'
SELECT * FROM admin_settings LIMIT 5;

\echo '--- admin_settings data summary ---'
SELECT 
    COUNT(*) as total_settings,
    COUNT(CASE WHEN setting_value IS NOT NULL AND setting_value != '' THEN 1 END) as configured_settings,
    COUNT(CASE WHEN setting_value IS NULL OR setting_value = '' THEN 1 END) as empty_settings
FROM admin_settings;

-- Users Table
\echo ''
\echo '--- users table structure ---'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

\echo '--- users data summary ---'
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN membership_type = 'admin' THEN 1 END) as admin_users,
    COUNT(CASE WHEN membership_type = 'retailer' THEN 1 END) as retailer_users,
    COUNT(CASE WHEN membership_type = 'manufacturer' THEN 1 END) as manufacturer_users,
    COUNT(CASE WHEN membership_type = 'competitor' THEN 1 END) as competitor_users,
    COUNT(CASE WHEN membership_type = 'organization' THEN 1 END) as organization_users,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
    COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_users
FROM users;

-- Events Table
\echo ''
\echo '--- events table structure ---'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'events' AND table_schema = 'public'
ORDER BY ordinal_position;

\echo '--- events data summary ---'
SELECT 
    COUNT(*) as total_events,
    COUNT(CASE WHEN status = 'published' THEN 1 END) as published_events,
    COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved_events,
    COUNT(CASE WHEN start_date >= CURRENT_DATE THEN 1 END) as upcoming_events,
    MIN(start_date) as earliest_event,
    MAX(start_date) as latest_event
FROM events;

-- =============================================================================
-- 4. FOREIGN KEY RELATIONSHIPS AND INTEGRITY
-- =============================================================================
\echo ''
\echo '4. FOREIGN KEY RELATIONSHIPS'
\echo '============================='

\echo '--- All Foreign Key Constraints ---'
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

\echo ''
\echo '--- Foreign Key Integrity Check ---'
-- This will check for orphaned records in key relationships
WITH fk_violations AS (
    -- Check users.id references
    SELECT 'events.user_id -> users.id' as relationship, COUNT(*) as violations
    FROM events e LEFT JOIN users u ON e.user_id = u.id 
    WHERE e.user_id IS NOT NULL AND u.id IS NULL
    
    UNION ALL
    
    -- Check team_members relationships
    SELECT 'team_members.user_id -> users.id' as relationship, COUNT(*) as violations
    FROM team_members tm LEFT JOIN users u ON tm.user_id = u.id 
    WHERE tm.user_id IS NOT NULL AND u.id IS NULL
    
    UNION ALL
    
    SELECT 'team_members.team_id -> teams.id' as relationship, COUNT(*) as violations
    FROM team_members tm LEFT JOIN teams t ON tm.team_id = t.id 
    WHERE tm.team_id IS NOT NULL AND t.id IS NULL
)
SELECT * FROM fk_violations WHERE violations > 0;

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS) ANALYSIS
-- =============================================================================
\echo ''
\echo '5. ROW LEVEL SECURITY ANALYSIS'
\echo '==============================='

\echo '--- Tables with RLS Enabled ---'
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;

\echo '--- All RLS Policies ---'
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo '--- Admin Settings Table Policies (Critical for Admin Access) ---'
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'admin_settings';

-- =============================================================================
-- 6. INDEXES AND PERFORMANCE
-- =============================================================================
\echo ''
\echo '6. INDEXES AND PERFORMANCE'
\echo '==========================='

\echo '--- All Indexes ---'
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

\echo '--- Missing Indexes (Foreign Keys without indexes) ---'
SELECT 
    tc.table_name,
    kcu.column_name,
    'Missing index on FK column' as recommendation
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = tc.table_name 
        AND indexdef ILIKE '%' || kcu.column_name || '%'
    )
ORDER BY tc.table_name;

-- =============================================================================
-- 7. SECURITY ANALYSIS
-- =============================================================================
\echo ''
\echo '7. SECURITY ANALYSIS'
\echo '===================='

\echo '--- User Privileges ---'
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;

\echo '--- Sensitive Data Detection ---'
-- Look for potentially sensitive columns
SELECT 
    table_name,
    column_name,
    data_type,
    'Potentially sensitive' as note
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND (column_name ILIKE '%password%' 
         OR column_name ILIKE '%secret%' 
         OR column_name ILIKE '%key%'
         OR column_name ILIKE '%token%'
         OR column_name ILIKE '%email%'
         OR column_name ILIKE '%phone%'
         OR column_name ILIKE '%ssn%'
         OR column_name ILIKE '%credit%')
ORDER BY table_name, column_name;

-- =============================================================================
-- 8. DATA INTEGRITY CHECKS
-- =============================================================================
\echo ''
\echo '8. DATA INTEGRITY CHECKS'
\echo '========================='

\echo '--- Null Values in Critical Fields ---'
-- Check for unexpected nulls in important fields
SELECT 'users.email' as field, COUNT(*) as null_count 
FROM users WHERE email IS NULL OR email = ''
UNION ALL
SELECT 'users.membership_type' as field, COUNT(*) as null_count 
FROM users WHERE membership_type IS NULL
UNION ALL
SELECT 'events.title' as field, COUNT(*) as null_count 
FROM events WHERE title IS NULL OR title = ''
UNION ALL
SELECT 'events.start_date' as field, COUNT(*) as null_count 
FROM events WHERE start_date IS NULL;

\echo '--- Duplicate Check ---'
-- Check for potential duplicates
SELECT 'users.email duplicates' as check_type, email, COUNT(*) as count
FROM users 
WHERE email IS NOT NULL AND email != ''
GROUP BY email 
HAVING COUNT(*) > 1

UNION ALL

SELECT 'events with same title and date' as check_type, 
       title || ' on ' || start_date::text as identifier, 
       COUNT(*) as count
FROM events 
WHERE title IS NOT NULL AND start_date IS NOT NULL
GROUP BY title, start_date 
HAVING COUNT(*) > 1;

-- =============================================================================
-- 9. AUTHENTICATION AND AUTH SCHEMA
-- =============================================================================
\echo ''
\echo '9. AUTHENTICATION ANALYSIS'
\echo '=========================='

\echo '--- Auth Schema Tables ---'
SELECT 
    table_name,
    CASE 
        WHEN has_table_privilege('auth.' || table_name, 'SELECT') THEN 'Accessible'
        ELSE 'No Access'
    END as access_status
FROM information_schema.tables 
WHERE table_schema = 'auth'
ORDER BY table_name;

-- Only query auth.users if we have access
\echo '--- Auth Users Summary (if accessible) ---'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        PERFORM 1; -- We'll handle this in the main query
    END IF;
END $$;

-- =============================================================================
-- 10. SYSTEM RECOMMENDATIONS
-- =============================================================================
\echo ''
\echo '10. SYSTEM RECOMMENDATIONS'
\echo '=========================='

\echo '--- Schema Analysis Summary ---'
WITH table_analysis AS (
    SELECT 
        t.table_name,
        COUNT(c.column_name) as column_count,
        COUNT(CASE WHEN c.is_nullable = 'NO' THEN 1 END) as not_null_columns,
        COUNT(CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN 1 END) as pk_count,
        COUNT(CASE WHEN tc.constraint_type = 'FOREIGN KEY' THEN 1 END) as fk_count,
        CASE WHEN pt.rowsecurity THEN 'Yes' ELSE 'No' END as has_rls
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    LEFT JOIN information_schema.key_column_usage kcu ON t.table_name = kcu.table_name AND t.table_schema = kcu.table_schema
    LEFT JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
    LEFT JOIN pg_tables pt ON t.table_name = pt.tablename AND t.table_schema = pt.schemaname
    WHERE t.table_schema = 'public'
    GROUP BY t.table_name, pt.rowsecurity
)
SELECT 
    table_name,
    column_count,
    not_null_columns,
    pk_count,
    fk_count,
    has_rls,
    CASE 
        WHEN pk_count = 0 THEN 'Missing Primary Key!'
        WHEN has_rls = 'No' AND table_name IN ('users', 'admin_settings', 'events') THEN 'Consider RLS'
        ELSE 'OK'
    END as recommendations
FROM table_analysis
ORDER BY table_name;

\echo ''
\echo '=== DATABASE AUDIT COMPLETE ==='
\echo ''
\echo 'SUMMARY:'
\echo '- Review all foreign key violations'
\echo '- Check RLS policies for admin_settings access'
\echo '- Verify sensitive data protection'
\echo '- Consider adding missing indexes'
\echo '- Review user privileges and access patterns'
\echo '' 