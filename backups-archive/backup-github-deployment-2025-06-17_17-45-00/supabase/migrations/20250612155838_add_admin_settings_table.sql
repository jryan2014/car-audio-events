-- Drop existing admin_settings table if it exists (to handle any existing conflicting structure)
DROP TABLE IF EXISTS admin_settings CASCADE;
DROP TABLE IF EXISTS admin_activity_log CASCADE;

-- Create admin_settings table for storing configuration keys
CREATE TABLE admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_activity_log table for logging admin actions
CREATE TABLE admin_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_admin_settings_key ON admin_settings(setting_key);
CREATE INDEX idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_log_created_at ON admin_activity_log(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_settings
CREATE POLICY "Admin can manage settings" ON admin_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  );

-- Create policies for admin_activity_log
CREATE POLICY "Admin can view activity log" ON admin_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  );

CREATE POLICY "System can insert activity log" ON admin_activity_log
  FOR INSERT WITH CHECK (true);
