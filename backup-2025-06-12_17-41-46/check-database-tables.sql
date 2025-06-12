-- Check what tables exist in the database
-- Run this first to see what we're working with

SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Also check for any configuration-related tables
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name LIKE '%config%'
ORDER BY table_name, ordinal_position;

-- Check for system configuration related tables
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%rule%' OR table_name LIKE '%form%' OR table_name LIKE '%template%')
ORDER BY table_name, ordinal_position; 