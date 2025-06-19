-- Fix admin_settings RLS policy to allow proper access
-- Run this in Supabase SQL Editor

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow authenticated admin access" ON admin_settings;

-- Create a new, more permissive policy for testing
CREATE POLICY "Admin settings access for authenticated users" ON admin_settings
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- Insert some test data if the table is empty
INSERT INTO admin_settings (setting_key, setting_value, updated_by) 
VALUES 
  ('stripe_publishable_key', '', auth.uid()),
  ('stripe_secret_key', '', auth.uid()),
  ('google_maps_api_key', '', auth.uid()),
  ('login_debug_mode', 'false', auth.uid())
ON CONFLICT (setting_key) DO NOTHING;

-- Verify the fix worked
SELECT 
  setting_key, 
  setting_value,
  updated_at
FROM admin_settings 
ORDER BY setting_key; 