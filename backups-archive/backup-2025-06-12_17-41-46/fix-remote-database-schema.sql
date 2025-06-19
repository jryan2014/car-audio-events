-- Fix Remote Database Schema and Relationships
-- This script ensures all tables and relationships exist for event creation

-- 1. Create event_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  color text DEFAULT '#0ea5e9',
  icon text DEFAULT 'calendar',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Ensure events table has proper structure
-- First check if events table exists and has the right columns
DO $$
BEGIN
  -- Add category_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE events ADD COLUMN category_id uuid;
  END IF;
  
  -- Add organizer_id column if it doesn't exist  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'organizer_id'
  ) THEN
    ALTER TABLE events ADD COLUMN organizer_id uuid;
  END IF;
END $$;

-- 3. Add foreign key constraints safely
DO $$
BEGIN
  -- Add foreign key for category_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_category_id_fkey' 
    AND table_name = 'events'
  ) THEN
    ALTER TABLE events ADD CONSTRAINT events_category_id_fkey 
      FOREIGN KEY (category_id) REFERENCES event_categories(id);
  END IF;
  
  -- Add foreign key for organizer_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_organizer_id_fkey' 
    AND table_name = 'events'
  ) THEN
    ALTER TABLE events ADD CONSTRAINT events_organizer_id_fkey 
      FOREIGN KEY (organizer_id) REFERENCES users(id);
  END IF;
END $$;

-- 4. Insert default event categories
INSERT INTO event_categories (name, description, color, icon) VALUES
  ('Bass Competition', 'SPL and bass-focused competitions', '#ff6b35', 'volume-2'),
  ('Sound Quality', 'Audio quality and clarity competitions', '#4ecdc4', 'headphones'),
  ('Championship', 'Major championship events', '#ffd23f', 'trophy'),
  ('Local Show', 'Local car audio shows and meets', '#95e1d3', 'map-pin'),
  ('Installation', 'Installation and build competitions', '#f38ba8', 'wrench')
ON CONFLICT (name) DO NOTHING;

-- 5. Update existing events to have valid category references
-- Set a default category for events that don't have one
UPDATE events 
SET category_id = (SELECT id FROM event_categories WHERE name = 'Local Show' LIMIT 1)
WHERE category_id IS NULL;

-- 6. Enable RLS on event_categories
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for event_categories
DO $$
BEGIN
  -- Public read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'event_categories' AND policyname = 'event_categories_public_read'
  ) THEN
    CREATE POLICY event_categories_public_read ON event_categories
      FOR SELECT USING (true);
  END IF;
  
  -- Admin full access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'event_categories' AND policyname = 'event_categories_admin_all'
  ) THEN
    CREATE POLICY event_categories_admin_all ON event_categories
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.membership_type = 'admin'
        )
      );
  END IF;
END $$;

-- 8. Verify the setup
SELECT 'Event Categories:' as section;
SELECT id, name, description FROM event_categories ORDER BY name;

SELECT 'Events Table Structure Check:' as section;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND column_name IN ('id', 'title', 'category_id', 'organizer_id', 'organization_id')
ORDER BY ordinal_position;

SELECT 'Foreign Key Constraints:' as section;
SELECT 
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'events' 
  AND constraint_type = 'FOREIGN KEY';

-- 9. Test query that was failing
SELECT 'Test Query (should work now):' as section;
SELECT 
  e.id,
  e.title,
  ec.name as category_name
FROM events e
LEFT JOIN event_categories ec ON e.category_id = ec.id
LIMIT 5;

