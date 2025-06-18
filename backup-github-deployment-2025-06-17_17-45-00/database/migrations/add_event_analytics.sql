-- =============================================================================
-- EVENT ANALYTICS & TRACKING SYSTEM
-- =============================================================================

-- Event Favorites Table
CREATE TABLE IF NOT EXISTS event_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Event Attendance Table
CREATE TABLE IF NOT EXISTS event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  attendance_status text DEFAULT 'registered' CHECK (attendance_status IN ('registered', 'attended', 'no_show', 'cancelled')),
  registration_date timestamptz DEFAULT now(),
  attendance_confirmed_at timestamptz,
  scores jsonb DEFAULT '{}', -- Store competition scores
  placement integer, -- Final placement in competition
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Event Analytics Table
CREATE TABLE IF NOT EXISTS event_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  metric_type text NOT NULL CHECK (metric_type IN ('view', 'favorite', 'registration', 'attendance', 'share')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet,
  user_agent text,
  referrer text,
  session_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Ad Placements Table
CREATE TABLE IF NOT EXISTS ad_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location text NOT NULL, -- 'header', 'sidebar', 'footer', 'event_detail', 'event_list', etc.
  dimensions text, -- '300x250', '728x90', etc.
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Advertisements Table
CREATE TABLE IF NOT EXISTS advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  placement_id uuid NOT NULL REFERENCES ad_placements(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  link_url text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'paused', 'expired', 'rejected')),
  priority integer DEFAULT 1,
  click_count integer DEFAULT 0,
  impression_count integer DEFAULT 0,
  budget_amount numeric(10,2),
  cost_per_click numeric(10,2),
  cost_per_impression numeric(10,2),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ad Impressions & Clicks Tracking
CREATE TABLE IF NOT EXISTS ad_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id uuid NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  interaction_type text NOT NULL CHECK (interaction_type IN ('impression', 'click')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet,
  user_agent text,
  referrer text,
  created_at timestamptz DEFAULT now()
);

-- CMS Pages Table for Admin-Created Pages
CREATE TABLE IF NOT EXISTS cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  meta_title text,
  meta_description text,
  meta_keywords text[],
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_featured boolean DEFAULT false,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_event_favorites_user_id ON event_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_event_favorites_event_id ON event_favorites(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_user_id ON event_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_event_id ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_status ON event_attendance(attendance_status);
CREATE INDEX IF NOT EXISTS idx_event_analytics_event_id ON event_analytics(event_id);
CREATE INDEX IF NOT EXISTS idx_event_analytics_metric_type ON event_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_event_analytics_created_at ON event_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_advertisements_advertiser_id ON advertisements(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_placement_id ON advertisements(placement_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_status ON advertisements(status);
CREATE INDEX IF NOT EXISTS idx_advertisements_dates ON advertisements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ad_interactions_advertisement_id ON ad_interactions(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages(status);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Event Favorites Policies
ALTER TABLE event_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorites" ON event_favorites
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Event organizers can view favorites for their events" ON event_favorites
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_favorites.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Event Attendance Policies
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own attendance" ON event_attendance
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Event organizers can manage attendance for their events" ON event_attendance
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_attendance.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Event Analytics Policies
ALTER TABLE event_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event organizers can view analytics for their events" ON event_analytics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_analytics.event_id
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all analytics" ON event_analytics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.membership_type = 'admin'
      AND users.status = 'active'
    )
  );

-- Advertisement Policies
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers can manage their own ads" ON advertisements
  FOR ALL TO authenticated
  USING (auth.uid() = advertiser_id)
  WITH CHECK (auth.uid() = advertiser_id);

CREATE POLICY "Active ads are viewable by everyone" ON advertisements
  FOR SELECT TO public
  USING (status = 'active' AND start_date <= now() AND end_date >= now());

-- CMS Pages Policies
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published pages are viewable by everyone" ON cms_pages
  FOR SELECT TO public
  USING (status = 'published');

CREATE POLICY "Admins can manage all pages" ON cms_pages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.membership_type = 'admin'
      AND users.status = 'active'
    )
  );

