-- Check Organizations Table Constraints and Triggers
-- Run this to find what might be blocking saves

-- 1. Check table constraints
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'organizations';

-- 2. Check for triggers
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'organizations';

-- 3. Check current user permissions
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_name = 'organizations';

-- 4. Test minimal insert
INSERT INTO organizations (name) 
VALUES ('Minimal Test') 
RETURNING id, name;

-- 5. Clean up
DELETE FROM organizations WHERE name = 'Minimal Test'; 