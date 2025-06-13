-- Fix AdManagement page database dependencies
-- Creates advertisements table with all required columns and functionality

-- Create advertisements table
CREATE TABLE IF NOT EXISTS public.advertisements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    click_url TEXT NOT NULL,
    advertiser_name TEXT NOT NULL,
    advertiser_email TEXT NOT NULL,
    placement_type TEXT NOT NULL CHECK (placement_type IN ('header', 'sidebar', 'event_page', 'mobile_banner', 'footer')),
    size TEXT NOT NULL CHECK (size IN ('small', 'medium', 'large', 'banner', 'square')),
    target_pages JSONB DEFAULT '[]'::jsonb,
    target_keywords JSONB DEFAULT '[]'::jsonb,
    target_categories JSONB DEFAULT '[]'::jsonb,
    budget DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_per_click DECIMAL(10,4) DEFAULT 0,
    cost_per_impression DECIMAL(10,4) DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'active', 'paused', 'completed', 'rejected')) DEFAULT 'pending',
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    spent DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert sample advertisements for testing
INSERT INTO public.advertisements (
    title, description, image_url, click_url, advertiser_name, advertiser_email,
    placement_type, size, target_pages, target_keywords, target_categories,
    budget, cost_per_click, cost_per_impression, start_date, end_date, status,
    clicks, impressions, spent
) VALUES 
(
    'Premium Car Audio Equipment',
    'High-quality speakers, amplifiers, and subwoofers for your vehicle. Professional installation available.',
    'https://images.unsplash.com/photo-1493238792000-8113da705763?w=600',
    'https://example.com/audio-equipment',
    'AudioPro Solutions',
    'sales@audiopro.com',
    'sidebar',
    'medium',
    '["events", "directory", "profile"]'::jsonb,
    '["audio", "speakers", "amplifiers", "subwoofers"]'::jsonb,
    '["retail", "equipment"]'::jsonb,
    500.00,
    0.75,
    0.02,
    timezone('utc'::text, now()),
    timezone('utc'::text, now() + interval '30 days'),
    'active',
    245,
    12580,
    183.75
),
(
    'Competition Prep Services',
    'Professional car audio competition preparation and tuning services.',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600',
    'https://example.com/comp-prep',
    'Elite Audio Tuning',
    'info@elitetuning.com',
    'event_page',
    'large',
    '["events", "competitions"]'::jsonb,
    '["competition", "tuning", "professional"]'::jsonb,
    '["service", "professional"]'::jsonb,
    750.00,
    1.25,
    0.03,
    timezone('utc'::text, now()),
    timezone('utc'::text, now() + interval '45 days'),
    'active',
    89,
    4532,
    111.25
),
(
    'Car Audio Installation',
    'Expert installation services for all car audio equipment. Certified technicians.',
    'https://images.unsplash.com/photo-1544829099-b9a0c5303bea?w=600',
    'https://example.com/installation',
    'TechInstall Pro',
    'contact@techinstall.com',
    'header',
    'banner',
    '["home", "services"]'::jsonb,
    '["installation", "professional", "certified"]'::jsonb,
    '["service"]'::jsonb,
    300.00,
    0.50,
    0.015,
    timezone('utc'::text, now() - interval '5 days'),
    timezone('utc'::text, now() + interval '25 days'),
    'active',
    156,
    8960,
    78.00
),
(
    'Custom Audio Systems',
    'Build your dream car audio system with our custom design services.',
    'https://images.unsplash.com/photo-1614200187524-dc4b892acf16?w=600',
    'https://example.com/custom-systems',
    'Custom Audio Designs',
    'design@customaudio.com',
    'sidebar',
    'square',
    '["directory", "profile"]'::jsonb,
    '["custom", "design", "premium"]'::jsonb,
    '["manufacturer", "custom"]'::jsonb,
    1000.00,
    2.00,
    0.05,
    timezone('utc'::text, now() + interval '3 days'),
    timezone('utc'::text, now() + interval '60 days'),
    'pending',
    0,
    0,
    0.00
),
(
    'Audio Component Sale',
    'End of year clearance sale on all audio components. Up to 50% off!',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
    'https://example.com/sale',
    'Audio Outlet Store',
    'sales@audiooutlet.com',
    'mobile_banner',
    'small',
    '["home", "events", "directory"]'::jsonb,
    '["sale", "clearance", "discount", "components"]'::jsonb,
    '["retail", "sale"]'::jsonb,
    200.00,
    0.30,
    0.01,
    timezone('utc'::text, now() - interval '2 days'),
    timezone('utc'::text, now() + interval '15 days'),
    'active',
    312,
    18650,
    93.60
);

-- Add RLS policies for advertisements
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- Allow all users to view approved/active ads
CREATE POLICY "advertisements_read_public" ON public.advertisements
    FOR SELECT USING (status IN ('approved', 'active'));

-- Allow admins to manage all advertisements
CREATE POLICY "advertisements_admin_all" ON public.advertisements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'admin'
        )
    );

-- Allow advertisers to manage their own ads
CREATE POLICY "advertisements_advertiser_own" ON public.advertisements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email = advertisements.advertiser_email
        )
    );

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_advertisements_status ON public.advertisements(status);
CREATE INDEX IF NOT EXISTS idx_advertisements_placement ON public.advertisements(placement_type);
CREATE INDEX IF NOT EXISTS idx_advertisements_dates ON public.advertisements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_advertisements_advertiser ON public.advertisements(advertiser_email);
CREATE INDEX IF NOT EXISTS idx_advertisements_created_at ON public.advertisements(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_advertisements_updated_at ON public.advertisements;
CREATE TRIGGER update_advertisements_updated_at
    BEFORE UPDATE ON public.advertisements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create ad_analytics table for detailed tracking
CREATE TABLE IF NOT EXISTS public.ad_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click', 'conversion')),
    user_id UUID REFERENCES auth.users(id),
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    page_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for analytics
CREATE INDEX IF NOT EXISTS idx_ad_analytics_ad_id ON public.ad_analytics(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_event_type ON public.ad_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_created_at ON public.ad_analytics(created_at);

-- Create ad_placements table for active ad display configuration
CREATE TABLE IF NOT EXISTS public.ad_placements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    placement_name TEXT NOT NULL UNIQUE,
    description TEXT,
    max_ads INTEGER DEFAULT 3,
    rotation_enabled BOOLEAN DEFAULT true,
    rotation_interval INTEGER DEFAULT 30, -- seconds
    dimensions TEXT, -- e.g., "300x250"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default ad placements
INSERT INTO public.ad_placements (placement_name, description, max_ads, dimensions) VALUES
('header', 'Header banner area', 1, '970x250'),
('sidebar', 'Right sidebar placement', 3, '300x250'),
('event_page', 'Event page advertisement area', 2, '728x90'),
('mobile_banner', 'Mobile banner at bottom', 1, '320x50'),
('footer', 'Footer advertisement area', 2, '468x60')
ON CONFLICT (placement_name) DO NOTHING;

-- Enable RLS for ad_placements
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;

-- Allow public read access to ad placements
CREATE POLICY "ad_placements_read_all" ON public.ad_placements
    FOR SELECT USING (is_active = true);

-- Allow admin write access to ad placements
CREATE POLICY "ad_placements_admin_write" ON public.ad_placements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'admin'
        )
    );

-- Add trigger for ad_placements updated_at
DROP TRIGGER IF EXISTS update_ad_placements_updated_at ON public.ad_placements;
CREATE TRIGGER update_ad_placements_updated_at
    BEFORE UPDATE ON public.ad_placements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'AdManagement tables and sample data created successfully!' as result; 