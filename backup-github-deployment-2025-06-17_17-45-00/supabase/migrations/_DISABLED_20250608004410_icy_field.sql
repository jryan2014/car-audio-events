/*
  # Create Admin User Setup

  1. New Functions
    - `create_admin_user()` - Creates admin user in auth and users table
    - `setup_admin_permissions()` - Sets up admin roles and permissions
  
  2. Admin User Creation
    - Creates auth user with email admin@caraudioevents.com
    - Creates corresponding profile in users table
    - Sets up admin roles and permissions
    - Requires password change on first login
  
  3. Security
    - Admin user created with temporary password
    - Password change required on first login
    - Full audit logging
*/

-- Function to create admin user
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  temp_password text := 'TempAdmin123!';
  admin_email text := 'admin@caraudioevents.com';
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    -- Create admin user in auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      admin_email,
      crypt(temp_password, gen_salt('bf')),
      now(),
      NULL,
      NULL,
      '{"provider": "email", "providers": ["email"]}',
      '{"require_password_change": true}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO admin_user_id;
  ELSE
    -- Update existing auth user
    UPDATE auth.users 
    SET 
      raw_user_meta_data = '{"require_password_change": true}',
      updated_at = now()
    WHERE id = admin_user_id;
  END IF;
  
  -- Create or update user profile
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
    admin_user_id,
    admin_email,
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
  ) ON CONFLICT (id) DO UPDATE SET
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
    admin_user_id,
    'super_admin',
    admin_user_id,
    now(),
    NULL,
    true,
    '{"granted_reason": "initial_admin_setup", "permissions": "all"}'
  ) ON CONFLICT (user_id, role_name) DO UPDATE SET
    is_active = true,
    granted_at = now();

  -- Create admin audit log entry
  INSERT INTO admin_audit_log (
    admin_id,
    action,
    details,
    created_at
  ) VALUES (
    admin_user_id,
    'admin_account_created',
    jsonb_build_object(
      'email', admin_email,
      'created_by', 'system',
      'requires_password_change', true,
      'temp_password', 'TempAdmin123!'
    ),
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
    admin_user_id,
    'account_created',
    'users',
    admin_user_id::text,
    jsonb_build_object(
      'account_type', 'admin',
      'email', admin_email,
      'requires_password_change', true
    ),
    now()
  );

  RAISE NOTICE 'Admin user created successfully with email: % and temporary password: %', admin_email, temp_password;
END;
$$;

-- Function to setup admin permissions
CREATE OR REPLACE FUNCTION setup_admin_permissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert comprehensive admin role permissions
  INSERT INTO role_permissions (role_name, permission, resource, conditions) VALUES
    ('super_admin', 'all', 'users', '{}'),
    ('super_admin', 'all', 'events', '{}'),
    ('super_admin', 'all', 'payments', '{}'),
    ('super_admin', 'all', 'subscriptions', '{}'),
    ('super_admin', 'all', 'registrations', '{}'),
    ('super_admin', 'all', 'settings', '{}'),
    ('super_admin', 'all', 'audit_logs', '{}'),
    ('super_admin', 'all', 'roles', '{}'),
    ('super_admin', 'all', 'permissions', '{}'),
    ('admin', 'read', 'users', '{}'),
    ('admin', 'update', 'users', '{}'),
    ('admin', 'read', 'events', '{}'),
    ('admin', 'create', 'events', '{}'),
    ('admin', 'update', 'events', '{}'),
    ('admin', 'read', 'payments', '{}'),
    ('admin', 'read', 'audit_logs', '{}')
  ON CONFLICT (role_name, permission, resource) DO NOTHING;
END;
$$;

-- Execute the functions to create admin user and setup permissions
-- Temporarily commented out - will be executed after users table is created
-- SELECT create_admin_user();
-- SELECT setup_admin_permissions();

-- Drop the functions after use (optional, for security)
-- DROP FUNCTION IF EXISTS create_admin_user();
-- DROP FUNCTION IF EXISTS setup_admin_permissions();