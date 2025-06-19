-- Fix Admin User Creation
-- This script manually creates the admin user in both auth.users and users tables

-- First, ensure we have the admin user UUID
DO $$ 
DECLARE
    admin_user_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Insert into auth.users if not exists
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        role,
        aud,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin
    ) VALUES (
        admin_user_id,
        '00000000-0000-0000-0000-000000000000',
        'admin@caraudioevents.com',
        '$2a$10$8qS4SZF.YfHfEaK/dWNgLO8nH8jcAiV8EQjODUOYCF2G1W5iEFLe6', -- bcrypt hash for 'admin123!'
        now(),
        now(),
        now(),
        'authenticated',
        'authenticated',
        '',
        '',
        '',
        '',
        '{"provider": "email", "providers": ["email"], "role": "admin"}'::jsonb,
        '{"name": "System Administrator", "role": "admin"}'::jsonb,
        false
    ) ON CONFLICT (id) DO UPDATE SET
        encrypted_password = EXCLUDED.encrypted_password,
        updated_at = now(),
        raw_user_meta_data = EXCLUDED.raw_user_meta_data;

    -- Insert/update in users table
    INSERT INTO users (
        id,
        email,
        name,
        membership_type,
        status,
        verification_status,
        subscription_plan,
        created_at,
        updated_at
    ) VALUES (
        admin_user_id,
        'admin@caraudioevents.com',
        'System Administrator',
        'enterprise',
        'active',
        'verified',
        'enterprise',
        now(),
        now()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        membership_type = EXCLUDED.membership_type,
        status = EXCLUDED.status,
        verification_status = EXCLUDED.verification_status,
        subscription_plan = EXCLUDED.subscription_plan,
        updated_at = now();

    RAISE NOTICE 'Admin user created/updated successfully!';
    RAISE NOTICE 'Login credentials:';
    RAISE NOTICE 'Email: admin@caraudioevents.com';
    RAISE NOTICE 'Password: admin123!';
END $$; 