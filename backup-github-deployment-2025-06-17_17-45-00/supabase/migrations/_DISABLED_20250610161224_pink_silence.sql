/*
  # Fix Admin User Edit Permissions

  1. Changes
     - Simplify admin user policies to ensure they can properly edit other users
     - Create a more robust policy structure with clearer conditions
     - Fix permission issues with the admin-update-user edge function
     - Ensure proper grants are in place for the authenticated role

  2. Security
     - Maintain row level security while fixing permission issues
     - Ensure only admins can edit other users
     - Regular users can still only edit their own profiles
*/

-- First ensure we have the proper grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, UPDATE, INSERT, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Drop any problematic policies that might be causing issues
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Service role has full access" ON public.users;

-- Create a comprehensive policy for admin users with full access
CREATE POLICY "Admins have full access to users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'service_role'::text 
    OR (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND membership_type = 'admin' AND status = 'active'
      )
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'service_role'::text 
    OR (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND membership_type = 'admin' AND status = 'active'
      )
    )
  );

-- Create a policy for service role with full access
CREATE POLICY "Service role has full access to users"
  ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure users can still manage their own profiles
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

-- Create a function to check if a user is an admin (for use in other policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    (auth.jwt() ->> 'role')::text = 'service_role'::text 
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND membership_type = 'admin' AND status = 'active'
    );
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO anon;

-- Ensure the admin-update-user edge function has the necessary permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;