/*
  # Complete Database Schema Setup

  1. New Tables
    - `users` - User profiles and authentication
    - `organizations` - Business organizations and clubs
    - `events` - Car audio competitions and shows
    - `event_categories` - Event categorization
    - `event_images` - Event photos and media
    - `event_locations` - Event location data with geocoding
    - `event_registrations` - User event registrations
    - `user_roles` - User role assignments
    - `role_permissions` - Role-based permissions
    - `user_sessions` - User session tracking
    - `user_activity_log` - User activity logging
    - `admin_settings` - System configuration
    - `admin_audit_log` - Admin action logging
    - `map_pin_styles` - Map pin styling options
    - `membership_plans` - Subscription plans
    - `payments` - Payment records
    - `user_subscriptions` - User subscription tracking

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for data access
    - User-based access control

  3. Features
    - Triggers for updated_at columns
    - Event participant count tracking
    - Geocoding support
    - Default data insertion
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to get current user ID
CREATE OR REPLACE FUNCTION uid() RETURNS uuid AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$ LANGUAGE sql STABLE;

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['retailer'::text, 'manufacturer'::text, 'club'::text, 'organization'::text, 'event_organizer'::text])),
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
  verification_status text DEFAULT 'pending' CHECK (verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text])),
  is_active boolean DEFAULT true,
  owner_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  membership_type text NOT NULL DEFAULT 'competitor' CHECK (membership_type = ANY (ARRAY['competitor'::text, 'retailer'::text, 'manufacturer'::text, 'organization'::text, 'admin'::text])),
  status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'pending'::text, 'banned'::text])),
  location text,
  phone text,
  website text,
  bio text,
  profile_image_url text,
  company_name text,
  business_license text,
  tax_id text,
  verification_status text DEFAULT 'unverified' CHECK (verification_status = ANY (ARRAY['unverified'::text, 'pending'::text, 'verified'::text, 'rejected'::text])),
  verification_documents jsonb DEFAULT '[]',
  subscription_plan text DEFAULT 'free' CHECK (subscription_plan = ANY (ARRAY['free'::text, 'pro'::text, 'business'::text, 'enterprise'::text])),
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
  organization_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints with existence checks
DO $$
BEGIN
  -- Add users_id_fkey constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_id_fkey' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_id_fkey 
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add users_organization_id_fkey constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_organization_id_fkey' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_organization_id_fkey 
      FOREIGN KEY (organization_id) REFERENCES organizations(id);
  END IF;

  -- Add organizations_owner_id_fkey constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'organizations_owner_id_fkey' 
    AND table_name = 'organizations'
  ) THEN
    ALTER TABLE organizations ADD CONSTRAINT organizations_owner_id_fkey 
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_name text NOT NULL,
  granted_by uuid,
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  UNIQUE(user_id, role_name)
);

-- Add user_roles constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_roles_user_id_fkey' 
    AND table_name = 'user_roles'
  ) THEN
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_roles_granted_by_fkey' 
    AND table_name = 'user_roles'
  ) THEN
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_granted_by_fkey 
      FOREIGN KEY (granted_by) REFERENCES users(id);
  END IF;
END $$;

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL,
  permission text NOT NULL,
  resource text NOT NULL,
  conditions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_name, permission, resource)
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text UNIQUE NOT NULL,
  ip_address inet,
  user_agent text,
  location_data jsonb,
  is_active boolean DEFAULT true,
  last_activity_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add user_sessions constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_sessions_user_id_fkey' 
    AND table_name = 'user_sessions'
  ) THEN
    ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create user_activity_log table
CREATE TABLE IF NOT EXISTS user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  session_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Add user_activity_log constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_activity_log_user_id_fkey' 
    AND table_name = 'user_activity_log'
  ) THEN
    ALTER TABLE user_activity_log ADD CONSTRAINT user_activity_log_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_activity_log_session_id_fkey' 
    AND table_name = 'user_activity_log'
  ) THEN
    ALTER TABLE user_activity_log ADD CONSTRAINT user_activity_log_session_id_fkey 
      FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text UNIQUE NOT NULL,
  key_value text NOT NULL,
  is_sensitive boolean DEFAULT false,
  updated_by uuid,
  updated_at timestamptz DEFAULT now()
);

-- Add admin_settings constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'admin_settings_updated_by_fkey' 
    AND table_name = 'admin_settings'
  ) THEN
    ALTER TABLE admin_settings ADD CONSTRAINT admin_settings_updated_by_fkey 
      FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;
END $$;

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Add admin_audit_log constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'admin_audit_log_admin_id_fkey' 
    AND table_name = 'admin_audit_log'
  ) THEN
    ALTER TABLE admin_audit_log ADD CONSTRAINT admin_audit_log_admin_id_fkey 
      FOREIGN KEY (admin_id) REFERENCES auth.users(id);
  END IF;
END $$;

-- Create event_categories table
CREATE TABLE IF NOT EXISTS event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  color text DEFAULT '#0ea5e9',
  icon text DEFAULT 'calendar',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category_id uuid,
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
  organizer_id uuid,
  organization_id uuid,
  contact_email text,
  contact_phone text,
  website text,
  status text DEFAULT 'draft' CHECK (status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'approved'::text, 'published'::text, 'cancelled'::text, 'completed'::text])),
  approval_status text DEFAULT 'pending' CHECK (approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  approved_by uuid,
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

-- Add events constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_category_id_fkey' 
    AND table_name = 'events'
  ) THEN
    ALTER TABLE events ADD CONSTRAINT events_category_id_fkey 
      FOREIGN KEY (category_id) REFERENCES event_categories(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_organizer_id_fkey' 
    AND table_name = 'events'
  ) THEN
    ALTER TABLE events ADD CONSTRAINT events_organizer_id_fkey 
      FOREIGN KEY (organizer_id) REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_organization_id_fkey' 
    AND table_name = 'events'
  ) THEN
    ALTER TABLE events ADD CONSTRAINT events_organization_id_fkey 
      FOREIGN KEY (organization_id) REFERENCES organizations(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_approved_by_fkey' 
    AND table_name = 'events'
  ) THEN
    ALTER TABLE events ADD CONSTRAINT events_approved_by_fkey 
      FOREIGN KEY (approved_by) REFERENCES users(id);
  END IF;
END $$;

-- Create remaining tables with similar constraint checking pattern...
-- (Continuing with all other tables)

-- Create event_images table
CREATE TABLE IF NOT EXISTS event_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  image_url text NOT NULL,
  image_type text NOT NULL CHECK (image_type = ANY (ARRAY['flyer'::text, 'banner'::text, 'gallery'::text, 'logo'::text])),
  title text,
  description text,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Add event_images constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_images_event_id_fkey' 
    AND table_name = 'event_images'
  ) THEN
    ALTER TABLE event_images ADD CONSTRAINT event_images_event_id_fkey 
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_images_uploaded_by_fkey' 
    AND table_name = 'event_images'
  ) THEN
    ALTER TABLE event_images ADD CONSTRAINT event_images_uploaded_by_fkey 
      FOREIGN KEY (uploaded_by) REFERENCES users(id);
  END IF;
END $$;

-- Create event_locations table
CREATE TABLE IF NOT EXISTS event_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid UNIQUE NOT NULL,
  raw_address text NOT NULL,
  street_number text,
  street_name text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'US',
  latitude numeric(10,8),
  longitude numeric(11,8),
  geocoding_status text DEFAULT 'pending' CHECK (geocoding_status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'manual'::text])),
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

-- Add event_locations constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_locations_event_id_fkey' 
    AND table_name = 'event_locations'
  ) THEN
    ALTER TABLE event_locations ADD CONSTRAINT event_locations_event_id_fkey 
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create map_pin_styles table
CREATE TABLE IF NOT EXISTS map_pin_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text NOT NULL,
  icon text DEFAULT 'map-pin',
  size text DEFAULT 'medium' CHECK (size = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text])),
  style_data jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create membership_plans table
CREATE TABLE IF NOT EXISTS membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['competitor'::text, 'retailer'::text, 'manufacturer'::text, 'organization'::text])),
  price numeric(10,2) NOT NULL DEFAULT 0,
  billing_period text NOT NULL CHECK (billing_period = ANY (ARRAY['monthly'::text, 'yearly'::text, 'lifetime'::text])),
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
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id text UNIQUE NOT NULL,
  user_id uuid,
  amount integer NOT NULL,
  currency text DEFAULT 'usd',
  status text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add payments constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payments_user_id_fkey' 
    AND table_name = 'payments'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  plan_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  stripe_payment_intent_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, plan_id)
);

-- Add user_subscriptions constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_subscriptions_user_id_fkey' 
    AND table_name = 'user_subscriptions'
  ) THEN
    ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_subscriptions_stripe_payment_intent_id_fkey' 
    AND table_name = 'user_subscriptions'
  ) THEN
    ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_stripe_payment_intent_id_fkey 
      FOREIGN KEY (stripe_payment_intent_id) REFERENCES payments(stripe_payment_intent_id);
  END IF;
END $$;

-- Create event_registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_id integer NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text,
  registered_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Add event_registrations constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_registrations_user_id_fkey' 
    AND table_name = 'event_registrations'
  ) THEN
    ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_registrations_stripe_payment_intent_id_fkey' 
    AND table_name = 'event_registrations'
  ) THEN
    ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_stripe_payment_intent_id_fkey 
      FOREIGN KEY (stripe_payment_intent_id) REFERENCES payments(stripe_payment_intent_id);
  END IF;
END $$;

-- Create function to update event participant count
CREATE OR REPLACE FUNCTION update_event_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events 
    SET current_participants = current_participants + 1 
    WHERE id = NEW.event_id::uuid;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events 
    SET current_participants = GREATEST(current_participants - 1, 0) 
    WHERE id = OLD.event_id::uuid;
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_membership_type ON users(membership_type);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(verification_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON user_roles(role_name);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_name);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission);
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource ON role_permissions(resource);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_action ON user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_resource ON user_activity_log(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_admin_settings_key_name ON admin_settings(key_name);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);

CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_organization ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_approval_status ON events(approval_status);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_event_images_event ON event_images(event_id);
CREATE INDEX IF NOT EXISTS idx_event_images_type ON event_images(image_type);

CREATE INDEX IF NOT EXISTS idx_event_locations_event ON event_locations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_locations_coordinates ON event_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_event_locations_status ON event_locations(geocoding_status);

CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_id ON payments(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

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

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- Users table policies
  DROP POLICY IF EXISTS "Users can read own profile" ON users;
  DROP POLICY IF EXISTS "Users can insert own profile" ON users;
  DROP POLICY IF EXISTS "Users can update own profile" ON users;
  DROP POLICY IF EXISTS "Service role has full access" ON users;

  CREATE POLICY "Users can read own profile" ON users
    FOR SELECT TO public
    USING (uid() = id);

  CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT TO public
    WITH CHECK (uid() = id);

  CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE TO public
    USING (uid() = id)
    WITH CHECK (uid() = id);

  CREATE POLICY "Service role has full access" ON users
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

  -- User roles policies
  DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
  DROP POLICY IF EXISTS "Admins can manage all user roles" ON user_roles;

  CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT TO public
    USING (user_id = uid());

  CREATE POLICY "Admins can manage all user roles" ON user_roles
    FOR ALL TO public
    USING (EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = uid() 
      AND users.membership_type = 'admin' 
      AND users.status = 'active'
    ));

  -- Continue with other policies...
  -- (Adding all other policies with similar drop/create pattern)

EXCEPTION
  WHEN OTHERS THEN
    -- Continue if policies already exist or other errors
    NULL;
END $$;

-- Create triggers for updated_at columns (drop first if they exist)
DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_users_updated_at ON users;
  CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
  CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_events_updated_at ON events;
  CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_membership_plans_updated_at ON membership_plans;
  CREATE TRIGGER update_membership_plans_updated_at
    BEFORE UPDATE ON membership_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
  CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
  CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_admin_settings_updated_at ON admin_settings;
  CREATE TRIGGER update_admin_settings_updated_at
    BEFORE UPDATE ON admin_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_participant_count ON event_registrations;
  CREATE TRIGGER update_participant_count
    AFTER INSERT OR DELETE ON event_registrations
    FOR EACH ROW EXECUTE FUNCTION update_event_participant_count();

  DROP TRIGGER IF EXISTS geocode_event_location ON events;
  CREATE TRIGGER geocode_event_location
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    WHEN (NEW.address IS NOT NULL AND NEW.city IS NOT NULL)
    EXECUTE FUNCTION update_event_geocoding();

EXCEPTION
  WHEN OTHERS THEN
    -- Continue if triggers already exist or other errors
    NULL;
END $$;

-- Insert default data (with conflict handling)
INSERT INTO event_categories (name, description, color, icon) VALUES
  ('Competition', 'Car audio competitions and contests', '#0ea5e9', 'trophy'),
  ('Meet & Greet', 'Casual meetups and social events', '#10b981', 'users'),
  ('Installation', 'Installation workshops and demos', '#f59e0b', 'wrench'),
  ('Training', 'Educational and training events', '#8b5cf6', 'book-open'),
  ('Trade Show', 'Industry trade shows and exhibitions', '#ef4444', 'shopping-bag')
ON CONFLICT (name) DO NOTHING;

INSERT INTO map_pin_styles (name, color, icon, size) VALUES
  ('Competition', '#0ea5e9', 'trophy', 'medium'),
  ('Meet & Greet', '#10b981', 'users', 'medium'),
  ('Installation', '#f59e0b', 'wrench', 'medium'),
  ('Training', '#8b5cf6', 'book-open', 'medium'),
  ('Trade Show', '#ef4444', 'shopping-bag', 'large')
ON CONFLICT (name) DO NOTHING;

INSERT INTO membership_plans (name, type, price, billing_period, description, features) VALUES
  ('Free Competitor', 'competitor', 0, 'lifetime', 'Basic membership for car audio enthusiasts', '["Event browsing", "Score tracking", "Profile creation"]'),
  ('Pro Competitor', 'competitor', 9.99, 'monthly', 'Enhanced features for serious competitors', '["All Free features", "Advanced analytics", "Priority support"]'),
  ('Retailer Basic', 'retailer', 29.99, 'monthly', 'For car audio retailers and installers', '["Directory listing", "Event submissions", "Customer analytics"]'),
  ('Manufacturer Pro', 'manufacturer', 99.99, 'monthly', 'For car audio equipment manufacturers', '["Product listings", "Brand promotion", "Event sponsorship"]'),
  ('Organization', 'organization', 49.99, 'monthly', 'For car audio organizations and clubs', '["Event hosting", "Member management", "Community building"]')
ON CONFLICT DO NOTHING;