-- Fix Missing Advertisement Tables
-- These tables are referenced in AdDisplay.tsx but don't exist in database

-- 1. Create advertisements table
CREATE TABLE IF NOT EXISTS public.advertisements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    click_url TEXT NOT NULL,
    advertiser_name TEXT NOT NULL,
    advertiser_email TEXT NOT NULL,
    advertiser_user_id UUID REFERENCES auth.users(id),
    placement_type TEXT NOT NULL CHECK (placement_type IN ('header', 'sidebar', 'event_page', 'mobile_banner', 'footer', 'directory_listing', 'search_results')),
    size TEXT NOT NULL CHECK (size IN ('small', 'medium', 'large', 'banner', 'square', 'leaderboard', 'skyscraper')),
    target_pages TEXT[] DEFAULT '{}',
    target_keywords TEXT[] DEFAULT '{}',
    target_categories TEXT[] DEFAULT '{}',
    target_user_types TEXT[] DEFAULT '{}',
    budget DECIMAL(10,2) DEFAULT 0,
    cost_per_click DECIMAL(5,2) DEFAULT 0,
    cost_per_impression DECIMAL(5,4) DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'paused', 'completed', 'rejected')),
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    spent DECIMAL(10,2) DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    roi DECIMAL(8,2) DEFAULT 0,
    priority INTEGER DEFAULT 1,
    frequency_cap INTEGER DEFAULT 3,
    geographic_targeting TEXT[] DEFAULT '{}',
    device_targeting TEXT[] DEFAULT '{"desktop", "mobile"}',
    time_targeting JSONB DEFAULT '{}',
    a_b_test_variant TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create advertisement_impressions table
CREATE TABLE IF NOT EXISTS public.advertisement_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertisement_id UUID REFERENCES public.advertisements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    page_url TEXT NOT NULL,
    placement_type TEXT NOT NULL,
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    session_id TEXT,
    device_type TEXT,
    geographic_location TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    view_duration INTEGER DEFAULT 0, -- milliseconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create advertisement_clicks table
CREATE TABLE IF NOT EXISTS public.advertisement_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertisement_id UUID REFERENCES public.advertisements(id) ON DELETE CASCADE,
    impression_id UUID REFERENCES public.advertisement_impressions(id),
    user_id UUID REFERENCES auth.users(id),
    page_url TEXT NOT NULL,
    click_url TEXT NOT NULL,
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    session_id TEXT,
    device_type TEXT,
    geographic_location TEXT,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_advertisements_status ON public.advertisements(status);
CREATE INDEX IF NOT EXISTS idx_advertisements_placement_type ON public.advertisements(placement_type);
CREATE INDEX IF NOT EXISTS idx_advertisements_start_end_date ON public.advertisements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_advertisement_impressions_ad_id ON public.advertisement_impressions(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_advertisement_impressions_viewed_at ON public.advertisement_impressions(viewed_at);
CREATE INDEX IF NOT EXISTS idx_advertisement_clicks_ad_id ON public.advertisement_clicks(advertisement_id);

-- 5. Enable RLS (Row Level Security)
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisement_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisement_clicks ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies

-- Advertisements: Anyone can view active ads, only admins can modify
CREATE POLICY "Anyone can view active advertisements" ON public.advertisements
    FOR SELECT USING (status = 'active' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE);

CREATE POLICY "Admins can manage all advertisements" ON public.advertisements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Advertisement impressions: Anyone can record, only admins can view all
CREATE POLICY "Anyone can record impressions" ON public.advertisement_impressions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all impressions" ON public.advertisement_impressions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Advertisement clicks: Anyone can record, only admins can view all
CREATE POLICY "Anyone can record clicks" ON public.advertisement_clicks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all clicks" ON public.advertisement_clicks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 7. Create updated_at trigger for advertisements
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_advertisements_updated_at 
    BEFORE UPDATE ON public.advertisements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Insert sample advertisement data to test the system
INSERT INTO public.advertisements (
    title, 
    description, 
    image_url, 
    click_url, 
    advertiser_name, 
    advertiser_email, 
    placement_type, 
    size, 
    start_date, 
    end_date, 
    status
) VALUES 
(
    'Premium Car Audio Systems',
    'Upgrade your sound with our premium car audio systems. Professional installation available.',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&h=300&q=80',
    'https://example.com/car-audio',
    'AudioPro Systems',
    'contact@audiopro.com',
    'sidebar',
    'medium',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    'active'
),
(
    'Competition Sound Equipment',
    'Get competition-ready with our professional sound equipment and installation services.',
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=728&h=90&q=80',
    'https://example.com/competition-audio',
    'CompetitionPro',
    'sales@competitionpro.com',
    'header',
    'banner',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '60 days',
    'active'
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.advertisements IS 'Advertisement campaigns and placements';
COMMENT ON TABLE public.advertisement_impressions IS 'Advertisement view tracking';
COMMENT ON TABLE public.advertisement_clicks IS 'Advertisement click tracking'; 