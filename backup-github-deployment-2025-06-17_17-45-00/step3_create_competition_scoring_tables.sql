-- STEP 3: Create Competition Scoring System Tables
-- Phase 3 Step 4: Competition Scoring System

-- Create judges table for competition judges
CREATE TABLE IF NOT EXISTS public.competition_judges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    judge_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    certification_level TEXT CHECK (certification_level IN ('trainee', 'certified', 'master', 'senior')),
    specializations TEXT[], -- e.g., ['sound_quality', 'spl', 'installation']
    years_experience INTEGER DEFAULT 0,
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create competition registrations table
CREATE TABLE IF NOT EXISTS public.competition_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id INTEGER REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    class TEXT,
    audio_system_id UUID REFERENCES public.user_audio_systems(id),
    registration_notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id, category)
);

-- Create scoring sessions table for individual judging sessions
CREATE TABLE IF NOT EXISTS public.scoring_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id INTEGER REFERENCES public.events(id) ON DELETE CASCADE,
    registration_id UUID REFERENCES public.competition_registrations(id) ON DELETE CASCADE,
    judge_id UUID REFERENCES public.competition_judges(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    class TEXT,
    
    -- Individual scoring criteria (customizable based on competition type)
    sound_quality_score DECIMAL(5,2),
    sound_quality_notes TEXT,
    spl_score DECIMAL(5,2),
    spl_measurement DECIMAL(6,2), -- dB measurement
    installation_score DECIMAL(5,2),
    installation_notes TEXT,
    presentation_score DECIMAL(5,2),
    presentation_notes TEXT,
    innovation_score DECIMAL(5,2),
    innovation_notes TEXT,
    
    -- Overall
    total_score DECIMAL(5,2),
    overall_notes TEXT,
    is_final BOOLEAN DEFAULT false,
    
    -- Metadata
    scored_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one score per judge per registration
    UNIQUE(registration_id, judge_id)
);

-- Create competition results summary (enhanced version)
-- Note: We already have competition_results table, so we'll add an index and function
CREATE INDEX IF NOT EXISTS idx_competition_results_event_category ON public.competition_results(event_id, category);
CREATE INDEX IF NOT EXISTS idx_competition_results_user ON public.competition_results(user_id);
CREATE INDEX IF NOT EXISTS idx_scoring_sessions_event ON public.scoring_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_competition_registrations_event ON public.competition_registrations(event_id);

-- Add RLS policies for security
ALTER TABLE public.competition_judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_sessions ENABLE ROW LEVEL SECURITY;

-- Judges can see all judges
CREATE POLICY "Judges can view all judges" ON public.competition_judges
    FOR SELECT USING (true);

-- Users can view their own registrations
CREATE POLICY "Users can view own registrations" ON public.competition_registrations
    FOR SELECT USING (auth.uid() = user_id);

-- Event organizers can view all registrations for their events
CREATE POLICY "Event organizers can manage registrations" ON public.competition_registrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = competition_registrations.event_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- Judges can view scoring sessions they're involved in
CREATE POLICY "Judges can view their scoring sessions" ON public.scoring_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.competition_judges 
            WHERE competition_judges.id = scoring_sessions.judge_id 
            AND competition_judges.user_id = auth.uid()
        )
    );

-- Event organizers can view all scoring sessions for their events
CREATE POLICY "Event organizers can view event scoring sessions" ON public.scoring_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = scoring_sessions.event_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- Function to calculate final competition results
CREATE OR REPLACE FUNCTION calculate_competition_results(p_event_id INTEGER, p_category TEXT)
RETURNS TABLE (
    registration_id UUID,
    user_id UUID,
    participant_name TEXT,
    total_scores DECIMAL,
    average_score DECIMAL,
    placement INTEGER,
    points_earned INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH scored_registrations AS (
        SELECT 
            cr.id as registration_id,
            cr.user_id,
            COALESCE(p.full_name, p.first_name || ' ' || p.last_name, 'Unknown') as participant_name,
            SUM(ss.total_score) as total_scores,
            AVG(ss.total_score) as average_score
        FROM public.competition_registrations cr
        LEFT JOIN public.scoring_sessions ss ON cr.id = ss.registration_id
        LEFT JOIN public.profiles p ON cr.user_id = p.id
        WHERE cr.event_id = p_event_id 
        AND cr.category = p_category
        AND cr.status = 'approved'
        AND ss.is_final = true
        GROUP BY cr.id, cr.user_id, p.full_name, p.first_name, p.last_name
    ),
    ranked_results AS (
        SELECT 
            *,
            ROW_NUMBER() OVER (ORDER BY average_score DESC) as placement,
            CASE 
                WHEN ROW_NUMBER() OVER (ORDER BY average_score DESC) = 1 THEN 100
                WHEN ROW_NUMBER() OVER (ORDER BY average_score DESC) = 2 THEN 75
                WHEN ROW_NUMBER() OVER (ORDER BY average_score DESC) = 3 THEN 50
                WHEN ROW_NUMBER() OVER (ORDER BY average_score DESC) <= 10 THEN 25
                ELSE 10
            END as points_earned
        FROM scored_registrations
        WHERE average_score IS NOT NULL
    )
    SELECT * FROM ranked_results
    ORDER BY placement;
END;
$$;

-- Verification queries
SELECT 'Competition scoring tables created' as step, 'SUCCESS ✅' as status;

SELECT 
    'Table counts' as step,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'competition_judges') as judges_table,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'competition_registrations') as registrations_table,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'scoring_sessions') as scoring_sessions_table;

SELECT 'Database ready for competition scoring system' as result, 'SUCCESS ✅' as status; 