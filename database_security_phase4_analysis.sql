-- ============================================================================
-- DATABASE SECURITY PHASE 4 - HIGH-RISK TABLES RLS ENABLEMENT ANALYSIS
-- ============================================================================
-- Identify high-risk tables that need RLS enabled
-- Risk Level: MEDIUM - Enabling RLS may affect application functionality
-- Following proper protocol - analyze before proceeding
-- ============================================================================

-- Step 1: Identify tables without RLS that contain sensitive/critical data
SELECT 
    'High-risk tables without RLS:' as analysis_type,
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
AND c.relrowsecurity = false  -- RLS is disabled
AND (
    -- High-risk tables containing sensitive data
    t.table_name IN (
        'users', 'events', 'event_registrations', 'payments', 'notifications',
        'directory_listings', 'organizations', 'user_activity_log', 'admin_activity_log',
        'verification_documents', 'team_members', 'judge_assignments', 'competition_scores',
        'advertisements', 'cms_pages', 'admin_settings', 'ai_usage_logs'
    ) OR
    -- Tables with sensitive column patterns
    t.table_name ILIKE '%user%' OR
    t.table_name ILIKE '%admin%' OR
    t.table_name ILIKE '%payment%' OR
    t.table_name ILIKE '%score%' OR
    t.table_name ILIKE '%private%' OR
    t.table_name ILIKE '%secret%' OR
    t.table_name ILIKE '%auth%'
)
ORDER BY t.table_name;

-- Step 2: Check for tables with foreign keys to users (high-risk by association)
SELECT 
    'Tables with user foreign keys (high-risk):' as analysis_type,
    tc.table_name,
    CASE 
        WHEN c.relrowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as rls_status,
    kcu.column_name as user_fk_column,
    ccu.table_name as references_table
FROM information_schema.table_constraints tc 
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN pg_class c ON c.relname = tc.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND ccu.table_name IN ('users', 'auth.users')
AND c.relrowsecurity = false  -- RLS is disabled
ORDER BY tc.table_name;

-- Step 3: Identify system/lookup tables (usually low-risk)
SELECT 
    'System/lookup tables (typically low-risk):' as analysis_type,
    t.table_name,
    CASE 
        WHEN c.relrowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as rls_status
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
AND c.relrowsecurity = false  -- RLS is disabled
AND (
    t.table_name ILIKE '%categories' OR
    t.table_name ILIKE '%types' OR
    t.table_name ILIKE '%status%' OR
    t.table_name ILIKE '%config%' OR
    t.table_name ILIKE '%settings' OR
    t.table_name ILIKE '%metadata' OR
    t.table_name ILIKE '%lookup' OR
    t.table_name LIKE '%_enum' OR
    t.table_name LIKE '%_type' OR
    t.table_name LIKE '%_status'
)
ORDER BY t.table_name;

-- Step 4: Summary of RLS status across all tables
SELECT 
    'RLS Status Summary:' as analysis_type,
    COUNT(*) as total_tables,
    SUM(CASE WHEN c.relrowsecurity THEN 1 ELSE 0 END) as rls_enabled_count,
    SUM(CASE WHEN c.relrowsecurity THEN 0 ELSE 1 END) as rls_disabled_count,
    ROUND(
        (SUM(CASE WHEN c.relrowsecurity THEN 1 ELSE 0 END)::float / COUNT(*)) * 100, 1
    ) as rls_enabled_percentage
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE';

-- Step 5: Tables without RLS that might need policies created first
SELECT 
    'Tables needing policies before RLS enablement:' as analysis_type,
    t.table_name,
    'Missing policies - review needed' as recommendation
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
AND c.relrowsecurity = false  -- RLS is disabled
AND NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = t.table_name
)
-- Focus on tables that likely need user-based access control
AND (
    t.table_name IN (
        'users', 'events', 'event_registrations', 'payments', 'notifications',
        'directory_listings', 'organizations', 'user_activity_log'
    ) OR
    t.table_name ILIKE '%user%' OR
    t.table_name ILIKE '%member%' OR
    t.table_name ILIKE '%private%'
)
ORDER BY t.table_name; 