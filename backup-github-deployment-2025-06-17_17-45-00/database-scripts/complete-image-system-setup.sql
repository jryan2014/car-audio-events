-- Complete Advertisement Image System Setup
-- This script creates all tables and migrates existing data in one go

SELECT 'Creating advertisement image management tables...' as step;

-- Check if advertisements table exists and create a compatible version if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'advertisements') THEN
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

SELECT 'Tables created successfully! Now checking existing data...' as step;

-- Check what columns exist in advertisements table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'advertisements' 
ORDER BY ordinal_position;

-- Migrate existing images to the new table
SELECT 'Starting image migration...' as step;
INSERT INTO advertisement_images (
    advertisement_id,
    image_url,
    image_title,
    status,
    variant_type,
    created_at,
    updated_at
)
SELECT 
    id as advertisement_id,
    image_url,
    COALESCE(title || ' - Original Image', 'Original Advertisement Image') as image_title,
    'active' as status,
    'single' as variant_type,
    COALESCE(created_at, NOW()) as created_at,
    NOW() as updated_at
FROM advertisements 
WHERE image_url IS NOT NULL 
  AND image_url != ''
  AND NOT EXISTS (
      SELECT 1 FROM advertisement_images 
      WHERE advertisement_id = advertisements.id
  );

-- Set up Row Level Security
SELECT 'Setting up security policies...' as step;
ALTER TABLE advertisement_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage advertisement images" ON advertisement_images
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Active advertisement images are viewable by everyone" ON advertisement_images
    FOR SELECT TO public
    USING (status = 'active');

ALTER TABLE advertisement_image_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view advertisement image analytics" ON advertisement_image_analytics
    FOR SELECT TO authenticated
    USING (true);

ALTER TABLE advertisement_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage advertisement A/B tests" ON advertisement_ab_tests
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant permissions
SELECT 'Granting permissions...' as step;
GRANT SELECT, INSERT, UPDATE, DELETE ON advertisement_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON advertisement_image_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON advertisement_ab_tests TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Show results
SELECT 'Setup completed successfully!' as step;
SELECT COUNT(*) as images_migrated FROM advertisement_images;
SELECT 'Your advertisement images should now be visible!' as final_message; 