/*
  # Fix Organizations RLS Policy for Anonymous Access

  1. Security Changes
    - Update organizations RLS policy to allow anonymous users to view active organizations
    - Remove dependency on users table for public organization viewing
    - Ensure map can load organization data without authentication

  2. Changes Made
    - Drop existing restrictive policy for anonymous access
    - Create new policy that allows anonymous users to view active organizations
    - Maintain security by only showing active organizations
*/

-- Drop the existing policy that may be causing issues
DROP POLICY IF EXISTS "Organizations are viewable by everyone" ON organizations;

-- Create a new policy that allows anonymous users to view active organizations
-- without requiring access to the users table
CREATE POLICY "Public organizations are viewable by everyone"
  ON organizations
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Ensure the organizations table has RLS enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;