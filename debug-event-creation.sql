-- Debug Event Creation Issues
-- Check events table structure and identify potential issues

-- 1. Check if events table exists and its structure
SELECT 'Events table structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check for any constraints that might be failing
SELECT 'Events table constraints:' as info;
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'events' 
  AND table_schema = 'public';

-- 3. Check if we have any foreign key references that might be missing
SELECT 'Foreign key constraints:' as info;
SELECT 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu
  ON kcu.constraint_name = ccu.constraint_name
WHERE kcu.table_name = 'events'
  AND kcu.table_schema = 'public';

-- 4. Check if configuration_categories and configuration_options exist
SELECT 'Configuration tables check:' as info;
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('configuration_categories', 'configuration_options', 'organizations')
ORDER BY table_name;

-- 5. Check if we have any event categories
SELECT 'Event categories available:' as info;
SELECT COUNT(*) as category_count FROM configuration_options co
JOIN configuration_categories cc ON co.category_id = cc.id
WHERE cc.name = 'event_categories';

-- 6. Check if we have any organizations
SELECT 'Organizations available:' as info;
SELECT COUNT(*) as org_count FROM organizations WHERE status = 'active';

-- 7. Try a simple insert to see what fails
SELECT 'Testing simple event insert:' as info;
-- This will show us what columns are actually required
-- We'll comment this out for now to avoid errors

-- INSERT INTO events (title, venue_name, address, city, state, country, start_date, end_date)
-- VALUES ('Test Event', 'Test Venue', 'Test Address', 'Test City', 'Test State', 'US', '2025-01-15', '2025-01-15'); 