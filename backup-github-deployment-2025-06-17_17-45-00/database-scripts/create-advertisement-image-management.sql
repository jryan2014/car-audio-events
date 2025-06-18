-- Advertisement Image Management & A/B Testing System
-- Database Schema Enhancement for Multiple Images per Advertisement

-- Check if advertisements table exists and create a compatible version if needed
-- This handles different possible schemas that might exist
DO $$
BEGIN
    -- Check if advertisements table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'advertisements') THEN
        -- Create advertisements table if it doesn't exist
        CREATE TABLE advertisements (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            advertiser_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            placement_id UUID,
            title TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            link_url TEXT,
            start_date TIMESTAMPTZ NOT NULL,
            end_date TIMESTAMPTZ NOT NULL,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'paused', 'expired', 'rejected')),
            priority INTEGER DEFAULT 1,
            click_count INTEGER DEFAULT 0,
            impression_count INTEGER DEFAULT 0,
            budget_amount NUMERIC(10,2),
            cost_per_click NUMERIC(10,2),
            cost_per_impression NUMERIC(10,2),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created advertisements table';
    ELSE
        RAISE NOTICE 'Advertisements table already exists, using existing structure';
    END IF;
END
$$;

-- Create advertisement_images table for storing multiple images per ad
CREATE TABLE IF NOT EXISTS advertisement_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_title VARCHAR(255),
    
    -- Image status and variant information
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'archived')),
    variant_type VARCHAR(10) DEFAULT 'single' CHECK (variant_type IN ('single', 'a', 'b')),
    
    -- AI Generation metadata
    ai_prompt TEXT,
    ai_provider VARCHAR(50),
    ai_model VARCHAR(50),
    ai_style VARCHAR(20),
    ai_quality VARCHAR(20),
    generation_cost DECIMAL(8,4) DEFAULT 0,
    
    -- Image specifications
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    file_format VARCHAR(10),
    
    -- Performance tracking
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    click_through_rate DECIMAL(5,4) DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    
    -- A/B Testing metrics
    ab_test_start_date TIMESTAMP WITH TIME ZONE,
    ab_test_end_date TIMESTAMP WITH TIME ZONE,
    ab_test_impressions INTEGER DEFAULT 0,
    ab_test_clicks INTEGER DEFAULT 0,
    ab_test_conversions INTEGER DEFAULT 0,
    
    -- Metadata and timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_ab_test_dates CHECK (ab_test_end_date > ab_test_start_date OR ab_test_end_date IS NULL),
    CONSTRAINT valid_metrics CHECK (impressions >= 0 AND clicks >= 0 AND clicks <= impressions)
);

-- Remove the unique constraint that was causing issues and handle it in application logic instead
-- CONSTRAINT unique_active_image_per_ad UNIQUE (advertisement_id, status) 
--     DEFERRABLE INITIALLY DEFERRED,

-- Create advertisement_image_analytics for detailed tracking
CREATE TABLE IF NOT EXISTS advertisement_image_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    advertisement_image_id UUID NOT NULL REFERENCES advertisement_images(id) ON DELETE CASCADE,
    
    -- Date and time tracking
    date DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour <= 23),
    
    -- Performance metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    cost DECIMAL(8,2) DEFAULT 0,
    
    -- Context information
    placement_type VARCHAR(50),
    device_type VARCHAR(20),
    user_type VARCHAR(50),
    geographic_location VARCHAR(100),
    
    -- A/B testing specific
    variant_shown VARCHAR(10),
    ab_test_active BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique entries per day/hour combination
    UNIQUE(advertisement_image_id, date, hour, placement_type, device_type, user_type)
);

