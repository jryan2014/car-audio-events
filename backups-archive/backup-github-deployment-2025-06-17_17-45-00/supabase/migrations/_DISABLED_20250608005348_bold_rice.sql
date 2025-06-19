/*
  # Fix Users Table RLS Policies

  1. Security Updates
    - Drop existing RLS policies that use incorrect `uid()` function
    - Create new RLS policies using correct `auth.uid()` function
    - Ensure authenticated users can properly access their own profile data

  2. Policy Changes
    - Replace "Users can read own profile" policy
    - Replace "Users can insert own profile" policy  
    - Replace "Users can update own profile" policy
    - Keep "Service role has full access" policy unchanged
*/

-- Drop existing policies that use incorrect uid() function
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create new policies with correct auth.uid() function
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);