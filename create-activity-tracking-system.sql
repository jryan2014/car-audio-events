-- Activity Tracking System for Admin Dashboard
-- This will capture user actions and administrative changes for the Recent Activity feed

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255), -- Store email in case user is deleted
  user_name VARCHAR(255), -- Store name in case user is deleted
  activity_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);

-- Create RLS policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all activity logs
CREATE POLICY "Admins can read all activity logs" ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  );

-- Allow all authenticated users to insert their own activity logs
CREATE POLICY "Users can insert their own activity logs" ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_activity_type VARCHAR(50),
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  activity_id UUID;
  current_user_data RECORD;
BEGIN
  -- Get current user data or use provided user_id
  IF p_user_id IS NULL THEN
    SELECT id, email, name INTO current_user_data
    FROM users WHERE id = auth.uid();
  ELSE
    SELECT id, email, name INTO current_user_data
    FROM users WHERE id = p_user_id;
  END IF;

  -- Insert activity log
  INSERT INTO activity_logs (
    user_id,
    user_email,
    user_name,
    activity_type,
    description,
    metadata
  ) VALUES (
    current_user_data.id,
    current_user_data.email,
    current_user_data.name,
    p_activity_type,
    p_description,
    p_metadata
  ) RETURNING id INTO activity_id;

  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent activity for admin dashboard
CREATE OR REPLACE FUNCTION get_recent_activity(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  activity_type VARCHAR(50),
  description TEXT,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.activity_type,
    al.description,
    al.user_email,
    al.user_name,
    al.metadata,
    al.created_at
  FROM activity_logs al
  ORDER BY al.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to automatically log user registrations
CREATE OR REPLACE FUNCTION log_user_registration()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_activity(
    'user_registration',
    CASE 
      WHEN NEW.membership_type = 'admin' THEN 'New admin user registered: ' || NEW.email
      WHEN NEW.membership_type = 'organization' THEN 'New organization member registered: ' || NEW.email
      WHEN NEW.membership_type = 'retailer' THEN 'New retailer registered: ' || NEW.email
      WHEN NEW.membership_type = 'manufacturer' THEN 'New manufacturer registered: ' || NEW.email
      ELSE 'New competitor registered: ' || NEW.email
    END,
    jsonb_build_object(
      'membership_type', NEW.membership_type,
      'user_id', NEW.id,
      'registration_source', 'website'
    ),
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user registrations
DROP TRIGGER IF EXISTS trigger_log_user_registration ON users;
CREATE TRIGGER trigger_log_user_registration
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_registration();

-- Trigger function to log event creation
CREATE OR REPLACE FUNCTION log_event_creation()
RETURNS TRIGGER AS $$
DECLARE
  creator_data RECORD;
BEGIN
  -- Get creator information
  SELECT email, name INTO creator_data
  FROM users WHERE id = NEW.created_by;

  PERFORM log_activity(
    'event_created',
    'New event created: ' || NEW.title,
    jsonb_build_object(
      'event_id', NEW.id,
      'event_title', NEW.title,
      'event_date', NEW.date,
      'location', NEW.location,
      'status', NEW.status
    ),
    NEW.created_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for event creation
DROP TRIGGER IF EXISTS trigger_log_event_creation ON events;
CREATE TRIGGER trigger_log_event_creation
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION log_event_creation();

-- Trigger function to log CMS page creation/updates
CREATE OR REPLACE FUNCTION log_cms_page_activity()
RETURNS TRIGGER AS $$
DECLARE
  creator_data RECORD;
  activity_desc TEXT;
BEGIN
  -- Get creator information
  SELECT email, name INTO creator_data
  FROM users WHERE id = COALESCE(NEW.created_by, OLD.created_by);

  IF TG_OP = 'INSERT' THEN
    activity_desc := 'New CMS page created: ' || NEW.title;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      activity_desc := 'CMS page status changed: ' || NEW.title || ' (' || OLD.status || ' → ' || NEW.status || ')';
    ELSE
      activity_desc := 'CMS page updated: ' || NEW.title;
    END IF;
  END IF;

  PERFORM log_activity(
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'cms_page_created'
      ELSE 'cms_page_updated'
    END,
    activity_desc,
    jsonb_build_object(
      'page_id', NEW.id,
      'page_title', NEW.title,
      'page_slug', NEW.slug,
      'status', NEW.status,
      'operation', TG_OP
    ),
    COALESCE(NEW.created_by, OLD.created_by)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for CMS page activity
DROP TRIGGER IF EXISTS trigger_log_cms_page_activity ON cms_pages;
CREATE TRIGGER trigger_log_cms_page_activity
  AFTER INSERT OR UPDATE ON cms_pages
  FOR EACH ROW
  EXECUTE FUNCTION log_cms_page_activity();

-- Insert some sample activity data for demonstration
INSERT INTO activity_logs (user_email, user_name, activity_type, description, metadata, created_at) VALUES
  ('admin@caraudioevents.com', 'System Administrator', 'system_startup', 'Activity tracking system initialized', '{"version": "1.0"}', NOW() - INTERVAL '2 hours'),
  ('admin@caraudioevents.com', 'System Administrator', 'admin_action', 'Navigation Manager accessed', '{"module": "navigation"}', NOW() - INTERVAL '1 hour'),
  ('admin@caraudioevents.com', 'System Administrator', 'admin_action', 'Dashboard statistics refreshed', '{"stats_refreshed": true}', NOW() - INTERVAL '30 minutes'),
  ('admin@caraudioevents.com', 'System Administrator', 'system_maintenance', 'Database cleanup completed', '{"tables_optimized": 5}', NOW() - INTERVAL '15 minutes');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON activity_logs TO authenticated;
GRANT EXECUTE ON FUNCTION log_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_activity TO authenticated;

-- Comments for documentation
COMMENT ON TABLE activity_logs IS 'Stores all user and system activities for audit trail and admin dashboard';
COMMENT ON FUNCTION log_activity IS 'Logs an activity event with user context and metadata';
COMMENT ON FUNCTION get_recent_activity IS 'Retrieves recent activities for admin dashboard display'; 