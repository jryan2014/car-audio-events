/*
  # Create Admin User Account

  1. New Admin User
    - Creates admin user in auth.users table
    - Creates corresponding profile in users table
    - Sets up admin roles and permissions
    - Logs the creation in audit tables

  2. Security
    - Secure password set directly
    - Admin role permissions configured
    - Audit trail established
*/

-- Create the admin user directly in auth.users
DO $$
DECLARE
  admin_user_id uuid := gen_random_uuid();
  admin_email text := 'admin@caraudioevents.com';
  admin_password text := 'AdminSecure2025!@#';
  encrypted_password text;
  existing_user_id uuid;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO existing_user_id FROM auth.users WHERE email = admin_email;
  
  IF existing_user_id IS NOT NULL THEN
    -- User exists, use existing ID
    admin_user_id := existing_user_id;
    RAISE NOTICE 'Admin user already exists with email: %', admin_email;
  ELSE
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
    );
    
    RAISE NOTICE 'Admin user created successfully with email: % and password: %', admin_email, admin_password;
  END IF;
  
  -- Insert or update users table
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
    now(),
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

  -- Create admin audit log entry (only if it doesn't exist)
  IF NOT EXISTS (
    SELECT 1 FROM admin_audit_log 
    WHERE admin_id = admin_user_id 
    AND action = 'admin_account_created'
  ) THEN
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
    );
  END IF;

  -- Create user activity log entry (only if it doesn't exist)
  IF NOT EXISTS (
    SELECT 1 FROM user_activity_log 
    WHERE user_id = admin_user_id 
    AND action = 'account_created'
    AND resource_type = 'users'
  ) THEN
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
    );
  END IF;

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