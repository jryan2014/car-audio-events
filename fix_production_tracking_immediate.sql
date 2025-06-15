-- IMMEDIATE FIX FOR PRODUCTION TRACKING ISSUES
-- Run this directly in Supabase SQL Editor

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

-- Enable RLS
ALTER TABLE advertisement_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisement_clicks ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for Anonymous Tracking
CREATE POLICY "Allow anonymous impression tracking" ON advertisement_impressions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous click tracking" ON advertisement_clicks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view impression data" ON advertisement_impressions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view click data" ON advertisement_clicks
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow anonymous users to update impression and click counts on advertisements
CREATE POLICY "Allow anonymous impression count updates" ON advertisements
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_advertisement_impressions_ad_id ON advertisement_impressions(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_advertisement_clicks_ad_id ON advertisement_clicks(advertisement_id);

-- Add foreign key constraints if advertisements table exists
ALTER TABLE advertisement_impressions 
ADD CONSTRAINT advertisement_impressions_advertisement_id_fkey 
FOREIGN KEY (advertisement_id) REFERENCES advertisements(id) ON DELETE CASCADE;

ALTER TABLE advertisement_clicks 
ADD CONSTRAINT advertisement_clicks_advertisement_id_fkey 
FOREIGN KEY (advertisement_id) REFERENCES advertisements(id) ON DELETE CASCADE; 