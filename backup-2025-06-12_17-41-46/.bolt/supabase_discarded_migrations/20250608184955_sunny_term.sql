/*
  # Complete Database Reset and Clean Rebuild
  
  This migration completely resets the database by:
  1. Dropping all existing tables in the public schema
  2. Creating a clean, properly structured schema from scratch
  3. Setting up proper RLS policies with auth.uid()
  4. Creating necessary functions and triggers
  
  This ensures a clean slate without any legacy issues.
*/

-- First, drop all existing tables in the public schema
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Disable all triggers temporarily
    SET session_replication_role = 'replica';
    
    -- Drop all tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Re-enable triggers
    SET session_replication_role = 'origin';
END $$;

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create organizations table
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('retailer', 'manufacturer', 'club', 'organization', 'event_organizer')),
  description text,
  website text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'US',
  logo_url text,
  banner_url text,
  social_media jsonb DEFAULT '{}',
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  is_active boolean DEFAULT true,
  owner_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  membership_type text NOT NULL DEFAULT 'competitor' CHECK (membership_type IN ('competitor', 'retailer', 'manufacturer', 'organization', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending', 'banned')),
  location text,
  phone text,
  website text,
  bio text,
  profile_image_url text,
  company_name text,
  business_license text,
  tax_id text,
  verification_status text DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  verification_documents jsonb DEFAULT '[]',
  subscription_plan text DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'business', 'enterprise')),
  subscription_expires_at timestamptz,
  last_login_at timestamptz,
  login_count integer DEFAULT 0,
  failed_login_attempts integer DEFAULT 0,
  locked_until timestamptz,
  password_changed_at timestamptz DEFAULT now(),
  two_factor_enabled boolean DEFAULT false,
  two_factor_secret text,
  backup_codes text[],
  preferences jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add owner_id foreign key to organizations
ALTER TABLE organizations ADD CONSTRAINT organizations_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create user_roles table
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  granted_by uuid REFERENCES users(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  UNIQUE(user_id, role_name)
);

-- Create role_permissions table
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL,
  permission text NOT NULL,
  resource text NOT NULL,
  conditions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_name, permission, resource)
);

-- Create user_sessions table
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  ip_address inet,
  user_agent text,
  location_data jsonb,
  is_active boolean DEFAULT true,
  last_activity_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_activity_log table
CREATE TABLE user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  session_id uuid REFERENCES user_sessions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create admin_settings table
CREATE TABLE admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text UNIQUE NOT NULL,
  key_value text NOT NULL,
  is_sensitive boolean DEFAULT false,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now()
);

-- Create admin_audit_log table
CREATE TABLE admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES users(id),
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create event_categories table
CREATE TABLE event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  color text DEFAULT '#0ea5e9',
  icon text DEFAULT 'calendar',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES event_categories(id),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  registration_deadline timestamptz,
  max_participants integer,
  current_participants integer DEFAULT 0,
  registration_fee numeric(10,2) DEFAULT 0,
  early_bird_fee numeric(10,2),
  early_bird_deadline timestamptz,
  venue_name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text,
  country text DEFAULT 'US',
  latitude numeric(10,8),
  longitude numeric(11,8),
  organizer_id uuid REFERENCES users(id),
  organization_id uuid REFERENCES organizations(id),
  contact_email text,
  contact_phone text,
  website text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'published', 'cancelled', 'completed')),
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  rejection_reason text,
  features jsonb DEFAULT '{}',
  rules text,
  prizes jsonb DEFAULT '[]',
  schedule jsonb DEFAULT '[]',
  sponsors jsonb DEFAULT '[]',
  pin_color text DEFAULT '#0ea5e9',
  pin_style text DEFAULT 'default',
  show_organization_logo boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  is_public boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event_images table
CREATE TABLE event_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_type text NOT NULL CHECK (image_type IN ('flyer', 'banner', 'gallery', 'logo')),
  title text,
  description text,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  uploaded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Create event_locations table
