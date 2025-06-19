-- STEP 6: Competition Scoring Tables
-- Phase 3 Step 4: Competition Scoring System - Database Tables

-- Create competition_scores table to store individual scores
CREATE TABLE IF NOT EXISTS public.competition_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.scoring_sessions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES public.competition_registrations(id) ON DELETE CASCADE,
    criteria TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    notes TEXT,
    judge_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_competition_scores_session ON public.competition_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_competition_scores_participant ON public.competition_scores(participant_id);
CREATE INDEX IF NOT EXISTS idx_competition_scores_judge ON public.competition_scores(judge_id);

-- Enable RLS
ALTER TABLE public.competition_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competition_scores
CREATE POLICY "Judges can manage their own scores" ON public.competition_scores
    FOR ALL USING (
        judge_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND membership_type IN ('admin', 'manufacturer', 'organization')
        )
    );

-- Allow viewing scores for competition results
CREATE POLICY "Competition scores are viewable by participants and organizers" ON public.competition_scores
    FOR SELECT USING (
        -- Judges can see their own scores
        judge_id = auth.uid() OR
        -- Participants can see their own scores
        participant_id IN (
            SELECT id FROM public.competition_registrations 
            WHERE user_id = auth.uid()
        ) OR
        -- Admins and organizers can see all scores
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND membership_type IN ('admin', 'manufacturer', 'organization')
        )
    );

-- Update the scoring_sessions table to include more details if needed
ALTER TABLE public.scoring_sessions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Update trigger for competition_scores
CREATE OR REPLACE FUNCTION update_competition_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_competition_scores_updated_at
    BEFORE UPDATE ON public.competition_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_competition_scores_updated_at();

-- Create a view for competition results
CREATE OR REPLACE VIEW public.competition_results AS
SELECT 
    cr.id as registration_id,
    cr.event_id,
    cr.user_id,
    u.name as participant_name,
    cr.category,
    cr.class,
    COALESCE(SUM(cs.score), 0) as total_score,
    COUNT(DISTINCT cs.judge_id) as judge_count,
    ROUND(COALESCE(AVG(cs.score), 0), 2) as average_score,
    e.title as competition_title,
    e.start_date as competition_date
FROM public.competition_registrations cr
LEFT JOIN public.competition_scores cs ON cr.id = cs.participant_id
LEFT JOIN public.users u ON cr.user_id = u.id
LEFT JOIN public.events e ON cr.event_id = e.id
WHERE cr.status = 'approved' AND e.is_competition = true
GROUP BY cr.id, cr.event_id, cr.user_id, u.name, cr.category, cr.class, e.title, e.start_date
ORDER BY total_score DESC, participant_name;

-- Grant permissions on the view
GRANT SELECT ON public.competition_results TO authenticated;

-- Success message
SELECT 'SUCCESS ✅ Competition scoring tables and views created!' as result; 