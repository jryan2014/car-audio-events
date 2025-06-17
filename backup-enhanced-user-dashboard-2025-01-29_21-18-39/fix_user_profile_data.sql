-- =============================================================================
-- FIX USER PROFILE DATA
-- This script updates the current user profile with proper names and data
-- =============================================================================

-- Update the admin user profile with actual name instead of "Admin User"
UPDATE users 
SET 
    name = CASE 
        WHEN first_name IS NOT NULL AND last_name IS NOT NULL 
        THEN CONCAT(first_name, ' ', last_name)
        WHEN first_name IS NOT NULL 
        THEN first_name
        WHEN last_name IS NOT NULL 
        THEN last_name
        ELSE name
    END,
    updated_at = NOW()
WHERE email = 'admin@caraudioevents.com';

-- If no user exists with that email, create one from the auth.users table
INSERT INTO users (
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
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', 'Admin User'),
    'Admin',
    'User',
    'admin',
    'active',
    'verified',
    au.created_at,
    NOW()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = au.id
)
AND au.email = 'admin@caraudioevents.com';

-- Update any existing user profiles to ensure they have proper display names
UPDATE users 
SET 
    name = CASE 
        WHEN (name IS NULL OR name = 'User' OR name = 'Admin User') AND first_name IS NOT NULL AND last_name IS NOT NULL 
        THEN CONCAT(first_name, ' ', last_name)
        WHEN (name IS NULL OR name = 'User' OR name = 'Admin User') AND first_name IS NOT NULL 
        THEN first_name
        WHEN (name IS NULL OR name = 'User' OR name = 'Admin User') AND last_name IS NOT NULL 
        THEN last_name
        ELSE name
    END,
    updated_at = NOW()
WHERE name IS NULL OR name IN ('User', 'Admin User');

-- Show the updated user data
SELECT 
    id,
    email,
    name,
    first_name,
    last_name,
    bio,
    membership_type,
    updated_at
FROM users 
WHERE email = 'admin@caraudioevents.com' OR membership_type = 'admin'
ORDER BY updated_at DESC; 