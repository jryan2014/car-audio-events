-- Debug Organizations Table Issues
-- Run this in Supabase SQL Editor to check the table structure and data

-- 1. Check if organizations table exists and its structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'organizations' 
ORDER BY ordinal_position;

-- 2. Check if rules_templates table exists and its structure  
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'rules_templates' 
ORDER BY ordinal_position;

-- 3. Check current organizations data
SELECT 
  id, 
  name, 
  organization_type, 
  status,
  logo_url,
  small_logo_url,
  competition_classes,
  default_rules_template_id
FROM organizations 
LIMIT 10;

-- 4. Check current rules_templates data
SELECT 
  id, 
  name, 
  organization_name,
  rules_content
FROM rules_templates 
LIMIT 5;

-- 5. Check RLS policies on organizations
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'organizations';

-- 6. Test basic insert permissions
-- This will show if there are permission issues
INSERT INTO organizations (
  name, 
  organization_type, 
  status,
  description
) VALUES (
  'Test Organization',
  'competition', 
  'active',
  'Test organization for debugging'
) 
RETURNING id, name, organization_type, status; 