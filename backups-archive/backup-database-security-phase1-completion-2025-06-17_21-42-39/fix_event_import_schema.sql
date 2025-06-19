-- =============================================================================
-- FIX EVENT IMPORT SCHEMA
-- This script ensures the events table has all necessary fields for web scraping
-- =============================================================================

-- Check if created_by column exists and add it if missing
DO $$
BEGIN
  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE events ADD COLUMN created_by uuid REFERENCES auth.users(id);
    RAISE NOTICE 'Added created_by column to events table';
  ELSE
    RAISE NOTICE 'created_by column already exists in events table';
  END IF;

  -- Ensure organizer_id column exists and is uuid type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'organizer_id'
  ) THEN
    ALTER TABLE events ADD COLUMN organizer_id uuid REFERENCES auth.users(id);
    RAISE NOTICE 'Added organizer_id column to events table';
  ELSE
    RAISE NOTICE 'organizer_id column already exists in events table';
  END IF;

  -- Ensure approval_status column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE events ADD COLUMN approval_status text DEFAULT 'pending';
    RAISE NOTICE 'Added approval_status column to events table';
  ELSE
    RAISE NOTICE 'approval_status column already exists in events table';
  END IF;

  -- Ensure category_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE events ADD COLUMN category_id uuid;
    RAISE NOTICE 'Added category_id column to events table';
  ELSE
    RAISE NOTICE 'category_id column already exists in events table';
  END IF;

  -- Ensure website_url column exists (might be called website)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'website_url'
  ) THEN
    -- Check if website column exists and rename it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'events' AND column_name = 'website'
    ) THEN
      -- Add website_url as alias or copy data
      ALTER TABLE events ADD COLUMN website_url text;
      UPDATE events SET website_url = website WHERE website IS NOT NULL;
      RAISE NOTICE 'Added website_url column and copied data from website column';
    ELSE
      ALTER TABLE events ADD COLUMN website_url text;
      RAISE NOTICE 'Added website_url column to events table';
    END IF;
  ELSE
    RAISE NOTICE 'website_url column already exists in events table';
  END IF;

END $$;

-- Update RLS policies for events table to allow imports
DROP POLICY IF EXISTS "Events import access" ON events;
CREATE POLICY "Events import access" ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Allow all authenticated users to import events

-- Add a policy for imported events viewing
DROP POLICY IF EXISTS "View imported events" ON events;
CREATE POLICY "View imported events" ON events
  FOR SELECT
  TO authenticated
  USING (true); -- Allow viewing all events for authenticated users

-- Show current events table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position; 