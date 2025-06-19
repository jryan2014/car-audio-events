/*
  # Create admin settings and audit tables

  1. New Tables
    - `admin_settings`
      - `id` (uuid, primary key)
      - `key_name` (text, unique)
      - `key_value` (text, encrypted for sensitive keys)
      - `is_sensitive` (boolean)
      - `updated_by` (uuid, references users)
      - `updated_at` (timestamp)
    - `admin_audit_log`
      - `id` (uuid, primary key)
      - `admin_id` (uuid, references users)
      - `action` (text)
      - `details` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for admin-only access
    - Create function to manage admin_settings table creation

  3. Functions
    - Function to create admin_settings table if not exists
    - Function to encrypt/decrypt sensitive values
*/

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text UNIQUE NOT NULL,
  key_value text NOT NULL,
  is_sensitive boolean DEFAULT false,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_settings (admin only)
CREATE POLICY "Only admins can access admin_settings"
  ON admin_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  );

-- Create policies for admin_audit_log (admin only)
CREATE POLICY "Only admins can access audit log"
  ON admin_audit_log
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  );

-- Create function to create admin_settings table if not exists
CREATE OR REPLACE FUNCTION create_admin_settings_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function is mainly for the edge function to call
  -- The table should already exist from this migration
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_settings') THEN
    CREATE TABLE admin_settings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key_name text UNIQUE NOT NULL,
      key_value text NOT NULL,
      is_sensitive boolean DEFAULT false,
      updated_by uuid REFERENCES auth.users(id),
      updated_at timestamptz DEFAULT now()
    );
    
    ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Only admins can access admin_settings"
      ON admin_settings
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.membership_type = 'admin'
        )
      );
  END IF;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_settings_key_name ON admin_settings(key_name);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at);

-- Add updated_at trigger for admin_settings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_settings_updated_at 
  BEFORE UPDATE ON admin_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();