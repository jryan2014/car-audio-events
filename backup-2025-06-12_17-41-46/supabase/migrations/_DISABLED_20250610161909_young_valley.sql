/*
  # Fix Database Permissions

  1. Permissions
    - Grant proper permissions to anonymous users for map functionality
    - Fix RLS policies for users table
    - Ensure events are properly accessible
  
  2. Functions
    - Create admin check function with correct syntax
    - Create user edit permission function
  
  3. Policies
    - Fix policies for users table
    - Fix policies for events table
*/

-- First ensure we have the proper grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant SELECT permissions to anonymous users for map functionality
GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.event_categories TO anon;
GRANT SELECT ON public.organizations TO anon;
GRANT SELECT ON public.users TO anon;

-- Create a function to check if a user is an admin (with proper syntax)
CREATE OR REPLACE FUNCTION public.is_admin_check()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    (auth.jwt() ->> 'role')::text = 'service_role'::text 
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND membership_type = 'admin' AND status = 'active'
    )
  );
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin_check() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_check() TO anon;

-- Create a function to check if a user can edit another user (with proper syntax)
CREATE OR REPLACE FUNCTION public.can_edit_user(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    (auth.jwt() ->> 'role')::text = 'service_role'::text 
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND membership_type = 'admin' AND status = 'active'
    )
    OR auth.uid() = user_id
  );
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.can_edit_user(uuid) TO authenticated;

-- Drop any problematic policies that might be causing issues
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Service role has full access" ON public.users;
DROP POLICY IF EXISTS "Admins have full access to users" ON public.users;
DROP POLICY IF EXISTS "Anonymous users can read basic user info" ON public.users;

-- Create a comprehensive policy for admin users with full access
CREATE POLICY "Admins have full access to users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (is_admin_check())
  WITH CHECK (is_admin_check());

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

-- Grant anonymous users access to read basic user info
CREATE POLICY "Anonymous users can read basic user info"
  ON public.users
  FOR SELECT
  TO anon
  USING (
    (status = 'active') AND 
    (
      (membership_type IN ('organization', 'retailer', 'manufacturer')) OR 
      (verification_status = 'verified')
    )
  );

-- Fix permissions for the map view
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Ensure published events are viewable by everyone
DROP POLICY IF EXISTS "Published events are viewable by everyone" ON public.events;
CREATE POLICY "Published events are viewable by everyone"
  ON public.events
  FOR SELECT
  TO public
  USING ((status = 'published') AND (is_public = true));

-- Ensure the admin-update-user edge function has the necessary permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;