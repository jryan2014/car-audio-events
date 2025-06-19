-- Clean Migration Script: Move Existing Advertisement Images
-- This script migrates existing image_url data to the new advertisement_images table

-- First, check what columns exist in advertisements table
SELECT 'Checking advertisements table structure...' as step;
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
SELECT 'Migration completed!' as step;
SELECT COUNT(*) as images_migrated FROM advertisement_images;
SELECT 'All done! Your images should now be visible.' as final_message; 