/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - The current RLS policies on the users table are causing infinite recursion
    - This happens when policies reference the users table in a circular manner
    - The error occurs during event queries that join with users/organizations

  2. Solution
    - Drop and recreate the problematic policies with simpler, non-recursive logic
    - Ensure policies don't create circular dependencies
    - Use direct auth.uid() comparisons instead of complex subqueries where possible

  3. Changes
    - Remove the problematic "Admins can view all users" policy that uses complex subqueries
    - Simplify admin access using service role or direct role checks
    - Keep user self-access policies simple and direct
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Service role has full access" ON users;

-- Create simplified, non-recursive policies

-- Service role has full access (no recursion risk)
CREATE POLICY "Service role has full access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can manage their own profile (direct comparison, no recursion)
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Simplified admin access using auth metadata instead of recursive table lookup
CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Check if user has admin role in auth metadata
    (auth.jwt() ->> 'role')::text = 'service_role'
    OR 
    -- Check if user has admin membership type directly (avoid recursion)
    EXISTS (
      SELECT 1 FROM auth.users au 
      WHERE au.id = auth.uid() 
      AND (au.raw_user_meta_data ->> 'membership_type')::text = 'admin'
    )
  );

-- Allow admins to update other users
CREATE POLICY "Admins can update all users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    -- Service role can always update
    (auth.jwt() ->> 'role')::text = 'service_role'
    OR 
    -- Admin users can update others
    EXISTS (
      SELECT 1 FROM auth.users au 
      WHERE au.id = auth.uid() 
      AND (au.raw_user_meta_data ->> 'membership_type')::text = 'admin'
    )
    OR
    -- Users can always update themselves
    auth.uid() = id
  )
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'service_role'
    OR 
    EXISTS (
      SELECT 1 FROM auth.users au 
      WHERE au.id = auth.uid() 
      AND (au.raw_user_meta_data ->> 'membership_type')::text = 'admin'
    )
    OR
    auth.uid() = id
  );