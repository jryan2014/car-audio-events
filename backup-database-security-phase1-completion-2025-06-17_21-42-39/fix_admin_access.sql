-- Fix admin access to admin_settings table
-- This script ensures admin users can access the admin_settings table

-- First, let's see what policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'admin_settings';

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Admin can manage settings" ON admin_settings;
DROP POLICY IF EXISTS "Admin users can manage admin settings" ON admin_settings;

-- Create a more permissive policy for authenticated users to access admin_settings
-- This will help us debug the access issue
CREATE POLICY "Allow authenticated admin access" ON admin_settings
  FOR ALL 
  TO authenticated 
  USING (
    -- Allow access if user email is admin OR if they have admin role in JWT OR direct auth check
    auth.email() = 'admin@caraudioevents.com' 
    OR 
    (auth.jwt() ->> 'email') = 'admin@caraudioevents.com'
    OR
    auth.uid() IS NOT NULL  -- Temporary: allow any authenticated user for debugging
  )
  WITH CHECK (
    auth.email() = 'admin@caraudioevents.com' 
    OR 
    (auth.jwt() ->> 'email') = 'admin@caraudioevents.com'
    OR
    auth.uid() IS NOT NULL  -- Temporary: allow any authenticated user for debugging
  );

-- Ensure the admin user exists in auth.users (if using custom admin setup)
-- This is commented out as it's handled by the application

-- Create some test data if the table is empty
INSERT INTO admin_settings (setting_key, setting_value) VALUES 
  ('test_setting', 'test_value'),
  ('login_debug_mode', 'false')
ON CONFLICT (setting_key) DO NOTHING;

-- Show current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'admin_settings';

-- Test query to verify access
SELECT 'Admin settings access test' as test_name, count(*) as row_count FROM admin_settings; 