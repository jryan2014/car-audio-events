-- Add missing is_featured column to events table
-- This fixes the error: column events.is_featured does not exist

DO $$
BEGIN
    -- Add is_featured column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'is_featured'
    ) THEN
        ALTER TABLE events ADD COLUMN is_featured BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_featured column to events table';
    ELSE
        RAISE NOTICE 'is_featured column already exists in events table';
    END IF;

    -- Add image_url column if it doesn't exist (for featured event images)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE events ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Added image_url column to events table';
    ELSE
        RAISE NOTICE 'image_url column already exists in events table';
    END IF;
END $$;

-- Create index for better performance on featured events queries
CREATE INDEX IF NOT EXISTS idx_events_is_featured ON events(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_events_featured_published ON events(is_featured, status) WHERE is_featured = true AND status = 'published';

-- Update any existing events to be featured (optional - you can remove this if you don't want any existing events to be featured)
-- UPDATE events SET is_featured = true WHERE status = 'published' LIMIT 3;

COMMENT ON COLUMN events.is_featured IS 'Whether this event should be featured on the home page';
COMMENT ON COLUMN events.image_url IS 'URL to the main image for this event'; 