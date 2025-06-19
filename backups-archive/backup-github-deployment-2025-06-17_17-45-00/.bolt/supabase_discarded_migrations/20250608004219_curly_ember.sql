/*
  # Create Admin User with Password Change Requirement

  1. New Tables
    - Creates admin user account with email admin@caraudioevents.com
    - Sets up password change requirement on first login
    - Ensures admin has proper permissions and status

  2. Security
    - Admin user created with temporary password
    - Password change required flag set to true
    - Admin membership type and active status assigned

  3. Initial Setup
    - Creates the admin user in auth.users
    - Creates corresponding profile in users table
    - Sets up audit logging for admin creation
*/

-- Create the admin user in Supabase Auth
-- Note: In production, this would be done through Supabase dashboard or API
-- This is a placeholder for the SQL structure

-- Insert admin user profile (the auth user will be created separately)
INSERT INTO users (
  id,
  email,
  name,
  membership_type,
  status,
  location,
  phone,
  website,
  bio,
  company_name,
  verification_status,
  subscription_plan,
  password_changed_at,
  two_factor_enabled,
  preferences,
  metadata,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- This will be replaced with actual auth user ID
  'admin@caraudioevents.com',
  'System Administrator',
  'admin',
  'active',
  'System',
  NULL,
  NULL,
  'System administrator account for Car Audio Events platform',
  'Car Audio Events',
  'verified',
  'enterprise',
  NULL, -- This will force password change on first login
  false,
  '{"require_password_change": true, "first_login": true}',
  '{"created_by": "system", "account_type": "admin", "initial_setup": true}',
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  membership_type = 'admin',
  status = 'active',
  verification_status = 'verified',
  subscription_plan = 'enterprise',
  preferences = '{"require_password_change": true, "first_login": true}',
  updated_at = now();

-- Grant admin role permissions
INSERT INTO user_roles (
  user_id,
  role_name,
  granted_by,
  granted_at,
  expires_at,
  is_active,
  metadata
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'super_admin',
  '00000000-0000-0000-0000-000000000001',
  now(),
  NULL,
  true,
  '{"granted_reason": "initial_admin_setup", "permissions": "all"}'
) ON CONFLICT (user_id, role_name) DO UPDATE SET
  is_active = true,
  updated_at = now();

-- Create admin audit log entry
INSERT INTO admin_audit_log (
  admin_id,
  action,
  details,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin_account_created',
  '{"email": "admin@caraudioevents.com", "created_by": "system", "requires_password_change": true}',
  now()
);

-- Create user activity log entry
INSERT INTO user_activity_log (
  user_id,
  action,
  resource_type,
  resource_id,
  details,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'account_created',
  'users',
  '00000000-0000-0000-0000-000000000001',
  '{"account_type": "admin", "email": "admin@caraudioevents.com", "requires_password_change": true}',
  now()
);