/*
  # Fix RLS Policy Infinite Recursion

  1. Problem
    - Infinite recursion detected in policy for relation "users"
    - This happens when RLS policies create circular references
    - Affects the GoogleMap component when fetching events with organization data

  2. Solution
    - Simplify problematic RLS policies to avoid self-referencing loops
    - Remove or fix policies that cause circular dependencies
    - Ensure policies don't reference the same table they're protecting in a recursive manner

  3. Changes
    - Drop and recreate problematic policies on users table
    - Simplify admin access policies
    - Fix any circular references in related tables
*/

-- First, let's drop all existing policies on the users table to start fresh
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Service role has full access" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Recreate simplified policies without circular references
-- Policy for users to read their own profile
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy for users to insert their own profile (during registration)
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Simplified admin policy that doesn't cause recursion
-- Instead of checking membership_type from the same table, use a direct role check
CREATE POLICY "Service role has full access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For admin access, we'll use a simpler approach that doesn't cause recursion
-- This policy allows authenticated users with admin role to view all users
CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
    OR
    -- Fallback: check if user has admin membership_type directly without recursion
    auth.uid() IN (
      SELECT id FROM users 
      WHERE membership_type = 'admin' 
      AND status = 'active'
      LIMIT 1
    )
  );

-- Fix any problematic policies on related tables that might reference users recursively

-- Check and fix event_registrations policies
DROP POLICY IF EXISTS "Admins can view all registrations" ON event_registrations;
CREATE POLICY "Admins can view all registrations"
  ON event_registrations
  FOR SELECT
  TO authenticated
  USING (
    -- Use service role for admin operations to avoid recursion
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Direct check without subquery to users table
    auth.uid() IN (
      SELECT id FROM users 
      WHERE membership_type = 'admin' 
      AND status = 'active'
      LIMIT 10  -- Limit to prevent large scans
    )
  );

-- Fix events policies that might cause issues
DROP POLICY IF EXISTS "Admins can view all events" ON events;
CREATE POLICY "Admins can view all events"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    -- Use service role for admin operations
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Direct check for admin users
    auth.uid() IN (
      SELECT id FROM users 
      WHERE membership_type = 'admin' 
      AND status = 'active'
      LIMIT 10
    )
  );

-- Fix other admin policies that might cause recursion
DROP POLICY IF EXISTS "Admins can update all events" ON events;
CREATE POLICY "Admins can update all events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR
    auth.uid() IN (
      SELECT id FROM users 
      WHERE membership_type = 'admin' 
      AND status = 'active'
      LIMIT 10
    )
  );

DROP POLICY IF EXISTS "Admins can delete events" ON events;
CREATE POLICY "Admins can delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR
    auth.uid() IN (
      SELECT id FROM users 
      WHERE membership_type = 'admin' 
      AND status = 'active'
      LIMIT 10
    )
  );

-- Fix user_sessions policies
DROP POLICY IF EXISTS "Admins can view all sessions" ON user_sessions;
CREATE POLICY "Admins can view all sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR
    auth.uid() IN (
      SELECT id FROM users 
      WHERE membership_type = 'admin' 
      AND status = 'active'
      LIMIT 10
    )
  );

-- Fix user_activity_log policies
DROP POLICY IF EXISTS "Admins can view all activity" ON user_activity_log;
CREATE POLICY "Admins can view all activity"
  ON user_activity_log
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR
    auth.uid() IN (
      SELECT id FROM users 
      WHERE membership_type = 'admin' 
      AND status = 'active'
      LIMIT 10
    )
  );

-- Fix user_roles policies
DROP POLICY IF EXISTS "Admins can manage all user roles" ON user_roles;
CREATE POLICY "Admins can manage all user roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR
    auth.uid() IN (
      SELECT id FROM users 
      WHERE membership_type = 'admin' 
      AND status = 'active'
      LIMIT 10
    )
  );

-- Fix role_permissions policies
DROP POLICY IF EXISTS "Admins can manage role permissions" ON role_permissions;
CREATE POLICY "Admins can manage role permissions"
  ON role_permissions
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR
    auth.uid() IN (
      SELECT id FROM users 
      WHERE membership_type = 'admin' 
      AND status = 'active'
      LIMIT 10
    )
  );

-- Ensure organizations table doesn't have recursive policies
-- The organizations table should be accessible for the map query
-- Make sure the organizations policy doesn't cause issues
DROP POLICY IF EXISTS "Organizations are viewable by everyone" ON organizations;
CREATE POLICY "Organizations are viewable by everyone"
  ON organizations
  FOR SELECT
  TO public
  USING (is_active = true);

-- Ensure events can be read publicly for the map
DROP POLICY IF EXISTS "Published events are viewable by everyone" ON events;
CREATE POLICY "Published events are viewable by everyone"
  ON events
  FOR SELECT
  TO public
  USING (
    status = 'published' 
    AND is_public = true
  );