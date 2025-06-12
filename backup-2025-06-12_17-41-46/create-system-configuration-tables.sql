-- Create System Configuration Tables and Populate Data
-- This creates all missing tables needed for the System Configuration page
-- SAFE to run - only creates tables that don't exist

-- 1. Configuration Categories Table
CREATE TABLE IF NOT EXISTS configuration_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Configuration Options Table  
CREATE TABLE IF NOT EXISTS configuration_options (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES configuration_categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  value VARCHAR(255) NOT NULL,
  description TEXT,
  data_type VARCHAR(50) DEFAULT 'string',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id, name)
);

-- 3. Rules Templates Table
CREATE TABLE IF NOT EXISTS rules_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  organization_id INTEGER REFERENCES organizations(id),
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Form Field Configurations Table
CREATE TABLE IF NOT EXISTS form_field_configurations (
  id SERIAL PRIMARY KEY,
  form_name VARCHAR(255) NOT NULL,
  field_name VARCHAR(255) NOT NULL,
  configuration_category_id INTEGER REFERENCES configuration_categories(id),
  field_type VARCHAR(50) NOT NULL DEFAULT 'text',
  is_required BOOLEAN DEFAULT false,
  is_multiple BOOLEAN DEFAULT false,
  placeholder VARCHAR(255),
  help_text TEXT,
  validation_rules JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(form_name, field_name)
);

-- 5. Events Table (if missing)
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  organization_id INTEGER REFERENCES organizations(id),
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  venue_name VARCHAR(255),
  address TEXT,
  city VARCHAR(255),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  ticket_price DECIMAL(10, 2),
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  rules TEXT,
  image_url TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website_url TEXT,
  registration_deadline DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE configuration_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_field_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for public read access (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuration_categories' AND policyname = 'Public read access') THEN
    CREATE POLICY "Public read access" ON configuration_categories FOR SELECT TO anon, authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuration_options' AND policyname = 'Public read access') THEN
    CREATE POLICY "Public read access" ON configuration_options FOR SELECT TO anon, authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rules_templates' AND policyname = 'Public read access') THEN
    CREATE POLICY "Public read access" ON rules_templates FOR SELECT TO anon, authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'form_field_configurations' AND policyname = 'Public read access') THEN
    CREATE POLICY "Public read access" ON form_field_configurations FOR SELECT TO anon, authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Public read access') THEN
    CREATE POLICY "Public read access" ON events FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

-- Create admin policies for full access (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuration_categories' AND policyname = 'Admin full access') THEN
    CREATE POLICY "Admin full access" ON configuration_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuration_options' AND policyname = 'Admin full access') THEN
    CREATE POLICY "Admin full access" ON configuration_options FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rules_templates' AND policyname = 'Admin full access') THEN
    CREATE POLICY "Admin full access" ON rules_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'form_field_configurations' AND policyname = 'Admin full access') THEN
    CREATE POLICY "Admin full access" ON form_field_configurations FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Admin full access') THEN
    CREATE POLICY "Admin full access" ON events FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- NOW POPULATE THE TABLES WITH DATA

-- Insert Configuration Categories
INSERT INTO configuration_categories (name, description, is_active) 
VALUES 
  ('event_categories', 'Event category options', true),
  ('organizations', 'Organization options', true),
  ('competition_seasons', 'Competition season years', true),
  ('venue_types', 'Venue type options', true),
  ('status_options', 'Status options for events', true)
ON CONFLICT (name) DO NOTHING;

-- Insert Configuration Options for Event Categories
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

-- Insert Configuration Options for Organizations (using existing organizations)
-- First check if organizations exist, then insert safely
INSERT INTO configuration_options (category_id, name, value, display_order, is_active)
SELECT 
  cc.id,
  COALESCE(o.name, 'Organization ' || o.id),
  o.id::text,
  ROW_NUMBER() OVER (ORDER BY o.id),
  true
FROM configuration_categories cc
CROSS JOIN organizations o
WHERE cc.name = 'organizations'
ON CONFLICT (category_id, name) DO NOTHING;

-- Insert Configuration Options for Competition Seasons
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

-- Insert Configuration Options for Venue Types
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

-- Insert Configuration Options for Status Options
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

-- Insert Rules Templates (now with unique constraint on name)
INSERT INTO rules_templates (name, content, is_default, is_active) 
VALUES 
  ('IASCA Standard Rules', 'IASCA Official Competition Rules:
1. All vehicles must pass safety inspection
2. Sound pressure level measurements taken at driver''s ear
3. Maximum of 3 attempts per competitor
4. Professional conduct required at all times
5. Protests must be filed within 30 minutes of results
6. Entry fees are non-refundable
7. Competitors participate at their own risk', true, true),
  
  ('MECA Basic Rules', 'MECA Competition Guidelines:
1. Vehicle must be street legal and registered
2. All safety equipment must be functional
3. Two-minute time limit for setup
4. No artificial enhancement of recordings
5. Respect for venue and other competitors
6. Judges'' decisions are final
7. Awards ceremony attendance required for winners', false, true),
  
  ('Local Club Rules', 'Local Car Audio Club Rules:
1. Membership not required to compete
2. Family-friendly environment maintained
3. No alcohol or inappropriate behavior
4. Help with cleanup appreciated
5. Trophies for top 3 in each class
6. Registration closes 30 minutes after start time
7. Have fun and make friends!', false, true)
ON CONFLICT (name) DO NOTHING;

-- Insert Form Field Configurations
INSERT INTO form_field_configurations (form_name, field_name, configuration_category_id, field_type, is_required, placeholder, help_text, sort_order, is_active)
SELECT 
  'event_registration',
  'event_category',
  cc.id,
  'select',
  true,
  'Select event category',
  'Choose the type of competition you want to enter',
  1,
  true
FROM configuration_categories cc
WHERE cc.name = 'event_categories'
ON CONFLICT (form_name, field_name) DO NOTHING;

INSERT INTO form_field_configurations (form_name, field_name, configuration_category_id, field_type, is_required, placeholder, help_text, sort_order, is_active)
SELECT 
  'event_registration',
  'sanctioning_body',
  cc.id,
  'select',
  false,
  'Select sanctioning body',
  'Choose the organization sanctioning this event',
  2,
  true
FROM configuration_categories cc
WHERE cc.name = 'organizations'
ON CONFLICT (form_name, field_name) DO NOTHING;

INSERT INTO form_field_configurations (form_name, field_name, configuration_category_id, field_type, is_required, placeholder, help_text, sort_order, is_active)
SELECT 
  'event_registration',
  'competition_season',
  cc.id,
  'select',
  true,
  'Select season',
  'Choose the competition season year',
  3,
  true
FROM configuration_categories cc
WHERE cc.name = 'competition_seasons'
ON CONFLICT (form_name, field_name) DO NOTHING;

-- Final verification
SELECT 'Tables Created and Data Loaded Successfully!' as status;

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