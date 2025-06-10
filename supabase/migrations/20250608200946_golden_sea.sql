/*
  # Fix Admin User Setup

  This migration creates the necessary functions and setup for the admin user
  without violating foreign key constraints. The actual auth user creation
  will be handled by the application.

  1. Functions
     - Creates helper functions for admin user setup
     - Provides safe way to create admin profile after auth user exists
  
  2. Cleanup
     - Removes any existing conflicting data
     - Prepares for clean admin user creation
*/

-- Clean up any existing admin user data first
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT id FROM public.users WHERE email = 'admin@caraudioevents.com'
);

DELETE FROM public.user_preferences WHERE user_id IN (
  SELECT id FROM public.users WHERE email = 'admin@caraudioevents.com'
);

DELETE FROM public.users WHERE email = 'admin@caraudioevents.com';

-- Create a function that can safely create the admin user profile
-- This will be called AFTER the auth user is created
CREATE OR REPLACE FUNCTION create_admin_user_profile(auth_user_id uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- Create user profile in public.users table
  INSERT INTO public.users (
    id,
    email,
    name,
    membership_type,
    status,
    verification_status,
    subscription_plan,
    password_changed_at,
    created_at,
    updated_at
  ) VALUES (
    auth_user_id,
    'admin@caraudioevents.com',
    'System Administrator',
    'admin',
    'active',
    'verified',
    'enterprise',
    NULL, -- Will require password change on first login
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    email = 'admin@caraudioevents.com',
    name = 'System Administrator',
    membership_type = 'admin',
    status = 'active',
    verification_status = 'verified',
    subscription_plan = 'enterprise',
    updated_at = NOW();
  
  -- Create admin role
  INSERT INTO public.user_roles (
    user_id,
    role_name,
    is_active,
    granted_at
  ) VALUES (
    auth_user_id,
    'admin',
    true,
    NOW()
  ) ON CONFLICT (user_id, role_name) DO UPDATE SET
    is_active = true,
    granted_at = NOW();
  
  -- Create user preferences
  INSERT INTO public.user_preferences (user_id)
  VALUES (auth_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  result := json_build_object(
    'success', true,
    'message', 'Admin user profile created successfully',
    'user_id', auth_user_id,
    'email', 'admin@caraudioevents.com'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if admin user exists
CREATE OR REPLACE FUNCTION check_admin_user_exists()
RETURNS json AS $$
DECLARE
  admin_count integer;
  result json;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM public.users 
  WHERE email = 'admin@caraudioevents.com' 
  AND membership_type = 'admin';
  
  result := json_build_object(
    'admin_exists', admin_count > 0,
    'count', admin_count,
    'email', 'admin@caraudioevents.com'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function that provides admin user credentials info
CREATE OR REPLACE FUNCTION get_admin_credentials_info()
RETURNS json AS $$
BEGIN
  RETURN json_build_object(
    'email', 'admin@caraudioevents.com',
    'password', 'TempAdmin123!',
    'note', 'Use these credentials after creating the admin user'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_admin_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_admin_user_exists() TO anon;
GRANT EXECUTE ON FUNCTION get_admin_credentials_info() TO anon;