-- Complete Database Schema Audit for Car Audio Events Platform
-- This script checks ALL expected fields against actual database schema

-- First, let's see what columns actually exist in the events table
SELECT 'CURRENT EVENTS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;

-- Check if event_categories table exists
SELECT 'EVENT_CATEGORIES TABLE EXISTS:' as info;
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'event_categories'
) as table_exists;

-- If event_categories exists, show its columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_categories') THEN
        RAISE NOTICE 'EVENT_CATEGORIES COLUMNS:';
    END IF;
END $$;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'event_categories' 
ORDER BY ordinal_position;

-- Check for foreign key constraints
SELECT 'FOREIGN KEY CONSTRAINTS:' as info;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'events';

-- Now let's check for ALL expected columns based on the application code
SELECT 'MISSING COLUMNS ANALYSIS:' as info;

-- List of ALL columns the application expects in events table
WITH expected_columns AS (
    SELECT unnest(ARRAY[
        'id',
        'title', 
        'description',
        'category_id',
        'sanction_body_id',
        'season_year',
        'start_date',
        'end_date',
        'registration_deadline',
        'max_participants',
        'registration_fee',
        'ticket_price',
        'early_bird_fee',
        'early_bird_deadline',
        'early_bird_name',
        'event_name',
        'venue_name',
        'address',
        'city',
        'state',
        'zip_code',
        'country',
        'latitude',
        'longitude',
        'contact_email',
        'contact_phone',
        'website',
        'website_url',
        'event_director_first_name',
        'event_director_last_name',
        'event_director_email',
        'event_director_phone',
        'use_organizer_contact',
        'status',
        'approval_status',
        'rejection_reason',
        'is_active',
        'display_start_date',
        'display_end_date',
        'rules',
        'prizes',
        'schedule',
        'sponsors',
        'first_place_trophy',
        'second_place_trophy',
        'third_place_trophy',
        'fourth_place_trophy',
        'fifth_place_trophy',
        'has_raffle',
        'shop_sponsors',
        'member_giveaways',
        'non_member_giveaways',
        'seo_title',
        'seo_description',
        'seo_keywords',
        'is_public',
        'current_participants',
        'organizer_id',
        'organization_id',
        'created_at',
        'updated_at'
    ]) AS column_name
),
actual_columns AS (
    SELECT column_name
    FROM information_schema.columns 
    WHERE table_name = 'events'
)
SELECT 
    ec.column_name as expected_column,
    CASE 
        WHEN ac.column_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM expected_columns ec
LEFT JOIN actual_columns ac ON ec.column_name = ac.column_name
ORDER BY 
    CASE WHEN ac.column_name IS NOT NULL THEN 1 ELSE 0 END,
    ec.column_name;

-- Check organizations table (used for sanctioning bodies)
SELECT 'ORGANIZATIONS TABLE CHECK:' as info;
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'organizations'
) as organizations_table_exists;

-- If organizations exists, show sample data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        RAISE NOTICE 'ORGANIZATIONS TABLE COLUMNS:';
    END IF;
END $$;

SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'organizations' 
ORDER BY ordinal_position;

-- Check users table (for organizer relationships)
SELECT 'USERS TABLE CHECK:' as info;
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'users'
) as users_table_exists;

-- Sample data check
SELECT 'SAMPLE DATA CHECK:' as info;
SELECT 
    COUNT(*) as total_events,
    COUNT(CASE WHEN approval_status IS NOT NULL THEN 1 END) as events_with_approval_status,
    COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as events_with_category,
    COUNT(CASE WHEN organizer_id IS NOT NULL THEN 1 END) as events_with_organizer
FROM events;

SELECT 'AUDIT COMPLETE!' as result; 