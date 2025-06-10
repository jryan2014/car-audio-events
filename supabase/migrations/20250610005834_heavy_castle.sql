/*
  # Fix infinite recursion in users table RLS policies

  1. Security Changes
    - Remove recursive policies that query users table from within users policies
    - Use auth.jwt() claims and auth.users metadata for admin checks
    - Simplify policies to avoid circular dependencies

  2. Policy Updates
    - Replace complex subqueries with direct auth checks
    - Use service_role for admin operations where appropriate
    - Maintain security while eliminating recursion
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Create new non-recursive policies
CREATE POLICY "Service role has full access to users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all users (non-recursive)"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    (jwt() ->> 'role')::text = 'service_role'::text 
    OR 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'membership_type' = 'admin'
  );

CREATE POLICY "Admins can update all users (non-recursive)"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    (jwt() ->> 'role')::text = 'service_role'::text 
    OR 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'membership_type' = 'admin'
    OR 
    auth.uid() = id
  )
  WITH CHECK (
    (jwt() ->> 'role')::text = 'service_role'::text 
    OR 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'membership_type' = 'admin'
    OR 
    auth.uid() = id
  );

-- Also fix other policies that might have similar issues
DROP POLICY IF EXISTS "Admins can manage all user roles" ON user_roles;
CREATE POLICY "Admins can manage all user roles (non-recursive)"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    (jwt() ->> 'role')::text = 'service_role'::text 
    OR 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'membership_type' = 'admin'
  );

DROP POLICY IF EXISTS "Admins can view all registrations" ON event_registrations;
CREATE POLICY "Admins can view all registrations (non-recursive)"
  ON event_registrations
  FOR SELECT
  TO authenticated
  USING (
    (jwt() ->> 'role')::text = 'service_role'::text 
    OR 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'membership_type' = 'admin'
  );

DROP POLICY IF EXISTS "Admins can view all sessions" ON user_sessions;
CREATE POLICY "Admins can view all sessions (non-recursive)"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (
    (jwt() ->> 'role')::text = 'service_role'::text 
    OR 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'membership_type' = 'admin'
  );

DROP POLICY IF EXISTS "Admins can view all activity" ON user_activity_log;
CREATE POLICY "Admins can view all activity (non-recursive)"
  ON user_activity_log
  FOR SELECT
  TO authenticated
  USING (
    (jwt() ->> 'role')::text = 'service_role'::text 
    OR 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'membership_type' = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete events" ON events;
CREATE POLICY "Admins can delete events (non-recursive)"
  ON events
  FOR DELETE
  TO authenticated
  USING (
    (jwt() ->> 'role')::text = 'service_role'::text 
    OR 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'membership_type' = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update all events" ON events;
CREATE POLICY "Admins can update all events (non-recursive)"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    (jwt() ->> 'role')::text = 'service_role'::text 
    OR 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'membership_type' = 'admin'
  );

DROP POLICY IF EXISTS "Admins can view all events" ON events;
CREATE POLICY "Admins can view all events (non-recursive)"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    (jwt() ->> 'role')::text = 'service_role'::text 
    OR 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'membership_type' = 'admin'
  );

DROP POLICY IF EXISTS "Admins can manage all event images" ON event_images;
CREATE POLICY "Admins can manage all event images (non-recursive)"
  ON event_images
  FOR ALL
  TO authenticated
  USING (
    (jwt() ->> 'role')::text = 'service_role'::text 
    OR 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'membership_type' = 'admin'
  );

DROP POLICY IF EXISTS "Admins can manage role permissions" ON role_permissions;
CREATE POLICY "Admins can manage role permissions (non-recursive)"
  ON role_permissions
  FOR ALL
  TO authenticated
  USING (
    (jwt() ->> 'role')::text = 'service_role'::text 
    OR 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'membership_type' = 'admin'
  );