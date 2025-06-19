-- Phase 3 Step 3C: Notification System - Part 3 (FIXED)
-- Create helper functions for notification management
-- Fixed version with explicit type casting

-- ================================
-- HELPER FUNCTIONS (FIXED VERSION)
-- ================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TIMESTAMPTZ);

-- Function to create notification with automatic type lookup (FIXED)
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_notification_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB,
    p_priority INTEGER DEFAULT 1,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_id BIGINT;
    type_id BIGINT;
BEGIN
    -- First, get the notification type ID
    SELECT id INTO type_id 
    FROM public.notification_types 
    WHERE name = p_notification_type;
    
    -- Check if notification type exists
    IF type_id IS NULL THEN
        RAISE EXCEPTION 'Notification type % does not exist', p_notification_type;
    END IF;
    
    -- Insert the notification
    INSERT INTO public.user_notifications (
        user_id, 
        notification_type_id, 
        title, 
        message,
        action_url, 
        metadata, 
        priority, 
        expires_at
    )
    VALUES (
        p_user_id,
        type_id,
        p_title,
        p_message,
        p_action_url,
        p_metadata,
        p_priority,
        p_expires_at
    )
    RETURNING id INTO result_id;
    
    RETURN result_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating notification: %', SQLERRM;
END;
$$;

-- Function to get user notifications with type information (FIXED)
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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
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
    ORDER BY un.sent_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Function to mark notification as read (FIXED)
DROP FUNCTION IF EXISTS public.mark_notification_read(BIGINT, UUID);
CREATE OR REPLACE FUNCTION public.mark_notification_read(
    p_notification_id BIGINT,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    UPDATE public.user_notifications 
    SET is_read = true, read_at = NOW()
    WHERE id = p_notification_id 
      AND user_id = p_user_id
      AND is_read = false;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
END;
$$;

-- Function to mark all notifications as read (FIXED)
DROP FUNCTION IF EXISTS public.mark_all_notifications_read(UUID);
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE public.user_notifications 
    SET is_read = true, read_at = NOW()
    WHERE user_id = p_user_id 
      AND is_read = false;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$;

-- Function to get unread notification count (FIXED)
DROP FUNCTION IF EXISTS public.get_unread_notification_count(UUID);
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM public.user_notifications
    WHERE user_id = p_user_id 
      AND is_read = false
      AND is_dismissed = false
      AND (expires_at IS NULL OR expires_at > NOW());
      
    RETURN COALESCE(unread_count, 0);
END;
$$;

-- Function to dismiss notification (FIXED)
DROP FUNCTION IF EXISTS public.dismiss_notification(BIGINT, UUID);
CREATE OR REPLACE FUNCTION public.dismiss_notification(
    p_notification_id BIGINT,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    UPDATE public.user_notifications 
    SET is_dismissed = true
    WHERE id = p_notification_id 
      AND user_id = p_user_id;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_notifications(UUID, BOOLEAN, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(BIGINT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_notification(BIGINT, UUID) TO authenticated;

-- Test the function exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'create_notification' 
        AND pg_catalog.pg_function_is_visible(oid)
    ) THEN
        RAISE NOTICE 'SUCCESS: create_notification function created successfully';
    ELSE
        RAISE NOTICE 'ERROR: create_notification function was not created';
    END IF;
END $$; 