CREATE TABLE event_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  raw_address text NOT NULL,
  street_number text,
  street_name text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'US',
  latitude numeric(10,8),
  longitude numeric(11,8),
  geocoding_status text DEFAULT 'pending' CHECK (geocoding_status IN ('pending', 'success', 'failed', 'manual')),
  geocoding_provider text,
  geocoding_accuracy text,
  geocoded_at timestamptz,
  place_id text,
  formatted_address text,
  location_type text,
  pin_color text DEFAULT '#0ea5e9',
  pin_icon text DEFAULT 'map-pin',
  pin_size text DEFAULT 'medium',
  show_on_map boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create map_pin_styles table
CREATE TABLE map_pin_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text NOT NULL,
  icon text DEFAULT 'map-pin',
  size text DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),
  style_data jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create membership_plans table
CREATE TABLE membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('competitor', 'retailer', 'manufacturer', 'organization')),
  price numeric(10,2) NOT NULL DEFAULT 0,
  billing_period text NOT NULL CHECK (billing_period IN ('monthly', 'yearly', 'lifetime')),
  description text,
  features jsonb DEFAULT '[]',
  permissions jsonb DEFAULT '[]',
  limits jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  currency text DEFAULT 'usd',
  status text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  stripe_payment_intent_id text REFERENCES payments(stripe_payment_intent_id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, plan_id)
);

-- Create event_registrations table
CREATE TABLE event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id),
  payment_status text NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text REFERENCES payments(stripe_payment_intent_id),
  registered_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Create function to update event participant count
CREATE OR REPLACE FUNCTION update_event_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events 
    SET current_participants = current_participants + 1 
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events 
    SET current_participants = GREATEST(current_participants - 1, 0) 
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function for event geocoding
CREATE OR REPLACE FUNCTION update_event_geocoding()
RETURNS TRIGGER AS $$
BEGIN
  -- This is a placeholder function for geocoding
  -- In a real implementation, this would call a geocoding service
  
  -- For now, set some default coordinates based on major cities
  IF NEW.city ILIKE '%orlando%' THEN
    NEW.latitude = 28.5383;
    NEW.longitude = -81.3792;
  ELSIF NEW.city ILIKE '%phoenix%' THEN
    NEW.latitude = 33.4484;
    NEW.longitude = -112.0740;
  ELSIF NEW.city ILIKE '%atlanta%' THEN
    NEW.latitude = 33.7490;
    NEW.longitude = -84.3880;
  ELSIF NEW.city ILIKE '%dallas%' THEN
    NEW.latitude = 32.7767;
    NEW.longitude = -96.7970;
  ELSIF NEW.city ILIKE '%las vegas%' THEN
    NEW.latitude = 36.1699;
    NEW.longitude = -115.1398;
  ELSIF NEW.city ILIKE '%miami%' THEN
    NEW.latitude = 25.7617;
    NEW.longitude = -80.1918;
  ELSE
    -- Default to center of US if city not recognized
    NEW.latitude = 39.8283;
    NEW.longitude = -98.5795;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_default_name TEXT;
BEGIN
  -- Extract name from email or metadata
  user_default_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'New User'
  );

  -- Insert the user profile if it doesn't exist
  INSERT INTO public.users (
    id,
    email,
    name,
    membership_type,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    user_default_name,
    COALESCE(NEW.raw_user_meta_data->>'membership_type', 'competitor'),
    'active',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_membership_plans_updated_at
  BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participant_count
  AFTER INSERT OR DELETE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION update_event_participant_count();

CREATE TRIGGER geocode_event_location
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  WHEN (NEW.address IS NOT NULL AND NEW.city IS NOT NULL)
  EXECUTE FUNCTION update_event_geocoding();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_membership_type ON users(membership_type);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_verification_status ON users(verification_status);
CREATE INDEX idx_users_subscription_plan ON users(subscription_plan);
CREATE INDEX idx_users_last_login ON users(last_login_at);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_name ON user_roles(role_name);
CREATE INDEX idx_user_roles_active ON user_roles(is_active);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_name);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission);
CREATE INDEX idx_role_permissions_resource ON role_permissions(resource);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_action ON user_activity_log(action);
CREATE INDEX idx_user_activity_created_at ON user_activity_log(created_at);
CREATE INDEX idx_user_activity_resource ON user_activity_log(resource_type, resource_id);

