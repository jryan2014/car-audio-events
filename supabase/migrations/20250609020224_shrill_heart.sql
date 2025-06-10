-- First, ensure we have the admin user
DO $$
DECLARE
  admin_id uuid;
  admin_exists boolean;
BEGIN
  -- Check if admin user exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@caraudioevents.com'
  ) INTO admin_exists;
  
  IF admin_exists THEN
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@caraudioevents.com';
    
    -- Ensure admin profile exists and has correct permissions
    INSERT INTO public.users (
      id, 
      email, 
      name, 
      membership_type, 
      status, 
      verification_status, 
      subscription_plan,
      created_at,
      updated_at
    ) VALUES (
      admin_id,
      'admin@caraudioevents.com',
      'System Administrator',
      'admin',
      'active',
      'verified',
      'enterprise',
      now(),
      now()
    ) ON CONFLICT (id) DO UPDATE SET
      membership_type = 'admin',
      status = 'active',
      verification_status = 'verified',
      subscription_plan = 'enterprise',
      updated_at = now();
      
    RAISE NOTICE 'Admin user exists and profile updated: %', admin_id;
  ELSE
    RAISE NOTICE 'Admin user does not exist. Please create it using the Create Admin User button on the login page.';
  END IF;
END $$;

-- Clear existing sample data to avoid conflicts
DELETE FROM public.event_registrations;
DELETE FROM public.competition_results;
DELETE FROM public.audio_components;
DELETE FROM public.user_audio_systems;
DELETE FROM public.team_members;
DELETE FROM public.team_invitations;
DELETE FROM public.teams;
DELETE FROM public.user_subscriptions;
DELETE FROM public.event_images;

-- Keep the map events by deleting all events EXCEPT those with specific IDs
DELETE FROM public.events 
WHERE id NOT IN (
  '650e8400-e29b-41d4-a716-446655440001'::uuid, 
  '650e8400-e29b-41d4-a716-446655440002'::uuid, 
  '650e8400-e29b-41d4-a716-446655440003'::uuid,
  '650e8400-e29b-41d4-a716-446655440004'::uuid,
  '650e8400-e29b-41d4-a716-446655440005'::uuid,
  '650e8400-e29b-41d4-a716-446655440006'::uuid
);

-- Keep the map organizations by deleting all organizations EXCEPT those with specific IDs
DELETE FROM public.organizations 
WHERE id NOT IN (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  '550e8400-e29b-41d4-a716-446655440004'::uuid,
  '550e8400-e29b-41d4-a716-446655440005'::uuid,
  '550e8400-e29b-41d4-a716-446655440006'::uuid
);

DELETE FROM public.membership_plans;

