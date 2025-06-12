-- =============================================================================
-- ADD FEATURED EVENTS SUPPORT
-- =============================================================================

-- Add is_featured column to events table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'is_featured') THEN
        ALTER TABLE events ADD COLUMN is_featured BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_featured column to events table';
    ELSE
        RAISE NOTICE 'is_featured column already exists in events table';
    END IF;
END $$;

-- Add image_url column to events table if it doesn't exist (for featured event images)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'image_url') THEN
        ALTER TABLE events ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Added image_url column to events table';
    ELSE
        RAISE NOTICE 'image_url column already exists in events table';
    END IF;
END $$;

-- Create index for better performance when querying featured events
CREATE INDEX IF NOT EXISTS idx_events_is_featured ON events(is_featured) WHERE is_featured = true;

-- Create index for featured events with status
CREATE INDEX IF NOT EXISTS idx_events_featured_published ON events(is_featured, status) 
WHERE is_featured = true AND status = 'published';

-- Update RLS policies to allow reading featured events
CREATE POLICY IF NOT EXISTS "Allow reading featured events" ON events
    FOR SELECT USING (is_featured = true AND status = 'published');

COMMIT; 