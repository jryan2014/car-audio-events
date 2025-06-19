-- STEP 5: Create Test Data for Competition Scoring System
-- Phase 3 Step 4: Competition Scoring System

-- 1. Make current user a judge
INSERT INTO public.competition_judges (
    user_id,
    judge_name,
    email,
    certification_level,
    specializations,
    years_experience,
    bio,
    is_active
) VALUES (
    '29b931f5-c02e-4562-b249-278f86663b62'::uuid,  -- Your user ID
    'Test Judge',
    'judge@example.com',
    'certified',
    ARRAY['sound_quality', 'installation'],
    5,
    'Experienced car audio judge specializing in sound quality and installation assessment.',
    true
) ON CONFLICT (user_id) DO UPDATE SET
    judge_name = EXCLUDED.judge_name,
    certification_level = EXCLUDED.certification_level,
    specializations = EXCLUDED.specializations,
    is_active = true;

-- 2. Create a competition event for testing
INSERT INTO public.events (
    title,
    description,
    date,
    time,
    location,
    max_attendees,
    price,
    image_url,
    is_competition,
    competition_type,
    competition_categories,
    competition_classes,
    judging_criteria,
    scoring_system,
    max_participants_per_category,
    registration_deadline,
    competition_rules
) VALUES (
    'Spring Car Audio Championship 2025',
    'Annual spring competition featuring multiple categories including sound quality, SPL, and installation showcases.',
    CURRENT_DATE + INTERVAL '7 days',
    '10:00:00',
    'Convention Center, Downtown',
    200,
    50.00,
    'https://images.unsplash.com/photo-1493238792000-8113da705763?w=800',
    true,
    'sound_quality',
    ARRAY['Beginner', 'Intermediate', 'Expert', 'Master'],
    ARRAY['Stock', 'Street', 'Modified', 'Extreme'],
    '{
        "sound_quality": {"weight": 40, "max_score": 100, "description": "Overall audio reproduction quality"},
        "installation": {"weight": 25, "max_score": 100, "description": "Quality of equipment installation"},
        "presentation": {"weight": 20, "max_score": 100, "description": "Visual appeal and craftsmanship"},
        "innovation": {"weight": 15, "max_score": 100, "description": "Creative solutions and unique features"}
    }'::jsonb,
    'weighted',
    10,
    CURRENT_DATE + INTERVAL '5 days',
    'Standard IASCA rules apply. All participants must present valid registration and technical inspection forms.'
) ON CONFLICT (title) DO UPDATE SET
    is_competition = true,
    competition_type = EXCLUDED.competition_type;

-- 3. Get the event ID for registrations
DO $$
DECLARE
    event_id_var INTEGER;
    reg_id_1 UUID;
    reg_id_2 UUID;
    reg_id_3 UUID;
BEGIN
    -- Get the event ID
    SELECT id INTO event_id_var 
    FROM public.events 
    WHERE title = 'Spring Car Audio Championship 2025';

    -- Create sample competition registrations
    INSERT INTO public.competition_registrations (
        id,
        event_id,
        user_id,
        category,
        class,
        status,
        registration_notes,
        created_at
    ) VALUES 
    (
        gen_random_uuid(),
        event_id_var,
        '29b931f5-c02e-4562-b249-278f86663b62'::uuid,  -- Your user ID as participant too
        'Intermediate',
        'Street',
        'approved',
        'Test participant with custom install and high-end components.',
        NOW()
    ),
    (
        gen_random_uuid(),
        event_id_var,
        '29b931f5-c02e-4562-b249-278f86663b62'::uuid,  -- Duplicate for testing (different category)
        'Expert',
        'Modified',
        'approved',
        'Advanced competition setup with professional-grade equipment.',
        NOW()
    ),
    (
        gen_random_uuid(),
        event_id_var,
        '29b931f5-c02e-4562-b249-278f86663b62'::uuid,  -- Third entry for variety
        'Beginner',
        'Stock',
        'approved',
        'Entry-level competition setup using mostly factory components.',
        NOW()
    )
    ON CONFLICT (user_id, event_id, category) DO NOTHING;
    
    RAISE NOTICE 'Test data created successfully!';
END $$;

-- 4. Verify the test data
SELECT 
    'VERIFICATION: Judge created' as step,
    judge_name,
    certification_level,
    is_active
FROM public.competition_judges 
WHERE user_id = '29b931f5-c02e-4562-b249-278f86663b62'::uuid;

SELECT 
    'VERIFICATION: Competition event' as step,
    title,
    is_competition,
    competition_type,
    array_length(competition_categories, 1) as category_count
FROM public.events 
WHERE title = 'Spring Car Audio Championship 2025';

SELECT 
    'VERIFICATION: Registrations created' as step,
    COUNT(*) as registration_count,
    string_agg(DISTINCT category, ', ') as categories,
    string_agg(DISTINCT class, ', ') as classes
FROM public.competition_registrations cr
JOIN public.events e ON cr.event_id = e.id
WHERE e.title = 'Spring Car Audio Championship 2025';

-- 5. Final success message
SELECT 'SUCCESS ✅ Test data created! You can now test the judge scoring system!' as result; 