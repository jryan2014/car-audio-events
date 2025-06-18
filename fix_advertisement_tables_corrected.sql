-- Fix Missing Advertisement Tables - CORRECTED VERSION
-- These tables are referenced in AdDisplay.tsx but don't exist in database

-- 1. Drop existing tables if they have issues (safe with IF EXISTS)
DROP TABLE IF EXISTS public.advertisement_clicks CASCADE;
DROP TABLE IF EXISTS public.advertisement_impressions CASCADE;
DROP TABLE IF EXISTS public.advertisements CASCADE;

-- 2. Create advertisements table
CREATE TABLE public.advertisements (
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
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL DEFAULT CURRENT_DATE + INTERVAL '30 days',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'approved', 'active', 'paused', 'completed', 'rejected')),
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

-- 3. Create advertisement_impressions table
CREATE TABLE public.advertisement_impressions (
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
    view_duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create advertisement_clicks table
CREATE TABLE public.advertisement_clicks (
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

-- 5. Create indexes AFTER tables are created
CREATE INDEX idx_advertisements_status ON public.advertisements(status);
CREATE INDEX idx_advertisements_placement_type ON public.advertisements(placement_type);
CREATE INDEX idx_advertisements_start_end_date ON public.advertisements(start_date, end_date);
CREATE INDEX idx_advertisement_impressions_ad_id ON public.advertisement_impressions(advertisement_id);
CREATE INDEX idx_advertisement_impressions_viewed_at ON public.advertisement_impressions(viewed_at);
CREATE INDEX idx_advertisement_clicks_ad_id ON public.advertisement_clicks(advertisement_id);

-- 6. Enable RLS (Row Level Security)
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisement_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisement_clicks ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies

-- Anyone can view active advertisements
CREATE POLICY "Anyone can view active advertisements" ON public.advertisements
    FOR SELECT USING (status = 'active' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE);

-- Admins can manage all advertisements  
CREATE POLICY "Admins can manage all advertisements" ON public.advertisements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Anyone can record impressions
CREATE POLICY "Anyone can record impressions" ON public.advertisement_impressions
    FOR INSERT WITH CHECK (true);

-- Admins can view all impressions
CREATE POLICY "Admins can view all impressions" ON public.advertisement_impressions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Anyone can record clicks
CREATE POLICY "Anyone can record clicks" ON public.advertisement_clicks
    FOR INSERT WITH CHECK (true);

-- Admins can view all clicks
CREATE POLICY "Admins can view all clicks" ON public.advertisement_clicks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 8. Create updated_at trigger
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

-- 9. Insert sample advertisement data
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
);

-- Add table comments
COMMENT ON TABLE public.advertisements IS 'Advertisement campaigns and placements';
COMMENT ON TABLE public.advertisement_impressions IS 'Advertisement view tracking';
COMMENT ON TABLE public.advertisement_clicks IS 'Advertisement click tracking'; 