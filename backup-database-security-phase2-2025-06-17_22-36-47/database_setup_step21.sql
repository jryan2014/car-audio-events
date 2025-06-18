-- Step 21: Create Judge Assignment System
-- This creates the proper database structure for assigning judges to competitions

-- Create judge_assignments table
CREATE TABLE IF NOT EXISTS judge_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    judge_id UUID REFERENCES competition_judges(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    notes TEXT,
    UNIQUE(competition_id, judge_id)
);

-- Enable RLS
ALTER TABLE judge_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for judge_assignments
CREATE POLICY "Users can view judge assignments"
    ON judge_assignments FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can manage judge assignments"
    ON judge_assignments FOR ALL
    USING (auth.role() = 'authenticated');

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_judge_assignments_competition ON judge_assignments(competition_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_judge ON judge_assignments(judge_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_status ON judge_assignments(status);

-- Update the competition_judges table to ensure we have current user
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
    COALESCE(profile.full_name, 'System Admin'),
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

COMMENT ON TABLE judge_assignments IS 'Manages which judges are assigned to which competitions'; 