-- Populate membership plans with realistic data
INSERT INTO public.membership_plans (
  id, 
  name, 
  type, 
  price, 
  billing_period, 
  description, 
  features, 
  permissions, 
  limits, 
  is_active, 
  is_featured, 
  display_order
) VALUES
(
  gen_random_uuid(),
  'Competitor Free',
  'competitor',
  0,
  'lifetime',
  'Perfect for getting started in car audio competitions',
  '["Browse all events", "Basic profile creation", "Score tracking", "Community access", "Mobile app access"]',
  '["view_events", "register_events", "track_scores", "create_profile", "join_teams"]',
  '{"max_events_per_month": 5, "max_audio_systems": 1}',
  true,
  false,
  1
),
(
  gen_random_uuid(),
  'Pro Competitor',
  'competitor',
  29.99,
  'yearly',
  'Advanced features for serious competitors',
  '["Everything in Free", "Advanced analytics", "Team management", "Priority event registration", "Custom system showcase", "Competition history export", "Early access to new features"]',
  '["view_events", "register_events", "track_scores", "create_profile", "join_teams", "advanced_analytics", "priority_registration", "custom_showcase", "export_history"]',
  '{"max_events_per_month": 25, "max_audio_systems": 5, "max_team_memberships": 3}',
  true,
  true,
  2
),
(
  gen_random_uuid(),
  'Retailer Basic',
  'retailer',
  49.99,
  'monthly',
  'For small retailers and installers',
  '["Directory listing", "Basic event creation", "Customer analytics", "Advertising options", "Email support"]',
  '["view_events", "create_events", "directory_listing", "customer_analytics", "advertising"]',
  '{"max_listings": 10, "max_events_per_month": 5}',
  true,
  false,
  3
),
(
  gen_random_uuid(),
  'Retailer Pro',
  'retailer',
  99.99,
  'monthly',
  'For established retailers and installers',
  '["Everything in Basic", "Unlimited listings", "Advanced event management", "Sponsorship tools", "API access", "Priority support"]',
  '["view_events", "create_events", "directory_listing", "customer_analytics", "advertising", "sponsorship_tools", "api_access", "priority_support", "bulk_operations"]',
  '{"max_events_per_month": 50, "max_team_memberships": 10}',
  true,
  true,
  4
),
(
  gen_random_uuid(),
  'Manufacturer Basic',
  'manufacturer',
  149.99,
  'monthly',
  'For small to medium manufacturers',
  '["Brand profile", "Product listings", "Basic event sponsorship", "Customer insights", "Standard support"]',
  '["view_events", "create_events", "directory_listing", "customer_analytics", "advertising", "sponsorship_tools"]',
  '{"max_listings": 25, "max_events_per_month": 10}',
  true,
  false,
  5
),
(
  gen_random_uuid(),
  'Manufacturer Pro',
  'manufacturer',
  299.99,
  'monthly',
  'For established manufacturers',
  '["Everything in Basic", "Premium brand placement", "Advanced event sponsorship", "Market analytics", "API access", "Priority support", "Custom integrations"]',
  '["view_events", "create_events", "directory_listing", "customer_analytics", "advertising", "sponsorship_tools", "api_access", "priority_support", "bulk_operations", "white_label"]',
  '{"max_events_per_month": 100, "max_team_memberships": 25}',
  true,
  true,
  6
),
(
  gen_random_uuid(),
  'Organization Basic',
  'organization',
  79.99,
  'monthly',
  'For car audio clubs and small organizations',
  '["Organization profile", "Event hosting", "Member management", "Basic analytics", "Standard support"]',
  '["view_events", "create_events", "directory_listing", "member_management", "basic_analytics"]',
  '{"max_events_per_month": 15, "max_members": 100}',
  true,
  false,
  7
),
(
  gen_random_uuid(),
  'Organization Pro',
  'organization',
  199.99,
  'monthly',
  'For competition organizers and large clubs',
  '["Everything in Basic", "Advanced event management", "Competition scoring tools", "Member analytics", "API access", "Priority support", "Custom branding"]',
  '["view_events", "create_events", "directory_listing", "member_management", "advanced_analytics", "api_access", "priority_support", "custom_branding"]',
  '{"max_events_per_month": 50, "max_members": 500}',
  true,
  true,
  8
);

-- Add admin settings
INSERT INTO public.admin_settings (key_name, key_value, is_sensitive, updated_by)
VALUES
('site_name', 'Car Audio Events', false, NULL),
('contact_email', 'support@caraudioevents.com', false, NULL),
('support_phone', '+1 (555) 123-4567', false, NULL),
('enable_registration', 'true', false, NULL),
('enable_payments', 'true', false, NULL),
('maintenance_mode', 'false', false, NULL),
('login_debug_mode', 'false', false, NULL),
('default_currency', 'USD', false, NULL),
('tax_rate', '7.5', false, NULL),
('max_file_upload_size', '10485760', false, NULL)
ON CONFLICT (key_name) DO UPDATE SET
  key_value = EXCLUDED.key_value,
  updated_at = now();

-- Create auth users for sample data
-- Note: We need to create auth users first before creating public.users due to foreign key constraint
DO $$
DECLARE
  -- Auth user IDs
  auth_competitor_id uuid;
  auth_retailer_id uuid;
  auth_manufacturer_id uuid;
  auth_organization_id uuid;
  
  -- Organization IDs
  retailer_org_id uuid := gen_random_uuid();
  manufacturer_org_id uuid := gen_random_uuid();
  organization_org_id uuid := gen_random_uuid();
