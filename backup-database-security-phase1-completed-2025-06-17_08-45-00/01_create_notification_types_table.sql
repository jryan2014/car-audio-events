-- Phase 3 Step 3C: Notification System - Part 1
-- Create notification_types table only
-- Safe incremental update

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

-- Enable RLS
ALTER TABLE public.notification_types ENABLE ROW LEVEL SECURITY;

-- Create policy (read-only for users)
DROP POLICY IF EXISTS "Anyone can read notification types" ON public.notification_types;
CREATE POLICY "Anyone can read notification types" ON public.notification_types
    FOR SELECT
    USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_notification_types_name ON public.notification_types(name);

-- Grant permissions
GRANT SELECT ON public.notification_types TO anon, authenticated;

-- Insert basic notification types (safe upsert)
INSERT INTO public.notification_types (name, description, icon, color, default_enabled) VALUES
('system_announcement', 'System announcements and updates', 'Megaphone', '#3B82F6', true),
('event_reminder', 'Event registration and reminder notifications', 'Calendar', '#10B981', true),
('activity_like', 'Someone liked your activity', 'Heart', '#F59E0B', true),
('activity_comment', 'Someone commented on your activity', 'MessageSquare', '#10B981', true),
('achievement_unlock', 'Achievement and milestone notifications', 'Award', '#F97316', true)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color;

-- Comment
COMMENT ON TABLE public.notification_types IS 'Defines types of notifications available in the system'; 