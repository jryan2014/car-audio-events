/*
  # Setup Supabase Authentication Triggers and Admin User

  1. Database Functions
    - Create function to handle new user registration
    - Setup automatic profile creation on auth signup
  
  2. Triggers
    - Trigger to create user profile when auth user is created
    - Handle admin user creation properly
  
  3. Admin User Creation
    - Use Supabase's proper auth.admin functions
    - Create admin user through proper channels
*/

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    membership_type,
    status,
    verification_status,
    subscription_plan,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'membership_type', 'competitor'),
    'active',
    CASE 
      WHEN NEW.email_confirmed_at IS NOT NULL THEN 'verified'
      ELSE 'unverified'
    END,
    'free',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create admin user properly
CREATE OR REPLACE FUNCTION public.create_admin_user()
RETURNS json AS $$
DECLARE
  admin_user_id uuid;
  result json;
BEGIN
  -- Check if admin already exists
  SELECT id INTO admin_user_id 
  FROM public.users 
  WHERE email = 'admin@caraudioevents.com' AND membership_type = 'admin';
  
  IF admin_user_id IS NOT NULL THEN
    result := json_build_object(
      'success', true,
      'message', 'Admin user already exists',
      'user_id', admin_user_id,
      'email', 'admin@caraudioevents.com'
    );
    RETURN result;
  END IF;
  
  -- This function should be called from an edge function with proper auth
  -- For now, we'll create a placeholder that can be updated
  INSERT INTO public.users (
    id,
    email,
    name,
    membership_type,
    status,
    verification_status,
    subscription_plan,
    password_changed_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'admin@caraudioevents.com',
    'System Administrator',
    'admin',
    'active',
    'verified',
    'enterprise',
    NULL, -- Will require password change
    NOW(),
    NOW()
  ) RETURNING id INTO admin_user_id;
  
  -- Create admin role
  INSERT INTO public.user_roles (
    user_id,
    role_name,
    is_active,
    granted_at
  ) VALUES (
    admin_user_id,
    'admin',
    true,
    NOW()
  );
  
  result := json_build_object(
    'success', true,
    'message', 'Admin user profile created - auth user must be created via Supabase Auth',
    'user_id', admin_user_id,
    'email', 'admin@caraudioevents.com',
    'note', 'Use Supabase Auth admin functions to create the actual auth user'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;