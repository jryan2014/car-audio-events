-- Migration Script: Move Existing Advertisement Images
-- This script migrates existing image_url data from advertisements table to advertisement_images table

-- First, let's check what columns exist in the advertisements table
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Checking advertisements table structure...';
    
    -- List all columns in advertisements table
    FOR rec IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'advertisements' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % (Type: %)', rec.column_name, rec.data_type;
    END LOOP;
END;
$$;

-- Function to migrate existing advertisement images with flexible column handling
CREATE OR REPLACE FUNCTION migrate_existing_ad_images()
RETURNS INTEGER AS $$
DECLARE
    ad_record RECORD;
    images_migrated INTEGER := 0;
    user_id_column TEXT;
    sql_query TEXT;
BEGIN
    -- Determine which user ID column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advertisements' AND column_name = 'advertiser_id') THEN
        user_id_column := 'advertiser_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advertisements' AND column_name = 'user_id') THEN
        user_id_column := 'user_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advertisements' AND column_name = 'organizer_id') THEN
        user_id_column := 'organizer_id';
    ELSE
        user_id_column := NULL;
        RAISE NOTICE 'No user ID column found, will create images without created_by reference';
    END IF;
    
    RAISE NOTICE 'Using user ID column: %', COALESCE(user_id_column, 'NULL');
    
    -- Build dynamic SQL query based on available columns
    sql_query := 'SELECT id, image_url, ' ||
                 CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advertisements' AND column_name = 'title') 
                      THEN 'title' 
                      ELSE '''Advertisement'' as title' 
                 END ||
                 ', created_at' ||
                 CASE WHEN user_id_column IS NOT NULL 
                      THEN ', ' || user_id_column || ' as user_id' 
                      ELSE ', NULL as user_id' 
                 END ||
                 ' FROM advertisements 
                   WHERE image_url IS NOT NULL 
                   AND image_url != ''''
                   AND NOT EXISTS (
                       SELECT 1 FROM advertisement_images 
                       WHERE advertisement_id = advertisements.id
                   )';
    
    RAISE NOTICE 'SQL Query: %', sql_query;
    
    -- Loop through all advertisements that have an image_url
    FOR ad_record IN EXECUTE sql_query
    LOOP
        -- Insert the existing image as an active image in the new table
        INSERT INTO advertisement_images (
            advertisement_id,
            image_url,
            image_title,
            status,
            variant_type,
            created_at,
            updated_at,
            created_by
        ) VALUES (
            ad_record.id,
            ad_record.image_url,
            COALESCE(ad_record.title || ' - Original Image', 'Original Advertisement Image'),
            'active',
            'single',
            COALESCE(ad_record.created_at, NOW()),
            NOW(),
            ad_record.user_id
        );
        
        images_migrated := images_migrated + 1;
        
        RAISE NOTICE 'Migrated image for advertisement ID: % (Title: %)', ad_record.id, COALESCE(ad_record.title, 'Unknown');
    END LOOP;
    
    RAISE NOTICE 'Migration completed. Total images migrated: %', images_migrated;
    RETURN images_migrated;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration
SELECT migrate_existing_ad_images() as images_migrated;

-- Clean up the migration function (optional)
DROP FUNCTION IF EXISTS migrate_existing_ad_images();

-- Update RLS policies for the new tables with flexible user column handling
ALTER TABLE advertisement_images ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage images for their own advertisements
-- This policy needs to be flexible based on what user column exists
DO $$
DECLARE
    user_column TEXT;
    policy_sql TEXT;
BEGIN
    -- Determine which user ID column exists in advertisements table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advertisements' AND column_name = 'advertiser_id') THEN
        user_column := 'advertiser_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advertisements' AND column_name = 'user_id') THEN
        user_column := 'user_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advertisements' AND column_name = 'organizer_id') THEN
        user_column := 'organizer_id';
    ELSE
        -- If no user column exists, create a more permissive policy
        CREATE POLICY "Users can manage advertisement images" ON advertisement_images
            FOR ALL TO authenticated
            USING (true)
            WITH CHECK (true);
        RETURN;
    END IF;
    
    -- Create policy with the correct user column
    policy_sql := 'CREATE POLICY "Users can manage their own advertisement images" ON advertisement_images
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM advertisements
                WHERE advertisements.id = advertisement_images.advertisement_id
                AND advertisements.' || user_column || ' = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM advertisements
                WHERE advertisements.id = advertisement_images.advertisement_id
                AND advertisements.' || user_column || ' = auth.uid()
            )
        )';
    
    EXECUTE policy_sql;
    RAISE NOTICE 'Created RLS policy using column: %', user_column;
END;
$$;

-- Policy: Active images are viewable by everyone for display purposes
CREATE POLICY "Active advertisement images are viewable by everyone" ON advertisement_images
    FOR SELECT TO public
    USING (status = 'active');

-- RLS for advertisement_image_analytics
ALTER TABLE advertisement_image_analytics ENABLE ROW LEVEL SECURITY;

-- Flexible policy for analytics
DO $$
DECLARE
    user_column TEXT;
    policy_sql TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advertisements' AND column_name = 'advertiser_id') THEN
        user_column := 'advertiser_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advertisements' AND column_name = 'user_id') THEN
        user_column := 'user_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advertisements' AND column_name = 'organizer_id') THEN
        user_column := 'organizer_id';
    ELSE
        CREATE POLICY "Users can view advertisement image analytics" ON advertisement_image_analytics
            FOR SELECT TO authenticated
            USING (true);
        RETURN;
    END IF;
    
    policy_sql := 'CREATE POLICY "Users can view analytics for their own advertisement images" ON advertisement_image_analytics
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM advertisements
                WHERE advertisements.id = advertisement_image_analytics.advertisement_id
                AND advertisements.' || user_column || ' = auth.uid()
            )
        )';
    
    EXECUTE policy_sql;
END;
$$;

-- RLS for advertisement_ab_tests
ALTER TABLE advertisement_ab_tests ENABLE ROW LEVEL SECURITY;

-- Flexible policy for A/B tests
DO $$
DECLARE
    user_column TEXT;
    policy_sql TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advertisements' AND column_name = 'advertiser_id') THEN
        user_column := 'advertiser_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advertisements' AND column_name = 'user_id') THEN
        user_column := 'user_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advertisements' AND column_name = 'organizer_id') THEN
        user_column := 'organizer_id';
    ELSE
        CREATE POLICY "Users can manage advertisement A/B tests" ON advertisement_ab_tests
            FOR ALL TO authenticated
            USING (true)
            WITH CHECK (true);
        RETURN;
    END IF;
    
    policy_sql := 'CREATE POLICY "Users can manage A/B tests for their own advertisements" ON advertisement_ab_tests
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM advertisements
                WHERE advertisements.id = advertisement_ab_tests.advertisement_id
                AND advertisements.' || user_column || ' = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM advertisements
                WHERE advertisements.id = advertisement_ab_tests.advertisement_id
                AND advertisements.' || user_column || ' = auth.uid()
            )
        )';
    
    EXECUTE policy_sql;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON advertisement_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON advertisement_image_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON advertisement_ab_tests TO authenticated;

-- Also grant usage on sequences if they exist
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMENT ON TABLE advertisement_images IS 'Stores multiple images per advertisement with A/B testing capabilities';
COMMENT ON TABLE advertisement_image_analytics IS 'Detailed analytics tracking for individual advertisement images';
COMMENT ON TABLE advertisement_ab_tests IS 'A/B testing campaigns for advertisement images'; 