-- =============================================================================
-- CURRENT EMERGENCY BACKUP - June 19, 2025
-- =============================================================================
-- Current state emergency restore for authentication and critical functionality
-- Created: June 19, 2025
-- Purpose: Restore critical functionality if database issues occur
-- =============================================================================

-- Step 1: Verify and restore admin user access
INSERT INTO public.users (
    id,
    email,
    name,
    first_name,
    last_name,
    membership_type,
    status,
    verification_status,
    created_at,
    updated_at
)
SELECT 
    au.id,
    'admin@caraudioevents.com',
    'Admin User',
    'Admin',
    'User',
    'admin',
    'active',
    'verified',
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'admin@caraudioevents.com'
ON CONFLICT (id) DO UPDATE SET
    membership_type = 'admin',
    status = 'active',
    verification_status = 'verified',
    updated_at = NOW();

-- Step 2: Ensure critical RLS policies are in place (current as of June 2025)
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email = 'admin@caraudioevents.com'
        )
    );

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email = 'admin@caraudioevents.com'
        )
    );

-- Step 3: Ensure admin settings access
DROP POLICY IF EXISTS "Admin settings access for authenticated users" ON admin_settings;

CREATE POLICY "Admin settings access for authenticated users" ON admin_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 4: Verify critical admin settings (current values as of June 2025)
INSERT INTO admin_settings (setting_key, setting_value, created_at, updated_at)
VALUES 
    ('google_maps_api_key', 'AIzaSyBYMbq6u4tmOJKRnLww28MGe-7QOGmhjyM', NOW(), NOW()),
    ('site_title', 'Car Audio Events', NOW(), NOW()),
    ('maintenance_mode', 'false', NOW(), NOW())
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Step 5: Ensure RLS is enabled on critical tables (current security state)
-- These commands ensure security remains intact
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Current state verification queries
SELECT 'Checking admin user...' as status;
SELECT id, email, name, membership_type, status FROM users WHERE email = 'admin@caraudioevents.com';

SELECT 'Checking critical admin settings...' as status;
SELECT setting_key, setting_value FROM admin_settings WHERE setting_key IN ('google_maps_api_key', 'site_title', 'maintenance_mode');

SELECT 'Checking RLS status on critical tables...' as status;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'admin_settings', 'events', 'advertisements', 'profiles')
ORDER BY tablename;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
SELECT 'CURRENT EMERGENCY BACKUP COMPLETED - June 19, 2025' as final_status;
SELECT 'Authentication, admin access, and critical security restored to current state' as result;

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
/*
TO USE THIS EMERGENCY BACKUP:
1. Run this script in Supabase SQL Editor
2. Refresh your browser and clear cache
3. Try logging in with admin credentials
4. Verify admin dashboard access
5. Check that critical functionality works

WHAT THIS SCRIPT DOES:
- Restores admin user access
- Ensures proper RLS policies for authentication
- Verifies critical admin settings
- Maintains current security configuration
- Provides verification queries to confirm restoration

LAST UPDATED: June 19, 2025
REPRESENTS: Current production state as of backup creation
*/ 