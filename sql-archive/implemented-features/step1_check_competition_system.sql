-- STEP 1: Check Competition System Database Setup
-- Phase 3 Step 4: Competition Scoring System

-- Check if competition_results table exists and its structure
SELECT 
    'competition_results table check' as step,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'competition_results'
        ) THEN 'EXISTS ✅'
        ELSE 'MISSING ❌'
    END as status;

-- Check competition_results table structure
SELECT 
    'competition_results columns' as step,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'competition_results'
ORDER BY ordinal_position;

-- Check events table (needed for competitions)
SELECT 
    'events table check' as step,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'events'
        ) THEN 'EXISTS ✅'
        ELSE 'MISSING ❌'
    END as status;

-- Check if we have any sample competition data
SELECT 
    'competition data check' as step,
    COUNT(*) as total_competition_results
FROM public.competition_results;

-- Check if events have competition-related fields
SELECT 
    'events with competition data' as step,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE competition_type IS NOT NULL) as events_with_competition_type
FROM public.events;

-- Check user_audio_systems table (needed for linking systems to results)
SELECT 
    'user_audio_systems table check' as step,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_audio_systems'
        ) THEN 'EXISTS ✅'
        ELSE 'MISSING ❌'
    END as status;

-- Summary: What's missing for competition scoring system
SELECT 
    'SUMMARY: Competition System Readiness' as assessment,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competition_results')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events')
        THEN 'DATABASE READY ✅ - Need UI Components'
        ELSE 'DATABASE SETUP NEEDED ❌'
    END as status; 