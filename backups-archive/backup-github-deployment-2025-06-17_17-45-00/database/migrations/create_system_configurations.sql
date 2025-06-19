-- System Configuration Tables
-- This provides a flexible way to manage configurable options throughout the system

-- Main configuration categories table
CREATE TABLE IF NOT EXISTS configuration_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Configuration options table (flexible key-value with metadata)
CREATE TABLE IF NOT EXISTS configuration_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES configuration_categories(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  label VARCHAR(200) NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  data_type VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json, array
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}', -- For additional properties like color, icon, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, key)
);

-- Form field configurations - defines which config options appear in which forms
CREATE TABLE IF NOT EXISTS form_field_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_name VARCHAR(100) NOT NULL, -- 'create_event', 'edit_event', 'create_user', etc.
  field_name VARCHAR(100) NOT NULL, -- 'category', 'organization', 'rules_regulations', etc.
  configuration_category_id UUID REFERENCES configuration_categories(id),
  field_type VARCHAR(50) DEFAULT 'select', -- select, multiselect, checkbox, radio, etc.
  is_required BOOLEAN DEFAULT false,
  is_multiple BOOLEAN DEFAULT false,
  placeholder TEXT,
  help_text TEXT,
  validation_rules JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(form_name, field_name)
);

-- Predefined rules and regulations templates
CREATE TABLE IF NOT EXISTS rules_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  organization_id UUID, -- Links to configuration_options where category is 'organizations'
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Saved form data for reuse (auto-save functionality)
CREATE TABLE IF NOT EXISTS saved_form_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  form_name VARCHAR(100) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  field_value TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, form_name, field_name, field_value)
);

-- Insert default configuration categories
INSERT INTO configuration_categories (name, description) VALUES
  ('event_categories', 'Event categories for competitions and activities'),
  ('organizations', 'Sanctioning bodies and organizations'),
  ('competition_seasons', 'Available competition season years'),
  ('event_types', 'Types of events (competition, exhibition, etc.)'),
  ('locations', 'Common event locations and venues'),
  ('sponsors', 'Available sponsors for events'),
  ('equipment_categories', 'Audio equipment categories');

-- Insert default event categories
INSERT INTO configuration_options (category_id, key, label, value, description, sort_order, metadata) 
SELECT 
  c.id,
  LOWER(REPLACE(category, ' ', '_')),
  category,
  category,
  'Competition category',
  row_number() OVER (ORDER BY category),
  jsonb_build_object('color', color, 'icon', icon)
FROM configuration_categories c
CROSS JOIN (VALUES
  ('Bass Competition', '#f97316', 'volume-2'),
  ('Championship', '#ef4444', 'trophy'),
  ('Competition', '#3b82f6', 'target'),
  ('Exhibition', '#8b5cf6', 'eye'),
  ('Installation', '#10b981', 'wrench'),
  ('Install Competition', '#f59e0b', 'tools'),
  ('Local Event', '#06b6d4', 'map-pin'),
  ('Meet & Greet', '#ec4899', 'users'),
  ('Sound Quality', '#8b5cf6', 'music'),
  ('SPL Competition', '#f97316', 'volume-x'),
  ('Trade Show', '#6b7280', 'shopping-bag'),
  ('Training', '#84cc16', 'graduation-cap'),
  ('Workshop', '#f59e0b', 'book-open')
) AS categories(category, color, icon)
WHERE c.name = 'event_categories';

-- Insert default organizations/sanctioning bodies
INSERT INTO configuration_options (category_id, key, label, value, description, sort_order)
SELECT 
  c.id,
  LOWER(REPLACE(org, ' ', '_')),
  org,
  org,
  'Sanctioning body or organization',
  row_number() OVER (ORDER BY org)
FROM configuration_categories c
CROSS JOIN (VALUES
  ('IASCA'),
  ('MECA'),
  ('dB Drag Racing'),
  ('USACi'),
  ('BASS'),
  ('SQC'),
  ('Independent'),
  ('Local Club')
) AS orgs(org)
WHERE c.name = 'organizations';

