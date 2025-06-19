/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Current admin policies on users table create infinite recursion
    - Policies check if user is admin by querying users table, creating circular dependency

  2. Solution
    - Drop existing problematic policies
    - Create new policies that avoid circular references
    - Use auth.uid() directly without querying users table for admin checks
    - Simplify admin access using service role or separate admin functions

  3. Changes
    - Remove policies that query users table to check admin status
    - Add simpler policies for user self-management
    - Admin operations should be handled via service role or edge functions
*/

-- Drop existing problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Keep the existing user self-management policies (these are fine)
-- "Users can update their own profile" - uses (uid() = id) which is safe
-- "Users can view their own profile" - uses (uid() = id) which is safe

-- Add a policy for user registration (insert)
-- This allows new users to be created during registration
CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add a policy to allow service role full access for admin operations
-- This will be used by edge functions for admin operations
CREATE POLICY "Service role full access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);