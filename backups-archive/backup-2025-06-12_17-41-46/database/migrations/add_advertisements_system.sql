-- Advertisement Management System Database Migration
-- This migration creates tables for managing advertisements, placements, and tracking

-- Create advertisements table
CREATE TABLE IF NOT EXISTS advertisements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    click_url TEXT NOT NULL,
    advertiser_name VARCHAR(255) NOT NULL,
    advertiser_email VARCHAR(255) NOT NULL,
    placement_type VARCHAR(50) NOT NULL CHECK (placement_type IN ('header', 'sidebar', 'event_page', 'mobile_banner', 'footer')),
    size VARCHAR(50) NOT NULL CHECK (size IN ('small', 'medium', 'large', 'banner', 'square')),
    target_pages TEXT[], -- Array of page types to target
    target_keywords TEXT[], -- Array of keywords to target
    target_categories TEXT[], -- Array of event categories to target
    budget DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_per_click DECIMAL(6,3) NOT NULL DEFAULT 0,
    cost_per_impression DECIMAL(6,3) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'paused', 'completed', 'rejected')),
    clicks INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    spent DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (end_date > start_date),
    CONSTRAINT valid_budget CHECK (budget > 0),
    CONSTRAINT valid_costs CHECK (cost_per_click >= 0 AND cost_per_impression >= 0)
);

-- Create ad placements table for tracking where ads are shown
CREATE TABLE IF NOT EXISTS ad_placements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    page_url TEXT NOT NULL,
    page_type VARCHAR(100), -- 'home', 'events', 'event_detail', 'profile', etc.
    placement_position VARCHAR(50), -- 'header', 'sidebar', 'footer', etc.
    user_id UUID REFERENCES users(id), -- User who saw the ad (if logged in)
    user_ip INET, -- IP address for anonymous tracking
    user_agent TEXT, -- Browser/device info
    shown_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    clicked BOOLEAN DEFAULT FALSE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes for performance
    INDEX idx_ad_placements_ad_id (advertisement_id),
    INDEX idx_ad_placements_page_type (page_type),
    INDEX idx_ad_placements_shown_at (shown_at),
    INDEX idx_ad_placements_clicked (clicked)
);

-- Create ad performance tracking table
CREATE TABLE IF NOT EXISTS ad_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0, -- Future: track conversions
    revenue DECIMAL(10,2) NOT NULL DEFAULT 0, -- Future: track revenue attribution
    
    -- Unique constraint to prevent duplicate daily records
    UNIQUE(advertisement_id, date),
    
    -- Indexes
    INDEX idx_ad_performance_ad_id (advertisement_id),
    INDEX idx_ad_performance_date (date)
);

-- Create ad targeting rules table for advanced targeting
CREATE TABLE IF NOT EXISTS ad_targeting_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL, -- 'page_url', 'user_type', 'event_category', 'keyword', 'location'
    rule_value TEXT NOT NULL,
    rule_operator VARCHAR(20) NOT NULL DEFAULT 'equals', -- 'equals', 'contains', 'starts_with', 'in_array'
    is_include BOOLEAN NOT NULL DEFAULT TRUE, -- TRUE for include, FALSE for exclude
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_ad_targeting_ad_id (advertisement_id),
    INDEX idx_ad_targeting_type (rule_type)
);

-- Create ad billing table for tracking payments
CREATE TABLE IF NOT EXISTS ad_billing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    total_impressions INTEGER NOT NULL DEFAULT 0,
    total_clicks INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    payment_reference TEXT,
    invoice_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_ad_billing_ad_id (advertisement_id),
    INDEX idx_ad_billing_period (billing_period_start, billing_period_end),
    INDEX idx_ad_billing_status (payment_status)
);

-- Create function to update advertisement stats
CREATE OR REPLACE FUNCTION update_advertisement_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the advertisement's click and impression counts
    UPDATE advertisements 
    SET 
        clicks = (
            SELECT COUNT(*) 
            FROM ad_placements 
            WHERE advertisement_id = NEW.advertisement_id AND clicked = TRUE
        ),
        impressions = (
            SELECT COUNT(*) 
            FROM ad_placements 
            WHERE advertisement_id = NEW.advertisement_id
        ),
        spent = (
            SELECT 
                CASE 
                    WHEN a.cost_per_click > 0 THEN 
                        (SELECT COUNT(*) FROM ad_placements WHERE advertisement_id = NEW.advertisement_id AND clicked = TRUE) * a.cost_per_click
                    WHEN a.cost_per_impression > 0 THEN 
                        (SELECT COUNT(*) FROM ad_placements WHERE advertisement_id = NEW.advertisement_id) * a.cost_per_impression / 1000
                    ELSE 0
                END
            FROM advertisements a 
            WHERE a.id = NEW.advertisement_id
        ),
        updated_at = NOW()
    WHERE id = NEW.advertisement_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stats
