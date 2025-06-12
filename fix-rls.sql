-- Fix RLS policies for events table to allow coordinate updates
-- CORRECTED VERSION - removes references to non-existent 'created_by' column

-- Drop existing policies
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Events can be inserted by authenticated users" ON events;
DROP POLICY IF EXISTS "Events can be updated by owner" ON events;
DROP POLICY IF EXISTS "Events can be updated by organizer" ON events;
DROP POLICY IF EXISTS "Events can be deleted by owner" ON events;
DROP POLICY IF EXISTS "Anyone can view published approved events" ON events;
DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Admins can update any event" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;
DROP POLICY IF EXISTS "Admins can delete any event" ON events;

-- 1. Allow everyone to view published and approved events
CREATE POLICY "Anyone can view published approved events" ON events
    FOR SELECT USING (
        status = 'published' AND approval_status = 'approved'
    );

-- 2. Allow authenticated users to view their own events
CREATE POLICY "Users can view their own events" ON events
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND organizer_id = auth.uid()
    );

-- 3. Allow authenticated users to insert events
CREATE POLICY "Authenticated users can insert events" ON events
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- 4. Allow users to update their own events (including coordinates)
CREATE POLICY "Users can update their own events" ON events
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND organizer_id = auth.uid()
    ) WITH CHECK (
        auth.uid() IS NOT NULL AND organizer_id = auth.uid()
    );

-- 5. Allow admins to view any event
CREATE POLICY "Admins can view any event" ON events
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role = 'admin'
            )
        )
    );

-- 6. Allow admins to update any event (including coordinates)
CREATE POLICY "Admins can update any event" ON events
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role = 'admin'
            )
        )
    ) WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- 7. Allow users to delete their own events
CREATE POLICY "Users can delete their own events" ON events
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND organizer_id = auth.uid()
    );

-- 8. Allow admins to delete any event
CREATE POLICY "Admins can delete any event" ON events
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role = 'admin'
            )
        )
    );

-- Ensure RLS is enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Fix related tables
DROP POLICY IF EXISTS "Event categories are viewable by everyone" ON event_categories;
CREATE POLICY "Event categories are viewable by everyone" ON event_categories
    FOR SELECT USING (true);

-- Test coordinate update
UPDATE events 
SET 
  latitude = 41.3683,
  longitude = -82.1076
WHERE id = 1;

-- Verify the update
SELECT 
  id, 
  title, 
  latitude, 
  longitude,
  status,
  approval_status,
  organizer_id
FROM events 
WHERE id = 1;
