-- Fix RLS policies for events table to allow coordinate updates
-- This will allow the application to update latitude/longitude fields
-- CORRECTED VERSION - removes references to non-existent 'created_by' column

-- First, let's see what RLS policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'events';

-- Drop existing restrictive policies if they exist
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

-- Create comprehensive RLS policies for events table
-- 1. Allow everyone to view published and approved events
CREATE POLICY "Anyone can view published approved events" ON events
    FOR SELECT USING (
        status = 'published' AND approval_status = 'approved'
    );

-- 2. Allow authenticated users to view all their own events (by organizer_id only)
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

-- Ensure RLS is enabled on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Also check and fix RLS on related tables
-- Event categories should be viewable by everyone
DROP POLICY IF EXISTS "Event categories are viewable by everyone" ON event_categories;
CREATE POLICY "Event categories are viewable by everyone" ON event_categories
    FOR SELECT USING (true);

-- Users table policies (for admin checks)
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Test the coordinate update after fixing policies
-- This should now work from the application
UPDATE events 
SET 
  latitude = 41.3683,
  longitude = -82.1076
WHERE id = 1;

-- Verify the update worked
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

-- Show the final RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('events', 'event_categories', 'users')
ORDER BY tablename, policyname; 