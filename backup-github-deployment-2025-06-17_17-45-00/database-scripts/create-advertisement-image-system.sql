-- Advertisement Image Management System Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Advertisement Images Table
CREATE TABLE IF NOT EXISTS advertisement_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertisement_id VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    image_title VARCHAR(500),
    
    -- Image status and variant information
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'archived')),
    variant_type VARCHAR(10) DEFAULT 'single' CHECK (variant_type IN ('single', 'a', 'b')),
    
    -- AI Generation metadata
    ai_prompt TEXT,
    ai_provider VARCHAR(50),
    ai_model VARCHAR(100),
    ai_style VARCHAR(50),
    ai_quality VARCHAR(20),
    generation_cost DECIMAL(10,4) DEFAULT 0,
    
    -- Image specifications
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    file_format VARCHAR(10),
    
    -- Performance tracking
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    click_through_rate DECIMAL(8,6) DEFAULT 0,
    cost DECIMAL(10,4) DEFAULT 0,
    
    -- A/B Testing metrics
    ab_test_start_date TIMESTAMP,
    ab_test_end_date TIMESTAMP,
    ab_test_impressions INTEGER DEFAULT 0,
    ab_test_clicks INTEGER DEFAULT 0,
    ab_test_conversions INTEGER DEFAULT 0,
    
    -- Metadata and timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Advertisement A/B Tests Table
CREATE TABLE IF NOT EXISTS advertisement_ab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertisement_id VARCHAR(255) NOT NULL,
    
    -- Test configuration
    test_name VARCHAR(255) NOT NULL,
    test_description TEXT,
    
    -- Images being tested
    image_a_id UUID REFERENCES advertisement_images(id) ON DELETE CASCADE,
    image_b_id UUID REFERENCES advertisement_images(id) ON DELETE CASCADE,
    
    -- Test parameters
    traffic_split INTEGER DEFAULT 50 CHECK (traffic_split >= 10 AND traffic_split <= 90),
    confidence_level DECIMAL(5,3) DEFAULT 95.0,
    minimum_sample_size INTEGER DEFAULT 1000,
    
    -- Test status and dates
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    
    -- Results
    winning_variant VARCHAR(1) CHECK (winning_variant IN ('a', 'b')),
    statistical_significance DECIMAL(5,3),
    improvement_percentage DECIMAL(8,4),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Advertisement Image Analytics Table
CREATE TABLE IF NOT EXISTS advertisement_image_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertisement_id VARCHAR(255) NOT NULL,
    advertisement_image_id UUID REFERENCES advertisement_images(id) ON DELETE CASCADE,
    
    -- Date and time tracking
    date DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour <= 23),
    
    -- Performance metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    cost DECIMAL(10,4) DEFAULT 0,
    
    -- Context information
    placement_type VARCHAR(50),
    device_type VARCHAR(20),
    user_type VARCHAR(50),
    geographic_location VARCHAR(100),
    
    -- A/B testing specific
    variant_shown VARCHAR(1),
    ab_test_active BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI Generated Images Storage Table (for image management)