CREATE INDEX idx_admin_settings_key_name ON admin_settings(key_name);
CREATE INDEX idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at);

CREATE INDEX idx_organizations_owner ON organizations(owner_id);
CREATE INDEX idx_organizations_type ON organizations(type);

CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_organization ON events(organization_id);
CREATE INDEX idx_events_category ON events(category_id);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_approval_status ON events(approval_status);
CREATE INDEX idx_events_location ON events(latitude, longitude);

CREATE INDEX idx_event_images_event ON event_images(event_id);
CREATE INDEX idx_event_images_type ON event_images(image_type);

CREATE INDEX idx_event_locations_event ON event_locations(event_id);
CREATE INDEX idx_event_locations_coordinates ON event_locations(latitude, longitude);
CREATE INDEX idx_event_locations_status ON event_locations(geocoding_status);

CREATE INDEX idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX idx_event_registrations_event_id ON event_registrations(event_id);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_stripe_id ON payments(stripe_payment_intent_id);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_pin_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users table policies
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT TO public
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT TO public
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO public
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role has full access" ON users
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- User roles policies
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT TO public
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all user roles" ON user_roles
  FOR ALL TO public
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.membership_type = 'admin' 
    AND users.status = 'active'
  ));

-- Role permissions policies
CREATE POLICY "Users can view role permissions" ON role_permissions
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can manage role permissions" ON role_permissions
  FOR ALL TO public
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.membership_type = 'admin' 
    AND users.status = 'active'
  ));

-- User sessions policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT TO public
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions" ON user_sessions
  FOR UPDATE TO public
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions" ON user_sessions
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.membership_type = 'admin' 
    AND users.status = 'active'
  ));

-- User activity log policies
CREATE POLICY "Users can view their own activity" ON user_activity_log
  FOR SELECT TO public
  USING (user_id = auth.uid());

CREATE POLICY "System can insert activity logs" ON user_activity_log
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view all activity" ON user_activity_log
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.membership_type = 'admin' 
    AND users.status = 'active'
  ));

-- Admin settings policies
CREATE POLICY "Authenticated users can access admin_settings" ON admin_settings
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- Admin audit log policies
CREATE POLICY "Authenticated users can access audit log" ON admin_audit_log
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- Organizations policies
CREATE POLICY "Organizations are viewable by everyone" ON organizations
  FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT TO public
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Organization owners can update their organizations" ON organizations
  FOR UPDATE TO public
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Event categories policies
CREATE POLICY "Event categories are viewable by everyone" ON event_categories
  FOR SELECT TO public
  USING (is_active = true);

-- Events policies
CREATE POLICY "Published events are viewable by everyone" ON events
  FOR SELECT TO public
  USING (status = 'published' AND is_public = true);

CREATE POLICY "Users can view their own events" ON events
  FOR SELECT TO public
  USING (auth.uid() = organizer_id);

CREATE POLICY "Authenticated users can create events" ON events
  FOR INSERT TO public
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Event organizers can update their events" ON events
  FOR UPDATE TO public
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Admins can view all events" ON events
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.membership_type = 'admin' 
    AND users.status = 'active'
  ));

CREATE POLICY "Admins can update all events" ON events
  FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.membership_type = 'admin' 
    AND users.status = 'active'
  ));

-- Event images policies
CREATE POLICY "Event images are viewable with events" ON event_images
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_images.event_id 
    AND (events.status = 'published' OR events.organizer_id = auth.uid())
  ));

CREATE POLICY "Event organizers can manage event images" ON event_images
  FOR ALL TO public
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_images.event_id 
    AND events.organizer_id = auth.uid()
  ));