-- First, let's add any missing columns to the events table
DO $$ 
BEGIN
    -- Add approval_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'approval_status') THEN
        ALTER TABLE events ADD COLUMN approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
    END IF;
    
    -- Add rejection_reason column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'rejection_reason') THEN
        ALTER TABLE events ADD COLUMN rejection_reason TEXT;
    END IF;
    
    -- Add current_participants column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'current_participants') THEN
        ALTER TABLE events ADD COLUMN current_participants INTEGER DEFAULT 0;
    END IF;
    
    -- Add category_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'category_id') THEN
        ALTER TABLE events ADD COLUMN category_id UUID;
    END IF;
    
    -- Add organizer_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'organizer_id') THEN
        ALTER TABLE events ADD COLUMN organizer_id UUID;
    END IF;
    
    -- Add early_bird_deadline column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'early_bird_deadline') THEN
        ALTER TABLE events ADD COLUMN early_bird_deadline TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add early_bird_fee column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'early_bird_fee') THEN
        ALTER TABLE events ADD COLUMN early_bird_fee DECIMAL(10,2);
    END IF;
    
    -- Add registration_deadline column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'registration_deadline') THEN
        ALTER TABLE events ADD COLUMN registration_deadline TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add rules column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'rules') THEN
        ALTER TABLE events ADD COLUMN rules TEXT;
    END IF;
    
    -- Add prizes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'prizes') THEN
        ALTER TABLE events ADD COLUMN prizes JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add schedule column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'schedule') THEN
        ALTER TABLE events ADD COLUMN schedule JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add sponsors column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'sponsors') THEN
        ALTER TABLE events ADD COLUMN sponsors JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add is_public column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'is_public') THEN
        ALTER TABLE events ADD COLUMN is_public BOOLEAN DEFAULT true;
    END IF;
    
    -- Add contact_phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'contact_phone') THEN
        ALTER TABLE events ADD COLUMN contact_phone TEXT;
    END IF;
    
    -- Add contact_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'contact_email') THEN
        ALTER TABLE events ADD COLUMN contact_email TEXT;
    END IF;
    
    -- Add website_url column if it doesn't exist (some forms use this instead of website)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'website_url') THEN
        ALTER TABLE events ADD COLUMN website_url TEXT;
    END IF;
    
    -- Add zip_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'zip_code') THEN
        ALTER TABLE events ADD COLUMN zip_code TEXT;
    END IF;
    
    -- Ensure ticket_price exists (some forms use registration_fee, others use ticket_price)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'ticket_price') THEN
        ALTER TABLE events ADD COLUMN ticket_price DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Ensure registration_fee exists 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'registration_fee') THEN
        ALTER TABLE events ADD COLUMN registration_fee DECIMAL(10,2) DEFAULT 0;
    END IF;
    
END $$;

-- Create event_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'calendar',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default event categories if they don't exist
INSERT INTO event_categories (name, description, color, icon) 
VALUES 
    ('Bass Competition', 'SPL and bass-focused competitions', '#ef4444', 'volume-2'),
    ('Sound Quality', 'Audio quality and clarity competitions', '#10b981', 'headphones'),
    ('Championship', 'Major championship events', '#f59e0b', 'trophy'),
    ('Local Show', 'Local car audio shows and meets', '#6366f1', 'map-pin'),
    ('Installation', 'Installation and build competitions', '#8b5cf6', 'wrench')
ON CONFLICT (name) DO NOTHING;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add foreign key for category_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'events_category_id_fkey') THEN
        ALTER TABLE events ADD CONSTRAINT events_category_id_fkey 
        FOREIGN KEY (category_id) REFERENCES event_categories(id);
    END IF;
    
    -- Add foreign key for organizer_id (assuming users table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'events_organizer_id_fkey') THEN
            ALTER TABLE events ADD CONSTRAINT events_organizer_id_fkey 
            FOREIGN KEY (organizer_id) REFERENCES users(id);
        END IF;
    END IF;
END $$;

-- Enable RLS on event_categories
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for event_categories
DROP POLICY IF EXISTS "Public read access for event_categories" ON event_categories;
CREATE POLICY "Public read access for event_categories" ON event_categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin full access for event_categories" ON event_categories;
CREATE POLICY "Admin full access for event_categories" ON event_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- Update existing events to have valid category references
DO $$
DECLARE
    default_category_id UUID;
BEGIN
    -- Get the first category ID
    SELECT id INTO default_category_id FROM event_categories LIMIT 1;
    
    -- Update events without category_id
    IF default_category_id IS NOT NULL THEN
        UPDATE events 
        SET category_id = default_category_id 
        WHERE category_id IS NULL;
        
        -- Set default approval_status for existing events
        UPDATE events 
        SET approval_status = 'pending' 
        WHERE approval_status IS NULL;
    END IF;
END $$;

-- Test the relationship query that was failing
SELECT 'Testing event_categories relationship...' as status;

-- This should work now
SELECT e.id, e.title, ec.name as category_name
FROM events e
LEFT JOIN event_categories ec ON e.category_id = ec.id
LIMIT 1;

SELECT 'Schema fix completed successfully!' as result; 