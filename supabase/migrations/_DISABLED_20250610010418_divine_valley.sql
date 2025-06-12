/*
  # Fix infinite recursion in users table RLS policies

  1. Changes
    - Replace recursive policies that reference the users table within their own definitions
    - Use JWT role and auth.uid() instead of querying the users table again
    - Fix circular dependencies in admin-related policies
  
  2. Security
    - Maintains same security model but implements it without recursion
    - Ensures admins can still manage all users
    - Preserves user's ability to manage their own profile
*/

-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

-- Create new non-recursive policies
CREATE POLICY "Service role has full access" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text OR 
         (auth.jwt() ->> 'membership_type'::text) = 'admin'::text);

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text OR 
         (auth.jwt() ->> 'membership_type'::text) = 'admin'::text OR 
         (auth.uid() = id))
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text OR 
              (auth.jwt() ->> 'membership_type'::text) = 'admin'::text OR 
              (auth.uid() = id));

-- Ensure users can still manage their own profiles
CREATE POLICY IF NOT EXISTS "Users can read own profile" ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);