-- Debug Organizations Save Issues
-- Run this in Supabase SQL Editor to diagnose the save problem

-- 1. Check exact table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'organizations' 
ORDER BY ordinal_position;

-- 2. Check if table exists and has data
SELECT COUNT(*) as total_organizations FROM organizations;

-- 3. Check RLS policies that might be blocking saves
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'organizations';

-- 4. Test a simple insert to see what fails
INSERT INTO organizations (
  name,
  organization_type,
  status,
  description
) VALUES (
  'Test Save Debug',
  'competition',
  'active',
  'Testing save functionality'
) RETURNING id, name, organization_type, status;

-- 5. Check if the insert worked
SELECT * FROM organizations WHERE name = 'Test Save Debug';

-- 6. Clean up test record
DELETE FROM organizations WHERE name = 'Test Save Debug'; 