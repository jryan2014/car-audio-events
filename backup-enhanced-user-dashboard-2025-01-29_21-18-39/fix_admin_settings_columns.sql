-- Fix admin_settings table column names
-- This script ensures the table uses 'key' and 'value' columns instead of 'key_name' and 'key_value'

-- First, check if the table exists and what columns it has
DO $$
BEGIN
    -- Check if table exists with old column names
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_settings' 
        AND column_name = 'key_name'
    ) THEN
        -- Rename columns if they exist with old names
        ALTER TABLE admin_settings RENAME COLUMN key_name TO key;
        ALTER TABLE admin_settings RENAME COLUMN key_value TO value;
        
        RAISE NOTICE 'Renamed admin_settings columns from key_name/key_value to key/value';
    END IF;
    
    -- Ensure the table exists with correct structure
    CREATE TABLE IF NOT EXISTS admin_settings (
        id BIGSERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        is_sensitive BOOLEAN DEFAULT FALSE,
        description TEXT,
        updated_by UUID REFERENCES auth.users(id),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Create index on key column for faster lookups
    CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);
    
    -- Enable RLS
    ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for admin access
    DROP POLICY IF EXISTS "Admin users can manage admin settings" ON admin_settings;
    CREATE POLICY "Admin users can manage admin settings" ON admin_settings
        FOR ALL USING (
            auth.email() = 'admin@caraudioevents.com' OR
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.membership_type = 'admin'
            )
        );
        
    RAISE NOTICE 'Admin settings table structure verified and updated';
END $$; 