/*
  # Fix Admin User Edit Permissions

  1. Permissions
    - Grant proper permissions to authenticated and anonymous users
    - Fix policies for admin users to manage other users
    - Ensure users can still manage their own profiles
  
  2. Helper Functions
    - Create uniquely named helper functions for permission checks
    - Add function to check admin status
    - Add function to check user edit permissions
*/

-- First, ensure we have the proper grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- Drop any problematic policies that might be causing issues
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

-- Create a simpler policy for admin users to view all users
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'service_role'::text 
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND membership_type = 'admin' AND status = 'active'
    )
  );

-- Create a simpler policy for admin users to update all users
CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'service_role'::text 
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND membership_type = 'admin' AND status = 'active'
    )
    OR auth.uid() = id
  )
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'service_role'::text 
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND membership_type = 'admin' AND status = 'active'
    )
    OR auth.uid() = id
  );

-- Create a policy for admin users to insert users
CREATE POLICY "Admins can insert users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'service_role'::text 
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND membership_type = 'admin' AND status = 'active'
    )
    OR auth.uid() = id
  );

-- Ensure users can still manage their own profiles
-- These policies should already exist, but we'll recreate them to be sure
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Check if the function already exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'check_user_is_admin' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Create a function with a unique name to check if a user is an admin
    CREATE FUNCTION public.check_user_is_admin()
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
      SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND membership_type = 'admin' AND status = 'active'
      );
    $$;
  END IF;
END
$$;

-- Check if the function already exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'check_can_edit_user' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Create a function with a unique name to check if a user can edit another user
    CREATE FUNCTION public.check_can_edit_user(user_id uuid)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
      SELECT 
        (auth.jwt() ->> 'role')::text = 'service_role'::text 
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND membership_type = 'admin' AND status = 'active'
        )
        OR auth.uid() = user_id;
    $$;
  END IF;
END
$$;