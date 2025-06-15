-- Simple fix for admin_settings table column names
-- This script safely renames columns from key_name/key_value to key/value

-- Step 1: Check if we need to rename columns
DO $$
BEGIN
    -- Only proceed if key_name column exists (meaning we need to rename)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_settings' 
        AND column_name = 'key_name'
    ) THEN
        -- Rename the columns
        ALTER TABLE admin_settings RENAME COLUMN key_name TO key;
        ALTER TABLE admin_settings RENAME COLUMN key_value TO value;
        
        RAISE NOTICE 'Successfully renamed columns: key_name -> key, key_value -> value';
    ELSE
        RAISE NOTICE 'Columns already have correct names or table does not exist';
    END IF;
END $$;

-- Step 2: Create index only if key column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_settings' 
        AND column_name = 'key'
    ) THEN
        -- Create index on key column
        CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);
        RAISE NOTICE 'Created index on key column';
    END IF;
END $$;

-- Step 3: Ensure RLS and policies are set up
DO $$
BEGIN
    -- Enable RLS if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_settings') THEN
        ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Admin users can manage admin settings" ON admin_settings;
        
        -- Create new policy
        CREATE POLICY "Admin users can manage admin settings" ON admin_settings
            FOR ALL USING (
                auth.email() = 'admin@caraudioevents.com' OR
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.membership_type = 'admin'
                )
            );
            
        RAISE NOTICE 'Updated RLS policies';
    END IF;
END $$; 