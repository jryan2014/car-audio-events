-- =============================================================================
-- EMERGENCY DATABASE FIX
-- Restore login functionality and fix broken authentication
-- =============================================================================

-- Step 1: Ensure admin user exists and is properly configured
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at,
    confirmation_token,
    email_confirm_status,
    aud,
    role
)
SELECT 
    gen_random_uuid(),
    'admin@caraudioevents.com',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    '',
    1,
    'authenticated',
    'authenticated'
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@caraudioevents.com'
);

-- Step 2: Create/Update admin user in public.users table
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

-- Step 3: Fix RLS policies for users table to allow proper authentication
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admin settings access for authenticated users" ON admin_settings;

-- Create proper RLS policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id OR auth.email() = 'admin@caraudioevents.com');

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id OR auth.email() = 'admin@caraudioevents.com');

CREATE POLICY "Admin settings access for authenticated users" ON admin_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 4: Ensure Google Maps API key is properly set
UPDATE admin_settings 
SET setting_value = 'AIzaSyBYMbq6u4tmOJKRnLww28MGe-7QOGmhjyM'
WHERE setting_key = 'google_maps_api_key';

-- Step 5: Reset auth session to clear any cached issues
-- This requires manual browser refresh/logout

SELECT 'Emergency database fix completed - please refresh browser and try logging in' as status; 