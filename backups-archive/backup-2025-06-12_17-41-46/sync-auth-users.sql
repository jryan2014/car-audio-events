-- Manually sync existing auth users to custom users table
-- This will copy users from auth.users to our public.users table

-- First, let's see what's in auth.users (you should see your account here)
SELECT 'Auth users found:' as status;
SELECT id, email, created_at FROM auth.users;

-- Now manually insert your existing auth users into our users table
INSERT INTO users (
    id, 
    email, 
    name, 
    membership_type, 
    status, 
    verification_status,
    login_count,
    failed_login_attempts,
    created_at
)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)) as name,
    CASE 
        WHEN email = 'admin@caraudioevents.com' THEN 'admin'
        ELSE 'competitor'
    END as membership_type,
    'active' as status,
    'verified' as verification_status,
    0 as login_count,
    0 as failed_login_attempts,
    created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM users WHERE id IS NOT NULL);

-- Also sync to profiles table
INSERT INTO profiles (
    id, 
    email, 
    name, 
    membership_type, 
    status,
    created_at
)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)) as name,
    CASE 
        WHEN email = 'admin@caraudioevents.com' THEN 'admin'
        ELSE 'competitor'
    END as membership_type,
    'active' as status,
    created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles WHERE id IS NOT NULL);

-- Show results
SELECT 'Sync complete. Users in custom table:' as status;
SELECT id, email, name, membership_type, status FROM users; 