CREATE TABLE IF NOT EXISTS ai_generated_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100),
    cost DECIMAL(10,4) DEFAULT 0,
    
    -- Size information
    size_name VARCHAR(100),
    size_width INTEGER,
    size_height INTEGER,
    
    -- Metadata
    advertiser_id VARCHAR(255),
    advertiser_name VARCHAR(255),
    ad_id VARCHAR(255),
    ad_title VARCHAR(500),
    is_active BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Additional metadata
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_advertisement_images_ad_id ON advertisement_images(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_advertisement_images_status ON advertisement_images(status);
CREATE INDEX IF NOT EXISTS idx_advertisement_images_variant ON advertisement_images(variant_type);
CREATE INDEX IF NOT EXISTS idx_ab_tests_ad_id ON advertisement_ab_tests(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON advertisement_ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_analytics_image_id ON advertisement_image_analytics(advertisement_image_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON advertisement_image_analytics(date);
CREATE INDEX IF NOT EXISTS idx_ai_images_advertiser ON ai_generated_images(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_ai_images_active ON ai_generated_images(is_active);

-- Functions for tracking impressions and clicks
CREATE OR REPLACE FUNCTION track_image_impression(
    image_id UUID,
    placement VARCHAR(50) DEFAULT NULL,
    device VARCHAR(20) DEFAULT NULL,
    user_type VARCHAR(50) DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Update image impression count
    UPDATE advertisement_images 
    SET impressions = impressions + 1,
        updated_at = NOW()
    WHERE id = image_id;
    
    -- Insert analytics record
    INSERT INTO advertisement_image_analytics (
        advertisement_image_id,
        advertisement_id,
        date,
        hour,
        impressions,
        placement_type,
        device_type,
        user_type
    ) VALUES (
        image_id,
        (SELECT advertisement_id FROM advertisement_images WHERE id = image_id),
        CURRENT_DATE,
        EXTRACT(HOUR FROM NOW()),
        1,
        placement,
        device,
        user_type
    )
    ON CONFLICT (advertisement_image_id, date, hour, COALESCE(placement_type, ''), COALESCE(device_type, ''))
    DO UPDATE SET 
        impressions = advertisement_image_analytics.impressions + 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION track_image_click(
    image_id UUID,
    placement VARCHAR(50) DEFAULT NULL,
    device VARCHAR(20) DEFAULT NULL,
    user_type VARCHAR(50) DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Update image click count and CTR
    UPDATE advertisement_images 
    SET clicks = clicks + 1,
        click_through_rate = CASE 
            WHEN impressions > 0 THEN (clicks + 1)::DECIMAL / impressions::DECIMAL
            ELSE 0
        END,
        updated_at = NOW()
    WHERE id = image_id;
    
    -- Insert/update analytics record
    INSERT INTO advertisement_image_analytics (
        advertisement_image_id,
        advertisement_id,
        date,
        hour,
        clicks,
        placement_type,
        device_type,
        user_type
    ) VALUES (
        image_id,
        (SELECT advertisement_id FROM advertisement_images WHERE id = image_id),
        CURRENT_DATE,
        EXTRACT(HOUR FROM NOW()),
        1,
        placement,
        device,
        user_type
    )
    ON CONFLICT (advertisement_image_id, date, hour, COALESCE(placement_type, ''), COALESCE(device_type, ''))
    DO UPDATE SET 
        clicks = advertisement_image_analytics.clicks + 1;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update CTR when impressions or clicks change
CREATE OR REPLACE FUNCTION update_ctr() RETURNS TRIGGER AS $$
BEGIN
    NEW.click_through_rate = CASE 
        WHEN NEW.impressions > 0 THEN NEW.clicks::DECIMAL / NEW.impressions::DECIMAL
        ELSE 0
    END;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ctr
    BEFORE UPDATE ON advertisement_images
    FOR EACH ROW
    EXECUTE FUNCTION update_ctr();

-- Sample data for testing (optional)
-- First, let's create some sample advertisement IDs
DO $$
DECLARE
    sample_ad_id_1 UUID := uuid_generate_v4();
    sample_ad_id_2 UUID := uuid_generate_v4();
BEGIN
    -- Insert sample advertisement images
    INSERT INTO advertisement_images (
        advertisement_id, image_url, image_title, status, variant_type,
        ai_prompt, ai_provider, generation_cost, width, height,
        impressions, clicks
    ) VALUES 
    (
        sample_ad_id_1, 
        'https://images.unsplash.com/photo-1493238792000-8113da705763?w=600',
        'AD_SID_MED_20250115 - Premium Car Audio Equipment',
        'active',
        'single',
        'Premium car audio equipment advertisement with modern design',
        'dall-e-3',
        0.04,
        600,
        400,
        1250,
        45
    ),
    (
        sample_ad_id_1,
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600', 
        'AD_SID_MED_20250115_A - Car Audio Variant A',
        'inactive',
        'a',
        'Car audio equipment with bold red styling',
        'dall-e-3',
        0.04,
        600,
        400,
        890,
        32
    ),
    (
        sample_ad_id_1,
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
        'AD_SID_MED_20250115_B - Car Audio Variant B', 
        'inactive',
        'b',
        'Car audio equipment with sleek black styling',
        'dall-e-3',
        0.04,
        600,
        400,
        920,
        38
    ),
    (
        sample_ad_id_2,
        'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=600',
        'AD_HEA_LRG_20250115 - Professional Audio Installation',
        'active',
        'single',
        'Professional car audio installation with premium equipment',
        'dall-e-3',
        0.04,
        728,
        90,
        2100,
        89
    );
END $$;

-- Insert sample AI generated images for image management
DO $$
DECLARE
    sample_advertiser_id_1 VARCHAR(255) := 'adv-' || substr(uuid_generate_v4()::text, 1, 8);
    sample_advertiser_id_2 VARCHAR(255) := 'adv-' || substr(uuid_generate_v4()::text, 1, 8);
    sample_ad_id_1 VARCHAR(255) := 'ad-' || substr(uuid_generate_v4()::text, 1, 8);
    sample_ad_id_2 VARCHAR(255) := 'ad-' || substr(uuid_generate_v4()::text, 1, 8);
BEGIN
    INSERT INTO ai_generated_images (
        url, prompt, provider, cost, size_name, size_width, size_height,
        advertiser_id, advertiser_name, ad_id, ad_title, is_active
    ) VALUES
    (
        'https://images.unsplash.com/photo-1493238792000-8113da705763?w=600',
        'Premium car audio equipment advertisement with modern design',
        'dall-e-3',
        0.04,
        'Medium Rectangle',
        600,
        400,
        sample_advertiser_id_1,
        'AudioPro Solutions',
        sample_ad_id_1,
        'Premium Car Audio Equipment',
        true
    ),
    (
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600',
        'Car audio speakers with dynamic lighting effects',
        'dall-e-3', 
        0.04,
        'Medium Rectangle',
        600,
        400,
        sample_advertiser_id_1,
        'AudioPro Solutions',
        sample_ad_id_2,
        'Dynamic Audio Experience',
        false
    ),
    (
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
        'Professional car audio installation showcase',
        'dall-e-3',
        0.04,
        'Medium Rectangle', 
        600,
        400,
        sample_advertiser_id_2,
        'Sound Masters Pro',
        NULL,
        NULL,
        false
    ),
    (
        'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=160&h=600&fit=crop',
        'Sleek car audio equipment vertical banner',
        'stability-ai',
        0.02,
        'Skyscraper',
        160,
        600,
        sample_advertiser_id_2,
        'Sound Masters Pro',
        NULL,
        NULL,
        true
    );
END $$;

COMMENT ON TABLE advertisement_images IS 'Stores all advertisement images with performance tracking';
COMMENT ON TABLE advertisement_ab_tests IS 'Manages A/B tests between different advertisement images';
COMMENT ON TABLE advertisement_image_analytics IS 'Detailed analytics data for advertisement images';
COMMENT ON TABLE ai_generated_images IS 'Storage for AI-generated images in the image management system'; 