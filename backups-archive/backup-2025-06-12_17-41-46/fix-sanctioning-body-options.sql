-- Fix Sanctioning Body Options
-- Add "Non-sanctioned event" option and ensure proper organization types

-- First, let's see what organizations we currently have
SELECT 'Current Organizations:' as info;
SELECT id, name, organization_type, status FROM organizations ORDER BY name;

-- Add "Non-sanctioned event" option if it doesn't exist
INSERT INTO organizations (name, organization_type, status, description) 
VALUES 
  ('Non-sanctioned event', 'independent', 'active', 'Independent event not sanctioned by any organization')
ON CONFLICT (name) DO NOTHING;

-- Update existing organizations to have proper organization_type
UPDATE organizations 
SET organization_type = 'competition'
WHERE name IN ('IASCA', 'MECA', 'dB Drag Racing', 'USACi', 'BASS', 'SQC') 
  AND organization_type != 'competition';

UPDATE organizations 
SET organization_type = 'independent'
WHERE name IN ('Independent', 'Local Club', 'Non-sanctioned event') 
  AND organization_type != 'independent';

-- Now update the configuration options for organizations
-- First, clear existing organization options
DELETE FROM configuration_options 
WHERE category_id = (SELECT id FROM configuration_categories WHERE name = 'organizations');

-- Re-insert all organizations as configuration options
INSERT INTO configuration_options (category_id, name, value, display_order, is_active, key, label)
SELECT 
  cc.id,
  o.name,
  o.id::text,
  CASE 
    WHEN o.name = 'Non-sanctioned event' THEN 0  -- Put this first
    ELSE ROW_NUMBER() OVER (ORDER BY o.name)
  END,
  true,
  o.id::text,
  o.name || CASE 
    WHEN o.organization_type = 'competition' THEN ' (Sanctioning Body)'
    WHEN o.organization_type = 'independent' THEN ' (Independent)'
    ELSE ''
  END
FROM configuration_categories cc
CROSS JOIN organizations o
WHERE cc.name = 'organizations' 
  AND o.status = 'active'
ORDER BY 
  CASE WHEN o.name = 'Non-sanctioned event' THEN 0 ELSE 1 END,
  o.name;

-- Verify the results
SELECT 'Updated Organizations Configuration Options:' as info;
SELECT 
  co.name,
  co.label,
  co.value,
  co.display_order,
  o.organization_type
FROM configuration_options co
JOIN configuration_categories cc ON co.category_id = cc.id
JOIN organizations o ON o.id::text = co.value
WHERE cc.name = 'organizations'
ORDER BY co.display_order, co.name; 