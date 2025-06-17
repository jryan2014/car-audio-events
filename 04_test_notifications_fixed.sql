-- Phase 3 Step 3C: Notification System - Part 4 (FIXED)
-- Test notifications for demonstration (FIXED VERSION)
-- Safe test data with explicit type casting

-- ================================
-- TEST NOTIFICATION DATA (FIXED)
-- ================================

-- Simple test to create notifications directly
DO $$
DECLARE
    test_user_id UUID;
    system_announcement_id BIGINT;
    achievement_unlock_id BIGINT;
    event_reminder_id BIGINT;
    activity_like_id BIGINT;
    notification_id BIGINT;
BEGIN
    -- Get the first user from auth.users for testing
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found in auth.users table. Please create a user account first.';
        RETURN;
    END IF;
    
    -- Get notification type IDs
    SELECT id INTO system_announcement_id FROM public.notification_types WHERE name = 'system_announcement';
    SELECT id INTO achievement_unlock_id FROM public.notification_types WHERE name = 'achievement_unlock';
    SELECT id INTO event_reminder_id FROM public.notification_types WHERE name = 'event_reminder';
    SELECT id INTO activity_like_id FROM public.notification_types WHERE name = 'activity_like';
    
    -- Check if notification types exist
    IF system_announcement_id IS NULL THEN
        RAISE NOTICE 'Notification types not found. Please run 01_create_notification_types_table.sql first.';
        RETURN;
    END IF;
    
    -- Welcome notification
    INSERT INTO public.user_notifications (
        user_id, notification_type_id, title, message, action_url, 
        metadata, priority, expires_at, sent_at
    ) VALUES (
        test_user_id,
        system_announcement_id,
        'Welcome to Car Audio Events!',
        'Complete your profile to get the most out of our car audio community. Connect with fellow enthusiasts, discover events, and showcase your builds.',
        '/profile',
        '{"source": "onboarding", "step": "welcome"}'::JSONB,
        3,
        NOW() + INTERVAL '30 days',
        NOW()
    ) RETURNING id INTO notification_id;
    
    RAISE NOTICE 'Created welcome notification with ID: %', notification_id;
    
    -- Achievement notification
    INSERT INTO public.user_notifications (
        user_id, notification_type_id, title, message, action_url, 
        metadata, priority, sent_at
    ) VALUES (
        test_user_id,
        achievement_unlock_id,
        'Achievement Unlocked: New Member',
        'Congratulations! You''ve successfully joined the Car Audio Events community. Welcome aboard!',
        '/profile?tab=achievements',
        '{"achievement_id": "new_member", "points": 50}'::JSONB,
        4,
        NOW() - INTERVAL '5 minutes'
    ) RETURNING id INTO notification_id;
    
    RAISE NOTICE 'Created achievement notification with ID: %', notification_id;
    
    -- Event reminder
    INSERT INTO public.user_notifications (
        user_id, notification_type_id, title, message, action_url, 
        metadata, priority, expires_at, sent_at
    ) VALUES (
        test_user_id,
        event_reminder_id,
        'Upcoming Event: Car Audio Championship',
        'Don''t forget about the Car Audio Championship happening this weekend. Registration closes tomorrow!',
        '/events',
        '{"event_id": 1, "days_until": 2}'::JSONB,
        4,
        NOW() + INTERVAL '7 days',
        NOW() - INTERVAL '10 minutes'
    ) RETURNING id INTO notification_id;
    
    RAISE NOTICE 'Created event reminder notification with ID: %', notification_id;
    
    -- Activity like notification (already read)
    INSERT INTO public.user_notifications (
        user_id, notification_type_id, title, message, action_url, 
        metadata, priority, is_read, read_at, sent_at
    ) VALUES (
        test_user_id,
        activity_like_id,
        'Someone liked your post',
        'John Doe liked your post about your new subwoofer setup. Check out their response!',
        '/dashboard?tab=activity',
        '{"liker_id": "john-doe", "post_id": 123}'::JSONB,
        2,
        true,
        NOW() - INTERVAL '1 hour',
        NOW() - INTERVAL '2 hours'
    ) RETURNING id INTO notification_id;
    
    RAISE NOTICE 'Created activity like notification with ID: %', notification_id;
    
    -- Low priority system maintenance notice
    INSERT INTO public.user_notifications (
        user_id, notification_type_id, title, message, 
        metadata, priority, expires_at, sent_at
    ) VALUES (
        test_user_id,
        system_announcement_id,
        'Scheduled Maintenance Notice',
        'We''ll be performing system maintenance on Sunday, 2:00-4:00 AM PST. The platform may be temporarily unavailable.',
        '{"maintenance_window": "2025-02-02T02:00:00Z", "duration": "2 hours"}'::JSONB,
        1,
        NOW() + INTERVAL '14 days',
        NOW() - INTERVAL '30 minutes'
    ) RETURNING id INTO notification_id;
    
    RAISE NOTICE 'Created maintenance notification with ID: %', notification_id;
    
    RAISE NOTICE 'SUCCESS: Created 5 test notifications for user: %', test_user_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR creating test notifications: %', SQLERRM;
END $$;

-- Show what was created
SELECT 
    'Notification Summary' as info,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE is_read = false) as unread_notifications
FROM public.user_notifications; 