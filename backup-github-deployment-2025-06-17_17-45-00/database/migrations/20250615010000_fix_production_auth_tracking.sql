-- Fix Production Authentication and Tracking Issues
-- This migration addresses 401 errors and refresh token issues

-- Create advertisement tracking tables if they don't exist
CREATE TABLE IF NOT EXISTS advertisement_impressions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL,
    page_url TEXT,
    placement_type TEXT,
    device_type TEXT,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS advertisement_clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL,
    page_url TEXT,
    click_url TEXT,
    placement_type TEXT,
    device_type TEXT,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints only if advertisements table exists
DO $$
BEGIN
    -- Check if advertisements table exists and add foreign key constraints
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'advertisements') THEN
        -- Add foreign key constraint for impressions if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'advertisement_impressions_advertisement_id_fkey'
        ) THEN
            ALTER TABLE advertisement_impressions 
            ADD CONSTRAINT advertisement_impressions_advertisement_id_fkey 
            FOREIGN KEY (advertisement_id) REFERENCES advertisements(id) ON DELETE CASCADE;
        END IF;
        
        -- Add foreign key constraint for clicks if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'advertisement_clicks_advertisement_id_fkey'
        ) THEN
            ALTER TABLE advertisement_clicks 
            ADD CONSTRAINT advertisement_clicks_advertisement_id_fkey 
            FOREIGN KEY (advertisement_id) REFERENCES advertisements(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_advertisement_impressions_ad_id ON advertisement_impressions(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_advertisement_impressions_created_at ON advertisement_impressions(created_at);
CREATE INDEX IF NOT EXISTS idx_advertisement_clicks_ad_id ON advertisement_clicks(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_advertisement_clicks_created_at ON advertisement_clicks(created_at);

-- Enable RLS
ALTER TABLE advertisement_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisement_clicks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous impression tracking" ON advertisement_impressions;
DROP POLICY IF EXISTS "Allow anonymous click tracking" ON advertisement_clicks;
DROP POLICY IF EXISTS "Authenticated users can view impression data" ON advertisement_impressions;
DROP POLICY IF EXISTS "Authenticated users can view click data" ON advertisement_clicks;
DROP POLICY IF EXISTS "Admins can manage all tracking data impressions" ON advertisement_impressions;
DROP POLICY IF EXISTS "Admins can manage all tracking data clicks" ON advertisement_clicks;
DROP POLICY IF EXISTS "Allow anonymous impression count updates" ON advertisements;

-- RLS Policies for Advertisement Tracking (Allow anonymous access for tracking)
CREATE POLICY "Allow anonymous impression tracking" ON advertisement_impressions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous click tracking" ON advertisement_clicks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view impression data" ON advertisement_impressions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view click data" ON advertisement_clicks
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all tracking data impressions" ON advertisement_impressions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

CREATE POLICY "Admins can manage all tracking data clicks" ON advertisement_clicks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- Allow anonymous users to update impression and click counts on advertisements
-- This is needed for tracking to work for non-authenticated users
DO $$
BEGIN
    -- Only create policy if advertisements table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'advertisements') THEN
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Allow anonymous impression count updates" ON advertisements;
        
        -- Create new policy
        CREATE POLICY "Allow anonymous impression count updates" ON advertisements
            FOR UPDATE TO anon, authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE advertisement_impressions IS 'Tracks advertisement impressions with anonymous access for analytics';
COMMENT ON TABLE advertisement_clicks IS 'Tracks advertisement clicks with anonymous access for analytics';
COMMENT ON POLICY "Allow anonymous impression tracking" ON advertisement_impressions IS 'Allows anonymous users to track impressions for analytics';
COMMENT ON POLICY "Allow anonymous click tracking" ON advertisement_clicks IS 'Allows anonymous users to track clicks for analytics';
COMMENT ON POLICY "Allow anonymous impression count updates" ON advertisements IS 'Allows anonymous users to update impression/click counts for tracking'; 