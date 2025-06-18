/*
  # Fix anonymous user permissions for users table

  1. Permissions
    - Grant SELECT permission to anon role on users table
    - Ensure anon users can read public user information needed for events

  2. Security
    - RLS policies already exist but need to ensure they work with the granted permissions
    - Only allow access to non-sensitive user data for public viewing
*/

-- Grant SELECT permission to anon role on users table
GRANT SELECT ON public.users TO anon;

-- Ensure the existing RLS policy for anonymous users is properly configured
-- The policy "Anonymous users can read basic user info" already exists,
-- but let's make sure it's working correctly by recreating it if needed

DO $$
BEGIN
  -- Drop the existing policy if it exists and recreate it
  DROP POLICY IF EXISTS "Anonymous users can read basic user info" ON public.users;
  
  -- Create a comprehensive policy for anonymous users to read basic user info
  CREATE POLICY "Anonymous users can read basic user info"
    ON public.users
    FOR SELECT
    TO anon
    USING (
      status = 'active' AND 
      (
        membership_type IN ('organization', 'retailer', 'manufacturer') OR
        verification_status = 'verified'
      )
    );
END $$;

-- Also ensure anon can read from organizations table since events reference it
GRANT SELECT ON public.organizations TO anon;

-- Ensure anon can read from event_categories table
GRANT SELECT ON public.event_categories TO anon;

-- Ensure anon can read from events table (should already be granted but let's be explicit)
GRANT SELECT ON public.events TO anon;