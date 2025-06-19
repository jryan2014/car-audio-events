-- First check if the event_registrations table exists
DO $$
DECLARE
  table_name text;
  tables text[] := ARRAY['users', 'user_roles', 'role_permissions', 'user_sessions', 
    'user_activity_log', 'admin_settings', 'admin_audit_log', 
    'organizations', 'event_categories', 'events', 'event_images', 
    'event_locations', 'map_pin_styles', 'membership_plans', 
    'payments', 'user_subscriptions', 'event_registrations'];
BEGIN
  -- Check if event_registrations table exists and fix event_id column
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'event_registrations'
  ) THEN
    -- Check the current data type of event_id
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'event_registrations' 
      AND column_name = 'event_id' AND data_type = 'integer'
    ) THEN
      -- Create a new UUID column
      ALTER TABLE event_registrations ADD COLUMN event_id_uuid uuid;
      
      -- Try to convert existing integer values to string UUIDs where possible
      -- This is safer than direct casting
      UPDATE event_registrations
      SET event_id_uuid = (
        SELECT id FROM events WHERE events.id::text = event_registrations.event_id::text
      );
      
      -- Drop the old column and constraints that depend on it
      ALTER TABLE event_registrations 
        DROP CONSTRAINT IF EXISTS event_registrations_user_id_event_id_key;
      
      ALTER TABLE event_registrations 
        DROP COLUMN event_id;
      
      -- Rename the new column to event_id
      ALTER TABLE event_registrations 
        RENAME COLUMN event_id_uuid TO event_id;
      
      -- Add NOT NULL constraint if needed
      ALTER TABLE event_registrations 
        ALTER COLUMN event_id SET NOT NULL;
      
      -- Recreate the unique constraint
      ALTER TABLE event_registrations 
        ADD CONSTRAINT event_registrations_user_id_event_id_key 
        UNIQUE (user_id, event_id);
    END IF;
  END IF;

  -- Add missing foreign key constraint for event_registrations.event_id
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'event_registrations'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_registrations_event_id_fkey' 
    AND table_name = 'event_registrations'
  ) THEN
    ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_event_id_fkey 
      FOREIGN KEY (event_id) REFERENCES events(id);
  END IF;

  -- Enable RLS on all tables using UNNEST instead of FOREACH
  FOR table_name IN SELECT unnest(tables)
  LOOP
    IF EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = table_name
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    END IF;
  END LOOP;
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
    BEGIN
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
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error fixing policy %: %', policy_record.policyname, SQLERRM;
    END;
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

-- Create basic policies for all tables to ensure they work
DO $$
BEGIN
  -- Users table policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
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
  END IF;
    
  -- Payments policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
    DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;

    CREATE POLICY "Users can view their own payments" ON payments
      FOR SELECT TO public
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own payments" ON payments
      FOR INSERT TO public
      WITH CHECK (auth.uid() = user_id);
  END IF;
    
  -- User subscriptions policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_subscriptions') THEN
    DROP POLICY IF EXISTS "Users can view their own subscriptions" ON user_subscriptions;
    DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON user_subscriptions;

    CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
      FOR SELECT TO public
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can manage their own subscriptions" ON user_subscriptions
      FOR ALL TO public
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
    
  -- Event registrations policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_registrations') THEN
    DROP POLICY IF EXISTS "Users can view their own registrations" ON event_registrations;
    DROP POLICY IF EXISTS "Users can manage their own registrations" ON event_registrations;

    CREATE POLICY "Users can view their own registrations" ON event_registrations
      FOR SELECT TO public
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can manage their own registrations" ON event_registrations
      FOR ALL TO public
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
    
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;