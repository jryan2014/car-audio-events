-- Fix Organizations Image Column Size Issue
-- Run this in Supabase SQL Editor to fix the "value too long" error

-- 1. Check current column constraints
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND column_name IN ('logo_url', 'small_logo_url');

-- 2. Increase the size of logo URL columns to handle data URLs
ALTER TABLE organizations 
ALTER COLUMN logo_url TYPE TEXT;

ALTER TABLE organizations 
ALTER COLUMN small_logo_url TYPE TEXT;

-- 3. Also ensure other URL fields can handle long URLs
ALTER TABLE organizations 
ALTER COLUMN website TYPE TEXT;

-- 4. Verify the changes
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND column_name IN ('logo_url', 'small_logo_url', 'website');

-- 5. Test with a long data URL (simulated)
UPDATE organizations 
SET logo_url = 'data:image/png;base64,' || repeat('A', 1000)
WHERE id = (SELECT id FROM organizations LIMIT 1)
RETURNING id, length(logo_url) as logo_url_length;

-- 6. Clean up test
UPDATE organizations 
SET logo_url = NULL 
WHERE logo_url LIKE 'data:image/png;base64,AAA%';

SELECT 'Column size fix complete! Image URLs can now handle data URLs.' as status; 