BEGIN
  -- First, check if these users already exist in auth.users
  SELECT id INTO auth_competitor_id FROM auth.users WHERE email = 'competitor@example.com';
  SELECT id INTO auth_retailer_id FROM auth.users WHERE email = 'retailer@example.com';
  SELECT id INTO auth_manufacturer_id FROM auth.users WHERE email = 'manufacturer@example.com';
  SELECT id INTO auth_organization_id FROM auth.users WHERE email = 'organization@example.com';
  
  -- If users don't exist in auth.users, we'll create them
  -- Note: This requires service role permissions
  IF auth_competitor_id IS NULL THEN
    auth_competitor_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      auth_competitor_id,
      'authenticated',
      'authenticated',
      'competitor@example.com',
      crypt('Password123!', gen_salt('bf')),
      now(),
      NULL,
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "John Smith", "membership_type": "competitor"}',
      now() - interval '60 days',
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;
  
  IF auth_retailer_id IS NULL THEN
    auth_retailer_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      auth_retailer_id,
      'authenticated',
      'authenticated',
      'retailer@example.com',
      crypt('Password123!', gen_salt('bf')),
      now(),
      NULL,
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Sarah Johnson", "membership_type": "retailer"}',
      now() - interval '45 days',
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;
  
  IF auth_manufacturer_id IS NULL THEN
    auth_manufacturer_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      auth_manufacturer_id,
      'authenticated',
      'authenticated',
      'manufacturer@example.com',
      crypt('Password123!', gen_salt('bf')),
      now(),
      NULL,
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Michael Chen", "membership_type": "manufacturer"}',
      now() - interval '30 days',
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;
  
  IF auth_organization_id IS NULL THEN
    auth_organization_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      auth_organization_id,
      'authenticated',
      'authenticated',
      'organization@example.com',
      crypt('Password123!', gen_salt('bf')),
      now(),
      NULL,
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Emily Rodriguez", "membership_type": "organization"}',
      now() - interval '20 days',
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;
  
  -- Now create the public.users records
  INSERT INTO public.users (
    id,
    email,
    name,
    membership_type,
    status,
    location,
    phone,
    website,
    bio,
    company_name,
    verification_status,
    subscription_plan,
    created_at,
    updated_at
  ) VALUES
  (
    auth_competitor_id,
    'competitor@example.com',
    'John Smith',
    'competitor',
    'active',
    'Orlando, FL',
    '+1 (555) 123-4567',
    'https://johnsmith.example.com',
    'Passionate car audio enthusiast with 10 years of competition experience. Specializing in sound quality builds with a focus on accurate staging and imaging.',
    NULL,
    'verified',
    'pro',
    now() - interval '60 days',
    now()
  ),
  (
    auth_retailer_id,
    'retailer@example.com',
    'Sarah Johnson',
    'retailer',
    'active',
    'Phoenix, AZ',
    '+1 (555) 234-5678',
    'https://premiumaudio.example.com',
    'Owner of Premium Audio Solutions, specializing in high-end car audio installations and custom fabrication.',
    'Premium Audio Solutions',
    'verified',
    'business',
    now() - interval '45 days',
    now()
  ),
  (
    auth_manufacturer_id,
    'manufacturer@example.com',
    'Michael Chen',
    'manufacturer',
    'active',
    'Atlanta, GA',
    '+1 (555) 345-6789',
    'https://soundwave.example.com',
    'CEO of SoundWave Audio, manufacturing premium speakers and amplifiers for competition and audiophile markets.',
    'SoundWave Audio',
    'verified',
    'enterprise',
    now() - interval '30 days',
    now()
  ),
  (
    auth_organization_id,
    'organization@example.com',
    'Emily Rodriguez',
    'organization',
    'active',
    'Miami, FL',
    '+1 (555) 456-7890',
    'https://audioleague.example.com',
    'Director of Audio Competition League, organizing professional car audio competitions across the country.',
    'Audio Competition League',
    'verified',
    'enterprise',
    now() - interval '20 days',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    membership_type = EXCLUDED.membership_type,
    status = EXCLUDED.status,
    location = EXCLUDED.location,
    phone = EXCLUDED.phone,
    website = EXCLUDED.website,
    bio = EXCLUDED.bio,
    company_name = EXCLUDED.company_name,
    verification_status = EXCLUDED.verification_status,
    subscription_plan = EXCLUDED.subscription_plan,
    updated_at = now();
  
  -- Create organizations for business users
  INSERT INTO public.organizations (
    id,
    name,
    type,
    description,
    website,
    phone,
    email,
    address,
    city,
    state,
    country,
    logo_url,
    verification_status,
    is_active,
    owner_id
  ) VALUES
  (
    retailer_org_id,
    'Premium Audio Solutions',
    'retailer',
    'High-end car audio installation and custom fabrication shop with over 15 years of experience.',
    'https://premiumaudio.example.com',
    '+1 (555) 234-5678',
    'info@premiumaudio.example.com',
    '123 Main Street',
    'Phoenix',
    'AZ',
    'US',
    'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2',
    'verified',
    true,
    auth_retailer_id
  ),
  (
    manufacturer_org_id,
    'SoundWave Audio',
    'manufacturer',
    'Premium manufacturer of competition-grade speakers, amplifiers, and processors.',
    'https://soundwave.example.com',
    '+1 (555) 345-6789',
    'info@soundwave.example.com',
    '456 Tech Parkway',
    'Atlanta',
    'GA',
    'US',
    'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2',
    'verified',
    true,
    auth_manufacturer_id
  ),
  (
    organization_org_id,
    'Audio Competition League',
    'organization',
    'Professional organization hosting car audio competitions and events nationwide.',
    'https://audioleague.example.com',
    '+1 (555) 456-7890',
    'info@audioleague.example.com',
    '789 Event Center Blvd',
    'Miami',
    'FL',
    'US',
    'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2',
    'verified',
    true,
    auth_organization_id
  );
  
  -- Update users with organization IDs - Fixed ambiguous column references by using different variable names
  UPDATE public.users SET organization_id = retailer_org_id WHERE id = auth_retailer_id;
  UPDATE public.users SET organization_id = manufacturer_org_id WHERE id = auth_manufacturer_id;
  UPDATE public.users SET organization_id = organization_org_id WHERE id = auth_organization_id;
  
  -- Create user preferences
  INSERT INTO public.user_preferences (
    user_id,
    email_notifications,
    event_reminders,
    team_notifications,
    competition_updates,
    marketing_emails,
    profile_visibility,
    show_competition_results,
    show_audio_system,
    show_location,
    preferred_units,
    timezone
  )
  SELECT 
    id,
    true,
    true,
    true,
    true,
    false,
    'public',
    true,
    true,
    true,
    'imperial',
    'America/New_York'
  FROM public.users
  WHERE id IN (auth_competitor_id, auth_retailer_id, auth_manufacturer_id, auth_organization_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create audio systems for competitor
  WITH inserted_system AS (
    INSERT INTO public.user_audio_systems (
      user_id,
      name,
      description,
      vehicle_year,
      vehicle_make,
      vehicle_model,
      vehicle_color,
      system_type,
      total_power_watts,
      estimated_cost,
      is_primary,
      is_public
    ) VALUES (
      auth_competitor_id,
      'Competition SQ Build',
      'My main competition sound quality system focused on accurate staging and imaging.',
      2022,
      'Toyota',
      'Camry',
      'Pearl White',
      'sound_quality',
      2500,
      12500.00,
      true,
      true
    ) RETURNING id
  )
  -- Add components to the system
  INSERT INTO public.audio_components (
    system_id,
    category,
    brand,
    model,
    description,
    power_watts,
    impedance_ohms,
    price
  ) VALUES
  (
    (SELECT id FROM inserted_system),
    'head_unit',
    'Alpine',
    'F900',
    'High-resolution head unit with digital signal processing',
    NULL,
    NULL,
    1299.99
  ),
  (
    (SELECT id FROM inserted_system),
    'amplifier',
    'JL Audio',
    'HD900/5',
    '5-channel amplifier for full system power',
    900,
    NULL,
    1199.99
  ),
  (
    (SELECT id FROM inserted_system),
    'speakers',
    'Focal',
    'Utopia M',
    '3-way component speaker system',
    150,
    4.00,
    2499.99
  ),
  (
    (SELECT id FROM inserted_system),
    'subwoofers',
    'JL Audio',
    '12W7AE',
    '12-inch subwoofer in custom sealed enclosure',
    1000,
    3.00,
    1499.99
  ),
  (
    (SELECT id FROM inserted_system),
    'processor',
    'Helix',
    'DSP Ultra',
    'High-end digital signal processor with time alignment',
    NULL,
    NULL,
    1999.99
  ),
  (
    (SELECT id FROM inserted_system),
    'wiring',
    'Stinger',
    '4000 Series',
    'Complete OFC wiring kit with distribution blocks',
    NULL,
    NULL,
    499.99
  ),
  (
    (SELECT id FROM inserted_system),
    'damping',
    'Dynamat',
    'Xtreme',
    'Complete sound deadening treatment throughout vehicle',
    NULL,
    NULL,
    799.99
  );
  
  -- Create a team
  WITH inserted_team AS (
    INSERT INTO public.teams (
      name,
      description,
      team_type,
      location,
      website,
      is_public,
      requires_approval,
      max_members,
      total_points,
      competitions_won,
      owner_id
    ) VALUES (
      'SoundWave Competitors',
      'A team of dedicated sound quality competitors sponsored by SoundWave Audio.',
      'competitive',
      'Orlando, FL',
      'https://soundwave-team.example.com',
      true,
      true,
      20,
      1250,
      3,
      auth_competitor_id
    ) RETURNING id
  )
  -- Add team members
  INSERT INTO public.team_members (
    team_id,
    user_id,
    role,
    points_contributed,
    is_active
  ) VALUES
  (
    (SELECT id FROM inserted_team),
    auth_competitor_id,
    'owner',
    450,
    true
  ),
  (
    (SELECT id FROM inserted_team),
    auth_retailer_id,
    'member',
    0,
    true
  );
  
  -- Create competition results for the competitor
  INSERT INTO public.competition_results (
    user_id,
    event_id,
    category,
    class,
    overall_score,
    placement,
    total_participants,
    points_earned,
    sound_quality_score,
    installation_score,
    presentation_score,
    notes,
    competed_at
  ) VALUES
  (
    auth_competitor_id,
    '650e8400-e29b-41d4-a716-446655440003'::uuid, -- MECA Spring Championship
    'Sound Quality',
    'Modified',
    87.5,
    3,
    24,
    150,
    89.2,
    85.0,
    88.3,
    'Great imaging and staging, needs improvement in midbass impact.',
    '2025-05-11T14:30:00Z'
  ),
  (
    auth_competitor_id,
    '650e8400-e29b-41d4-a716-446655440002'::uuid, -- dB Drag National Event
    'SPL',
    'Street',
    NULL,
    7,
    32,
    85,
    NULL,
    NULL,
    NULL,
    'Hit 142.3 dB, good showing in a competitive class.',
    '2025-04-23T16:45:00Z'
  );
  
  -- Check the event_registrations table structure to determine if event_id is integer or uuid
  -- If it's integer, we need to cast the UUID to integer or text
  -- For this migration, we'll use a safer approach by checking the column type first
  
  -- Create event registrations - Using a safer approach with explicit type checking
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_registrations' 
    AND column_name = 'event_id' 
    AND data_type = 'integer'
  ) THEN
    -- If event_id is integer, we'll convert the UUID to text and then to integer
    -- This is a workaround for the specific sample data
    INSERT INTO public.event_registrations (
      user_id,
      event_id,
      payment_status,
      registered_at
    ) VALUES
    (
      auth_competitor_id,
      1, -- Using integer value instead of UUID
      'pending',
      now() - interval '5 days'
    ),
    (
      auth_competitor_id,
      3, -- Using integer value instead of UUID
      'completed',
      now() - interval '30 days'
    ),
    (
      auth_competitor_id,
      2, -- Using integer value instead of UUID
      'completed',
      now() - interval '45 days'
    );
  ELSE
    -- If event_id is UUID, we can use the UUID directly
    INSERT INTO public.event_registrations (
      user_id,
      event_id,
      payment_status,
      registered_at
    ) VALUES
    (
      auth_competitor_id,
      '650e8400-e29b-41d4-a716-446655440001'::uuid, -- IASCA World Finals 2025
      'pending',
      now() - interval '5 days'
    ),
    (
      auth_competitor_id,
      '650e8400-e29b-41d4-a716-446655440003'::uuid, -- MECA Spring Championship
      'completed',
      now() - interval '30 days'
    ),
    (
      auth_competitor_id,
      '650e8400-e29b-41d4-a716-446655440002'::uuid, -- dB Drag National Event
      'completed',
      now() - interval '45 days'
    );
  END IF;
  
  -- Create user subscriptions
  INSERT INTO public.user_subscriptions (
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end
  ) VALUES
  (
    auth_competitor_id,
    'pro',
    'active',
    now() - interval '30 days',
    now() + interval '335 days'
  ),
  (
    auth_retailer_id,
    'business',
    'active',
    now() - interval '15 days',
    now() + interval '15 days'
  ),
  (
    auth_manufacturer_id,
    'enterprise',
    'active',
    now() - interval '60 days',
    now() + interval '30 days'
  ),
  (
    auth_organization_id,
    'enterprise',
    'active',
    now() - interval '45 days',
    now() + interval '45 days'
  );
  
  -- Create event images for existing events
  INSERT INTO public.event_images (
    event_id,
    image_url,
    image_type,
    title,
    is_primary,
    uploaded_by
  ) VALUES
  (
    '650e8400-e29b-41d4-a716-446655440001'::uuid, -- IASCA World Finals 2025
    'https://images.pexels.com/photos/1127000/pexels-photo-1127000.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&dpr=2',
    'flyer',
    'IASCA World Finals 2025 Official Flyer',
    true,
    auth_organization_id
  ),
  (
    '650e8400-e29b-41d4-a716-446655440002'::uuid, -- dB Drag National Event
    'https://images.pexels.com/photos/1644888/pexels-photo-1644888.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&dpr=2',
    'flyer',
    'dB Drag National Event Flyer',
    true,
    auth_organization_id
  ),
  (
    '650e8400-e29b-41d4-a716-446655440003'::uuid, -- MECA Spring Championship
    'https://images.pexels.com/photos/2449600/pexels-photo-2449600.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&dpr=2',
    'flyer',
    'MECA Spring Championship Flyer',
    true,
    auth_organization_id
  );
  
  -- Create additional events with proper data
  WITH category_ids AS (
    SELECT id, name FROM event_categories
  ),
  inserted_event AS (
    INSERT INTO public.events (
      title,
      description,
      category_id,
      start_date,
      end_date,
      registration_deadline,
      max_participants,
      current_participants,
      registration_fee,
      early_bird_fee,
      early_bird_deadline,
      venue_name,
      address,
      city,
      state,
      zip_code,
      country,
      organizer_id,
      organization_id,
      contact_email,
      contact_phone,
      website,
      status,
      approval_status,
      approved_by,
      approved_at,
      features,
      rules,
      prizes,
      schedule,
      sponsors,
      is_featured,
      is_public
    ) VALUES (
      'Summer Sound Showcase 2025',
      'Join us for the ultimate summer car audio event featuring both sound quality and SPL competitions. This family-friendly event includes vendor displays, food trucks, and live demonstrations.',
      (SELECT id FROM category_ids WHERE name = 'Sound Quality'),
      '2025-07-15 09:00:00+00',
      '2025-07-17 18:00:00+00',
      '2025-07-01 23:59:59+00',
      150,
      0,
      75.00,
      60.00,
      '2025-06-15 23:59:59+00',
      'Sunshine Convention Center',
      '123 Beach Boulevard',
      'Tampa',
      'FL',
      '33602',
      'US',
      auth_organization_id,
      organization_org_id,
      'events@audioleague.example.com',
      '+1 (555) 456-7890',
      'https://audioleague.example.com/summer-showcase',
      'published',
      'approved',
      auth_organization_id,
      now() - interval '5 days',
      '{"parking": true, "food_vendors": true, "vendor_booths": true, "family_friendly": true}',
      'IASCA and MECA rules apply for respective competition categories. All vehicles must pass safety inspection.',
      '[{"place": "SQ Best of Show", "prize": "$2,000 + Trophy"}, {"place": "SPL King", "prize": "$2,000 + Trophy"}, {"place": "Best Installation", "prize": "$1,000 + Trophy"}]',
      '[{"time": "09:00", "activity": "Registration & Check-in"}, {"time": "10:30", "activity": "Sound Quality Judging Begins"}, {"time": "13:00", "activity": "Lunch Break"}, {"time": "14:00", "activity": "SPL Competition"}, {"time": "16:30", "activity": "Awards Ceremony"}]',
      '[{"name": "SoundWave Audio", "level": "Platinum"}, {"name": "Premium Audio Solutions", "level": "Gold"}, {"name": "Car Audio Magazine", "level": "Media"}]',
      true,
      true
    ) RETURNING id
  )
  -- Add event images
  INSERT INTO public.event_images (
    event_id,
    image_url,
    image_type,
    title,
    is_primary,
    uploaded_by
  ) VALUES
  (
    (SELECT id FROM inserted_event),
    'https://images.pexels.com/photos/2251206/pexels-photo-2251206.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&dpr=2',
    'flyer',
    'Summer Sound Showcase 2025 Official Flyer',
    true,
    auth_organization_id
  ),
  (
    (SELECT id FROM inserted_event),
    'https://images.pexels.com/photos/2251206/pexels-photo-2251206.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&dpr=2',
    'banner',
    'Summer Sound Showcase 2025 Banner',
    false,
    auth_organization_id
  );
  
  -- Create a retailer-hosted event
  WITH category_ids AS (
    SELECT id, name FROM event_categories
  ),
  inserted_event AS (
    INSERT INTO public.events (
      title,
      description,
      category_id,
      start_date,
      end_date,
      registration_deadline,
      max_participants,
      current_participants,
      registration_fee,
      venue_name,
      address,
      city,
      state,
      zip_code,
      country,
      organizer_id,
      organization_id,
      contact_email,
      contact_phone,
      website,
      status,
      approval_status,
      approved_by,
      approved_at,
      features,
      rules,
      prizes,
      schedule,
      sponsors,
      is_featured,
      is_public
    ) VALUES (
      'Installation Workshop & Showcase',
      'Learn professional installation techniques from our expert installers. This hands-on workshop covers sound deadening, wiring best practices, and custom fabrication basics.',
      (SELECT id FROM category_ids WHERE name = 'Workshop'),
      '2025-08-05 10:00:00+00',
      '2025-08-05 16:00:00+00',
      '2025-08-01 23:59:59+00',
      30,
      0,
      25.00,
      'Premium Audio Solutions',
      '123 Main Street',
      'Phoenix',
      'AZ',
      '85001',
      'US',
      auth_retailer_id,
      retailer_org_id,
      'workshops@premiumaudio.example.com',
      '+1 (555) 234-5678',
      'https://premiumaudio.example.com/workshops',
      'published',
      'approved',
      auth_retailer_id,
      now() - interval '10 days',
      '{"parking": true, "lunch_provided": true, "take_home_materials": true}',
      'All tools provided. No experience necessary. Must be 18+ to participate in hands-on activities.',
      '[{"place": "Best Student Project", "prize": "$100 Store Credit + Certificate"}]',
      '[{"time": "10:00", "activity": "Introduction & Safety Briefing"}, {"time": "10:30", "activity": "Sound Deadening Techniques"}, {"time": "12:00", "activity": "Lunch Break"}, {"time": "13:00", "activity": "Wiring Best Practices"}, {"time": "14:30", "activity": "Basic Fabrication"}, {"time": "15:30", "activity": "Q&A and Showcase"}]',
      '[{"name": "Dynamat", "level": "Materials Sponsor"}, {"name": "Stinger", "level": "Tools Sponsor"}]',
      false,
      true
    ) RETURNING id
  )
  -- Add event images
  INSERT INTO public.event_images (
    event_id,
    image_url,
    image_type,
    title,
    is_primary,
    uploaded_by
  ) VALUES
  (
    (SELECT id FROM inserted_event),
    'https://images.pexels.com/photos/3807319/pexels-photo-3807319.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&dpr=2',
    'flyer',
    'Installation Workshop Flyer',
    true,
    auth_retailer_id
  );
  
  -- Create a manufacturer-hosted event
  WITH category_ids AS (
    SELECT id, name FROM event_categories
  ),
  inserted_event AS (
    INSERT INTO public.events (
      title,
      description,
      category_id,
      start_date,
      end_date,
      registration_deadline,
      max_participants,
      current_participants,
      registration_fee,
      venue_name,
      address,
      city,
      state,
      zip_code,
      country,
      organizer_id,
      organization_id,
      contact_email,
      contact_phone,
      website,
      status,
      approval_status,
      approved_by,
      approved_at,
      features,
      rules,
      prizes,
      schedule,
      sponsors,
      is_featured,
      is_public
    ) VALUES (
      'SoundWave Product Launch & Demo Day',
      'Be the first to experience our new line of competition-grade speakers and amplifiers. Product demonstrations, technical presentations, and special launch day discounts.',
      (SELECT id FROM category_ids WHERE name = 'Exhibition'),
      '2025-09-12 11:00:00+00',
      '2025-09-12 19:00:00+00',
      '2025-09-10 23:59:59+00',
      200,
      0,
      0.00,
      'Atlanta Audio Expo Center',
      '456 Tech Parkway',
      'Atlanta',
      'GA',
      '30303',
      'US',
      auth_manufacturer_id,
      manufacturer_org_id,
      'events@soundwave.example.com',
      '+1 (555) 345-6789',
      'https://soundwave.example.com/launch2025',
      'published',
      'approved',
      auth_manufacturer_id,
      now() - interval '15 days',
      '{"parking": true, "food_vendors": true, "product_demos": true, "giveaways": true}',
      'Free admission. Registration required for capacity planning. Must be present to win giveaway items.',
      '[{"place": "Door Prize", "prize": "SoundWave Pro Component Set"}, {"place": "Social Media Contest", "prize": "SoundWave 1000W Amplifier"}]',
      '[{"time": "11:00", "activity": "Doors Open"}, {"time": "12:00", "activity": "Welcome Presentation"}, {"time": "12:30", "activity": "New Product Unveiling"}, {"time": "13:30", "activity": "Technical Demonstrations"}, {"time": "15:00", "activity": "Q&A with Engineers"}, {"time": "16:00", "activity": "Demo Vehicles Showcase"}, {"time": "18:00", "activity": "Giveaway Drawing"}]',
      '[{"name": "SoundWave Audio", "level": "Host"}, {"name": "Car Audio Magazine", "level": "Media Partner"}, {"name": "AudiophileReviews.com", "level": "Media Partner"}]',
      true,
      true
    ) RETURNING id
  )
  -- Add event images
  INSERT INTO public.event_images (
    event_id,
    image_url,
    image_type,
    title,
    is_primary,
    uploaded_by
  ) VALUES
  (
    (SELECT id FROM inserted_event),
    'https://images.pexels.com/photos/2110951/pexels-photo-2110951.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&dpr=2',
    'flyer',
    'SoundWave Product Launch Flyer',
    true,
    auth_manufacturer_id
  ),
  (
    (SELECT id FROM inserted_event),
    'https://images.pexels.com/photos/2110951/pexels-photo-2110951.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&dpr=2',
    'banner',
    'SoundWave Product Launch Banner',
    false,
    auth_manufacturer_id
  );
END $$;

-- Update event participant counts based on registrations
UPDATE events e
SET current_participants = (
  SELECT COUNT(*) 
  FROM event_registrations er 
  WHERE er.event_id::text = e.id::text
);