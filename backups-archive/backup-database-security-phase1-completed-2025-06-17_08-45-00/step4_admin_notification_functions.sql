-- STEP 4: Admin Notification Management Functions
-- These functions allow admins to create and manage notifications

-- Function 1: Send notification to a specific user
CREATE OR REPLACE FUNCTION admin_send_notification_to_user(
    target_user_id UUID,
    notification_type_name TEXT,
    notification_title TEXT,
    notification_message TEXT,
    action_url TEXT DEFAULT NULL,
    notification_metadata JSONB DEFAULT '{}'::JSONB,
    notification_priority INTEGER DEFAULT 3,
    expires_in_days INTEGER DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    type_id BIGINT;
    new_notification_id BIGINT;
    expires_at TIMESTAMPTZ;
BEGIN
    -- Get notification type ID
    SELECT id INTO type_id 
    FROM public.notification_types 
    WHERE name = notification_type_name;
    
    IF type_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid notification type: ' || notification_type_name
        );
    END IF;
    
    -- Calculate expiration date
    IF expires_in_days IS NOT NULL THEN
        expires_at := NOW() + (expires_in_days || ' days')::INTERVAL;
    END IF;
    
    -- Create the notification
    INSERT INTO public.user_notifications (
        user_id, notification_type_id, title, message, action_url,
        metadata, priority, expires_at, sent_at
    ) VALUES (
        target_user_id, type_id, notification_title, notification_message, action_url,
        notification_metadata, notification_priority, expires_at, NOW()
    ) RETURNING id INTO new_notification_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'notification_id', new_notification_id,
        'message', 'Notification sent successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Function 2: Send notification to all users
CREATE OR REPLACE FUNCTION admin_send_notification_to_all_users(
    notification_type_name TEXT,
    notification_title TEXT,
    notification_message TEXT,
    action_url TEXT DEFAULT NULL,
    notification_metadata JSONB DEFAULT '{}'::JSONB,
    notification_priority INTEGER DEFAULT 3,
    expires_in_days INTEGER DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    type_id BIGINT;
    user_count INTEGER := 0;
    expires_at TIMESTAMPTZ;
BEGIN
    -- Get notification type ID
    SELECT id INTO type_id 
    FROM public.notification_types 
    WHERE name = notification_type_name;
    
    IF type_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid notification type: ' || notification_type_name
        );
    END IF;
    
    -- Calculate expiration date
    IF expires_in_days IS NOT NULL THEN
        expires_at := NOW() + (expires_in_days || ' days')::INTERVAL;
    END IF;
    
    -- Create notifications for all users
    INSERT INTO public.user_notifications (
        user_id, notification_type_id, title, message, action_url,
        metadata, priority, expires_at, sent_at
    )
    SELECT 
        u.id, type_id, notification_title, notification_message, action_url,
        notification_metadata, notification_priority, expires_at, NOW()
    FROM auth.users u;
    
    GET DIAGNOSTICS user_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'users_notified', user_count,
        'message', 'Notifications sent to ' || user_count || ' users'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Function 3: Get notification statistics for admin dashboard
CREATE OR REPLACE FUNCTION admin_get_notification_stats()
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_notifications', COUNT(*),
        'unread_notifications', COUNT(*) FILTER (WHERE is_read = false),
        'read_notifications', COUNT(*) FILTER (WHERE is_read = true),
        'notifications_last_24h', COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '24 hours'),
        'notifications_last_7d', COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '7 days'),
        'by_type', (
            SELECT jsonb_object_agg(
                nt.name, 
                COUNT(un.*)
            )
            FROM public.notification_types nt
            LEFT JOIN public.user_notifications un ON nt.id = un.notification_type_id
            GROUP BY nt.name
        )
    ) INTO stats
    FROM public.user_notifications;
    
    RETURN stats;
END;
$$;

-- Test the admin functions
SELECT 'Admin functions created successfully!' as result; 