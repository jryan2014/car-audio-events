-- Comprehensive Database Fix for User Creation Issues
-- Run this script in your Supabase SQL editor

-- Step 1: Ensure all required columns exist in users table
DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') THEN
        ALTER TABLE public.users ADD COLUMN first_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') THEN
        ALTER TABLE public.users ADD COLUMN last_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'address') THEN
        ALTER TABLE public.users ADD COLUMN address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'city') THEN
        ALTER TABLE public.users ADD COLUMN city TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'state') THEN
        ALTER TABLE public.users ADD COLUMN state TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'zip') THEN
        ALTER TABLE public.users ADD COLUMN zip TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'website') THEN
        ALTER TABLE public.users ADD COLUMN website TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'bio') THEN
        ALTER TABLE public.users ADD COLUMN bio TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'login_count') THEN
        ALTER TABLE public.users ADD COLUMN login_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'failed_login_attempts') THEN
        ALTER TABLE public.users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;
END $$;

-- Step 2: Drop existing problematic triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user_simple();

-- Step 3: Create a robust user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_membership_type TEXT;
BEGIN
    -- Extract metadata safely
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
    user_membership_type := COALESCE(NEW.raw_user_meta_data->>'membership_type', 'competitor');
    
    -- Insert into public.users table with error handling
    BEGIN
        INSERT INTO public.users (
            id,
            email,
            name,
            first_name,
            last_name,
            membership_type,
            status,
            address,
            city,
            state,
            zip,
            phone,
            company_name,
            verification_status,
            subscription_plan,
            website,
            bio,
            created_at,
            updated_at,
            login_count,
            failed_login_attempts
        ) VALUES (
            NEW.id,
            NEW.email,
            user_name,
            COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
            user_membership_type,
            'pending',
            COALESCE(NEW.raw_user_meta_data->>'address', ''),
            COALESCE(NEW.raw_user_meta_data->>'city', ''),
            COALESCE(NEW.raw_user_meta_data->>'state', ''),
            COALESCE(NEW.raw_user_meta_data->>'zip', ''),
            COALESCE(NEW.raw_user_meta_data->>'phone', ''),
            COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
            'pending',
            'monthly',
            COALESCE(NEW.raw_user_meta_data->>'website', ''),
            COALESCE(NEW.raw_user_meta_data->>'bio', ''),
            NOW(),
            NOW(),
            0,
            0
        );
    EXCEPTION
        WHEN unique_violation THEN
            -- User already exists, update instead
            UPDATE public.users SET
                email = NEW.email,
                name = user_name,
                first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', first_name),
                last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', last_name),
                membership_type = user_membership_type,
                address = COALESCE(NEW.raw_user_meta_data->>'address', address),
                city = COALESCE(NEW.raw_user_meta_data->>'city', city),
                state = COALESCE(NEW.raw_user_meta_data->>'state', state),
                zip = COALESCE(NEW.raw_user_meta_data->>'zip', zip),
                phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
                company_name = COALESCE(NEW.raw_user_meta_data->>'company_name', company_name),
                website = COALESCE(NEW.raw_user_meta_data->>'website', website),
                bio = COALESCE(NEW.raw_user_meta_data->>'bio', bio),
                updated_at = NOW()
            WHERE id = NEW.id;
        WHEN OTHERS THEN
            -- Log error but don't fail auth creation
            RAISE WARNING 'Failed to create/update user profile for %: %', NEW.email, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Ensure proper RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND membership_type = 'admin'
        )
    );

CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND membership_type = 'admin'
        )
    );

CREATE POLICY "Service role can insert users" ON public.users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Trigger can insert users" ON public.users
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Step 6: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_membership_type ON public.users(membership_type);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON public.users(verification_status);

-- Step 8: Update any existing users to have default values for new columns
UPDATE public.users SET
    first_name = COALESCE(first_name, ''),
    last_name = COALESCE(last_name, ''),
    address = COALESCE(address, ''),
    city = COALESCE(city, ''),
    state = COALESCE(state, ''),
    zip = COALESCE(zip, ''),
    website = COALESCE(website, ''),
    bio = COALESCE(bio, ''),
    updated_at = COALESCE(updated_at, created_at, NOW()),
    login_count = COALESCE(login_count, 0),
    failed_login_attempts = COALESCE(failed_login_attempts, 0)
WHERE 
    first_name IS NULL OR 
    last_name IS NULL OR 
    address IS NULL OR 
    city IS NULL OR 
    state IS NULL OR 
    zip IS NULL OR 
    website IS NULL OR 
    bio IS NULL OR 
    updated_at IS NULL OR 
    login_count IS NULL OR 
    failed_login_attempts IS NULL;

-- Verification message
SELECT 'Database fix completed successfully. All columns added, trigger updated, and policies configured.' as status; 