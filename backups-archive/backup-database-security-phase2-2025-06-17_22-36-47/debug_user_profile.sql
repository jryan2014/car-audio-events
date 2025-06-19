-- =============================================================================
-- DEBUG USER PROFILE DATA
-- Check current user data and profile information
-- =============================================================================

-- Check all users in the system
SELECT 
    id,
    email,
    name,
    first_name,
    last_name,
    bio,
    membership_type,
    created_at,
    updated_at
FROM users 
ORDER BY created_at DESC;

-- Check if there's an admin user
SELECT 
    id,
    email,
    name,
    first_name,
    last_name,
    bio,
    membership_type,
    created_at
FROM users 
WHERE email = 'admin@caraudioevents.com' 
   OR membership_type = 'admin'
   OR name = 'Admin User';

-- Check auth.users table
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC;

-- Check if there are any mismatches between auth.users and public.users
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    pu.id as profile_id,
    pu.email as profile_email,
    pu.name,
    pu.first_name,
    pu.last_name
FROM auth.users au
LEFT JOIN users pu ON au.id = pu.id
ORDER BY au.created_at DESC; 