-- Create User Management System for Car Audio Events Platform
-- Run this in Supabase SQL Editor

-- 1. Create users table for extended user profiles
CREATE TABLE IF NOT EXISTS users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    membership_type VARCHAR(50) DEFAULT 'competitor' CHECK (membership_type IN ('competitor', 'manufacturer', 'retailer', 'organization', 'admin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    location VARCHAR(100),
    phone VARCHAR(20),
    website VARCHAR(255),
    bio TEXT,
    company_name VARCHAR(100),
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    profile_image VARCHAR(255),
    requires_password_change BOOLEAN DEFAULT false,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create profiles table (alternative name some apps use)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255),
    name VARCHAR(100),
    membership_type VARCHAR(50) DEFAULT 'competitor',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for users table
CREATE POLICY "users_select_policy" ON users
    FOR SELECT
    USING (auth.uid() = id OR auth.uid() IN (
        SELECT id FROM users WHERE membership_type = 'admin'
    ));

CREATE POLICY "users_insert_policy" ON users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_policy" ON users
    FOR UPDATE
    USING (auth.uid() = id OR auth.uid() IN (
        SELECT id FROM users WHERE membership_type = 'admin'
    ));

-- 5. Create RLS policies for profiles table
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    USING (true);

CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- 6. Create function to automatically create user profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into users table
    INSERT INTO users (id, email, name, membership_type, status, verification_status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN NEW.email = 'admin@caraudioevents.com' THEN 'admin'
            ELSE 'competitor'
        END,
        'active',
        'verified'
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

-- 7. Create trigger to automatically handle new user registrations
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. Create admin user in auth.users if it doesn't exist
-- Note: This needs to be done manually in Supabase Dashboard Authentication section
-- We'll create a placeholder entry that will be updated when the real user signs up

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_membership_type ON users(membership_type);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 10. Grant necessary permissions
-- The RLS policies handle most access control, but ensure authenticated users can access these tables
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

-- Show what we've created
SELECT 'Users table created' as status;
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('users', 'profiles');
SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('users', 'profiles'); 