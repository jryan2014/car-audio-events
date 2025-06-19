-- Notification System for Enhanced User Dashboard
-- Phase 3 Step 3C: Notification Center Implementation
-- Car Audio Competition Platform v1.3.4

-- ================================
-- NOTIFICATION SYSTEM TABLES
-- ================================

-- Create notification_types table for categorization
CREATE TABLE IF NOT EXISTS public.notification_types (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT, -- Lucide React icon name
    color TEXT DEFAULT '#3B82F6', -- Display color
    default_enabled BOOLEAN DEFAULT true, -- Default user preference
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_notifications table for all notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type_id BIGINT NOT NULL REFERENCES public.notification_types(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT, -- URL to navigate when clicked
    metadata JSONB DEFAULT '{}', -- Additional data
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5), -- 1=low, 5=urgent
    scheduled_for TIMESTAMPTZ, -- For scheduled notifications
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- Auto-expire notifications
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notification_preferences table for user settings
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type_id BIGINT NOT NULL REFERENCES public.notification_types(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    quiet_hours_start TIME, -- Time to start quiet hours
    quiet_hours_end TIME, -- Time to end quiet hours
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, notification_type_id)
);

-- Create notification_delivery_log for tracking
CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
    id BIGSERIAL PRIMARY KEY,
    notification_id BIGINT NOT NULL REFERENCES public.user_notifications(id) ON DELETE CASCADE,
    delivery_type TEXT NOT NULL CHECK (delivery_type IN ('in_app', 'email', 'push')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    delivered_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- PERFORMANCE INDEXES
-- ================================

-- User notifications indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_sent_at ON public.user_notifications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type_id ON public.user_notifications(notification_type_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_priority ON public.user_notifications(priority DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread_user ON public.user_notifications(user_id, is_read, sent_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_user_notifications_expires ON public.user_notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Notification preferences indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type_id ON public.notification_preferences(notification_type_id);

-- Delivery log indexes
CREATE INDEX IF NOT EXISTS idx_notification_delivery_notification_id ON public.notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_status ON public.notification_delivery_log(status, created_at);

-- Notification types indexes
CREATE INDEX IF NOT EXISTS idx_notification_types_name ON public.notification_types(name);

-- ================================
-- ROW LEVEL SECURITY
-- ================================

-- Enable RLS on all tables
ALTER TABLE public.notification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Notification types policies (read-only for users)
CREATE POLICY "Anyone can read notification types" ON public.notification_types
    FOR SELECT
    USING (true);

-- User notifications policies
CREATE POLICY "Users can read their own notifications" ON public.user_notifications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.user_notifications
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Notification preferences policies
CREATE POLICY "Users can manage their own preferences" ON public.notification_preferences
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Delivery log policies (read-only for users)
CREATE POLICY "Users can read delivery logs for their notifications" ON public.notification_delivery_log
    FOR SELECT
    USING (
        notification_id IN (
            SELECT id FROM public.user_notifications WHERE user_id = auth.uid()
        )
    );

-- ================================
-- HELPER FUNCTIONS
-- ================================

-- Function to create notification with automatic type lookup
DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_notification_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_priority INTEGER DEFAULT 1,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_id BIGINT;
BEGIN
    INSERT INTO public.user_notifications (
        user_id, notification_type_id, title, message,
        action_url, metadata, priority, expires_at
    )
    SELECT 
        p_user_id,
        nt.id,
        p_title,
        p_message,
        p_action_url,
        p_metadata,
        p_priority,
        p_expires_at
    FROM public.notification_types nt
    WHERE nt.name = p_notification_type
    RETURNING id INTO result_id;
    
    RETURN result_id;
END;
$$;

-- Function to get user notifications with preferences
DROP FUNCTION IF EXISTS public.get_user_notifications(UUID, BOOLEAN, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_user_notifications(
    p_user_id UUID,
    p_unread_only BOOLEAN DEFAULT false,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    message TEXT,
    action_url TEXT,
    metadata JSONB,
    is_read BOOLEAN,
    priority INTEGER,
    sent_at TIMESTAMPTZ,
    notification_type TEXT,
    notification_icon TEXT,
    notification_color TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        un.id,
        un.title,
        un.message,
        un.action_url,
        un.metadata,
        un.is_read,
        un.priority,
        un.sent_at,
        nt.name as notification_type,
        nt.icon as notification_icon,
        nt.color as notification_color
    FROM public.user_notifications un
    JOIN public.notification_types nt ON un.notification_type_id = nt.id
    WHERE un.user_id = p_user_id
        AND (NOT p_unread_only OR un.is_read = false)
        AND (un.expires_at IS NULL OR un.expires_at > NOW())
        AND un.is_dismissed = false
    ORDER BY un.priority DESC, un.sent_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Function to mark notification as read  
DROP FUNCTION IF EXISTS public.mark_notification_read(BIGINT, UUID);
CREATE OR REPLACE FUNCTION public.mark_notification_read(
    p_notification_id BIGINT,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_notifications
    SET is_read = true, read_at = NOW()
    WHERE id = p_notification_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

-- Function to mark all notifications as read
DROP FUNCTION IF EXISTS public.mark_all_notifications_read(UUID);
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
    WITH updated AS (
        UPDATE public.user_notifications
        SET is_read = true, read_at = NOW()
        WHERE user_id = p_user_id AND is_read = false
        RETURNING id
    )
    SELECT COUNT(*)::INTEGER FROM updated;
$$;

-- Function to get unread notification count
DROP FUNCTION IF EXISTS public.get_unread_notification_count(UUID);
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.user_notifications
    WHERE user_id = p_user_id 
        AND is_read = false 
        AND is_dismissed = false
        AND (expires_at IS NULL OR expires_at > NOW());
$$;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
    WITH deleted AS (
        DELETE FROM public.user_notifications
        WHERE expires_at < NOW()
        RETURNING id
    )
    SELECT COUNT(*)::INTEGER FROM deleted;
$$;

-- ================================
-- GRANT PERMISSIONS
-- ================================

-- Grant table permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.notification_types TO anon, authenticated;
GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT ALL ON public.notification_preferences TO authenticated;
GRANT SELECT ON public.notification_delivery_log TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO authenticated;

-- ================================
-- SEED DATA
-- ================================

-- Insert notification types
INSERT INTO public.notification_types (name, description, icon, color, default_enabled) VALUES
('system_announcement', 'System announcements and updates', 'Megaphone', '#3B82F6', true),
('event_reminder', 'Event registration and reminder notifications', 'Calendar', '#10B981', true),
('competition_result', 'Competition results and rankings', 'Trophy', '#EF4444', true),
('team_invitation', 'Team invitations and updates', 'Users', '#8B5CF6', true),
('message_received', 'Direct messages and communications', 'MessageCircle', '#06B6D4', true),
('activity_like', 'Someone liked your activity', 'Heart', '#F59E0B', true),
('activity_comment', 'Someone commented on your activity', 'MessageSquare', '#10B981', true),
('profile_view', 'Someone viewed your profile', 'Eye', '#6B7280', false),
('achievement_unlock', 'Achievement and milestone notifications', 'Award', '#F97316', true),
('business_update', 'Business listing updates and approvals', 'MapPin', '#84CC16', true)
ON CONFLICT (name) DO NOTHING;

-- ================================
-- TRIGGERS & AUTOMATION
-- ================================

-- Trigger to update updated_at on notification preferences
CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notification_preferences_updated_at();

-- Function to automatically create default preferences for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id, notification_type_id, enabled, email_enabled, push_enabled)
    SELECT 
        NEW.id,
        nt.id,
        nt.default_enabled,
        false, -- Email disabled by default
        nt.default_enabled
    FROM public.notification_types nt
    ON CONFLICT (user_id, notification_type_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger would be created on auth.users table if we had access
-- For now, we'll handle this in the application layer

-- ================================
-- COMMENTS
-- ================================

COMMENT ON TABLE public.notification_types IS 'Defines types of notifications available in the system';
COMMENT ON TABLE public.user_notifications IS 'Stores all user notifications';
COMMENT ON TABLE public.notification_preferences IS 'User preferences for notification delivery';
COMMENT ON TABLE public.notification_delivery_log IS 'Log of notification delivery attempts';

COMMENT ON FUNCTION public.create_notification IS 'Create a new notification for a user';
COMMENT ON FUNCTION public.get_user_notifications IS 'Retrieve notifications for a user with filtering';
COMMENT ON FUNCTION public.mark_notification_read IS 'Mark a specific notification as read';
COMMENT ON FUNCTION public.mark_all_notifications_read IS 'Mark all notifications as read for a user';
COMMENT ON FUNCTION public.get_unread_notification_count IS 'Get count of unread notifications for a user';
COMMENT ON FUNCTION public.cleanup_expired_notifications IS 'Remove expired notifications from the system'; 