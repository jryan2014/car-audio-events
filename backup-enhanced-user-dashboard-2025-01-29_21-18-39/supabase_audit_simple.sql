-- =============================================================================
-- SUPABASE DATABASE AUDIT - Run this in Supabase SQL Editor
-- =============================================================================

-- 1. DATABASE OVERVIEW
SELECT 
    current_database() as database_name,
    current_user as current_user,
    session_user as session_user;

-- 2. ALL PUBLIC TABLES
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 3. ADMIN_SETTINGS TABLE STRUCTURE (This is what's causing your issues)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'admin_settings' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. ADMIN_SETTINGS SAMPLE DATA
SELECT * FROM admin_settings LIMIT 10;

-- 5. ADMIN_SETTINGS RLS POLICIES (This is likely the problem)
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'admin_settings';

-- 6. USERS TABLE STRUCTURE
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. USERS DATA SUMMARY
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN membership_type = 'admin' THEN 1 END) as admin_users,
    COUNT(CASE WHEN email = 'admin@caraudioevents.com' THEN 1 END) as admin_email_users
FROM users;

-- 8. ALL FOREIGN KEY CONSTRAINTS
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

-- 9. TABLES WITH RLS ENABLED
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;

-- 10. ALL RLS POLICIES
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