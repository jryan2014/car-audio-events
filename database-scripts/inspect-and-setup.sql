-- Inspect Database and Setup Advertisement Image System
-- This script first checks what exists and adapts accordingly

-- Step 1: Check if advertisements table exists and show its structure
SELECT 'Checking advertisements table structure...' as step;

SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'advertisements') 
        THEN 'advertisements table EXISTS'
        ELSE 'advertisements table DOES NOT EXIST'
    END as table_status;

-- Show all columns in advertisements table if it exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'advertisements' 
ORDER BY ordinal_position;

-- Step 2: Check what the primary key column is called
SELECT constraint_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'advertisements' 
  AND constraint_name LIKE '%pkey%';

-- Step 3: Create the new image tables (these should work regardless)
SELECT 'Creating advertisement image tables...' as step;

-- Create advertisement_images table with flexible foreign key
CREATE TABLE IF NOT EXISTS advertisement_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL, -- We'll add the foreign key constraint later
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

-- Create other tables without foreign key constraints initially
CREATE TABLE IF NOT EXISTS advertisement_image_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL,
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
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS advertisement_ab_tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL,
    
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

-- Step 4: Set up basic permissions (no RLS for now to avoid issues)
SELECT 'Setting up permissions...' as step;

GRANT SELECT, INSERT, UPDATE, DELETE ON advertisement_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON advertisement_image_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON advertisement_ab_tests TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 5: Show what we've created
SELECT 'Setup completed! Tables created:' as step;

SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE t.table_name IN ('advertisement_images', 'advertisement_image_analytics', 'advertisement_ab_tests');

SELECT 'Next step: Please run the migration after we understand your advertisements table structure' as next_step; 