DROP TRIGGER IF EXISTS trigger_update_ad_stats ON ad_placements;
CREATE TRIGGER trigger_update_ad_stats
    AFTER INSERT OR UPDATE ON ad_placements
    FOR EACH ROW
    EXECUTE FUNCTION update_advertisement_stats();

-- Create function to update daily performance stats
CREATE OR REPLACE FUNCTION update_daily_ad_performance()
RETURNS TRIGGER AS $$
DECLARE
    target_date DATE;
BEGIN
    target_date := DATE(NEW.shown_at);
    
    -- Insert or update daily performance record
    INSERT INTO ad_performance (advertisement_id, date, impressions, clicks, cost)
    VALUES (
        NEW.advertisement_id,
        target_date,
        1,
        CASE WHEN NEW.clicked THEN 1 ELSE 0 END,
        CASE 
            WHEN NEW.clicked THEN (SELECT cost_per_click FROM advertisements WHERE id = NEW.advertisement_id)
            ELSE (SELECT cost_per_impression FROM advertisements WHERE id = NEW.advertisement_id) / 1000
        END
    )
    ON CONFLICT (advertisement_id, date)
    DO UPDATE SET
        impressions = ad_performance.impressions + 1,
        clicks = ad_performance.clicks + CASE WHEN NEW.clicked THEN 1 ELSE 0 END,
        cost = ad_performance.cost + CASE 
            WHEN NEW.clicked THEN (SELECT cost_per_click FROM advertisements WHERE id = NEW.advertisement_id)
            ELSE (SELECT cost_per_impression FROM advertisements WHERE id = NEW.advertisement_id) / 1000
        END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for daily performance tracking
DROP TRIGGER IF EXISTS trigger_daily_ad_performance ON ad_placements;
CREATE TRIGGER trigger_daily_ad_performance
    AFTER INSERT ON ad_placements
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_ad_performance();

-- Create function to automatically update ad status based on dates and budget
CREATE OR REPLACE FUNCTION update_ad_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if ad should be completed (past end date or budget exhausted)
    IF NEW.end_date < CURRENT_DATE OR NEW.spent >= NEW.budget THEN
        NEW.status = 'completed';
    -- Check if ad should be active (within date range and approved)
    ELSIF NEW.start_date <= CURRENT_DATE AND NEW.end_date >= CURRENT_DATE AND NEW.status = 'approved' THEN
        NEW.status = 'active';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status updates
DROP TRIGGER IF EXISTS trigger_update_ad_status ON advertisements;
CREATE TRIGGER trigger_update_ad_status
    BEFORE UPDATE ON advertisements
    FOR EACH ROW
    EXECUTE FUNCTION update_ad_status();

-- Create updated_at trigger for advertisements
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_advertisements_updated_at ON advertisements;
CREATE TRIGGER trigger_advertisements_updated_at
    BEFORE UPDATE ON advertisements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample advertisement data
INSERT INTO advertisements (
    title, description, image_url, click_url, advertiser_name, advertiser_email,
    placement_type, size, target_pages, target_keywords, target_categories,
    budget, cost_per_click, start_date, end_date, status
) VALUES 
(
    'Premium Car Audio Systems',
    'High-quality speakers and amplifiers for your car audio setup',
    '/api/placeholder/728/90',
    'https://example-audio.com',
    'Audio Pro Solutions',
    'contact@audiopro.com',
    'header',
    'banner',
    ARRAY['events', 'competitions', 'home'],
    ARRAY['spl', 'competition', 'speakers', 'amplifiers'],
    ARRAY['SPL Competition', 'Sound Quality'],
    500.00,
    0.75,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    'approved'
),
(
    'Car Audio Installation Services',
    'Professional installation services for car audio systems',
    '/api/placeholder/300/250',
    'https://example-install.com',
    'Install Masters',
    'info@installmasters.com',
    'sidebar',
    'medium',
    ARRAY['events', 'directory'],
    ARRAY['installation', 'professional', 'service'],
    ARRAY['Installation', 'Local Event'],
    250.00,
    0.50,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '60 days',
    'active'
),
(
    'Competition Entry Discounts',
    'Special pricing for upcoming car audio competitions',
    '/api/placeholder/300/150',
    'https://example-events.com',
    'Event Organizers LLC',
    'events@organizers.com',
    'event_page',
    'small',
    ARRAY['event_detail'],
    ARRAY['competition', 'discount', 'entry'],
    ARRAY['Bass Competition', 'Championship'],
    150.00,
    0.25,
    CURRENT_DATE + INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '37 days',
    'pending'
);

