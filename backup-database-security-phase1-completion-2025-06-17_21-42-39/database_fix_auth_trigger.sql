-- Fix Auth Trigger Issues
-- This script addresses potential issues with auth triggers when creating users

-- First, let's check if there's an existing trigger that creates user profiles
-- and update it to handle the new columns properly

-- Drop existing trigger if it exists (we'll recreate it properly)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a new function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table with all available fields
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
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'membership_type', 'competitor'),
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
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth creation
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Alternative approach: Create a simpler trigger that only handles basic fields
-- if the above fails due to missing columns

CREATE OR REPLACE FUNCTION public.handle_new_user_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert with only guaranteed fields
  INSERT INTO public.users (
    id,
    email,
    name,
    membership_type,
    status,
    verification_status,
    subscription_plan,
    created_at,
    updated_at,
    login_count,
    failed_login_attempts
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'membership_type', 'competitor'),
    'pending',
    'pending',
    'monthly',
    NOW(),
    NOW(),
    0,
    0
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth creation
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, anon, authenticated, service_role; 