-- Insert default competition seasons (current year and next few years)
INSERT INTO configuration_options (category_id, key, label, value, description, sort_order)
SELECT 
  c.id,
  year_val::text,
  year_val::text || ' Season',
  year_val::text,
  'Competition season year',
  row_number() OVER (ORDER BY year_val)
FROM configuration_categories c
CROSS JOIN generate_series(2024, 2030) AS year_val
WHERE c.name = 'competition_seasons';

-- Insert default form field configurations
INSERT INTO form_field_configurations (form_name, field_name, configuration_category_id, field_type, is_required, is_multiple, placeholder, help_text)
SELECT 
  form_field.form_name,
  form_field.field_name,
  c.id,
  form_field.field_type,
  form_field.is_required,
  form_field.is_multiple,
  form_field.placeholder,
  form_field.help_text
FROM configuration_categories c
CROSS JOIN (VALUES
  ('create_event', 'category', 'event_categories', 'select', true, false, 'Select event category', 'Choose the primary category for this event'),
  ('create_event', 'organization', 'organizations', 'select', false, true, 'Select sanctioning body', 'Choose one or more organizations sanctioning this event'),
  ('create_event', 'season_year', 'competition_seasons', 'select', true, false, 'Select season year', 'Choose the competition season year'),
  ('edit_event', 'category', 'event_categories', 'select', true, false, 'Select event category', 'Choose the primary category for this event'),
  ('edit_event', 'organization', 'organizations', 'select', false, true, 'Select sanctioning body', 'Choose one or more organizations sanctioning this event'),
  ('edit_event', 'season_year', 'competition_seasons', 'select', true, false, 'Select season year', 'Choose the competition season year')
) AS form_field(form_name, field_name, category_name, field_type, is_required, is_multiple, placeholder, help_text)
WHERE c.name = form_field.category_name;

-- Insert default rules templates
INSERT INTO rules_templates (name, content, is_default, is_active)
VALUES
  ('IASCA Standard Rules', 'Standard IASCA competition rules apply. All vehicles must meet safety requirements...', true, true),
  ('MECA Standard Rules', 'MECA sanctioned event rules. All participants must be current MECA members...', true, true),
  ('dB Drag Standard Rules', 'dB Drag Racing Association rules apply. Maximum noise levels and safety protocols...', true, true),
  ('Local Event Rules', 'Local event guidelines and safety requirements. Have fun and compete safely!', true, true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_configuration_options_category_active ON configuration_options(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_configuration_options_sort ON configuration_options(category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_form_field_configurations_form ON form_field_configurations(form_name, is_active);
CREATE INDEX IF NOT EXISTS idx_saved_form_data_user_form ON saved_form_data(user_id, form_name);
CREATE INDEX IF NOT EXISTS idx_rules_templates_organization ON rules_templates(organization_id, is_active);

-- Enable RLS
ALTER TABLE configuration_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_field_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_form_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin can manage, users can read)
CREATE POLICY "Admins can manage configuration categories" ON configuration_categories
  FOR ALL USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.membership_type = 'admin'
  ));

CREATE POLICY "Users can view active configuration categories" ON configuration_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage configuration options" ON configuration_options
  FOR ALL USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.membership_type = 'admin'
  ));

CREATE POLICY "Users can view active configuration options" ON configuration_options
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage form field configurations" ON form_field_configurations
  FOR ALL USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.membership_type = 'admin'
  ));

CREATE POLICY "Users can view active form field configurations" ON form_field_configurations
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage rules templates" ON rules_templates
  FOR ALL USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.membership_type = 'admin'
  ));

CREATE POLICY "Users can view active rules templates" ON rules_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage their own saved form data" ON saved_form_data
  FOR ALL USING (user_id = auth.uid()); 