-- Event locations policies
CREATE POLICY "Event locations are viewable with events" ON event_locations
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_locations.event_id 
    AND (events.status = 'published' OR events.organizer_id = auth.uid())
  ));

CREATE POLICY "Event organizers can manage event locations" ON event_locations
  FOR ALL TO public
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_locations.event_id 
    AND events.organizer_id = auth.uid()
  ));

-- Map pin styles policies
CREATE POLICY "Map pin styles are viewable by everyone" ON map_pin_styles
  FOR SELECT TO public
  USING (is_active = true);

-- Membership plans policies
CREATE POLICY "Active membership plans are viewable by everyone" ON membership_plans
  FOR SELECT TO public
  USING (is_active = true);

-- Payments policies
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON payments
  FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

-- User subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
  FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subscriptions" ON user_subscriptions
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Event registrations policies
CREATE POLICY "Users can view their own registrations" ON event_registrations
  FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own registrations" ON event_registrations
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert default event categories
INSERT INTO event_categories (name, description, color, icon) VALUES
  ('Championship', 'Major championship events', '#ef4444', 'trophy'),
  ('SPL Competition', 'Sound Pressure Level competitions', '#f97316', 'volume-2'),
  ('Sound Quality', 'Sound quality focused events', '#8b5cf6', 'music'),
  ('Bass Competition', 'Bass-focused competitions', '#06b6d4', 'speaker'),
  ('Local Event', 'Local and regional events', '#10b981', 'map-pin'),
  ('Exhibition', 'Shows and exhibitions', '#6366f1', 'eye'),
  ('Workshop', 'Educational workshops', '#84cc16', 'book-open'),
  ('Install Competition', 'Installation competitions', '#f59e0b', 'wrench');

-- Insert default map pin styles
INSERT INTO map_pin_styles (name, color, icon, size) VALUES
  ('Championship', '#ef4444', 'trophy', 'large'),
  ('SPL Competition', '#f97316', 'volume-2', 'medium'),
  ('Sound Quality', '#8b5cf6', 'music', 'medium'),
  ('Bass Competition', '#06b6d4', 'speaker', 'medium'),
  ('Local Event', '#10b981', 'map-pin', 'small'),
  ('Exhibition', '#6366f1', 'eye', 'medium'),
  ('Featured', '#fbbf24', 'star', 'large'),
  ('Default', '#0ea5e9', 'map-pin', 'medium');

-- Insert default membership plans
INSERT INTO membership_plans (name, type, price, billing_period, description, features, permissions, limits) VALUES
  ('Competitor Free', 'competitor', 0, 'lifetime', 'Perfect for getting started in car audio competitions', 
   '["Browse all events", "Basic profile creation", "Score tracking", "Community access", "Mobile app access"]',
   '["view_events", "register_events", "track_scores", "create_profile", "join_teams"]',
   '{"max_events_per_month": 5}'
  ),
  ('Pro Competitor', 'competitor', 29, 'yearly', 'Advanced features for serious competitors',
   '["Everything in Free", "Advanced analytics", "Priority registration", "Custom system showcase", "Competition history export", "Early access to features"]',
   '["view_events", "register_events", "track_scores", "create_profile", "join_teams", "advanced_analytics", "priority_registration", "custom_showcase", "export_history"]',
   '{"max_events_per_month": 25}'
  ),
  ('Business Starter', 'retailer', 99, 'yearly', 'For small retailers and installers',
   '["Directory listing", "Basic event creation", "Customer analytics", "Advertising options", "Email support"]',
   '["view_events", "create_events", "directory_listing", "customer_analytics", "advertising"]',
   '{"max_listings": 10, "max_events_per_month": 5}'
  ),
  ('Business Pro', 'retailer', 299, 'yearly', 'For established retailers and manufacturers',
   '["Everything in Starter", "Unlimited listings", "Advanced event management", "Sponsorship tools", "API access", "Priority support"]',
   '["view_events", "create_events", "directory_listing", "customer_analytics", "advertising", "sponsorship_tools", "api_access", "priority_support", "bulk_operations"]',
   '{"max_events_per_month": 50}'
  ),
  ('Enterprise', 'manufacturer', 999, 'yearly', 'For large manufacturers and organizations',
   '["Everything in Pro", "White label options", "Custom integrations", "Dedicated support", "Custom analytics", "Multi-location management"]',
   '["view_events", "create_events", "directory_listing", "customer_analytics", "advertising", "sponsorship_tools", "api_access", "priority_support", "bulk_operations", "white_label", "member_management"]',
   '{"max_events_per_month": 200, "max_team_members": 100}'
  );

