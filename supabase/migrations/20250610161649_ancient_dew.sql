/*
  # Fix SQL Syntax Errors in Admin Functions
  
  1. Changes
     - Fix syntax errors in SQL function definitions
     - Use proper PL/pgSQL syntax with BEGIN/RETURN/END blocks
     - Grant necessary permissions for map component
     - Fix RLS policies for events table
  
  2. Security
     - Maintain existing security model
     - Ensure proper access control for admin functions
     - Allow anonymous access to published events
*/

-- First ensure we have the proper grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.event_categories TO anon;
GRANT SELECT ON public.organizations TO anon;

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

-- Create a comprehensive policy for admin users with full access
CREATE POLICY "Admins have full access to users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (public.is_admin_check())
  WITH CHECK (public.is_admin_check());

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

-- Fix permissions for the map view
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Ensure published events are viewable by everyone
DROP POLICY IF EXISTS "Published events are viewable by everyone" ON public.events;
CREATE POLICY "Published events are viewable by everyone"
  ON public.events
  FOR SELECT
  TO public
  USING ((status = 'published'::text) AND (is_public = true));

-- Grant anonymous users access to read basic user info
DROP POLICY IF EXISTS "Anonymous users can read basic user info" ON public.users;
CREATE POLICY "Anonymous users can read basic user info"
  ON public.users
  FOR SELECT
  TO anon
  USING (
    status = 'active' AND 
    (
      membership_type IN ('organization', 'retailer', 'manufacturer') OR
      verification_status = 'verified'
    )
  );

-- Grant SELECT permission to anon role on users table
GRANT SELECT ON public.users TO anon;