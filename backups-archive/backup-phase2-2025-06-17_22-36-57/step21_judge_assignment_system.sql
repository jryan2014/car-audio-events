-- ================================================================
-- STEP 21: JUDGE ASSIGNMENT SYSTEM
-- Complete SQL setup for assigning judges to competitions
-- ================================================================

-- STEP 1: Create the judge_assignments table
-- This table manages which judges are assigned to which competitions
CREATE TABLE IF NOT EXISTS public.judge_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id INTEGER REFERENCES public.events(id) ON DELETE CASCADE,
    judge_id UUID REFERENCES public.competition_judges(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    notes TEXT,
    UNIQUE(competition_id, judge_id)
);

-- STEP 2: Enable Row Level Security for the new table
ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create RLS policies for judge_assignments
CREATE POLICY "Users can view judge assignments"
    ON public.judge_assignments FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage judge assignments"
    ON public.judge_assignments FOR ALL
    USING (auth.role() = 'authenticated');

-- STEP 4: Add database indexes for better performance
CREATE INDEX IF NOT EXISTS idx_judge_assignments_competition ON public.judge_assignments(competition_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_judge ON public.judge_assignments(judge_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_status ON public.judge_assignments(status);

-- STEP 5: Ensure current user exists as a judge
-- This adds the current logged-in user to the competition_judges table
INSERT INTO public.competition_judges (
    id,
    user_id,
    judge_name,
    email,
    certification_level,
    specializations,
    years_experience,
    is_active
) 
SELECT 
    auth.uid(),
    auth.uid(),
    COALESCE(profile.first_name || ' ' || profile.last_name, profile.name, users.email, 'System Admin'),
    users.email,
    'certified',
    ARRAY['sound_quality', 'installation'],
    1,
    true
FROM auth.users users
LEFT JOIN public.profiles profile ON users.id = profile.id
WHERE users.id = auth.uid()
ON CONFLICT (id) DO UPDATE SET
    judge_name = EXCLUDED.judge_name,
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active;

-- STEP 6: Add helpful comment
COMMENT ON TABLE public.judge_assignments IS 'Manages which judges are assigned to which competitions';

-- STEP 7: Verification queries
SELECT 'Judge assignment table created successfully' as step, 'SUCCESS ✅' as status;

SELECT 
    'Table verification' as step,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'judge_assignments') as assignments_table_exists,
    (SELECT COUNT(*) FROM public.competition_judges WHERE id = auth.uid()) as current_user_is_judge;

SELECT 'Judge assignment system ready!' as result, 'SUCCESS ✅' as status; 