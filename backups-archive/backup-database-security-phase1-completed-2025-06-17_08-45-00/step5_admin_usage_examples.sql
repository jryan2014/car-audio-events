-- STEP 5: How Admins Use the Notification System
-- Copy these examples for your admin documentation

-- EXAMPLE 1: Send a welcome message to a specific new user
SELECT admin_send_notification_to_user(
    '29b931f5-c02e-4562-b249-278f86663b62'::uuid,  -- Replace with actual user ID
    'system_announcement',                           -- Notification type
    'Welcome to Car Audio Events! 🎉',             -- Title
    'Thank you for joining our community! Complete your profile to get started and connect with fellow car audio enthusiasts.',  -- Message
    '/profile',                                      -- Action URL (where to go when clicked)
    '{"welcome": true, "source": "admin"}'::jsonb, -- Metadata (extra info)
    4,                                              -- Priority (1-5, 5 = highest)
    30                                              -- Expires in 30 days
) as welcome_notification_result;

-- EXAMPLE 2: Send event announcement to ALL users
SELECT admin_send_notification_to_all_users(
    'event_reminder',                               -- Notification type
    '🏆 Championship Registration Open!',          -- Title
    'The 2025 Car Audio Championship is now open for registration! Early bird pricing ends in 7 days. Register now to secure your spot!',  -- Message
    '/events/championship-2025',                    -- Action URL
    '{"event_id": "championship-2025", "early_bird": true}'::jsonb,  -- Metadata
    5,                                              -- High priority
    14                                              -- Expires in 14 days
) as championship_announcement_result;

-- EXAMPLE 3: Send achievement notification to a specific user
SELECT admin_send_notification_to_user(
    '29b931f5-c02e-4562-b249-278f86663b62'::uuid,  -- User ID
    'achievement_unlock',                           -- Notification type
    '🏅 Achievement Unlocked: Event Organizer!',   -- Title
    'Congratulations! You have successfully organized your first car audio event and earned 500 points!',  -- Message
    '/profile?tab=achievements',                    -- Action URL
    '{"achievement": "event_organizer", "points": 500}'::jsonb,  -- Metadata
    4,                                              -- Priority
    NULL                                            -- No expiration (permanent achievement)
) as achievement_notification_result;

-- EXAMPLE 4: Send system maintenance notification to all users
SELECT admin_send_notification_to_all_users(
    'system_announcement',                          -- Notification type
    '🔧 Scheduled Maintenance Notice',             -- Title
    'We will be performing system maintenance on Sunday, Feb 2nd from 2:00-4:00 AM EST. The platform will be temporarily unavailable during this time.',  -- Message
    '/help/maintenance',                            -- Action URL
    '{"maintenance": true, "date": "2025-02-02", "duration": "2 hours"}'::jsonb,  -- Metadata
    3,                                              -- Medium priority
    7                                               -- Expires in 7 days
) as maintenance_notification_result;

-- EXAMPLE 5: Get notification statistics for admin dashboard
SELECT admin_get_notification_stats() as notification_statistics;

-- ADMIN INTERFACE IDEAS:
-- 1. Create an admin page at /admin/notifications
-- 2. Form with fields for:
--    - Recipient: "Specific User" or "All Users"
--    - Type: Dropdown with notification types
--    - Title: Text input
--    - Message: Textarea
--    - Action URL: Text input (optional)
--    - Priority: 1-5 slider
--    - Expires: Date picker (optional)
-- 3. Preview before sending
-- 4. Statistics dashboard showing notification metrics

SELECT 'Admin usage examples completed!' as result; 