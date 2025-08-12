-- Complete Schema for Car Audio Events Platform
-- This migration adds all the missing tables needed for full functionality

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  membership_type VARCHAR(50) DEFAULT 'free',
  status VARCHAR(20) DEFAULT 'active',
  location TEXT,
  phone VARCHAR(50),
  website TEXT,
  bio TEXT,
  company_name VARCHAR(255),
  verification_status VARCHAR(20) DEFAULT 'pending',
  subscription_plan VARCHAR(50) DEFAULT 'free',
  password_changed_at TIMESTAMPTZ,
  two_factor_enabled BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CMS Pages table
CREATE TABLE IF NOT EXISTS cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT,
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT false,
  author_id uuid REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  navigation_placement VARCHAR(20) DEFAULT 'none',
  parent_nav_item VARCHAR(255),
  footer_section VARCHAR(50),
  nav_order INTEGER DEFAULT 0,
  nav_title VARCHAR(255),
  show_in_sitemap BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(100),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Event favorites table
CREATE TABLE IF NOT EXISTS event_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Event analytics table
CREATE TABLE IF NOT EXISTS event_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Event images table
CREATE TABLE IF NOT EXISTS event_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Event registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  payment_status VARCHAR(20) DEFAULT 'pending',
  registration_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Event attendance table
CREATE TABLE IF NOT EXISTS event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'text',
  is_encrypted BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Role permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_name, permission, resource)
);

-- Membership plans table
CREATE TABLE IF NOT EXISTS membership_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  features JSONB DEFAULT '[]',
  max_events INTEGER,
  max_participants INTEGER,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User audio systems table
CREATE TABLE IF NOT EXISTS user_audio_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  vehicle_year INTEGER,
  vehicle_make VARCHAR(100),
  vehicle_model VARCHAR(100),
  system_type VARCHAR(50),
  total_value DECIMAL(10,2),
  is_primary BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audio components table
CREATE TABLE IF NOT EXISTS audio_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_system_id uuid REFERENCES user_audio_systems(id) ON DELETE CASCADE,
  component_type VARCHAR(50) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(255),
  specifications JSONB DEFAULT '{}',
  price DECIMAL(10,2),
  installation_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Competition results table
CREATE TABLE IF NOT EXISTS competition_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(id),
  category VARCHAR(100) NOT NULL,
  position INTEGER,
  score DECIMAL(10,2),
  notes TEXT,
  verified BOOLEAN DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Advertisements table
CREATE TABLE IF NOT EXISTS advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  target_url TEXT,
  placement VARCHAR(50) NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  impression_count INTEGER DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Organization config view (virtual table)
CREATE OR REPLACE VIEW organization_config_view AS
SELECT 
  o.id,
  o.name,
  o.logo_url,
  o.small_logo_url,
  o.description,
  o.organization_type,
  o.status,
  o.competition_classes,
  o.default_rules_template_id,
  rt.name as default_rules_name,
  rt.rules_content as default_rules_content
FROM organizations o
LEFT JOIN rules_templates rt ON o.default_rules_template_id = rt.id
WHERE o.status = 'active';

-- Enable RLS on all new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_audio_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access where appropriate
CREATE POLICY "Public read access" ON categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON membership_plans FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Public read access" ON cms_pages FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Public read access" ON advertisements FOR SELECT TO anon, authenticated USING (is_active = true);

-- Create policies for authenticated user access
CREATE POLICY "Users can manage their own data" ON users FOR ALL TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "Users can view other users" ON users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage their own favorites" ON event_favorites FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can manage their own registrations" ON event_registrations FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can manage their own audio systems" ON user_audio_systems FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Public can view public audio systems" ON user_audio_systems FOR SELECT TO anon, authenticated USING (is_public = true);

CREATE POLICY "Users can manage their own components" ON audio_components 
FOR ALL TO authenticated 
USING (EXISTS (
  SELECT 1 FROM user_audio_systems uas 
  WHERE uas.id = audio_system_id AND uas.user_id = (SELECT auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM user_audio_systems uas 
  WHERE uas.id = audio_system_id AND uas.user_id = (SELECT auth.uid())
));

CREATE POLICY "Users can view competition results" ON competition_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own results" ON competition_results FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can manage their teams" ON teams FOR ALL TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY "Public can view public teams" ON teams FOR SELECT TO anon, authenticated USING (is_public = true);

CREATE POLICY "Team members can view their memberships" ON team_members FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Team owners can manage memberships" ON team_members 
FOR ALL TO authenticated 
USING (EXISTS (
  SELECT 1 FROM teams t 
  WHERE t.id = team_id AND t.owner_id = (SELECT auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM teams t 
  WHERE t.id = team_id AND t.owner_id = (SELECT auth.uid())
));

-- Insert sample data for categories
INSERT INTO categories (name, description, color) VALUES
('Bass Competition', 'Bass sound pressure level competitions', '#DC2626'),
('Sound Quality', 'Audio quality and clarity competitions', '#059669'),
('Install Competition', 'Installation and craftsmanship showcase', '#7C3AED'),
('Meet & Greet', 'Social gathering and networking events', '#2563EB'),
('Championship', 'Championship and tournament events', '#EA580C')
ON CONFLICT (name) DO NOTHING;

-- Insert sample membership plans
INSERT INTO membership_plans (name, description, price, billing_cycle, features, max_events, max_participants) VALUES
('Free', 'Basic membership with limited features', 0, 'monthly', '["Event browsing", "Basic profile"]', 1, 50),
('Pro', 'Professional membership for serious competitors', 19.99, 'monthly', '["Unlimited events", "Advanced analytics", "Priority support"]', 10, 500),
('Enterprise', 'Full access for organizations and clubs', 99.99, 'monthly', '["Unlimited everything", "White label options", "API access"]', -1, -1)
ON CONFLICT (name) DO NOTHING;

-- Insert basic admin settings
INSERT INTO admin_settings (setting_key, setting_value, setting_type, description) VALUES
('site_name', 'Car Audio Events', 'text', 'Name of the website'),
('site_description', 'The premier platform for car audio events and competitions', 'text', 'Site description for SEO'),
('default_timezone', 'America/New_York', 'text', 'Default timezone for events'),
('registration_enabled', 'true', 'boolean', 'Whether user registration is enabled'),
('maintenance_mode', 'false', 'boolean', 'Site maintenance mode')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert basic role permissions
INSERT INTO role_permissions (role_name, permission, resource) VALUES
('admin', 'read', 'all'),
('admin', 'write', 'all'),
('admin', 'delete', 'all'),
('user', 'read', 'events'),
('user', 'write', 'events'),
('user', 'read', 'profile'),
('user', 'write', 'profile')
ON CONFLICT (role_name, permission, resource) DO NOTHING; 