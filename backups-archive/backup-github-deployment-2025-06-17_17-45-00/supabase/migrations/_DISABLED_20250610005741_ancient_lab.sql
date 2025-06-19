/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - The current RLS policies on the users table are causing infinite recursion
    - This happens when policies reference the users table in a circular manner
    - The error occurs during event queries that join with users/organizations

  2. Solution
    - Drop and recreate the problematic policies with simpler, non-recursive logic
    - Use direct auth.uid() comparisons instead of complex subqueries
    - Ensure admin policies don't create circular references

  3. Changes
    - Simplify admin access policies
    - Fix user profile access policies
    - Remove circular references in policy conditions
*/

-- First, drop all existing policies on the users table to start fresh
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Service role has full access" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create simplified, non-recursive policies

-- 1. Service role has full access (no recursion risk)
CREATE POLICY "Service role has full access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Users can manage their own profile (direct auth.uid() comparison)
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

-- 3. Simplified admin access policy using auth metadata instead of table lookup
CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Check if user has admin role in auth metadata
    (auth.jwt() ->> 'role')::text = 'service_role'
    OR 
    -- Or check if the current user's membership_type is admin (direct lookup, no recursion)
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      WHERE au.id = auth.uid() 
      AND (au.raw_user_meta_data ->> 'role')::text = 'admin'
    )
  );

-- 4. Admin management policy (simplified)
CREATE POLICY "Admins can manage all users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    -- Check if user has admin role in auth metadata
    (auth.jwt() ->> 'role')::text = 'service_role'
    OR 
    -- Or check if the current user's membership_type is admin (direct lookup, no recursion)
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      WHERE au.id = auth.uid() 
      AND (au.raw_user_meta_data ->> 'role')::text = 'admin'
    )
  )
  WITH CHECK (
    -- Same check for WITH CHECK
    (auth.jwt() ->> 'role')::text = 'service_role'
    OR 
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      WHERE au.id = auth.uid() 
      AND (au.raw_user_meta_data ->> 'role')::text = 'admin'
    )
  );

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;