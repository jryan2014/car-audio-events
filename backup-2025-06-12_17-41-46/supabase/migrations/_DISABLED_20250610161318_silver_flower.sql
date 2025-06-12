/*
  # Fix Admin User Edit Permissions

  1. Permissions
    - Grant proper permissions to authenticated users
    - Create clear policies for admin access to users table
    - Maintain user self-management policies
  
  2. Functions
    - Create a unique admin check function with timestamp suffix
    - Grant execute permissions on functions
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
DROP POLICY IF EXISTS "Admins have full access to users" ON public.users;

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

-- Create a function with a unique name to check if a user is an admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_admin_20250610' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    CREATE FUNCTION public.is_admin_20250610()
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
  END IF;
END
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin_20250610() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_20250610() TO anon;

-- Ensure the admin-update-user edge function has the necessary permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant permissions on events table specifically
GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.events TO authenticated;

-- Grant permissions on event_categories table
GRANT SELECT ON public.event_categories TO anon;
GRANT SELECT ON public.event_categories TO authenticated;

-- Grant permissions on organizations table
GRANT SELECT ON public.organizations TO anon;
GRANT SELECT ON public.organizations TO authenticated;

-- Fix permissions for the map view
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Ensure published events are viewable by everyone
DROP POLICY IF EXISTS "Published events are viewable by everyone" ON public.events;
CREATE POLICY "Published events are viewable by everyone"
  ON public.events
  FOR SELECT
  TO public
  USING ((status = 'published'::text) AND (is_public = true));