-- =============================================================================
-- FUNCTIONS FOR ANALYTICS
-- =============================================================================

-- Function to update event favorites count
CREATE OR REPLACE FUNCTION update_event_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events 
    SET metadata = jsonb_set(
      COALESCE(metadata, '{}'),
      '{favorites_count}',
      (
        SELECT to_jsonb(COUNT(*))
        FROM event_favorites 
        WHERE event_id = NEW.event_id
      )
    )
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events 
    SET metadata = jsonb_set(
      COALESCE(metadata, '{}'),
      '{favorites_count}',
      (
        SELECT to_jsonb(COUNT(*))
        FROM event_favorites 
        WHERE event_id = OLD.event_id
      )
    )
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update event attendance count
CREATE OR REPLACE FUNCTION update_event_attendance_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE events 
    SET metadata = jsonb_set(
      COALESCE(metadata, '{}'),
      '{attendance_count}',
      (
        SELECT to_jsonb(COUNT(*))
        FROM event_attendance 
        WHERE event_id = NEW.event_id 
        AND attendance_status = 'attended'
      )
    )
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events 
    SET metadata = jsonb_set(
      COALESCE(metadata, '{}'),
      '{attendance_count}',
      (
        SELECT to_jsonb(COUNT(*))
        FROM event_attendance 
        WHERE event_id = OLD.event_id 
        AND attendance_status = 'attended'
      )
    )
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger for favorites count
DROP TRIGGER IF EXISTS update_favorites_count ON event_favorites;
CREATE TRIGGER update_favorites_count
  AFTER INSERT OR DELETE ON event_favorites
  FOR EACH ROW EXECUTE FUNCTION update_event_favorites_count();

-- Trigger for attendance count
DROP TRIGGER IF EXISTS update_attendance_count ON event_attendance;
CREATE TRIGGER update_attendance_count
  AFTER INSERT OR UPDATE OR DELETE ON event_attendance
  FOR EACH ROW EXECUTE FUNCTION update_event_attendance_count();

-- =============================================================================
-- SAMPLE DATA
-- =============================================================================

-- Insert default ad placements
INSERT INTO ad_placements (name, description, location, dimensions) VALUES
  ('Header Banner', 'Top of page banner ad', 'header', '728x90'),
  ('Sidebar Rectangle', 'Right sidebar ad space', 'sidebar', '300x250'),
  ('Event Detail Banner', 'Banner on event detail pages', 'event_detail', '728x90'),
  ('Event List Sponsored', 'Sponsored event in event listings', 'event_list', '300x100'),
  ('Footer Banner', 'Bottom of page banner', 'footer', '728x90'),
  ('Mobile Banner', 'Mobile-optimized banner', 'mobile', '320x50')
ON CONFLICT DO NOTHING;

-- Insert default CMS pages
INSERT INTO cms_pages (title, slug, content, meta_title, meta_description, author_id, status, published_at) VALUES
  ('Privacy Policy', 'privacy-policy', 
   '<h1>Privacy Policy</h1><p>Your privacy is important to us. This policy explains how we collect, use, and protect your information...</p>',
   'Privacy Policy - Car Audio Events',
   'Learn about how we protect your privacy and handle your personal information.',
   (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1),
   'published',
   now()
  ),
  ('Terms of Service', 'terms-of-service',
   '<h1>Terms of Service</h1><p>By using our platform, you agree to these terms and conditions...</p>',
   'Terms of Service - Car Audio Events',
   'Read our terms of service and user agreement.',
   (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1),
   'published',
   now()
  ),
  ('About Us', 'about',
   '<h1>About Car Audio Events</h1><p>We are the premier platform for car audio competitions and events...</p>',
   'About Us - Car Audio Events Platform',
   'Learn about our mission to connect the car audio community.',
   (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1),
   'published',
   now()
  )
ON CONFLICT (slug) DO NOTHING; 