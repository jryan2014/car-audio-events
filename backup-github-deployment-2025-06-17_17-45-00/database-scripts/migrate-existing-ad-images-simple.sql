-- Simple Migration Script: Move Existing Advertisement Images
-- This script uses simpler SQL to avoid PL/pgSQL syntax issues

-- Step 1: Check what columns exist in advertisements table
-- This will show the structure of your advertisements table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'advertisements' 
ORDER BY ordinal_position;

-- Step 2: Simple migration without complex PL/pgSQL
-- This assumes the table has basic columns like id, image_url, title, created_at
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

-- Step 3: Set up basic RLS policies
ALTER TABLE advertisement_images ENABLE ROW LEVEL SECURITY;

-- Basic policy - allow authenticated users to manage all images for now
-- We can make this more restrictive later once we know the table structure
CREATE POLICY "Authenticated users can manage advertisement images" ON advertisement_images
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Active images are viewable by everyone for display purposes
CREATE POLICY "Active advertisement images are viewable by everyone" ON advertisement_images
    FOR SELECT TO public
    USING (status = 'active');

-- RLS for advertisement_image_analytics
ALTER TABLE advertisement_image_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view advertisement image analytics" ON advertisement_image_analytics
    FOR SELECT TO authenticated
    USING (true);

-- RLS for advertisement_ab_tests
ALTER TABLE advertisement_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage advertisement A/B tests" ON advertisement_ab_tests
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON advertisement_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON advertisement_image_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON advertisement_ab_tests TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Show how many images were migrated
SELECT COUNT(*) as images_migrated FROM advertisement_images;

-- Migration completed successfully! 