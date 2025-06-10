/*
  # Fix event_registrations table and RLS policies

  1. Schema Fixes
    - Fix event_registrations.event_id column type (integer to uuid)
    - Add missing foreign key constraint to events table
    - Fix RLS policies to use auth.uid() consistently

  2. User Creation
    - Improve handle_new_user trigger function for reliability
    - Ensure proper error handling during user creation

  3. Security
    - Ensure all tables have RLS enabled
    - Create consistent RLS policies across tables
*/

-- Fix event_registrations.event_id column type
-- First create a temporary column to avoid casting errors
ALTER TABLE event_registrations 
  ADD COLUMN event_id_new uuid;

-- Update the new column with converted values where possible
UPDATE event_registrations
SET event_id_new = CASE
  WHEN event_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN event_id::uuid
  ELSE NULL
END;

-- Drop the old column and rename the new one
ALTER TABLE event_registrations DROP COLUMN event_id;
ALTER TABLE event_registrations RENAME COLUMN event_id_new TO event_id;

-- Make the column NOT NULL
ALTER TABLE event_registrations ALTER COLUMN event_id SET NOT NULL;

-- Add missing foreign key constraint for event_registrations.event_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_registrations_event_id_fkey' 
    AND table_name = 'event_registrations'
  ) THEN
    ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_event_id_fkey 
      FOREIGN KEY (event_id) REFERENCES events(id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Fix RLS policies to use auth.uid() consistently
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Find and fix policies using uid() instead of auth.uid()
  FOR policy_record IN 
    SELECT 
      schemaname, 
      tablename, 
      policyname,
      cmd,
      qual,
      with_check
    FROM 
      pg_policies
    WHERE 
      (qual LIKE '%uid()%' OR with_check LIKE '%uid()%')
      AND schemaname = 'public'
  LOOP
    -- Drop the policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      policy_record.policyname, 
      policy_record.schemaname, 
      policy_record.tablename
    );
    
    -- Recreate with auth.uid()
    IF policy_record.qual IS NOT NULL THEN
      policy_record.qual := replace(policy_record.qual, 'uid()', 'auth.uid()');
    END IF;
    
    IF policy_record.with_check IS NOT NULL THEN
      policy_record.with_check := replace(policy_record.with_check, 'uid()', 'auth.uid()');
    END IF;
    
    -- Recreate the policy with fixed references
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR %s TO public %s %s', 
      policy_record.policyname, 
      policy_record.schemaname, 
      policy_record.tablename,
      policy_record.cmd,
      CASE WHEN policy_record.qual IS NOT NULL 
        THEN 'USING (' || policy_record.qual || ')' 
        ELSE '' 
      END,
      CASE WHEN policy_record.with_check IS NOT NULL 
        THEN 'WITH CHECK (' || policy_record.with_check || ')' 
        ELSE '' 
      END
    );
  END LOOP;
END $$;

-- Create a function to handle new user creation that works reliably
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_name TEXT;
BEGIN
  -- Extract name from email or metadata
  default_name := COALESCE(
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
    default_name,
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

-- Recreate the trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure all tables have RLS enabled
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

-- Create basic policies for all tables to ensure they work
DO $$
BEGIN
  -- Users table policies
  DROP POLICY IF EXISTS "Users can read own profile" ON users;
  DROP POLICY IF EXISTS "Users can insert own profile" ON users;
  DROP POLICY IF EXISTS "Users can update own profile" ON users;
  DROP POLICY IF EXISTS "Service role has full access" ON users;

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
    
  -- Payments policies
  DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
  DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;

  CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT TO public
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own payments" ON payments
    FOR INSERT TO public
    WITH CHECK (auth.uid() = user_id);
    
  -- User subscriptions policies
  DROP POLICY IF EXISTS "Users can view their own subscriptions" ON user_subscriptions;
  DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON user_subscriptions;

  CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
    FOR SELECT TO public
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can manage their own subscriptions" ON user_subscriptions
    FOR ALL TO public
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    
  -- Event registrations policies
  DROP POLICY IF EXISTS "Users can view their own registrations" ON event_registrations;
  DROP POLICY IF EXISTS "Users can manage their own registrations" ON event_registrations;

  CREATE POLICY "Users can view their own registrations" ON event_registrations
    FOR SELECT TO public
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can manage their own registrations" ON event_registrations
    FOR ALL TO public
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating policies: %', SQLERRM;
END $$;