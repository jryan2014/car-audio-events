-- Fix User Signup Security - Prevent Auto-Admin Assignment
-- Run this in Supabase SQL Editor

-- Step 1: Fix the database trigger to prevent admin auto-assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_membership_type TEXT;
BEGIN
    -- Extract metadata safely
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
    
    -- SECURITY FIX: Always default to 'competitor', NEVER allow 'admin'
    user_membership_type := COALESCE(NEW.raw_user_meta_data->>'membership_type', 'competitor');
    
    -- CRITICAL: Block ANY attempt to create admin through signup
    IF user_membership_type = 'admin' OR user_membership_type = 'support_member' THEN
        user_membership_type := 'competitor';
    END IF;
    
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
            user_membership_type, -- Always 'competitor' or safe value
            'pending', -- New users start pending approval
            COALESCE(NEW.raw_user_meta_data->>'address', ''),
            COALESCE(NEW.raw_user_meta_data->>'city', ''),
            COALESCE(NEW.raw_user_meta_data->>'state', ''),
            COALESCE(NEW.raw_user_meta_data->>'zip', ''),
            COALESCE(NEW.raw_user_meta_data->>'phone', ''),
            COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
            'pending', -- Requires admin verification
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
            -- User already exists, update safely (don't change membership_type)
            UPDATE public.users SET
                email = NEW.email,
                name = user_name,
                updated_at = NOW()
            WHERE id = NEW.id;
        WHEN OTHERS THEN
            -- Log error but don't fail auth creation
            RAISE WARNING 'Failed to create/update user profile for %: %', NEW.email, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Check current admin users (see who needs fixing)
SELECT id, email, name, membership_type, status 
FROM public.users 
WHERE membership_type = 'admin'
ORDER BY created_at DESC;

-- Step 3: Fix any incorrect admin users (except legitimate admin)
-- Uncomment and modify this section after reviewing Step 2 results:
/*
UPDATE public.users 
SET membership_type = 'competitor', 
    status = 'pending',
    verification_status = 'pending',
    updated_at = NOW()
WHERE membership_type = 'admin' 
  AND email NOT IN ('admin@caraudioevents.com');
*/

SELECT 'User signup security fix completed - new signups will be competitors only' as status; 