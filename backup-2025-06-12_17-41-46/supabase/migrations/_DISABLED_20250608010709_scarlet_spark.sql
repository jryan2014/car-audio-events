/*
  # Fix RLS policies for users table

  1. Security Updates
    - Drop existing policies that use incorrect `uid()` function
    - Create new policies using correct `auth.uid()` function
    - Ensure authenticated users can read and update their own profiles
    - Maintain service role access for admin operations

  2. Policy Changes
    - Replace "Users can read own profile" policy
    - Replace "Users can update own profile" policy  
    - Replace "Users can insert own profile" policy
    - Keep service role policy unchanged
*/

-- Drop existing policies that use incorrect uid() function
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create new policies using correct auth.uid() function
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