-- Fix Admin Settings Database Issues
-- This addresses the missing admin_settings table and schema inconsistencies

-- Create admin_settings table with proper structure
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_name VARCHAR(255) UNIQUE NOT NULL,
    key_value TEXT,
    is_sensitive BOOLEAN DEFAULT false,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_activity_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on admin tables
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_settings
DROP POLICY IF EXISTS "Admins can manage settings" ON admin_settings;
CREATE POLICY "Admins can manage settings" ON admin_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- Create RLS policies for admin_activity_log
DROP POLICY IF EXISTS "Admins can read activity log" ON admin_activity_log;
CREATE POLICY "Admins can read activity log" ON admin_activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can insert activity log" ON admin_activity_log;
CREATE POLICY "Admins can insert activity log" ON admin_activity_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_settings_key_name ON admin_settings(key_name);
CREATE INDEX IF NOT EXISTS idx_admin_settings_updated_at ON admin_settings(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action ON admin_activity_log(action);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_settings_updated_at_trigger
    BEFORE UPDATE ON admin_settings
    FOR EACH ROW EXECUTE FUNCTION update_admin_settings_updated_at();

-- Insert default settings if they don't exist
INSERT INTO admin_settings (key_name, key_value, is_sensitive, description) VALUES
    ('login_debug_mode', 'false', false, 'Enable debug mode for login system'),
    ('stripe_test_mode', 'true', false, 'Enable Stripe test mode'),
    ('system_maintenance_mode', 'false', false, 'Enable system maintenance mode'),
    ('email_notifications_enabled', 'true', false, 'Enable email notifications'),
    ('registration_enabled', 'true', false, 'Allow new user registrations'),
    ('event_approval_required', 'true', false, 'Require admin approval for new events')
ON CONFLICT (key_name) DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_settings TO authenticated;
GRANT SELECT, INSERT ON admin_activity_log TO authenticated;

-- Create helpful views for admin dashboard
CREATE OR REPLACE VIEW admin_settings_summary AS
SELECT 
    key_name,
    key_value,
    is_sensitive,
    description,
    updated_at,
    (SELECT name FROM users WHERE id = admin_settings.updated_by) as updated_by_name
FROM admin_settings
ORDER BY key_name;

CREATE OR REPLACE VIEW recent_admin_activity AS
SELECT 
    aal.id,
    aal.action,
    aal.details,
    aal.created_at,
    u.name as admin_name,
    u.email as admin_email
FROM admin_activity_log aal
LEFT JOIN users u ON aal.admin_id = u.id
ORDER BY aal.created_at DESC
LIMIT 100;

-- Grant view permissions
GRANT SELECT ON admin_settings_summary TO authenticated;
GRANT SELECT ON recent_admin_activity TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE admin_settings IS 'Global application settings managed by administrators';
COMMENT ON TABLE admin_activity_log IS 'Audit log for administrative actions';
COMMENT ON COLUMN admin_settings.key_name IS 'Unique identifier for the setting';
COMMENT ON COLUMN admin_settings.key_value IS 'The setting value (stored as text)';
COMMENT ON COLUMN admin_settings.is_sensitive IS 'Whether this setting contains sensitive information';
COMMENT ON VIEW admin_settings_summary IS 'Summary view of admin settings with user names';
COMMENT ON VIEW recent_admin_activity IS 'Recent administrative activity with user details';

-- Create function to safely get admin setting
CREATE OR REPLACE FUNCTION get_admin_setting(setting_key TEXT)
RETURNS TEXT AS $$
DECLARE
    setting_value TEXT;
BEGIN
    SELECT key_value INTO setting_value
    FROM admin_settings
    WHERE key_name = setting_key;
    
    RETURN COALESCE(setting_value, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to safely set admin setting
CREATE OR REPLACE FUNCTION set_admin_setting(
    setting_key TEXT,
    setting_value TEXT,
    is_sensitive_setting BOOLEAN DEFAULT false,
    setting_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND membership_type = 'admin'
    ) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;
    
    -- Upsert the setting
    INSERT INTO admin_settings (key_name, key_value, is_sensitive, description, updated_by)
    VALUES (setting_key, setting_value, is_sensitive_setting, setting_description, auth.uid())
    ON CONFLICT (key_name) 
    DO UPDATE SET 
        key_value = EXCLUDED.key_value,
        is_sensitive = EXCLUDED.is_sensitive,
        description = COALESCE(EXCLUDED.description, admin_settings.description),
        updated_by = auth.uid(),
        updated_at = NOW();
    
    -- Log the activity
    INSERT INTO admin_activity_log (admin_id, action, details)
    VALUES (
        auth.uid(),
        'update_setting',
        jsonb_build_object(
            'setting_key', setting_key,
            'old_value', (SELECT key_value FROM admin_settings WHERE key_name = setting_key),
            'new_value', setting_value
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_admin_setting TO authenticated;
GRANT EXECUTE ON FUNCTION set_admin_setting TO authenticated;

SELECT 'Admin Settings database setup complete!' as status; 