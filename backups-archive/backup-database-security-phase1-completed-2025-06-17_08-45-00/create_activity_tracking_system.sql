-- Activity Tracking System for Enhanced User Dashboard
-- Phase 3 Step 3A: Activity Feed Foundation
-- Car Audio Competition Platform v1.3.4

-- ================================
-- ACTIVITY TRACKING TABLES
-- ================================

-- Create activity_types table for categorization
CREATE TABLE IF NOT EXISTS public.activity_types (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT, -- Lucide React icon name
    color TEXT DEFAULT '#3B82F6', -- Tailwind color for display
    is_public BOOLEAN DEFAULT true, -- Whether this activity shows in feeds
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_activities table for tracking all user actions
CREATE TABLE IF NOT EXISTS public.user_activities (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type_id BIGINT NOT NULL REFERENCES public.activity_types(id) ON DELETE CASCADE,
    title TEXT NOT NULL, -- Display title for the activity
    description TEXT, -- Optional detailed description
    metadata JSONB DEFAULT '{}', -- Flexible data storage
    entity_type TEXT, -- Type of entity involved (event, business, user, etc.)
    entity_id TEXT, -- ID of the entity involved
    is_public BOOLEAN DEFAULT true, -- Whether this shows in community feeds
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_interactions table for likes, comments, etc.
CREATE TABLE IF NOT EXISTS public.activity_interactions (
    id BIGSERIAL PRIMARY KEY,
    activity_id BIGINT NOT NULL REFERENCES public.user_activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'comment', 'share')),
    content TEXT, -- For comments
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, user_id, interaction_type) -- Prevent duplicate likes
);

-- ================================
-- PERFORMANCE INDEXES
-- ================================

