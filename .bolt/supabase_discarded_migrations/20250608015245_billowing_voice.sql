/*
  # Create Admin User Directly

  1. New Tables
    - Creates admin user directly in auth.users and users tables
  2. Security
    - Sets up proper admin permissions
    - Creates secure password hash
  3. Admin Credentials
    - Email: admin@caraudioevents.com
    - Password: AdminSecure2025!@#
*/

-- Create the admin user directly in auth.users
DO $$
DECLARE
  admin_user_id uuid := gen_random_uuid();
  admin_email text := 'admin@caraudioevents.com';
  admin_password text := 'AdminSecure2025!@#';
  encrypted_password text;
BEGIN
  -- Generate encrypted password
  encrypted_password := crypt(admin_password, gen_salt('bf'));
  
  -- Insert into auth.users
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
    admin_user_id,
    'authenticated',
    'authenticated',
    admin_email,
    encrypted_password,
    now(),
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "System Administrator"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = encrypted_password,
    updated_at = now();

  -- Get the actual user ID (in case of conflict)
  SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email;
  
  -- Insert into users table
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
    now(), -- Password has been changed (not temporary)
    false,
    '{"require_password_change": false, "first_login": false}',
    '{"created_by": "system", "account_type": "admin", "initial_setup": true}',
    now(),
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    membership_type = 'admin',
    status = 'active',
    verification_status = 'verified',
    subscription_plan = 'enterprise',
    password_changed_at = now(),
    preferences = '{"require_password_change": false, "first_login": false}',
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
      'requires_password_change', false,
      'secure_password_set', true
    ),
    now()
  ) ON CONFLICT DO NOTHING;

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
      'requires_password_change', false
    ),
    now()
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Admin user created successfully with email: % and password: %', admin_email, admin_password;
END $$;

-- Ensure comprehensive admin role permissions exist
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