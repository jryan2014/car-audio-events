-- Fix Auto-Admin Assignment Issue
-- This prevents new users from being automatically set as admins

-- Update the trigger function to ensure new users are set as 'competitor' by default
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
                first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', first_name),
                last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', last_name),
                -- Don't update membership_type from metadata to prevent admin escalation
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

-- Fix any existing users who were incorrectly set as admin
-- (Only run this if you want to demote incorrectly assigned admins)
UPDATE public.users 
SET membership_type = 'competitor', 
    status = 'pending',
    verification_status = 'pending'
WHERE membership_type = 'admin' 
  AND created_at > NOW() - INTERVAL '1 hour' 
  AND email NOT IN (
    'your-admin@email.com',
    'another-admin@email.com'
  );

SELECT 'Admin auto-assignment fixed - new users will be competitors by default' as status; 