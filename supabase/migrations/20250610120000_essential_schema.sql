-- Essential Schema for Car Audio Events Platform
-- This migration creates the minimal required tables and data

-- Configuration system tables
CREATE TABLE IF NOT EXISTS configuration_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS configuration_options (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES configuration_categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  value VARCHAR(255) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id, value)
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT,
  small_logo_url TEXT,
  description TEXT,
  website TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  organization_type VARCHAR(50) DEFAULT 'competition',
  status VARCHAR(20) DEFAULT 'active',
  competition_classes JSONB DEFAULT '[]',
  default_rules_template_id INTEGER,
  address TEXT,
  city VARCHAR(255),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rules templates table
CREATE TABLE IF NOT EXISTS rules_templates (
  id SERIAL PRIMARY KEY,
  organization_name VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rules_content TEXT NOT NULL,
  version VARCHAR(50) DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key for organizations
ALTER TABLE organizations 
ADD CONSTRAINT fk_organizations_rules_template 
FOREIGN KEY (default_rules_template_id) 
REFERENCES rules_templates(id) ON DELETE SET NULL;

-- Events table
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

-- Form field configurations table
CREATE TABLE IF NOT EXISTS form_field_configurations (
  id SERIAL PRIMARY KEY,
  form_name VARCHAR(255) NOT NULL,
  field_name VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL DEFAULT 'text',
  is_required BOOLEAN DEFAULT false,
  placeholder_text TEXT,
  help_text TEXT,
  validation_rules JSONB DEFAULT '{}',
  options JSONB DEFAULT '[]',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(form_name, field_name)
);

-- Enable RLS on all tables
ALTER TABLE configuration_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_field_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access" ON configuration_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON configuration_options FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON organizations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON rules_templates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON form_field_configurations FOR SELECT TO anon, authenticated USING (true);

-- Create policies for authenticated write access
CREATE POLICY "Authenticated write access" ON events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert basic configuration data
INSERT INTO configuration_categories (name, description) VALUES
('event_categories', 'Event category options'),
('venue_types', 'Venue type options'),
('status_options', 'Status options for events')
ON CONFLICT (name) DO NOTHING;

-- Insert event categories
INSERT INTO configuration_options (category_id, name, value, display_order) 
SELECT 
  cc.id,
  options.name,
  options.value,
  options.display_order
FROM configuration_categories cc
CROSS JOIN (
  VALUES 
    ('Bass Competition', 'bass_competition', 1),
    ('Championship', 'championship', 2),
    ('Sound Quality', 'sound_quality', 3),
    ('Install Competition', 'install_competition', 4),
    ('Meet & Greet', 'meet_greet', 5)
) AS options(name, value, display_order)
WHERE cc.name = 'event_categories'
ON CONFLICT DO NOTHING;

-- Insert rules templates
INSERT INTO rules_templates (organization_name, name, description, rules_content) VALUES
('IASCA', 'IASCA Standard Rules', 'Standard IASCA competition rules and regulations', 'IASCA Standard Competition Rules and Regulations...'),
('MECA', 'MECA Basic Rules', 'Basic MECA competition guidelines', 'MECA Basic Competition Guidelines...'),
('Local Club', 'Local Club Rules', 'General rules for local club events', 'Local Club Competition Rules...')
ON CONFLICT DO NOTHING;

-- Insert organizations
INSERT INTO organizations (name, organization_type, status, description, default_rules_template_id) 
SELECT 
  orgs.name,
  orgs.org_type,
  orgs.status,
  orgs.description,
  rt.id
FROM (
  VALUES 
    ('IASCA', 'competition', 'active', 'International Auto Sound Challenge Association'),
    ('MECA', 'competition', 'active', 'Mobile Electronics Competition Association'),
    ('dB Drag Racing', 'competition', 'active', 'dB Drag Racing Association'),
    ('USACi', 'competition', 'active', 'United Sound & Audio Competition International'),
    ('BASS', 'competition', 'active', 'Bass Audio Sound Society'),
    ('SQC', 'competition', 'active', 'Sound Quality Competition'),
    ('Independent', 'independent', 'active', 'Independent event organizers'),
    ('Local Club', 'local', 'active', 'Local car audio clubs')
) AS orgs(name, org_type, status, description)
LEFT JOIN rules_templates rt ON rt.organization_name = orgs.name
ON CONFLICT (name) DO UPDATE SET
  organization_type = EXCLUDED.organization_type,
  status = EXCLUDED.status,
  description = EXCLUDED.description;

-- Insert form field configurations for create_event form
INSERT INTO form_field_configurations (form_name, field_name, field_type, is_required, placeholder_text, help_text, display_order) VALUES
('create_event', 'title', 'text', true, 'Enter event title', 'Name of your event', 1),
('create_event', 'description', 'textarea', false, 'Enter event description', 'Brief description of the event', 2),
('create_event', 'category', 'select', true, 'Select category', 'Choose the type of event', 3),
('create_event', 'organization_id', 'select', false, 'Select organization', 'Choose organizing body', 4),
('create_event', 'start_date', 'date', true, '', 'Event start date', 5),
('create_event', 'end_date', 'date', false, '', 'Event end date (if multi-day)', 6),
('create_event', 'start_time', 'time', false, '', 'Event start time', 7),
('create_event', 'end_time', 'time', false, '', 'Event end time', 8),
('create_event', 'venue_name', 'text', false, 'Enter venue name', 'Name of the venue', 9),
('create_event', 'address', 'text', false, 'Enter address', 'Street address', 10),
('create_event', 'city', 'text', false, 'Enter city', 'City name', 11),
('create_event', 'state', 'text', false, 'Enter state', 'State or province', 12),
('create_event', 'zip_code', 'text', false, 'Enter ZIP code', 'Postal code', 13),
('create_event', 'ticket_price', 'number', false, '0.00', 'Ticket price (0 for free)', 14),
('create_event', 'max_participants', 'number', false, '', 'Maximum number of participants', 15),
('create_event', 'rules', 'textarea', false, 'Enter event rules', 'Competition rules and regulations', 16),
('create_event', 'contact_email', 'email', false, 'Enter contact email', 'Contact email for inquiries', 17),
('create_event', 'contact_phone', 'tel', false, 'Enter contact phone', 'Contact phone number', 18),
('create_event', 'website_url', 'url', false, 'Enter website URL', 'Event website or registration link', 19),
('create_event', 'registration_deadline', 'date', false, '', 'Registration deadline', 20)
ON CONFLICT (form_name, field_name) DO NOTHING; 