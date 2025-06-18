-- Enhanced Advertisement System Database Migration
-- This migration enhances the existing advertisements table and adds new features

-- First, add new columns to existing advertisements table
ALTER TABLE advertisements 
ADD COLUMN IF NOT EXISTS advertiser_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS target_user_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
ADD COLUMN IF NOT EXISTS frequency_cap INTEGER DEFAULT 3 CHECK (frequency_cap >= 1 AND frequency_cap <= 20),
ADD COLUMN IF NOT EXISTS geographic_targeting TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS device_targeting TEXT[] DEFAULT ARRAY['desktop', 'mobile'],
ADD COLUMN IF NOT EXISTS time_targeting JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS a_b_test_variant VARCHAR(50),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS roi DECIMAL(8,2) DEFAULT 0;

-- Update placement_type enum to include new options
ALTER TABLE advertisements 
DROP CONSTRAINT IF EXISTS advertisements_placement_type_check;

ALTER TABLE advertisements 
ADD CONSTRAINT advertisements_placement_type_check 
CHECK (placement_type IN ('header', 'sidebar', 'event_page', 'mobile_banner', 'footer', 'directory_listing', 'search_results'));

-- Update size enum to include new options
ALTER TABLE advertisements 
DROP CONSTRAINT IF EXISTS advertisements_size_check;

ALTER TABLE advertisements 
ADD CONSTRAINT advertisements_size_check 
CHECK (size IN ('small', 'medium', 'large', 'banner', 'square', 'leaderboard', 'skyscraper'));

-- Create advertisement billing table
CREATE TABLE IF NOT EXISTS advertisement_billing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    total_clicks INTEGER DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
    stripe_invoice_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create advertisement analytics table for detailed tracking
CREATE TABLE IF NOT EXISTS advertisement_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour <= 23),
    placement_type VARCHAR(50),
    user_type VARCHAR(50),
    device_type VARCHAR(20),
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    cost DECIMAL(8,2) DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(advertisement_id, date, hour, placement_type, user_type, device_type)
);

-- Create advertisement campaigns table for grouping ads
CREATE TABLE IF NOT EXISTS advertisement_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_budget DECIMAL(10,2) NOT NULL DEFAULT 0,
    spent_budget DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add campaign_id to advertisements table
ALTER TABLE advertisements 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES advertisement_campaigns(id);

-- Create advertisement templates table for AI-generated designs
CREATE TABLE IF NOT EXISTS advertisement_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    placement_type VARCHAR(50) NOT NULL,
    size VARCHAR(50) NOT NULL,
    template_data JSONB NOT NULL,
    preview_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user advertisement preferences