-- Create advertisement_ab_tests table for managing A/B test campaigns
CREATE TABLE IF NOT EXISTS advertisement_ab_tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    
    -- Test configuration
    test_name VARCHAR(255) NOT NULL,
    test_description TEXT,
    
    -- Images being tested
    image_a_id UUID NOT NULL REFERENCES advertisement_images(id) ON DELETE CASCADE,
    image_b_id UUID NOT NULL REFERENCES advertisement_images(id) ON DELETE CASCADE,
    
    -- Test parameters
    traffic_split DECIMAL(3,2) DEFAULT 0.50 CHECK (traffic_split > 0 AND traffic_split < 1),
    confidence_level DECIMAL(3,2) DEFAULT 0.95,
    minimum_sample_size INTEGER DEFAULT 100,
    
    -- Test status and dates
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    
    -- Results
    winning_variant VARCHAR(1) CHECK (winning_variant IN ('a', 'b')),
    statistical_significance DECIMAL(5,4),
    improvement_percentage DECIMAL(5,2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_test_dates CHECK (end_date > start_date OR end_date IS NULL),
    CONSTRAINT different_images CHECK (image_a_id != image_b_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_advertisement_images_ad_id ON advertisement_images(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_advertisement_images_status ON advertisement_images(status);
CREATE INDEX IF NOT EXISTS idx_advertisement_images_variant ON advertisement_images(variant_type);
CREATE INDEX IF NOT EXISTS idx_advertisement_images_created_at ON advertisement_images(created_at);

CREATE INDEX IF NOT EXISTS idx_advertisement_image_analytics_image_id ON advertisement_image_analytics(advertisement_image_id);
CREATE INDEX IF NOT EXISTS idx_advertisement_image_analytics_date ON advertisement_image_analytics(date);
CREATE INDEX IF NOT EXISTS idx_advertisement_image_analytics_ad_id ON advertisement_image_analytics(advertisement_id);

CREATE INDEX IF NOT EXISTS idx_advertisement_ab_tests_ad_id ON advertisement_ab_tests(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_advertisement_ab_tests_status ON advertisement_ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_advertisement_ab_tests_dates ON advertisement_ab_tests(start_date, end_date);

-- Create functions for automatic updates
CREATE OR REPLACE FUNCTION update_advertisement_image_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update click-through rate
    IF NEW.impressions > 0 THEN
        NEW.click_through_rate = (NEW.clicks::DECIMAL / NEW.impressions::DECIMAL);
    END IF;
    
    -- Update timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic stat updates
DROP TRIGGER IF EXISTS trigger_update_advertisement_image_stats ON advertisement_images;
CREATE TRIGGER trigger_update_advertisement_image_stats
    BEFORE UPDATE ON advertisement_images
    FOR EACH ROW
    EXECUTE FUNCTION update_advertisement_image_stats();

-- Function to activate an image and deactivate others
CREATE OR REPLACE FUNCTION activate_advertisement_image(image_id UUID)
RETURNS VOID AS $$
DECLARE
    ad_id UUID;
BEGIN
    -- Get the advertisement ID for this image
    SELECT advertisement_id INTO ad_id 
    FROM advertisement_images 
    WHERE id = image_id;
    
    -- Deactivate all images for this advertisement
    UPDATE advertisement_images 
    SET status = 'inactive', updated_at = NOW()
    WHERE advertisement_id = ad_id AND status = 'active';
    
    -- Activate the selected image
    UPDATE advertisement_images 
    SET status = 'active', updated_at = NOW()
    WHERE id = image_id;
END;
$$ LANGUAGE plpgsql;

-- Function to set up A/B test between two images
CREATE OR REPLACE FUNCTION setup_ab_test(
    ad_id UUID,
    image_a_id UUID, 
    image_b_id UUID,
    test_name VARCHAR(255)
)
RETURNS UUID AS $$
DECLARE
    test_id UUID;
BEGIN
    -- Create A/B test record
    INSERT INTO advertisement_ab_tests (
        advertisement_id,
        test_name,
        image_a_id,
        image_b_id,
        status,
        start_date
    ) VALUES (
        ad_id,
        test_name,
        image_a_id,
        image_b_id,
        'active',
        NOW()
    ) RETURNING id INTO test_id;
    
    -- Update images to A/B variant types
    UPDATE advertisement_images 
    SET variant_type = 'a', 
        status = 'active',
        ab_test_start_date = NOW(),
        updated_at = NOW()
    WHERE id = image_a_id;
    
    UPDATE advertisement_images 
    SET variant_type = 'b', 
        status = 'active',
        ab_test_start_date = NOW(),
        updated_at = NOW()
    WHERE id = image_b_id;
    
    -- Deactivate any other active images for this ad
    UPDATE advertisement_images 
    SET status = 'inactive', updated_at = NOW()
    WHERE advertisement_id = ad_id 
    AND id NOT IN (image_a_id, image_b_id) 
    AND status = 'active';
    
    RETURN test_id;
END;
$$ LANGUAGE plpgsql;

-- Function to track image impression
CREATE OR REPLACE FUNCTION track_image_impression(
    image_id UUID,
    placement VARCHAR(50) DEFAULT NULL,
    device VARCHAR(20) DEFAULT NULL,
    user_type VARCHAR(50) DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    ad_id UUID;
BEGIN
    -- Get advertisement ID
    SELECT advertisement_id INTO ad_id 
    FROM advertisement_images 
    WHERE id = image_id;
    
    -- Update image impression count
    UPDATE advertisement_images 
    SET impressions = impressions + 1,
        updated_at = NOW()
    WHERE id = image_id;
    
    -- Insert/update analytics record
    INSERT INTO advertisement_image_analytics (
        advertisement_id,
        advertisement_image_id,
        date,
        hour,
        impressions,
        placement_type,
        device_type,
        user_type
    ) VALUES (
        ad_id,
        image_id,
        CURRENT_DATE,
        EXTRACT(HOUR FROM NOW())::INTEGER,
        1,
        placement,
        device,
        user_type
    )
    ON CONFLICT (advertisement_image_id, date, hour, placement_type, device_type, user_type)
    DO UPDATE SET 
        impressions = advertisement_image_analytics.impressions + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to track image click
CREATE OR REPLACE FUNCTION track_image_click(
    image_id UUID,
    placement VARCHAR(50) DEFAULT NULL,
    device VARCHAR(20) DEFAULT NULL,
    user_type VARCHAR(50) DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    ad_id UUID;
BEGIN
    -- Get advertisement ID
    SELECT advertisement_id INTO ad_id 
    FROM advertisement_images 
    WHERE id = image_id;
    
    -- Update image click count
    UPDATE advertisement_images 
    SET clicks = clicks + 1,
        updated_at = NOW()
    WHERE id = image_id;
    
    -- Insert/update analytics record
    INSERT INTO advertisement_image_analytics (
        advertisement_id,
        advertisement_image_id,
        date,
        hour,
        clicks,
        placement_type,
        device_type,
        user_type
    ) VALUES (
        ad_id,
        image_id,
        CURRENT_DATE,
        EXTRACT(HOUR FROM NOW())::INTEGER,
        1,
        placement,
        device,
        user_type
    )
    ON CONFLICT (advertisement_image_id, date, hour, placement_type, device_type, user_type)
    DO UPDATE SET 
        clicks = advertisement_image_analytics.clicks + 1;
END;
$$ LANGUAGE plpgsql;

-- Create views for easy data access
CREATE OR REPLACE VIEW advertisement_image_summary AS
SELECT 
    ai.id,
    ai.advertisement_id,
    ai.image_url,
    ai.image_title,
    ai.status,
    ai.variant_type,
    ai.impressions,
    ai.clicks,
    ai.click_through_rate,
    ai.cost,
    ai.created_at,
    a.title as advertisement_title,
    a.advertiser_name,
    CASE 
        WHEN ai.impressions > 0 THEN (ai.clicks::DECIMAL / ai.impressions::DECIMAL * 100)
        ELSE 0 
    END as ctr_percentage
FROM advertisement_images ai
JOIN advertisements a ON ai.advertisement_id = a.id
ORDER BY ai.created_at DESC;

-- Create view for A/B test performance comparison
CREATE OR REPLACE VIEW ab_test_performance AS
SELECT 
    abt.id as test_id,
    abt.test_name,
    abt.advertisement_id,
    abt.status as test_status,
    abt.start_date,
    abt.end_date,
    abt.traffic_split,
    
    -- Image A metrics
    ai_a.image_url as image_a_url,
    ai_a.impressions as image_a_impressions,
    ai_a.clicks as image_a_clicks,
    ai_a.click_through_rate as image_a_ctr,
    
    -- Image B metrics  
    ai_b.image_url as image_b_url,
    ai_b.impressions as image_b_impressions,
    ai_b.clicks as image_b_clicks,
    ai_b.click_through_rate as image_b_ctr,
    
    -- Performance comparison
    CASE 
        WHEN ai_a.click_through_rate > ai_b.click_through_rate THEN 'A'
        WHEN ai_b.click_through_rate > ai_a.click_through_rate THEN 'B'
        ELSE 'Tie'
    END as leading_variant,
    
    CASE 
        WHEN ai_a.click_through_rate > 0 AND ai_b.click_through_rate > 0 THEN
            ABS((ai_a.click_through_rate - ai_b.click_through_rate) / ai_b.click_through_rate * 100)
        ELSE 0
    END as improvement_percentage
    
FROM advertisement_ab_tests abt
JOIN advertisement_images ai_a ON abt.image_a_id = ai_a.id
JOIN advertisement_images ai_b ON abt.image_b_id = ai_b.id
ORDER BY abt.created_at DESC;

-- Add helpful comments
COMMENT ON TABLE advertisement_images IS 'Stores multiple images per advertisement with individual performance tracking';
COMMENT ON TABLE advertisement_image_analytics IS 'Detailed analytics tracking for each image by date/hour';
COMMENT ON TABLE advertisement_ab_tests IS 'A/B test configuration and results between image variants';

COMMENT ON FUNCTION activate_advertisement_image(UUID) IS 'Activates one image and deactivates all others for an advertisement';
COMMENT ON FUNCTION setup_ab_test(UUID, UUID, UUID, VARCHAR) IS 'Sets up A/B test between two images';
COMMENT ON FUNCTION track_image_impression(UUID, VARCHAR, VARCHAR, VARCHAR) IS 'Records an impression for a specific image';
COMMENT ON FUNCTION track_image_click(UUID, VARCHAR, VARCHAR, VARCHAR) IS 'Records a click for a specific image'; 