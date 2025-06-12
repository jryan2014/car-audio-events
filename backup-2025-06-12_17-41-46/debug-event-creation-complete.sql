-- Complete Event Creation Diagnostic Script
-- This script checks all components needed for event creation and display

-- 1. Check Organizations Table
SELECT 'Organizations Table Check:' as section;
SELECT 
  id, 
  name, 
  organization_type, 
  status,
  CASE 
    WHEN logo_url IS NOT NULL THEN 'Has Logo' 
    ELSE 'No Logo' 
  END as logo_status
FROM organizations 
ORDER BY name;

-- 2. Check Configuration Categories and Options
SELECT 'Configuration Categories:' as section;
SELECT id, name, description FROM configuration_categories ORDER BY name;

SELECT 'Event Categories Options:' as section;
SELECT id, category_id, name, value, label, key FROM configuration_options 
WHERE category_id = (SELECT id FROM configuration_categories WHERE name = 'event_categories')
ORDER BY sort_order, name;

SELECT 'Competition Seasons Options:' as section;
SELECT id, category_id, name, value, label, key FROM configuration_options 
WHERE category_id = (SELECT id FROM configuration_categories WHERE name = 'competition_seasons')
ORDER BY sort_order, name;

-- 3. Check Events Table Structure
SELECT 'Events Table Structure:' as section;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if there are any existing events
SELECT 'Existing Events Count:' as section;
SELECT COUNT(*) as total_events FROM events;

-- 5. Check Events Table Constraints
SELECT 'Events Table Constraints:' as section;
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'events' 
  AND table_schema = 'public';

-- 6. Test Insert Compatibility (dry run)
SELECT 'Sample Event Data Structure:' as section;
SELECT 
  'title' as field, 'text' as expected_type, 'Test Event' as sample_value
UNION ALL
SELECT 'description', 'text', 'Test Description'
UNION ALL
SELECT 'category', 'text', 'bass_competition'
UNION ALL
SELECT 'start_date', 'timestamptz', '2025-01-13T08:00:00'
UNION ALL
SELECT 'end_date', 'timestamptz', '2025-01-13T19:00:00'
UNION ALL
SELECT 'venue_name', 'text', 'Test Venue'
UNION ALL
SELECT 'address', 'text', '123 Test St'
UNION ALL
SELECT 'city', 'text', 'Test City'
UNION ALL
SELECT 'state', 'text', 'CA'
UNION ALL
SELECT 'organization_id', 'uuid', 'NULL or valid org ID';

-- 7. Check RLS Policies on Events
SELECT 'Events RLS Policies:' as section;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'events';

-- 8. Verify User Permissions
SELECT 'Current User Info:' as section;
SELECT 
  current_user as database_user,
  session_user as session_user,
  current_database() as database_name;

-- 9. Check if we can insert a test event (this will show any constraint violations)
SELECT 'Testing Event Insert Compatibility:' as section;
-- This is a dry run - we'll show what would be inserted
SELECT 
  'Test Event' as title,
  'Test Description' as description,
  'bass_competition' as category,
  '2025-01-13T08:00:00'::timestamptz as start_date,
  '2025-01-13T19:00:00'::timestamptz as end_date,
  'Test Venue' as venue_name,
  '123 Test St' as address,
  'Test City' as city,
  'CA' as state,
  'US' as country,
  0 as ticket_price,
  'draft' as status;

-- 10. Check for any missing required fields or data type mismatches
SELECT 'Potential Issues Check:' as section;
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM organizations WHERE status = 'active') 
    THEN 'WARNING: No active organizations found'
    ELSE 'OK: Active organizations exist'
  END as organizations_check,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM configuration_categories WHERE name = 'event_categories') 
    THEN 'WARNING: No event_categories configuration found'
    ELSE 'OK: Event categories configuration exists'
  END as categories_check,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM configuration_options WHERE category_id = (SELECT id FROM configuration_categories WHERE name = 'event_categories')) 
    THEN 'WARNING: No event category options found'
    ELSE 'OK: Event category options exist'
  END as category_options_check; 