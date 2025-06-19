-- STEP 2: Add Competition Fields to Events Table
-- Phase 3 Step 4: Competition Scoring System

-- Add competition-related columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS competition_type TEXT,
ADD COLUMN IF NOT EXISTS competition_categories TEXT[],
ADD COLUMN IF NOT EXISTS competition_classes TEXT[],
ADD COLUMN IF NOT EXISTS judging_criteria JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS scoring_system TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS max_participants_per_category INTEGER,
ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS competition_rules TEXT,
ADD COLUMN IF NOT EXISTS is_competition BOOLEAN DEFAULT false;

-- Add comments to explain the new fields
COMMENT ON COLUMN public.events.competition_type IS 'Type of competition: sound_quality, spl, install, overall, etc.';
COMMENT ON COLUMN public.events.competition_categories IS 'Array of competition categories: [amateur, expert, pro, etc.]';
COMMENT ON COLUMN public.events.competition_classes IS 'Array of competition classes: [rookie, street, expert, pro, outlaw]';
COMMENT ON COLUMN public.events.judging_criteria IS 'JSON object defining scoring criteria and weights';
COMMENT ON COLUMN public.events.scoring_system IS 'Scoring system type: standard, percentage, points';
COMMENT ON COLUMN public.events.max_participants_per_category IS 'Maximum participants allowed per category';
COMMENT ON COLUMN public.events.registration_deadline IS 'Deadline for competition registration';
COMMENT ON COLUMN public.events.competition_rules IS 'Text description of competition rules';
COMMENT ON COLUMN public.events.is_competition IS 'Whether this event includes competitions';

-- Update existing events to mark some as competitions (sample data)
UPDATE public.events 
SET 
    is_competition = true,
    competition_type = 'sound_quality',
    competition_categories = ARRAY['amateur', 'expert', 'pro'],
    competition_classes = ARRAY['rookie', 'street', 'expert', 'pro'],
    judging_criteria = '{
        "sound_quality": {"weight": 40, "max_score": 100},
        "installation": {"weight": 30, "max_score": 100}, 
        "presentation": {"weight": 20, "max_score": 100},
        "innovation": {"weight": 10, "max_score": 100}
    }'::JSONB,
    scoring_system = 'percentage',
    max_participants_per_category = 50
WHERE title ILIKE '%competition%' OR title ILIKE '%show%' OR title ILIKE '%contest%';

-- Show the updated events table structure
SELECT 
    'Updated events table structure' as step,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'events'
AND column_name LIKE '%competition%' OR column_name = 'is_competition'
ORDER BY ordinal_position;

-- Show events that are now marked as competitions
SELECT 
    'Events marked as competitions' as step,
    COUNT(*) as total_competition_events,
    COUNT(*) FILTER (WHERE competition_type = 'sound_quality') as sound_quality_events,
    COUNT(*) FILTER (WHERE competition_type = 'spl') as spl_events
FROM public.events 
WHERE is_competition = true;

-- Verify the fix worked
SELECT 
    'VERIFICATION: Competition fields added' as result,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'events' AND column_name = 'competition_type'
        ) THEN 'SUCCESS ✅'
        ELSE 'FAILED ❌'
    END as status; 