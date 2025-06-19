-- =============================================================================
-- EMERGENCY DATABASE FIX V2 - CORRECTED
-- Restore login functionality and fix broken authentication
-- =============================================================================

-- Step 1: Check if admin user exists in auth.users
DO $$
BEGIN
    -- Only create admin if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@caraudioevents.com') THEN
        -- This would normally be done through Supabase Auth API
        -- For now, we'll focus on the public.users table
        RAISE NOTICE 'Admin user needs to be created through Supabase Auth dashboard';
    END IF;
END $$;

-- Step 2: Ensure admin user exists in public.users table
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

-- Step 3: Fix RLS policies for users table
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admin settings access for authenticated users" ON admin_settings;

-- Create proper RLS policies that allow authentication
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

-- Step 4: Fix admin_settings access
CREATE POLICY "Admin settings access for authenticated users" ON admin_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 5: Ensure Google Maps API key is properly set
INSERT INTO admin_settings (setting_key, setting_value, created_at, updated_at)
VALUES ('google_maps_api_key', 'AIzaSyBYMbq6u4tmOJKRnLww28MGe-7QOGmhjyM', NOW(), NOW())
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = 'AIzaSyBYMbq6u4tmOJKRnLww28MGe-7QOGmhjyM',
    updated_at = NOW();

-- Step 6: Check current state
SELECT 'Checking users table...' as status;
SELECT id, email, name, membership_type, status FROM users WHERE email = 'admin@caraudioevents.com';

SELECT 'Checking admin_settings...' as status;
SELECT setting_key, setting_value FROM admin_settings WHERE setting_key = 'google_maps_api_key';

SELECT 'Emergency database fix V2 completed' as final_status; 