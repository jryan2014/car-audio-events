-- STEP 5: Simple Test Data (Judge and Registrations Only)
-- Phase 3 Step 4: Competition Scoring System

-- 1. Make current user a judge
DO $$
BEGIN
    -- Check if judge already exists
    IF NOT EXISTS (
        SELECT 1 FROM public.competition_judges 
        WHERE user_id = '29b931f5-c02e-4562-b249-278f86663b62'::uuid
    ) THEN
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
        );
        RAISE NOTICE 'Judge created successfully!';
    ELSE
        -- Update existing judge
        UPDATE public.competition_judges SET
            judge_name = 'Test Judge',
            certification_level = 'certified',
            specializations = ARRAY['sound_quality', 'installation'],
            is_active = true
        WHERE user_id = '29b931f5-c02e-4562-b249-278f86663b62'::uuid;
        RAISE NOTICE 'Judge updated successfully!';
    END IF;
END $$;

-- 2. Update an existing event to be a competition (avoid trigger issues)
DO $$
DECLARE
    event_id_var INTEGER;
BEGIN
    -- Find an existing event to convert to competition
    SELECT id INTO event_id_var 
    FROM public.events 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF event_id_var IS NOT NULL THEN
        -- Update existing event to be a competition
        UPDATE public.events SET
            is_competition = true,
            competition_type = 'sound_quality',
            competition_categories = ARRAY['Beginner', 'Intermediate', 'Expert', 'Master'],
            competition_classes = ARRAY['Stock', 'Street', 'Modified', 'Extreme'],
            judging_criteria = '{
                "sound_quality": {"weight": 40, "max_score": 100, "description": "Overall audio reproduction quality"},
                "installation": {"weight": 25, "max_score": 100, "description": "Quality of equipment installation"},
                "presentation": {"weight": 20, "max_score": 100, "description": "Visual appeal and craftsmanship"},
                "innovation": {"weight": 15, "max_score": 100, "description": "Creative solutions and unique features"}
            }'::jsonb,
            scoring_system = 'weighted',
            max_participants_per_category = 10,
            competition_rules = 'Standard IASCA rules apply. All participants must present valid registration and technical inspection forms.'
        WHERE id = event_id_var;
        
        RAISE NOTICE 'Converted event ID % to competition', event_id_var;
    ELSE
        RAISE NOTICE 'No existing events found to convert';
    END IF;
END $$;

-- 3. Create sample competition registrations using the converted event
DO $$
DECLARE
    event_id_var INTEGER;
BEGIN
    -- Get the competition event ID
    SELECT id INTO event_id_var 
    FROM public.events 
    WHERE is_competition = true
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF event_id_var IS NOT NULL THEN
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
        ) 
        SELECT 
            gen_random_uuid(),
            event_id_var,
            '29b931f5-c02e-4562-b249-278f86663b62'::uuid,
            cat,
            cls,
            'approved',
            'Test registration for ' || cat || ' - ' || cls || ' category.',
            NOW()
        FROM (
            VALUES 
            ('Intermediate', 'Street'),
            ('Expert', 'Modified'),
            ('Beginner', 'Stock')
        ) AS test_data(cat, cls)
        WHERE NOT EXISTS (
            SELECT 1 FROM public.competition_registrations 
            WHERE event_id = event_id_var 
            AND user_id = '29b931f5-c02e-4562-b249-278f86663b62'::uuid
            AND category = test_data.cat
        );
        
        RAISE NOTICE 'Created competition registrations for event ID %', event_id_var;
    ELSE
        RAISE NOTICE 'No competition events found for registrations';
    END IF;
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
    'VERIFICATION: Competition events' as step,
    COUNT(*) as competition_event_count,
    string_agg(e.title, ', ') as event_titles
FROM public.events e
WHERE e.is_competition = true;

SELECT 
    'VERIFICATION: Registrations created' as step,
    COUNT(*) as registration_count,
    string_agg(DISTINCT cr.category, ', ') as categories,
    string_agg(DISTINCT cr.class, ', ') as classes
FROM public.competition_registrations cr
JOIN public.events e ON cr.event_id = e.id
WHERE e.is_competition = true
AND cr.user_id = '29b931f5-c02e-4562-b249-278f86663b62'::uuid;

-- 5. Final success message
SELECT 'SUCCESS ✅ Test data created! You can now test the judge scoring system!' as result; 