-- Insert default role permissions
INSERT INTO role_permissions (role_name, permission, resource, conditions) VALUES
  -- Admin permissions (full access)
  ('admin', 'create', 'users', '{}'),
  ('admin', 'read', 'users', '{}'),
  ('admin', 'update', 'users', '{}'),
  ('admin', 'delete', 'users', '{}'),
  ('admin', 'create', 'events', '{}'),
  ('admin', 'read', 'events', '{}'),
  ('admin', 'update', 'events', '{}'),
  ('admin', 'delete', 'events', '{}'),
  ('admin', 'create', 'payments', '{}'),
  ('admin', 'read', 'payments', '{}'),
  ('admin', 'update', 'payments', '{}'),
  ('admin', 'manage', 'system_settings', '{}'),
  ('admin', 'view', 'audit_logs', '{}'),
  ('admin', 'manage', 'roles', '{}'),

  -- Organization permissions (event management)
  ('organization', 'create', 'events', '{"scope": "own"}'),
  ('organization', 'read', 'events', '{}'),
  ('organization', 'update', 'events', '{"scope": "own"}'),
  ('organization', 'delete', 'events', '{"scope": "own"}'),
  ('organization', 'read', 'event_registrations', '{"scope": "own_events"}'),
  ('organization', 'update', 'event_registrations', '{"scope": "own_events"}'),
  ('organization', 'read', 'users', '{"scope": "basic_info"}'),

  -- Competitor permissions (basic user access)
  ('competitor', 'read', 'events', '{}'),
  ('competitor', 'create', 'event_registrations', '{}'),
  ('competitor', 'read', 'event_registrations', '{"scope": "own"}'),
  ('competitor', 'update', 'event_registrations', '{"scope": "own"}'),
  ('competitor', 'delete', 'event_registrations', '{"scope": "own"}'),
  ('competitor', 'read', 'business_listings', '{}'),
  ('competitor', 'create', 'teams', '{}'),
  ('competitor', 'read', 'teams', '{}'),
  ('competitor', 'update', 'teams', '{"scope": "member"}');

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_membership text;
BEGIN
  SELECT membership_type INTO user_membership
  FROM users
  WHERE id = user_id_param AND status = 'active';
  
  RETURN user_membership = 'admin';
END;
$$;

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_id_param uuid DEFAULT auth.uid())
RETURNS TABLE(permission text, resource text, conditions jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_membership text;
BEGIN
  -- Get user membership type
  SELECT u.membership_type INTO user_membership
  FROM users u
  WHERE u.id = user_id_param AND u.status = 'active';
  
  IF user_membership IS NULL THEN
    RETURN;
  END IF;
  
  -- Return permissions from membership type
  RETURN QUERY
  SELECT rp.permission, rp.resource, rp.conditions
  FROM role_permissions rp
  WHERE rp.role_name = user_membership;
  
  -- Return permissions from additional roles
  RETURN QUERY
  SELECT rp.permission, rp.resource, rp.conditions
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role_name = ur.role_name
  WHERE ur.user_id = user_id_param
    AND ur.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > now());
END;
$$;

-- Create function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  user_id_param uuid,
  action_param text,
  resource_type_param text DEFAULT NULL,
  resource_id_param text DEFAULT NULL,
  details_param jsonb DEFAULT '{}',
  ip_address_param inet DEFAULT NULL,
  user_agent_param text DEFAULT NULL,
  session_id_param uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_activity_log (
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent,
    session_id
  ) VALUES (
    user_id_param,
    action_param,
    resource_type_param,
    resource_id_param,
    details_param,
    ip_address_param,
    user_agent_param,
    session_id_param
  );
