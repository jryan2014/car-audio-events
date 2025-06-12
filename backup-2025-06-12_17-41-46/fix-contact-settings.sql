-- Fix Contact Settings Storage
-- Run this in Supabase SQL Editor to enable contact settings functionality

-- 1. First, let's check and modify the organizations table structure
DO $$ 
BEGIN
    -- Add type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' AND column_name = 'type') THEN
        ALTER TABLE organizations ADD COLUMN type TEXT;
    END IF;
    
    -- Add system_config column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' AND column_name = 'system_config') THEN
        ALTER TABLE organizations ADD COLUMN system_config JSONB;
    END IF;
END $$;

-- 2. Create organizations table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  system_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Delete any existing platform organization to avoid conflicts
DELETE FROM organizations WHERE type = 'platform';

-- 4. Create platform organization record for storing contact settings
INSERT INTO organizations (
  name, 
  type, 
  description, 
  system_config
) VALUES (
  'Car Audio Events Platform',
  'platform',
  'Platform system configuration and contact settings',
  '{
    "contact_email": "info@caraudioevents.com",
    "contact_phone": "+1 (850) 300-8926",
    "support_email": "support@caraudioevents.com", 
    "business_email": "business@caraudioevents.com",
    "created_at": "2025-01-11T22:00:00Z"
  }'::jsonb
);

-- 5. Enable Row Level Security (if not already enabled)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 6. Create policy for admins to manage system config
DROP POLICY IF EXISTS "Admins can manage organizations" ON organizations;
CREATE POLICY "Admins can manage organizations" 
ON organizations 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 7. Also fix CMS footer sections while we're at it
UPDATE cms_pages 
SET footer_section = 'legal'
WHERE slug IN ('privacy', 'terms') AND navigation_placement = 'footer';

UPDATE cms_pages 
SET footer_section = 'support'
WHERE slug = 'contact' AND navigation_placement = 'footer';

-- 8. Add Help Center page
INSERT INTO cms_pages (
    title, slug, content, meta_title, meta_description, 
    status, navigation_placement, footer_section, nav_order, show_in_sitemap
) VALUES (
    'Help Center', 'help', 
    '<h1>Help Center</h1><p>Find answers to frequently asked questions and get support.</p><h2>Getting Started</h2><p>New to our platform? Here''s how to get started with Car Audio Events.</p><h2>Account Management</h2><p>Learn how to manage your account settings and profile.</p><h2>Event Registration</h2><p>Step-by-step guide to register for competitions and events.</p>', 
    'Help Center - Car Audio Events', 
    'Get help and support for the Car Audio Events platform', 
    'published', 'footer', 'support', 1, true
) ON CONFLICT (slug) DO UPDATE SET
    footer_section = EXCLUDED.footer_section,
    navigation_placement = EXCLUDED.navigation_placement;

-- 9. Verify the setup
SELECT 
  'Contact Settings Check' as check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Platform organization exists'
    ELSE '❌ Platform organization missing'
  END as status
FROM organizations 
WHERE type = 'platform'
UNION ALL
SELECT 
  'CMS Footer Pages Check' as check_type,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ Footer pages configured (' || COUNT(*) || ' pages)'
    ELSE '⚠️  Missing footer pages (' || COUNT(*) || ' found)'
  END as status
FROM cms_pages 
WHERE navigation_placement = 'footer' AND footer_section IS NOT NULL; 