-- User activities indexes
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_type_id ON public.user_activities(activity_type_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_entity ON public.user_activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_public ON public.user_activities(is_public);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_public_date ON public.user_activities(user_id, is_public, created_at DESC);

-- Activity interactions indexes
CREATE INDEX IF NOT EXISTS idx_activity_interactions_activity_id ON public.activity_interactions(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_interactions_user_id ON public.activity_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_interactions_type ON public.activity_interactions(interaction_type);

-- Activity types indexes
CREATE INDEX IF NOT EXISTS idx_activity_types_name ON public.activity_types(name);
CREATE INDEX IF NOT EXISTS idx_activity_types_public ON public.activity_types(is_public);

-- ================================
-- ROW LEVEL SECURITY
-- ================================

-- Enable RLS on all tables
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_interactions ENABLE ROW LEVEL SECURITY;

-- Activity types policies (read-only for users)
CREATE POLICY "Anyone can read activity types" ON public.activity_types
    FOR SELECT
    USING (true);

-- User activities policies
CREATE POLICY "Users can read public activities" ON public.user_activities
    FOR SELECT
    USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can insert their own activities" ON public.user_activities
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own activities" ON public.user_activities
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Activity interactions policies
CREATE POLICY "Users can read all interactions" ON public.activity_interactions
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own interactions" ON public.activity_interactions
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own interactions" ON public.activity_interactions
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own interactions" ON public.activity_interactions
    FOR DELETE
    USING (user_id = auth.uid());

-- ================================
-- HELPER FUNCTIONS
-- ================================

-- Function to create activity with automatic type lookup
CREATE OR REPLACE FUNCTION public.create_user_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id TEXT DEFAULT NULL,
    p_is_public BOOLEAN DEFAULT true
)
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
AS $$
    INSERT INTO public.user_activities (
        user_id, activity_type_id, title, description, 
        metadata, entity_type, entity_id, is_public
    )
    SELECT 
        p_user_id,
        at.id,
        p_title,
        p_description,
        p_metadata,
        p_entity_type,
        p_entity_id,
        p_is_public
    FROM public.activity_types at
    WHERE at.name = p_activity_type
    RETURNING id;
$$;

-- Function to get user activity feed
CREATE OR REPLACE FUNCTION public.get_user_activity_feed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    description TEXT,
    activity_type TEXT,
    activity_icon TEXT,
    activity_color TEXT,
    metadata JSONB,
    entity_type TEXT,
    entity_id TEXT,
    created_at TIMESTAMPTZ,
    user_name TEXT,
    user_image TEXT,
    like_count BIGINT,
    comment_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        ua.id,
        ua.title,
        ua.description,
        at.name as activity_type,
        at.icon as activity_icon,
        at.color as activity_color,
        ua.metadata,
        ua.entity_type,
        ua.entity_id,
        ua.created_at,
        u.name as user_name,
        u.profile_image as user_image,
        COALESCE(likes.count, 0) as like_count,
        COALESCE(comments.count, 0) as comment_count
    FROM public.user_activities ua
    JOIN public.activity_types at ON ua.activity_type_id = at.id
    JOIN public.users u ON ua.user_id = u.id
    LEFT JOIN (
        SELECT activity_id, COUNT(*) as count
        FROM public.activity_interactions
        WHERE interaction_type = 'like'
        GROUP BY activity_id
    ) likes ON ua.id = likes.activity_id
    LEFT JOIN (
        SELECT activity_id, COUNT(*) as count
        FROM public.activity_interactions
        WHERE interaction_type = 'comment'
        GROUP BY activity_id
    ) comments ON ua.id = comments.activity_id
    WHERE ua.user_id = p_user_id AND ua.is_public = true
    ORDER BY ua.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Function to get community activity feed
CREATE OR REPLACE FUNCTION public.get_community_activity_feed(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    description TEXT,
    activity_type TEXT,
    activity_icon TEXT,
    activity_color TEXT,
    metadata JSONB,
    entity_type TEXT,
    entity_id TEXT,
    created_at TIMESTAMPTZ,
    user_name TEXT,
    user_image TEXT,
    like_count BIGINT,
    comment_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        ua.id,
        ua.title,
        ua.description,
        at.name as activity_type,
        at.icon as activity_icon,
        at.color as activity_color,
        ua.metadata,
        ua.entity_type,
        ua.entity_id,
        ua.created_at,
        u.name as user_name,
        u.profile_image as user_image,
        COALESCE(likes.count, 0) as like_count,
        COALESCE(comments.count, 0) as comment_count
    FROM public.user_activities ua
    JOIN public.activity_types at ON ua.activity_type_id = at.id
    JOIN public.users u ON ua.user_id = u.id
    LEFT JOIN (
        SELECT activity_id, COUNT(*) as count
        FROM public.activity_interactions
        WHERE interaction_type = 'like'
        GROUP BY activity_id
    ) likes ON ua.id = likes.activity_id
    LEFT JOIN (
        SELECT activity_id, COUNT(*) as count
        FROM public.activity_interactions
        WHERE interaction_type = 'comment'
        GROUP BY activity_id
    ) comments ON ua.id = comments.activity_id
    WHERE ua.is_public = true AND at.is_public = true
    ORDER BY ua.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- ================================
-- GRANT PERMISSIONS
-- ================================

-- Grant table permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.activity_types TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_interactions TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.create_user_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_activity_feed TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_activity_feed TO anon, authenticated;

-- ================================
-- SEED DATA
-- ================================

-- Insert default activity types
INSERT INTO public.activity_types (name, description, icon, color, is_public) VALUES
('profile_update', 'Updated their profile', 'User', '#3B82F6', true),
('event_registration', 'Registered for an event', 'Calendar', '#10B981', true),
('event_creation', 'Created a new event', 'Plus', '#8B5CF6', true),
('business_listing', 'Added a business listing', 'MapPin', '#F59E0B', true),
('competition_result', 'Competition result posted', 'Trophy', '#EF4444', true),
('team_join', 'Joined a team', 'Users', '#06B6D4', true),
('achievement_unlock', 'Unlocked an achievement', 'Award', '#F97316', true),
('search_performed', 'Performed a search', 'Search', '#6B7280', false),
('login', 'Logged in', 'LogIn', '#6B7280', false),
('content_view', 'Viewed content', 'Eye', '#6B7280', false)
ON CONFLICT (name) DO NOTHING;

-- ================================
-- COMMENTS
-- ================================

COMMENT ON TABLE public.activity_types IS 'Defines types of activities that can be tracked';
COMMENT ON TABLE public.user_activities IS 'Tracks all user activities for activity feeds';
COMMENT ON TABLE public.activity_interactions IS 'Tracks likes, comments, shares on activities';
COMMENT ON FUNCTION public.create_user_activity IS 'Helper function to create activity entries';
COMMENT ON FUNCTION public.get_user_activity_feed IS 'Returns personalized activity feed for a user';
COMMENT ON FUNCTION public.get_community_activity_feed IS 'Returns community-wide activity feed';

-- ================================
-- TRIGGERS FOR UPDATED_AT
-- ================================

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_activities
DROP TRIGGER IF EXISTS update_user_activities_updated_at ON public.user_activities;
CREATE TRIGGER update_user_activities_updated_at
    BEFORE UPDATE ON public.user_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column(); 