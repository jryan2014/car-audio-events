-- Fix User Management RLS Policies 
-- Run this to fix the infinite recursion issue

-- 1. Drop the problematic policies
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

-- 2. Create simpler, working policies
-- Allow users to see their own profile + allow admins to see all
CREATE POLICY "users_select_policy" ON users
    FOR SELECT
    USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email = 'admin@caraudioevents.com'
        )
    );

-- Allow users to insert their own profile
CREATE POLICY "users_insert_policy" ON users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile + allow admin to update any
CREATE POLICY "users_update_policy" ON users
    FOR UPDATE
    USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email = 'admin@caraudioevents.com'
        )
    );

-- 3. Add missing fields to users table that the app expects
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- 4. Fix the status constraint to match what the app expects
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check 
    CHECK (status IN ('active', 'inactive', 'suspended', 'pending', 'banned'));

-- 5. Update the trigger function to use correct status values
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into users table with correct field names
    INSERT INTO users (
        id, 
        email, 
        name, 
        membership_type, 
        status, 
        verification_status,
        login_count,
        failed_login_attempts
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN NEW.email = 'admin@caraudioevents.com' THEN 'admin'
            ELSE 'competitor'
        END,
        'active',  -- Use 'active' instead of 'verified'
        'verified',
        0,
        0
    );
    
    -- Also insert into profiles table
    INSERT INTO profiles (id, email, name, membership_type, status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN NEW.email = 'admin@caraudioevents.com' THEN 'admin'
            ELSE 'competitor'
        END,
        'active'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Test the setup
SELECT 'Fixed user policies and updated schema' as status; 