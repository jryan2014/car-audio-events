/*
  # Event Management Enhancement Migration

  1. New Fields
    - Add pin_color, pin_style, show_organization_logo, is_featured, is_public to events table
  
  2. Performance Indexes
    - Add indexes for better query performance on events table
  
  3. Security Policies
    - Update RLS policies for events, event_registrations, and event_images
    - Ensure proper access control for different user types
  
  4. Participant Count Management
    - Add function and trigger to automatically update participant counts
  
  5. Default Categories
    - Insert default event categories for immediate use
*/

-- Update events table with additional fields for management
ALTER TABLE events ADD COLUMN IF NOT EXISTS pin_color text DEFAULT '#0ea5e9';
ALTER TABLE events ADD COLUMN IF NOT EXISTS pin_style text DEFAULT 'default';
ALTER TABLE events ADD COLUMN IF NOT EXISTS show_organization_logo boolean DEFAULT true;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_approval_status ON events(approval_status);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_organization ON events(organization_id);

-- Update RLS policies for events
DROP POLICY IF EXISTS "Published events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "Event organizers can update their events" ON events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
DROP POLICY IF EXISTS "Admins can view all events" ON events;
DROP POLICY IF EXISTS "Admins can update all events" ON events;

-- New comprehensive policies
CREATE POLICY "Published events are viewable by everyone"
  ON events
  FOR SELECT
  TO public
  USING (status = 'published' AND is_public = true);

CREATE POLICY "Users can view their own events"
  ON events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = organizer_id);

CREATE POLICY "Admins can view all events"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.membership_type = 'admin'
      AND users.status = 'active'
    )
  );

CREATE POLICY "Authenticated users can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Event organizers can update their events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Admins can update all events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.membership_type = 'admin'
      AND users.status = 'active'
    )
  );

CREATE POLICY "Admins can delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.membership_type = 'admin'
      AND users.status = 'active'
    )
  );

-- Update event_registrations policies
DROP POLICY IF EXISTS "Users can manage their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can view their own registrations" ON event_registrations;

CREATE POLICY "Users can manage their own registrations"
  ON event_registrations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Event organizers can view registrations for their events"
  ON event_registrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id::text = event_registrations.event_id::text
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all registrations"
  ON event_registrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.membership_type = 'admin'
      AND users.status = 'active'
    )
  );

-- Update event_images policies
DROP POLICY IF EXISTS "Event images are viewable with events" ON event_images;
DROP POLICY IF EXISTS "Event organizers can manage event images" ON event_images;

CREATE POLICY "Event images are viewable with events"
  ON event_images
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_images.event_id
      AND (
        (events.status = 'published' AND events.is_public = true)
        OR events.organizer_id = auth.uid()
      )
    )
  );

CREATE POLICY "Event organizers can manage event images"
  ON event_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_images.event_id
      AND events.organizer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_images.event_id
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all event images"
  ON event_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.membership_type = 'admin'
      AND users.status = 'active'
    )
  );

-- Function to update event participant count
-- Note: Using explicit type casting to handle UUID/integer mismatch
CREATE OR REPLACE FUNCTION update_event_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events 
    SET current_participants = (
      SELECT COUNT(*) 
      FROM event_registrations 
      WHERE event_registrations.event_id::text = events.id::text
      AND payment_status = 'completed'
    )
    WHERE events.id::text = NEW.event_id::text;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events 
    SET current_participants = (
      SELECT COUNT(*) 
      FROM event_registrations 
      WHERE event_registrations.event_id::text = events.id::text
      AND payment_status = 'completed'
    )
    WHERE events.id::text = OLD.event_id::text;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update for both old and new event if event_id changed
    IF OLD.event_id::text != NEW.event_id::text THEN
      UPDATE events 
      SET current_participants = (
        SELECT COUNT(*) 
        FROM event_registrations 
        WHERE event_registrations.event_id::text = events.id::text
        AND payment_status = 'completed'
      )
      WHERE events.id::text = OLD.event_id::text;
    END IF;
    
    UPDATE events 
    SET current_participants = (
      SELECT COUNT(*) 
      FROM event_registrations 
      WHERE event_registrations.event_id::text = events.id::text
      AND payment_status = 'completed'
    )
    WHERE events.id::text = NEW.event_id::text;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for participant count updates
DROP TRIGGER IF EXISTS update_participant_count ON event_registrations;
CREATE TRIGGER update_participant_count
  AFTER INSERT OR UPDATE OR DELETE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION update_event_participant_count();

-- Insert default event categories if they don't exist
INSERT INTO event_categories (name, description, color, icon, is_active) VALUES
  ('Bass Competition', 'Bass and low-frequency competitions', '#06b6d4', 'speaker', true),
  ('Championship', 'Major championship events and finals', '#ef4444', 'trophy', true),
  ('Competition', 'General car audio competitions', '#f97316', 'trophy', true),
  ('Exhibition', 'Shows and exhibitions', '#6366f1', 'eye', true),
  ('Installation', 'Installation showcases and demos', '#f59e0b', 'wrench', true),
  ('Install Competition', 'Installation competitions and contests', '#8b5cf6', 'wrench', true),
  ('Local Event', 'Regional and local events', '#10b981', 'map-pin', true),
  ('Meet & Greet', 'Community gatherings and social events', '#ec4899', 'users', true),
  ('Sound Quality', 'Sound quality focused competitions', '#8b5cf6', 'music', true),
  ('SPL Competition', 'Sound Pressure Level competitions', '#f97316', 'volume-2', true),
  ('Trade Show', 'Industry trade shows and exhibitions', '#ef4444', 'shopping-bag', true),
  ('Training', 'Educational workshops and training', '#84cc16', 'book-open', true),
  ('Workshop', 'Educational workshops and seminars', '#f59e0b', 'book-open', true)
ON CONFLICT (name) DO NOTHING;