CREATE TABLE IF NOT EXISTS user_advertisement_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    show_ads BOOLEAN DEFAULT true,
    preferred_ad_types TEXT[] DEFAULT '{}',
    blocked_advertisers TEXT[] DEFAULT '{}',
    frequency_preference VARCHAR(20) DEFAULT 'normal' CHECK (frequency_preference IN ('low', 'normal', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Create advertisement impressions tracking
CREATE TABLE IF NOT EXISTS advertisement_impressions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    page_url TEXT,
    placement_type VARCHAR(50),
    device_type VARCHAR(20),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create advertisement clicks tracking
CREATE TABLE IF NOT EXISTS advertisement_clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    page_url TEXT,
    click_url TEXT,
    placement_type VARCHAR(50),
    device_type VARCHAR(20),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create advertisement A/B tests table
CREATE TABLE IF NOT EXISTS advertisement_ab_tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES advertisement_campaigns(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    variant_a_id UUID NOT NULL REFERENCES advertisements(id),
    variant_b_id UUID NOT NULL REFERENCES advertisements(id),
    traffic_split DECIMAL(3,2) DEFAULT 0.50 CHECK (traffic_split > 0 AND traffic_split < 1),
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed')),
    winner_variant VARCHAR(1) CHECK (winner_variant IN ('A', 'B')),
    confidence_level DECIMAL(5,2),
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_advertisements_user_id ON advertisements(advertiser_user_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_status ON advertisements(status);
CREATE INDEX IF NOT EXISTS idx_advertisements_placement_type ON advertisements(placement_type);
CREATE INDEX IF NOT EXISTS idx_advertisements_dates ON advertisements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_advertisement_analytics_date ON advertisement_analytics(date);
CREATE INDEX IF NOT EXISTS idx_advertisement_billing_user ON advertisement_billing(user_id);
CREATE INDEX IF NOT EXISTS idx_advertisement_billing_period ON advertisement_billing(billing_period_start, billing_period_end);

-- Create indexes for impressions and clicks tables
CREATE INDEX IF NOT EXISTS idx_advertisement_impressions_ad_timestamp ON advertisement_impressions(advertisement_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_advertisement_impressions_user_timestamp ON advertisement_impressions(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_advertisement_clicks_ad_timestamp ON advertisement_clicks(advertisement_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_advertisement_clicks_user_timestamp ON advertisement_clicks(user_id, timestamp);

-- Enable RLS on new tables (simplified policies)
ALTER TABLE advertisement_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisement_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_advertisement_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisement_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisement_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisement_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisement_ab_tests ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies (can be enhanced later)
CREATE POLICY "Users can view own billing" ON advertisement_billing
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own campaigns" ON advertisement_campaigns
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own ad preferences" ON user_advertisement_preferences
    FOR ALL USING (user_id = auth.uid());

-- Create functions for advertisement management

-- Function to update advertisement statistics
CREATE OR REPLACE FUNCTION update_advertisement_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update advertisement clicks and impressions from tracking tables
    UPDATE advertisements 
    SET 
        clicks = (
            SELECT COUNT(*) 
            FROM advertisement_clicks 
            WHERE advertisement_id = NEW.advertisement_id
        ),
        impressions = (
            SELECT COUNT(*) 
            FROM advertisement_impressions 
            WHERE advertisement_id = NEW.advertisement_id
        ),
        updated_at = NOW()
    WHERE id = NEW.advertisement_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic stats updates
CREATE TRIGGER update_ad_stats_on_click
    AFTER INSERT ON advertisement_clicks
    FOR EACH ROW
    EXECUTE FUNCTION update_advertisement_stats();

CREATE TRIGGER update_ad_stats_on_impression
    AFTER INSERT ON advertisement_impressions
    FOR EACH ROW
    EXECUTE FUNCTION update_advertisement_stats();

-- Function to calculate advertisement ROI
CREATE OR REPLACE FUNCTION calculate_advertisement_roi(ad_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    ad_spent DECIMAL;
    ad_clicks INTEGER;
    estimated_revenue DECIMAL;
    roi_value DECIMAL;
BEGIN
    SELECT spent, clicks INTO ad_spent, ad_clicks
    FROM advertisements 
    WHERE id = ad_id;
    
    IF ad_spent = 0 THEN
        RETURN 0;
    END IF;
    
    -- Estimate revenue based on average conversion value
    estimated_revenue := ad_clicks * 2.50; -- Assume $2.50 average value per click
    
    roi_value := ((estimated_revenue - ad_spent) / ad_spent) * 100;
    
    RETURN roi_value;
END;
$$ LANGUAGE plpgsql;

-- Function to get advertisement performance metrics
CREATE OR REPLACE FUNCTION get_advertisement_metrics(ad_id UUID, start_date DATE, end_date DATE)
RETURNS TABLE (
    total_clicks BIGINT,
    total_impressions BIGINT,
    total_cost DECIMAL,
    avg_ctr DECIMAL,
    avg_cpc DECIMAL,
    avg_cpm DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(clicks)::BIGINT as total_clicks,
        SUM(impressions)::BIGINT as total_impressions,
        SUM(cost) as total_cost,
        CASE 
            WHEN SUM(impressions) > 0 THEN (SUM(clicks)::DECIMAL / SUM(impressions)) * 100
            ELSE 0
        END as avg_ctr,
        CASE 
            WHEN SUM(clicks) > 0 THEN SUM(cost) / SUM(clicks)
            ELSE 0
        END as avg_cpc,
        CASE 
            WHEN SUM(impressions) > 0 THEN (SUM(cost) / SUM(impressions)) * 1000
            ELSE 0
        END as avg_cpm
    FROM advertisement_analytics
    WHERE advertisement_id = ad_id
    AND date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Insert default advertisement templates
INSERT INTO advertisement_templates (name, category, placement_type, size, template_data, preview_url) VALUES
('Car Audio Banner - Performance', 'automotive', 'header', 'banner', '{"background": "#000000", "accent": "#00ff88", "font": "bold", "style": "modern"}', '/templates/performance-banner.jpg'),
('Subwoofer Sidebar Ad', 'automotive', 'sidebar', 'medium', '{"background": "#1a1a1a", "accent": "#ff4444", "font": "bold", "style": "dynamic"}', '/templates/subwoofer-sidebar.jpg'),
('Competition Event Promo', 'events', 'event_page', 'square', '{"background": "#2d1b69", "accent": "#00ff88", "font": "bold", "style": "energetic"}', '/templates/competition-square.jpg'),
('Mobile Audio Banner', 'automotive', 'mobile_banner', 'small', '{"background": "#000000", "accent": "#00ff88", "font": "clean", "style": "minimal"}', '/templates/mobile-banner.jpg')
ON CONFLICT DO NOTHING;

-- Create view for advertisement dashboard
CREATE OR REPLACE VIEW advertisement_dashboard AS
SELECT 
    a.id,
    a.title,
    a.advertiser_name,
    a.placement_type,
    a.status,
    a.budget,
    a.spent,
    a.clicks,
    a.impressions,
    a.start_date,
    a.end_date,
    CASE 
        WHEN a.impressions > 0 THEN (a.clicks::DECIMAL / a.impressions) * 100
        ELSE 0
    END as ctr,
    CASE 
        WHEN a.clicks > 0 THEN a.spent / a.clicks
        ELSE 0
    END as cpc,
    calculate_advertisement_roi(a.id) as roi,
    a.advertiser_email,
    c.name as campaign_name
FROM advertisements a
LEFT JOIN advertisement_campaigns c ON a.campaign_id = c.id;

COMMENT ON TABLE advertisements IS 'Enhanced advertisement system with user integration and advanced features';
COMMENT ON TABLE advertisement_billing IS 'Billing and payment tracking for advertisements';
COMMENT ON TABLE advertisement_analytics IS 'Detailed analytics and performance tracking';
COMMENT ON TABLE advertisement_campaigns IS 'Campaign management for grouping advertisements';
COMMENT ON TABLE advertisement_templates IS 'AI-generated advertisement templates';
COMMENT ON TABLE user_advertisement_preferences IS 'User preferences for advertisement display';
COMMENT ON VIEW advertisement_dashboard IS 'Comprehensive view for advertisement management dashboard'; 