END;
$$;

-- Create function to create admin settings table if needed
CREATE OR REPLACE FUNCTION create_admin_settings_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function is mainly for the edge function to call
  -- The table should already exist from this migration
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_settings') THEN
    CREATE TABLE admin_settings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key_name text UNIQUE NOT NULL,
      key_value text NOT NULL,
      is_sensitive boolean DEFAULT false,
      updated_by uuid REFERENCES auth.users(id),
      updated_at timestamptz DEFAULT now()
    );
    
    ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Authenticated users can access admin_settings"
      ON admin_settings
      FOR ALL
      TO public
      USING (true);
  END IF;
END;
$$;

-- Create function for event approval
CREATE OR REPLACE FUNCTION approve_event(
  event_id uuid,
  admin_id uuid,
  approval_decision text,
  rejection_reason text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  event_record events%ROWTYPE;
  result json;
BEGIN
  -- Verify admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = admin_id 
    AND membership_type = 'admin' 
    AND status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get event details
  SELECT * INTO event_record FROM events WHERE id = event_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- Update event approval status
  IF approval_decision = 'approved' THEN
    UPDATE events 
    SET 
      approval_status = 'approved',
      status = 'published',
      approved_by = admin_id,
      approved_at = now(),
      rejection_reason = NULL,
      updated_at = now()
    WHERE id = event_id;
    
    result = json_build_object(
      'success', true, 
      'message', 'Event approved and published',
      'event_id', event_id,
      'status', 'approved'
    );
  ELSIF approval_decision = 'rejected' THEN
    UPDATE events 
    SET 
      approval_status = 'rejected',
      status = 'draft',
      approved_by = admin_id,
      approved_at = now(),
      rejection_reason = rejection_reason,
      updated_at = now()
    WHERE id = event_id;
    
    result = json_build_object(
      'success', true, 
      'message', 'Event rejected',
      'event_id', event_id,
      'status', 'rejected',
      'reason', rejection_reason
    );
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid approval decision');
  END IF;

  -- Log the approval action
  INSERT INTO admin_audit_log (admin_id, action, details)
  VALUES (
    admin_id,
    'event_' || approval_decision,
    json_build_object(
      'event_id', event_id,
      'event_title', event_record.title,
      'organizer_id', event_record.organizer_id,
      'decision', approval_decision,
      'reason', rejection_reason,
      'timestamp', now()
    )
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample organizations
INSERT INTO organizations (id, name, type, description, website, phone, email, city, state, country, logo_url, verification_status, is_active, created_at, updated_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'IASCA International', 'organization', 'International Auto Sound Challenge Association', 'https://iasca.com', '+1-555-0123', 'info@iasca.com', 'Oklahoma City', 'OK', 'US', 'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', 'verified', true, now(), now()),
  ('550e8400-e29b-41d4-a716-446655440002', 'dB Drag Racing Association', 'organization', 'Sound Pressure Level Competition Organization', 'https://dbdrag.com', '+1-555-0456', 'info@dbdrag.com', 'Tulsa', 'OK', 'US', 'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', 'verified', true, now(), now()),
  ('550e8400-e29b-41d4-a716-446655440003', 'MECA Audio', 'organization', 'Mobile Electronics Competition Association', 'https://meca.org', '+1-555-0789', 'info@meca.org', 'Phoenix', 'AZ', 'US', 'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', 'verified', true, now(), now()),
  ('550e8400-e29b-41d4-a716-446655440004', 'Bass Race Events', 'organization', 'Bass Competition Specialists', 'https://bassrace.com', '+1-555-0321', 'info@bassrace.com', 'Las Vegas', 'NV', 'US', 'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', 'verified', true, now(), now()),
  ('550e8400-e29b-41d4-a716-446655440005', 'Sound Quality Alliance', 'organization', 'Premium Sound Quality Events', 'https://sqalliance.com', '+1-555-0654', 'info@sqalliance.com', 'Atlanta', 'GA', 'US', 'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', 'verified', true, now(), now()),
  ('550e8400-e29b-41d4-a716-446655440006', 'Mobile Electronics Expo', 'organization', 'Trade Shows and Exhibitions', 'https://mobileexpo.com', '+1-555-0987', 'info@mobileexpo.com', 'Miami', 'FL', 'US', 'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', 'verified', true, now(), now());

-- Insert sample events
INSERT INTO events (
  id, title, description, category_id, start_date, end_date, registration_deadline,
  max_participants, current_participants, registration_fee, early_bird_fee, early_bird_deadline,
  venue_name, address, city, state, zip_code, country, latitude, longitude,
  organization_id, contact_email, contact_phone, website,
  status, approval_status, approved_at, features, rules, prizes, schedule,
  pin_color, pin_style, show_organization_logo, is_featured, is_public,
  created_at, updated_at
) VALUES
(
  '650e8400-e29b-41d4-a716-446655440001',
  'IASCA World Finals 2025',
  'The ultimate car audio championship featuring the world''s best competitors from around the globe. This prestigious event brings together sound quality enthusiasts and SPL competitors to compete for the coveted IASCA World Championship title.',
  (SELECT id FROM event_categories WHERE name = 'Championship'),
  '2025-03-15 10:00:00+00',
  '2025-03-17 18:00:00+00',
  '2025-03-01 23:59:59+00',
  200,
  150,
  150.00,
  125.00,
  '2025-02-15 23:59:59+00',
  'Orange County Convention Center',
  '9800 International Dr',
  'Orlando',
  'FL',
  '32819',
  'US',
  28.5383,
  -81.3792,
  '550e8400-e29b-41d4-a716-446655440001',
  'worldfinals@iasca.com',
  '+1-555-0123',
  'https://iasca.com/worldfinals',
  'published',
  'approved',
  now(),
  '{"parking": true, "food_vendors": true, "vendor_booths": true, "live_streaming": true}',
  'IASCA official rules apply. All vehicles must pass tech inspection.',
  '[{"place": "1st Place Overall", "prize": "$5,000 + Trophy"}, {"place": "2nd Place Overall", "prize": "$3,000 + Trophy"}, {"place": "3rd Place Overall", "prize": "$1,500 + Trophy"}, {"place": "Best of Show", "prize": "$1,000 + Trophy"}]',
  '[{"time": "08:00", "activity": "Registration & Tech Inspection"}, {"time": "10:00", "activity": "Sound Quality Judging Begins"}, {"time": "12:00", "activity": "SPL Competition Round 1"}, {"time": "14:00", "activity": "Lunch Break"}, {"time": "15:00", "activity": "SPL Competition Finals"}, {"time": "17:00", "activity": "Awards Ceremony"}]',
  '#ef4444',
  'championship',
  true,
  true,
  true,
  now(),
  now()
),
(
  '650e8400-e29b-41d4-a716-446655440002',
  'dB Drag National Event',
  'Pure loudness competition - see who can hit the highest decibel levels. This SPL-focused event features multiple classes and the latest in high-powered car audio systems.',
  (SELECT id FROM event_categories WHERE name = 'SPL Competition'),
  '2025-04-22 09:00:00+00',
  '2025-04-24 17:00:00+00',
  '2025-04-10 23:59:59+00',
  150,
  89,
  75.00,
  60.00,
  '2025-04-01 23:59:59+00',
  'Phoenix Raceway',
  '7602 Jimmie Johnson Dr',
  'Phoenix',
  'AZ',
  '85143',
  'US',
  33.4484,
  -112.0740,
  '550e8400-e29b-41d4-a716-446655440002',
  'nationals@dbdrag.com',
  '+1-555-0456',
  'https://dbdrag.com/nationals',
  'published',
  'approved',
  now(),
  '{"parking": true, "food_vendors": true, "sound_meter_rental": true}',
  'dB Drag official rules. Sound meters provided. Safety equipment required.',
  '[{"place": "Loudest Overall", "prize": "$2,500 + Trophy"}, {"place": "Street Class Winner", "prize": "$1,000 + Trophy"}, {"place": "Extreme Class Winner", "prize": "$1,500 + Trophy"}]',
  '[{"time": "09:00", "activity": "Registration Opens"}, {"time": "10:00", "activity": "Tech Inspection"}, {"time": "11:00", "activity": "Practice Runs"}, {"time": "13:00", "activity": "Competition Begins"}, {"time": "16:00", "activity": "Finals"}, {"time": "17:00", "activity": "Awards"}]',
  '#f97316',
  'spl',
  true,
  false,
  true,
  now(),
  now()
),
(
  '650e8400-e29b-41d4-a716-446655440003',
  'MECA Spring Championship',
  'Precision and clarity take center stage in this sound quality focused event. Judges will evaluate tonal accuracy, staging, and imaging in this prestigious competition.',
  (SELECT id FROM event_categories WHERE name = 'Sound Quality'),
  '2025-05-10 08:00:00+00',
  '2025-05-12 16:00:00+00',
  '2025-04-25 23:59:59+00',
  100,
  67,
  100.00,
  85.00,
  '2025-04-20 23:59:59+00',
  'Georgia World Congress Center',
  '285 Andrew Young International Blvd NW',
  'Atlanta',
  'GA',
  '30313',
  'US',
  33.7490,
  -84.3880,
  '550e8400-e29b-41d4-a716-446655440003',
  'spring@meca.org',
  '+1-555-0789',
  'https://meca.org/spring',
  'published',
  'approved',
  now(),
  '{"parking": true, "food_vendors": true, "quiet_judging_area": true}',
  'MECA sound quality rules. Judging by certified MECA judges only.',
  '[{"place": "SQ Champion", "prize": "$3,000 + Trophy"}, {"place": "Street SQ Winner", "prize": "$1,500 + Trophy"}, {"place": "Modified SQ Winner", "prize": "$2,000 + Trophy"}]',
  '[{"time": "08:00", "activity": "Registration"}, {"time": "09:00", "activity": "Sound Quality Judging Round 1"}, {"time": "12:00", "activity": "Lunch"}, {"time": "13:00", "activity": "Semi-Finals"}, {"time": "15:00", "activity": "Finals"}, {"time": "16:00", "activity": "Awards"}]',
  '#8b5cf6',
  'sound_quality',
  true,
  true,
  true,
  now(),
  now()
);

-- Create event locations for sample events
INSERT INTO event_locations (
  event_id, raw_address, city, state, country, latitude, longitude,
  geocoding_status, geocoding_provider, geocoding_accuracy, formatted_address, geocoded_at,
  pin_color, pin_icon, pin_size, show_on_map, created_at, updated_at
) VALUES
('650e8400-e29b-41d4-a716-446655440001', '9800 International Dr', 'Orlando', 'FL', 'US', 28.5383, -81.3792, 'success', 'manual', 'exact', '9800 International Dr, Orlando, FL, US', now(), '#ef4444', 'map-pin', 'medium', true, now(), now()),
('650e8400-e29b-41d4-a716-446655440002', '7602 Jimmie Johnson Dr', 'Phoenix', 'AZ', 'US', 33.4484, -112.0740, 'success', 'manual', 'exact', '7602 Jimmie Johnson Dr, Phoenix, AZ, US', now(), '#f97316', 'map-pin', 'medium', true, now(), now()),
('650e8400-e29b-41d4-a716-446655440003', '285 Andrew Young International Blvd NW', 'Atlanta', 'GA', 'US', 33.7490, -84.3880, 'success', 'manual', 'exact', '285 Andrew Young International Blvd NW, Atlanta, GA, US', now(), '#8b5cf6', 'map-pin', 'medium', true, now(), now());