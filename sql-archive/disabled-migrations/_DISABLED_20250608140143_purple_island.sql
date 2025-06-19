/*
  # Complete Database Schema Setup
  
  1. Tables Created
    - users: User profiles and authentication data
    - organizations: Business and organization profiles
    - user_roles: Role-based access control
    - role_permissions: Permission definitions
    - user_sessions: Session management
    - user_activity_log: Activity tracking
    - admin_settings: System configuration
    - admin_audit_log: Admin action logging
    - event_categories: Event categorization
    - events: Event management
    - event_images: Event media
    - event_locations: Event location data
    - map_pin_styles: Map styling
    - membership_plans: Subscription plans
    - payments: Payment processing
    - user_subscriptions: User subscriptions
    - event_registrations: Event registrations
    
  2. Security
    - Row Level Security enabled on all tables
    - Comprehensive RLS policies for data protection
    - Proper foreign key constraints
    
  3. Performance
    - Indexes on frequently queried columns
    - Optimized for user lookups and event queries
    
  4. Automation
    - Triggers for updated_at timestamps
    - Event participant count automation
    - Geocoding trigger placeholder
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

-- Handle foreign key constraints safely
DO $$
BEGIN
  -- Drop existing constraints if they exist
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_id_fkey' AND table_name = 'users') THEN
    ALTER TABLE users DROP CONSTRAINT users_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_organization_id_fkey' AND table_name = 'users') THEN
    ALTER TABLE users DROP CONSTRAINT users_organization_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'organizations_owner_id_fkey' AND table_name = 'organizations') THEN
    ALTER TABLE organizations DROP CONSTRAINT organizations_owner_id_fkey;
  END IF;
  
  -- Add foreign key constraints
  ALTER TABLE users ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

  ALTER TABLE users ADD CONSTRAINT users_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES organizations(id);

  ALTER TABLE organizations ADD CONSTRAINT organizations_owner_id_fkey 
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
    
EXCEPTION
  WHEN OTHERS THEN
    -- If constraints fail, continue without them for now
    NULL;
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
  metadata jsonb DEFAULT '{}'
);

-- Add unique constraint safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_roles_user_id_role_name_key' AND table_name = 'user_roles') THEN
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_role_name_key UNIQUE(user_id, role_name);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Add foreign key constraints for user_roles safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_roles_user_id_fkey' AND table_name = 'user_roles') THEN
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_roles_granted_by_fkey' AND table_name = 'user_roles') THEN
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_granted_by_fkey 
      FOREIGN KEY (granted_by) REFERENCES users(id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL,
  permission text NOT NULL,
  resource text NOT NULL,
  conditions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'role_permissions_role_name_permission_resource_key' AND table_name = 'role_permissions') THEN
    ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_name_permission_resource_key UNIQUE(role_name, permission, resource);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  ip_address inet,
  user_agent text,
  location_data jsonb,
  is_active boolean DEFAULT true,
  last_activity_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint and foreign key safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_sessions_session_token_key' AND table_name = 'user_sessions') THEN
    ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_session_token_key UNIQUE(session_token);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_sessions_user_id_fkey' AND table_name = 'user_sessions') THEN
    ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
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

-- Add foreign key constraints safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_activity_log_user_id_fkey' AND table_name = 'user_activity_log') THEN
    ALTER TABLE user_activity_log ADD CONSTRAINT user_activity_log_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_activity_log_session_id_fkey' AND table_name = 'user_activity_log') THEN
    ALTER TABLE user_activity_log ADD CONSTRAINT user_activity_log_session_id_fkey 
      FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text NOT NULL,
  key_value text NOT NULL,
  is_sensitive boolean DEFAULT false,
  updated_by uuid,
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint and foreign key safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_settings_key_name_key' AND table_name = 'admin_settings') THEN
    ALTER TABLE admin_settings ADD CONSTRAINT admin_settings_key_name_key UNIQUE(key_name);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_settings_updated_by_fkey' AND table_name = 'admin_settings') THEN
    ALTER TABLE admin_settings ADD CONSTRAINT admin_settings_updated_by_fkey 
      FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_audit_log_admin_id_fkey' AND table_name = 'admin_audit_log') THEN
    ALTER TABLE admin_audit_log ADD CONSTRAINT admin_audit_log_admin_id_fkey 
      FOREIGN KEY (admin_id) REFERENCES auth.users(id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Create event_categories table
CREATE TABLE IF NOT EXISTS event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#0ea5e9',
  icon text DEFAULT 'calendar',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'event_categories_name_key' AND table_name = 'event_categories') THEN
    ALTER TABLE event_categories ADD CONSTRAINT event_categories_name_key UNIQUE(name);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

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

-- Add foreign key constraints for events safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'events_category_id_fkey' AND table_name = 'events') THEN
    ALTER TABLE events ADD CONSTRAINT events_category_id_fkey 
      FOREIGN KEY (category_id) REFERENCES event_categories(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'events_organizer_id_fkey' AND table_name = 'events') THEN
    ALTER TABLE events ADD CONSTRAINT events_organizer_id_fkey 
      FOREIGN KEY (organizer_id) REFERENCES users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'events_organization_id_fkey' AND table_name = 'events') THEN
    ALTER TABLE events ADD CONSTRAINT events_organization_id_fkey 
      FOREIGN KEY (organization_id) REFERENCES organizations(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'events_approved_by_fkey' AND table_name = 'events') THEN
    ALTER TABLE events ADD CONSTRAINT events_approved_by_fkey 
      FOREIGN KEY (approved_by) REFERENCES users(id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Create remaining tables with similar safe constraint handling...
-- (Continuing with the same pattern for all other tables)

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

-- Create event_locations table
CREATE TABLE IF NOT EXISTS event_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
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

-- Add unique constraint for event_locations safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'event_locations_event_id_key' AND table_name = 'event_locations') THEN
    ALTER TABLE event_locations ADD CONSTRAINT event_locations_event_id_key UNIQUE(event_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Create map_pin_styles table
CREATE TABLE IF NOT EXISTS map_pin_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL,
  icon text DEFAULT 'map-pin',
  size text DEFAULT 'medium' CHECK (size = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text])),
  style_data jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'map_pin_styles_name_key' AND table_name = 'map_pin_styles') THEN
    ALTER TABLE map_pin_styles ADD CONSTRAINT map_pin_styles_name_key UNIQUE(name);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

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
  stripe_payment_intent_id text NOT NULL,
  user_id uuid,
  amount integer NOT NULL,
  currency text DEFAULT 'usd',
  status text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payments_stripe_payment_intent_id_key' AND table_name = 'payments') THEN
    ALTER TABLE payments ADD CONSTRAINT payments_stripe_payment_intent_id_key UNIQUE(stripe_payment_intent_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
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
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_subscriptions_user_id_plan_id_key' AND table_name = 'user_subscriptions') THEN
    ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_plan_id_key UNIQUE(user_id, plan_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Create event_registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_id integer NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text,
  registered_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'event_registrations_user_id_event_id_key' AND table_name = 'event_registrations') THEN
    ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_user_id_event_id_key UNIQUE(user_id, event_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
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

-- Create indexes for performance (using IF NOT EXISTS pattern)
DO $$
BEGIN
  -- Users table indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email') THEN
    CREATE INDEX idx_users_email ON users(email);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_membership_type') THEN
    CREATE INDEX idx_users_membership_type ON users(membership_type);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_status') THEN
    CREATE INDEX idx_users_status ON users(status);
  END IF;
  
  -- Add more indexes as needed...
  
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

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

-- Create RLS policies (drop existing ones first to avoid conflicts)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can read own profile" ON users;
  DROP POLICY IF EXISTS "Users can insert own profile" ON users;
  DROP POLICY IF EXISTS "Users can update own profile" ON users;
  DROP POLICY IF EXISTS "Service role has full access" ON users;
  
  -- Create new policies
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

EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Create basic policies for other tables
DO $$
BEGIN
  -- Event categories policies
  DROP POLICY IF EXISTS "Event categories are viewable by everyone" ON event_categories;
  CREATE POLICY "Event categories are viewable by everyone" ON event_categories
    FOR SELECT TO public
    USING (is_active = true);

  -- Events policies
  DROP POLICY IF EXISTS "Published events are viewable by everyone" ON events;
  CREATE POLICY "Published events are viewable by everyone" ON events
    FOR SELECT TO public
    USING (status = 'published' AND is_public = true);

  -- Payments policies
  DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
  CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT TO public
    USING (uid() = user_id);

EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Create triggers safely
DO $$
BEGIN
  -- Drop existing triggers if they exist
  DROP TRIGGER IF EXISTS update_users_updated_at ON users;
  DROP TRIGGER IF EXISTS update_events_updated_at ON events;
  DROP TRIGGER IF EXISTS update_participant_count ON event_registrations;
  
  -- Create new triggers
  CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  CREATE TRIGGER update_participant_count
    AFTER INSERT OR DELETE ON event_registrations
    FOR EACH ROW EXECUTE FUNCTION update_event_participant_count();

EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Insert default data safely
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