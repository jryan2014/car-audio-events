-- Simple Admin Security Fix
-- Run this step by step

-- Step 1: Fix the trigger function to prevent future admin auto-assignments
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_membership_type TEXT;
BEGIN
    -- Extract metadata safely
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
    
    -- SECURITY FIX: Always default to 'competitor', never 'admin'
    user_membership_type := COALESCE(NEW.raw_user_meta_data->>'membership_type', 'competitor');
    
    -- Ensure no one can sign up as admin through the trigger
    IF user_membership_type = 'admin' THEN
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
            user_membership_type, -- This will always be 'competitor' or other safe value
            'pending', -- New users start as pending
            COALESCE(NEW.raw_user_meta_data->>'address', ''),
            COALESCE(NEW.raw_user_meta_data->>'city', ''),
            COALESCE(NEW.raw_user_meta_data->>'state', ''),
            COALESCE(NEW.raw_user_meta_data->>'zip', ''),
            COALESCE(NEW.raw_user_meta_data->>'phone', ''),
            COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
            'pending', -- New users need verification
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
            -- User already exists, update but don't change membership_type to admin
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

-- Step 2: Check which users are currently admins (run this to see who needs to be fixed)
SELECT id, email, name, membership_type, status 
FROM public.users 
WHERE membership_type = 'admin';

-- Step 3: Manually fix incorrect admin users (ONLY run this after checking Step 2)
-- Replace 'admin@caraudioevents.com' with your actual admin email
-- Uncomment the lines below and modify as needed:

/*
UPDATE public.users 
SET membership_type = 'competitor', 
    status = 'pending',
    verification_status = 'pending'
WHERE membership_type = 'admin' 
  AND email != 'admin@caraudioevents.com';
*/

SELECT 'Admin security fix completed - trigger updated to prevent future auto-admin assignments' as status; 