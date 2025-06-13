-- Fix Admin Settings Column Structure
-- This handles the existing admin_settings table that has different column names

-- First, let's check what columns exist and rename them if needed
DO $$
BEGIN
    -- Check if the table exists and what columns it has
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_settings') THEN
        
        -- Check if it has 'key' column (old structure)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'admin_settings' AND column_name = 'key'
        ) THEN
            -- Rename 'key' to 'key_name' if it exists
            ALTER TABLE admin_settings RENAME COLUMN key TO key_name;
            RAISE NOTICE 'Renamed column: key -> key_name';
        END IF;
        
        -- Check if it has 'value' column (old structure)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'admin_settings' AND column_name = 'value'
        ) THEN
            -- Rename 'value' to 'key_value' if it exists
            ALTER TABLE admin_settings RENAME COLUMN value TO key_value;
            RAISE NOTICE 'Renamed column: value -> key_value';
        END IF;
        
        -- Add missing columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'admin_settings' AND column_name = 'is_sensitive'
        ) THEN
            ALTER TABLE admin_settings ADD COLUMN is_sensitive BOOLEAN DEFAULT false;
            RAISE NOTICE 'Added column: is_sensitive';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'admin_settings' AND column_name = 'description'
        ) THEN
            ALTER TABLE admin_settings ADD COLUMN description TEXT;
            RAISE NOTICE 'Added column: description';
        END IF;
        
        -- Make sure updated_by is properly referenced to users table
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc 
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'admin_settings' 
            AND kcu.column_name = 'updated_by' 
            AND tc.constraint_type = 'FOREIGN KEY'
        ) THEN
            -- Add foreign key constraint if it doesn't exist
            ALTER TABLE admin_settings 
            ADD CONSTRAINT fk_admin_settings_updated_by 
            FOREIGN KEY (updated_by) REFERENCES users(id);
            RAISE NOTICE 'Added foreign key constraint for updated_by';
        END IF;
        
        RAISE NOTICE 'Updated existing admin_settings table structure';
        
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE admin_settings (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            key_name VARCHAR(255) UNIQUE NOT NULL,
            key_value TEXT,
            is_sensitive BOOLEAN DEFAULT false,
            description TEXT,
            updated_by UUID REFERENCES users(id),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Created new admin_settings table';
    END IF;
END $$;

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

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage settings" ON admin_settings;
DROP POLICY IF EXISTS "Admins can read activity log" ON admin_activity_log;
DROP POLICY IF EXISTS "Admins can insert activity log" ON admin_activity_log;

-- Create RLS policies for admin_settings
CREATE POLICY "Admins can manage settings" ON admin_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- Create RLS policies for admin_activity_log
CREATE POLICY "Admins can read activity log" ON admin_activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

CREATE POLICY "Admins can insert activity log" ON admin_activity_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_admin_settings_key_name ON admin_settings(key_name);
CREATE INDEX IF NOT EXISTS idx_admin_settings_updated_at ON admin_settings(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action ON admin_activity_log(action);

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger to ensure it's using the right column names
DROP TRIGGER IF EXISTS update_admin_settings_updated_at_trigger ON admin_settings;
CREATE TRIGGER update_admin_settings_updated_at_trigger
    BEFORE UPDATE ON admin_settings
    FOR EACH ROW EXECUTE FUNCTION update_admin_settings_updated_at();

-- Insert default settings if they don't exist (using the correct column names)
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

-- Create or replace helpful views for admin dashboard
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

-- Create or replace helper functions
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

-- Add helpful comments
COMMENT ON TABLE admin_settings IS 'Global application settings managed by administrators';
COMMENT ON TABLE admin_activity_log IS 'Audit log for administrative actions';
COMMENT ON COLUMN admin_settings.key_name IS 'Unique identifier for the setting';
COMMENT ON COLUMN admin_settings.key_value IS 'The setting value (stored as text)';
COMMENT ON COLUMN admin_settings.is_sensitive IS 'Whether this setting contains sensitive information';

SELECT 'Admin Settings database migration completed successfully!' as status; 