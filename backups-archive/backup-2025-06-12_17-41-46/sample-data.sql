-- Sample data for testing dynamic fields functionality

-- Add some event categories (if they don't exist)
INSERT INTO event_categories (name, color, icon, is_active) 
VALUES 
  ('Bass Competition', '#8B5CF6', 'volume-2', true),
  ('Championship', '#F59E0B', 'trophy', true),
  ('Sound Quality', '#10B981', 'headphones', true),
  ('Install Competition', '#EF4444', 'settings', true),
  ('Meet & Greet', '#3B82F6', 'users', true)
ON CONFLICT (name) DO NOTHING;

-- Add some organizations (if they don't exist)
INSERT INTO organizations (name, type, organization_type, status) 
VALUES 
  ('IASCA', 'organization', 'sanctioning_body', 'active'),
  ('MECA', 'organization', 'sanctioning_body', 'active'),
  ('dB Drag Racing', 'organization', 'sanctioning_body', 'active'),
  ('USACi', 'organization', 'sanctioning_body', 'active'),
  ('Local Club', 'organization', 'club', 'active')
ON CONFLICT (name) DO NOTHING;

-- Add configuration categories for the system
INSERT INTO configuration_categories (name, description, is_active) 
VALUES 
  ('event_categories', 'Event category options', true),
  ('organizations', 'Organization options', true),
  ('competition_seasons', 'Competition season years', true)
ON CONFLICT (name) DO NOTHING;

-- Add configuration options for event categories
INSERT INTO configuration_options (category_id, key, value, label, sort_order, is_active)
SELECT 
  cc.id,
  ec.id::text,
  ec.id::text,
  ec.name,
  ROW_NUMBER() OVER (ORDER BY ec.name),
  true
FROM configuration_categories cc
CROSS JOIN event_categories ec
WHERE cc.name = 'event_categories'
ON CONFLICT (category_id, key) DO NOTHING;

-- Add configuration options for organizations
INSERT INTO configuration_options (category_id, key, value, label, sort_order, is_active)
SELECT 
  cc.id,
  o.id::text,
  o.id::text,
  o.name,
  ROW_NUMBER() OVER (ORDER BY o.name),
  true
FROM configuration_categories cc
CROSS JOIN organizations o
WHERE cc.name = 'organizations' AND o.organization_type = 'sanctioning_body'
ON CONFLICT (category_id, key) DO NOTHING;

-- Add configuration options for competition seasons
INSERT INTO configuration_options (category_id, key, value, label, sort_order, is_active)
SELECT 
  cc.id,
  year_val::text,
  year_val::text,
  year_val::text || ' Season',
  year_val - 2024,
  true
FROM configuration_categories cc
CROSS JOIN generate_series(2024, 2030) as year_val
WHERE cc.name = 'competition_seasons'
ON CONFLICT (category_id, key) DO NOTHING;

-- Add some sample rules templates
INSERT INTO rules_templates (name, content, organization_id) 
VALUES 
  ('IASCA Standard Rules', 'IASCA Official Competition Rules:
1. All vehicles must pass safety inspection
2. Sound pressure level measurements taken at driver''s ear
3. Maximum of 3 attempts per competitor
4. Professional conduct required at all times
5. Protests must be filed within 30 minutes of results
6. Entry fees are non-refundable
7. Competitors participate at their own risk', NULL),
  
  ('MECA Basic Rules', 'MECA Competition Guidelines:
1. Vehicle must be street legal and registered
2. All safety equipment must be functional
3. Two-minute time limit for setup
4. No artificial enhancement of recordings
5. Respect for venue and other competitors
6. Judges'' decisions are final
7. Awards ceremony attendance required for winners', NULL),
  
  ('Local Club Rules', 'Local Car Audio Club Rules:
1. Membership not required to compete
2. Family-friendly environment maintained
3. No alcohol or inappropriate behavior
4. Help with cleanup appreciated
5. Trophies for top 3 in each class
6. Registration closes 30 minutes after start time
7. Have fun and make friends!', NULL)
ON CONFLICT (name) DO NOTHING; 