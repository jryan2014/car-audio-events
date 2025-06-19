-- Phase 3 Step 3C: Notification System - Part 4
-- Test notifications for demonstration
-- Safe test data

-- ================================
-- TEST NOTIFICATION DATA
-- ================================

-- Note: Replace 'your-user-id-here' with an actual user UUID from your auth.users table
-- You can get user IDs with: SELECT id, email FROM auth.users LIMIT 5;

-- Create welcome notification for new users
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get the first user from auth.users for testing
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Welcome notification
        PERFORM public.create_notification(
            test_user_id,
            'system_announcement',
            'Welcome to Car Audio Events!',
            'Complete your profile to get the most out of our car audio community. Connect with fellow enthusiasts, discover events, and showcase your builds.',
            '/profile',
            '{"source": "onboarding", "step": "welcome"}',
            3,
            NOW() + INTERVAL '30 days'
        );

        -- Achievement notification
        PERFORM public.create_notification(
            test_user_id,
            'achievement_unlock',
            'Achievement Unlocked: New Member',
            'Congratulations! You''ve successfully joined the Car Audio Events community. Welcome aboard!',
            '/profile?tab=achievements',
            '{"achievement_id": "new_member", "points": 50}',
            4,
            NULL
        );

        -- Event reminder
        PERFORM public.create_notification(
            test_user_id,
            'event_reminder',
            'Upcoming Event: Car Audio Championship',
            'Don''t forget about the Car Audio Championship happening this weekend. Registration closes tomorrow!',
            '/events',
            '{"event_id": 1, "days_until": 2}',
            4,
            NOW() + INTERVAL '7 days'
        );

        -- Activity like notification (already read)
        INSERT INTO public.user_notifications (
            user_id, notification_type_id, title, message, action_url, 
            metadata, priority, is_read, read_at, sent_at
        )
        SELECT 
            test_user_id,
            nt.id,
            'Someone liked your post',
            'John Doe liked your post about your new subwoofer setup. Check out their response!',
            '/dashboard?tab=activity',
            '{"liker_id": "john-doe", "post_id": 123}',
            2,
            true,
            NOW() - INTERVAL '1 hour',
            NOW() - INTERVAL '2 hours'
        FROM public.notification_types nt
        WHERE nt.name = 'activity_like';

        -- Low priority system maintenance notice
        PERFORM public.create_notification(
            test_user_id,
            'system_announcement',
            'Scheduled Maintenance Notice',
            'We''ll be performing system maintenance on Sunday, 2:00-4:00 AM PST. The platform may be temporarily unavailable.',
            NULL,
            '{"maintenance_window": "2025-02-02T02:00:00Z", "duration": "2 hours"}',
            1,
            NOW() + INTERVAL '14 days'
        );

        RAISE NOTICE 'Successfully created test notifications for user: %', test_user_id;
    ELSE
        RAISE NOTICE 'No users found in auth.users table. Please create a user account first.';
    END IF;
END $$; 