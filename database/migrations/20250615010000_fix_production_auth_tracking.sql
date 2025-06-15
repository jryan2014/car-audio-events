-- Fix Production Authentication and Tracking Issues
-- This migration addresses 401 errors and refresh token issues

-- Create advertisement tracking tables if they don't exist
CREATE TABLE IF NOT EXISTS advertisement_impressions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    page_url TEXT,
    placement_type TEXT,
    device_type TEXT,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS advertisement_clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    page_url TEXT,
    click_url TEXT,
    placement_type TEXT,
    device_type TEXT,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
DROP POLICY IF EXISTS "Admins can manage all tracking data" ON advertisement_impressions;
DROP POLICY IF EXISTS "Admins can manage all tracking data" ON advertisement_clicks;
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
CREATE POLICY "Allow anonymous impression count updates" ON advertisements
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE advertisement_impressions IS 'Tracks advertisement impressions with anonymous access for analytics';
COMMENT ON TABLE advertisement_clicks IS 'Tracks advertisement clicks with anonymous access for analytics';
COMMENT ON POLICY "Allow anonymous impression tracking" ON advertisement_impressions IS 'Allows anonymous users to track impressions for analytics';
COMMENT ON POLICY "Allow anonymous click tracking" ON advertisement_clicks IS 'Allows anonymous users to track clicks for analytics';
COMMENT ON POLICY "Allow anonymous impression count updates" ON advertisements IS 'Allows anonymous users to update impression/click counts for tracking'; 