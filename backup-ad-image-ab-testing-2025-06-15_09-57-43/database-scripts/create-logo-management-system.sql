-- Logo Management System Setup
-- Creates storage buckets and admin settings for comprehensive logo management

-- First, ensure admin_settings table has the correct structure
DROP TABLE IF EXISTS admin_settings CASCADE;

-- Recreate admin_settings table with correct structure
CREATE TABLE admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_admin_settings_key ON admin_settings(setting_key);

-- Enable RLS (Row Level Security)
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_settings
CREATE POLICY "Admin can manage settings" ON admin_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  );

-- Create storage buckets for different logo types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('website-logos', 'website-logos', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']),
  ('email-logos', 'email-logos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
  ('document-logos', 'document-logos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
  ('signature-logos', 'signature-logos', true, 1048576, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for logo storage buckets
-- Admin upload policy
CREATE POLICY "Admin can upload logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id IN ('website-logos', 'email-logos', 'document-logos', 'signature-logos') 
  AND auth.uid() IN (
    SELECT id FROM users 
    WHERE membership_type = 'admin'
  )
);

-- Public read policy for logo display
CREATE POLICY "Public can view logos" ON storage.objects
FOR SELECT USING (
  bucket_id IN ('website-logos', 'email-logos', 'document-logos', 'signature-logos')
);

-- Admin update/delete policy
CREATE POLICY "Admin can manage logos" ON storage.objects
FOR ALL USING (
  bucket_id IN ('website-logos', 'email-logos', 'document-logos', 'signature-logos')
  AND auth.uid() IN (
    SELECT id FROM users 
    WHERE membership_type = 'admin'
  )
);

-- Add logo management settings to admin_settings table
INSERT INTO admin_settings (setting_key, setting_value) VALUES
('main_logo_url', ''),
('main_logo_alt_text', 'Car Audio Events'),
('main_logo_width', '200'),
('main_logo_height', '60'),
('email_logo_url', ''),
('email_logo_alt_text', 'Car Audio Events'),
('email_logo_width', '150'),
('email_logo_height', '45'),
('document_logo_url', ''),
('document_logo_alt_text', 'Car Audio Events'),
('document_logo_width', '120'),
('document_logo_height', '36'),
('signature_logo_url', ''),
('signature_logo_alt_text', 'Car Audio Events'),
('signature_logo_width', '100'),
('signature_logo_height', '30'),
('logo_upload_enabled', 'true'),
('logo_max_file_size', '5242880'),
('logo_allowed_formats', 'png,jpg,jpeg,webp,svg')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value;

-- Create function to get logo settings as JSON
CREATE OR REPLACE FUNCTION get_logo_settings()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_object_agg(setting_key, setting_value)
  INTO result
  FROM admin_settings
  WHERE setting_key LIKE '%logo%';
  
  RETURN result;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_logo_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION get_logo_settings() TO anon; 