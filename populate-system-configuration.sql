-- Populate System Configuration Tables SAFELY
-- Run this in Supabase SQL Editor to fix the "Failed to load data" error
-- This script only touches configuration tables, not event/map functionality

-- Add configuration categories for the system (these should already exist from migration)
INSERT INTO configuration_categories (name, description, is_active) 
VALUES 
  ('event_categories', 'Event category options', true),
  ('organizations', 'Organization options', true),
  ('competition_seasons', 'Competition season years', true),
  ('venue_types', 'Venue type options', true),
  ('status_options', 'Status options for events', true)
ON CONFLICT (name) DO NOTHING;

-- Add configuration options for event categories (using existing categories from migration)
INSERT INTO configuration_options (category_id, name, value, display_order, is_active)
SELECT 
  cc.id,
  options.name,
  options.value,
  options.display_order,
  true
FROM configuration_categories cc
CROSS JOIN (
  VALUES 
    ('Bass Competition', 'bass_competition', 1),
    ('Championship', 'championship', 2),
    ('Sound Quality', 'sound_quality', 3),
    ('Install Competition', 'install_competition', 4),
    ('Meet & Greet', 'meet_greet', 5),
    ('Car Show', 'car_show', 6),
    ('Dyno Competition', 'dyno_competition', 7)
) AS options(name, value, display_order)
WHERE cc.name = 'event_categories'
ON CONFLICT (category_id, name) DO NOTHING;

-- Add configuration options for organizations (using existing organizations from migration)
INSERT INTO configuration_options (category_id, name, value, display_order, is_active)
SELECT 
  cc.id,
  o.name,
  o.id::text,
  ROW_NUMBER() OVER (ORDER BY o.name),
  true
FROM configuration_categories cc
CROSS JOIN organizations o
WHERE cc.name = 'organizations' AND o.organization_type IN ('competition', 'independent')
ON CONFLICT (category_id, name) DO NOTHING;

-- Add configuration options for competition seasons
INSERT INTO configuration_options (category_id, name, value, display_order, is_active)
SELECT 
  cc.id,
  year_val::text || ' Season',
  year_val::text,
  year_val - 2023,
  true
FROM configuration_categories cc
CROSS JOIN generate_series(2024, 2030) as year_val
WHERE cc.name = 'competition_seasons'
ON CONFLICT (category_id, name) DO NOTHING;

-- Add configuration options for venue types
INSERT INTO configuration_options (category_id, name, value, display_order, is_active)
SELECT 
  cc.id,
  options.name,
  options.value,
  options.display_order,
  true
FROM configuration_categories cc
CROSS JOIN (
  VALUES 
    ('Convention Center', 'convention_center', 1),
    ('Parking Lot', 'parking_lot', 2),
    ('Race Track', 'race_track', 3),
    ('Fairgrounds', 'fairgrounds', 4),
    ('Shopping Center', 'shopping_center', 5),
    ('Park', 'park', 6),
    ('Indoor Arena', 'indoor_arena', 7)
) AS options(name, value, display_order)
WHERE cc.name = 'venue_types'
ON CONFLICT (category_id, name) DO NOTHING;

-- Add configuration options for status options
INSERT INTO configuration_options (category_id, name, value, display_order, is_active)
SELECT 
  cc.id,
  options.name,
  options.value,
  options.display_order,
  true
FROM configuration_categories cc
CROSS JOIN (
  VALUES 
    ('Draft', 'draft', 1),
    ('Published', 'published', 2),
    ('Cancelled', 'cancelled', 3),
    ('Completed', 'completed', 4),
    ('Postponed', 'postponed', 5)
) AS options(name, value, display_order)
WHERE cc.name = 'status_options'
ON CONFLICT (category_id, name) DO NOTHING;

-- Add some additional rules templates (these should be safe to add)
INSERT INTO rules_templates (organization_name, name, description, rules_content, is_active) 
VALUES 
  ('BASS', 'BASS Standard Rules', 'Bass Audio Sound Society competition rules', 'BASS Competition Rules:
1. All vehicles must pass safety inspection
2. Sound pressure level measurements taken at driver''s ear
3. Maximum of 3 attempts per competitor
4. Professional conduct required at all times
5. Protests must be filed within 30 minutes of results
6. Entry fees are non-refundable
7. Competitors participate at their own risk', true),
  
  ('SQC', 'Sound Quality Rules', 'Sound Quality Competition guidelines', 'Sound Quality Competition Guidelines:
1. Vehicle must be street legal and registered
2. All safety equipment must be functional
3. Two-minute time limit for setup
4. No artificial enhancement of recordings
5. Respect for venue and other competitors
6. Judges'' decisions are final
7. Awards ceremony attendance required for winners', true),
  
  ('Independent', 'Independent Event Rules', 'General rules for independent events', 'Independent Event Rules:
1. Membership not required to compete
2. Family-friendly environment maintained
3. No alcohol or inappropriate behavior
4. Help with cleanup appreciated
5. Trophies for top 3 in each class
6. Registration closes 30 minutes after start time
7. Have fun and make friends!', true)
ON CONFLICT (organization_name, name) DO NOTHING;

-- Add more form field configurations for different forms
INSERT INTO form_field_configurations (form_name, field_name, field_type, is_required, placeholder_text, help_text, display_order, is_active) VALUES
('event_registration', 'participant_name', 'text', true, 'Enter your full name', 'Full name as it appears on ID', 1, true),
('event_registration', 'email', 'email', true, 'Enter your email', 'Contact email address', 2, true),
('event_registration', 'phone', 'tel', false, 'Enter phone number', 'Contact phone number', 3, true),
('event_registration', 'vehicle_year', 'number', false, 'Enter vehicle year', 'Year of your vehicle', 4, true),
('event_registration', 'vehicle_make', 'text', false, 'Enter vehicle make', 'Make of your vehicle', 5, true),
('event_registration', 'vehicle_model', 'text', false, 'Enter vehicle model', 'Model of your vehicle', 6, true),
('event_registration', 'competition_class', 'select', true, 'Select class', 'Choose your competition class', 7, true),
('event_registration', 'emergency_contact', 'text', false, 'Emergency contact name', 'Emergency contact person', 8, true),
('event_registration', 'emergency_phone', 'tel', false, 'Emergency contact phone', 'Emergency contact phone number', 9, true),
('event_registration', 'special_requirements', 'textarea', false, 'Any special requirements', 'Accessibility or other special needs', 10, true)
ON CONFLICT (form_name, field_name) DO NOTHING;

-- Verification queries to check the data was loaded
SELECT 'Configuration Categories' as table_name, COUNT(*)::text as count FROM configuration_categories
UNION ALL
SELECT 'Configuration Options', COUNT(*)::text FROM configuration_options
UNION ALL
SELECT 'Rules Templates', COUNT(*)::text FROM rules_templates
UNION ALL
SELECT 'Form Field Configurations', COUNT(*)::text FROM form_field_configurations
UNION ALL
SELECT 'Organizations', COUNT(*)::text FROM organizations
UNION ALL
SELECT 'Events', COUNT(*)::text FROM events; 