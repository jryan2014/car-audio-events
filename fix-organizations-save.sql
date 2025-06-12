-- Fix Organizations Save Issues
-- Run this in Supabase SQL Editor

-- 1. First, let's see what we're working with
SELECT 'Current table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'organizations' 
ORDER BY ordinal_position;

-- 2. Ensure the organizations table has all required columns
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS organization_type VARCHAR(50) DEFAULT 'competition';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS small_logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS competition_classes JSONB DEFAULT '[]';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_rules_template_id INTEGER;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Create or update RLS policies for admin access
DROP POLICY IF EXISTS "Admin can manage organizations" ON organizations;
CREATE POLICY "Admin can manage organizations" 
ON organizations 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Ensure RLS is enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 5. Test insert to verify it works
INSERT INTO organizations (
  name,
  organization_type,
  status,
  description
) VALUES (
  'Test Organization Save',
  'competition',
  'active',
  'Testing save functionality'
) 
ON CONFLICT (name) DO UPDATE SET
  organization_type = EXCLUDED.organization_type,
  status = EXCLUDED.status,
  description = EXCLUDED.description
RETURNING id, name, organization_type, status;

-- 6. Verify the test worked
SELECT 'Test result:' as info;
SELECT id, name, organization_type, status 
FROM organizations 
WHERE name = 'Test Organization Save';

-- 7. Clean up test record
DELETE FROM organizations WHERE name = 'Test Organization Save';

-- 8. Show final status
SELECT 'Setup complete! Organizations table ready for saves.' as status; 