-- Insert sample targeting rules
INSERT INTO ad_targeting_rules (advertisement_id, rule_type, rule_value, rule_operator, is_include)
SELECT 
    id,
    'user_type',
    'competitor',
    'equals',
    TRUE
FROM advertisements 
WHERE title = 'Premium Car Audio Systems';

INSERT INTO ad_targeting_rules (advertisement_id, rule_type, rule_value, rule_operator, is_include)
SELECT 
    id,
    'page_url',
    '/events/',
    'contains',
    TRUE
FROM advertisements 
WHERE title = 'Car Audio Installation Services';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_advertisements_status ON advertisements(status);
CREATE INDEX IF NOT EXISTS idx_advertisements_dates ON advertisements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_advertisements_placement ON advertisements(placement_type, size);
CREATE INDEX IF NOT EXISTS idx_advertisements_advertiser ON advertisements(advertiser_email);

-- Enable Row Level Security (RLS)
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_targeting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_billing ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for advertisements (admin access only for management)
CREATE POLICY "Admins can manage all advertisements" ON advertisements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- Create RLS policy for ad placements (allow tracking for all users)
CREATE POLICY "Allow ad placement tracking" ON ad_placements
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view ad placements" ON ad_placements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- Create RLS policies for performance data (admin access only)
CREATE POLICY "Admins can manage ad performance" ON ad_performance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- Create RLS policies for targeting rules (admin access only)
CREATE POLICY "Admins can manage targeting rules" ON ad_targeting_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- Create RLS policies for billing (admin access only)
CREATE POLICY "Admins can manage ad billing" ON ad_billing
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- Create view for advertisement analytics
CREATE OR REPLACE VIEW advertisement_analytics AS
SELECT 
    a.id,
    a.title,
    a.advertiser_name,
    a.status,
    a.budget,
    a.spent,
    a.clicks,
    a.impressions,
    CASE 
        WHEN a.impressions > 0 THEN (a.clicks::DECIMAL / a.impressions * 100)
        ELSE 0 
    END as click_through_rate,
    CASE 
        WHEN a.spent > 0 THEN (a.clicks::DECIMAL / a.spent)
        ELSE 0 
    END as cost_per_click_actual,
    CASE 
        WHEN a.spent > 0 THEN (a.impressions::DECIMAL / a.spent * 1000)
        ELSE 0 
    END as cost_per_thousand_impressions,
    (a.budget - a.spent) as remaining_budget,
    CASE 
        WHEN a.budget > 0 THEN (a.spent / a.budget * 100)
        ELSE 0 
    END as budget_utilization,
    a.start_date,
    a.end_date,
    CASE 
        WHEN a.end_date < CURRENT_DATE THEN 'Expired'
        WHEN a.start_date > CURRENT_DATE THEN 'Scheduled'
        ELSE 'Current'
    END as campaign_status,
    a.created_at,
    a.updated_at
FROM advertisements a;

-- Grant permissions to authenticated users for the view
GRANT SELECT ON advertisement_analytics TO authenticated;

COMMENT ON TABLE advertisements IS 'Stores advertisement campaigns and their configuration';
COMMENT ON TABLE ad_placements IS 'Tracks individual ad impressions and clicks';
COMMENT ON TABLE ad_performance IS 'Daily aggregated performance metrics for advertisements';
COMMENT ON TABLE ad_targeting_rules IS 'Advanced targeting rules for advertisements';
COMMENT ON TABLE ad_billing IS 'Billing and payment tracking for advertisements';
COMMENT ON VIEW advertisement_analytics IS 'Analytics view with calculated metrics for advertisements'; 