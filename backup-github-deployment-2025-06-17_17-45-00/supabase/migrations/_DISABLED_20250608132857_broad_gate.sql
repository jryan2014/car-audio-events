/*
  # Add Sample Events for Map Display

  1. Sample Data
    - Creates sample events with proper geocoded locations
    - Includes various event categories and organizations
    - Sets events to published status so they appear on map
  
  2. Organizations
    - Creates sample organizations to host events
    - Includes logos and contact information
  
  3. Event Categories
    - Ensures all categories have proper styling
*/

-- Insert sample organizations first
INSERT INTO organizations (id, name, type, description, website, phone, email, city, state, country, logo_url, verification_status, is_active, created_at, updated_at) VALUES
(gen_random_uuid(), 'IASCA International', 'organization', 'International Auto Sound Challenge Association', 'https://iasca.com', '+1-555-0123', 'info@iasca.com', 'Oklahoma City', 'OK', 'US', 'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', 'verified', true, now(), now()),
(gen_random_uuid(), 'dB Drag Racing Association', 'organization', 'Sound Pressure Level Competition Organization', 'https://dbdrag.com', '+1-555-0456', 'info@dbdrag.com', 'Tulsa', 'OK', 'US', 'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', 'verified', true, now(), now()),
(gen_random_uuid(), 'MECA Audio', 'organization', 'Mobile Electronics Competition Association', 'https://meca.org', '+1-555-0789', 'info@meca.org', 'Phoenix', 'AZ', 'US', 'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', 'verified', true, now(), now()),
(gen_random_uuid(), 'Bass Race Events', 'organization', 'Bass Competition Specialists', 'https://bassrace.com', '+1-555-0321', 'info@bassrace.com', 'Las Vegas', 'NV', 'US', 'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', 'verified', true, now(), now()),
(gen_random_uuid(), 'Sound Quality Alliance', 'organization', 'Premium Sound Quality Events', 'https://sqalliance.com', '+1-555-0654', 'info@sqalliance.com', 'Atlanta', 'GA', 'US', 'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', 'verified', true, now(), now()),
(gen_random_uuid(), 'Mobile Electronics Expo', 'organization', 'Trade Shows and Exhibitions', 'https://mobileexpo.com', '+1-555-0987', 'info@mobileexpo.com', 'Miami', 'FL', 'US', 'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', 'verified', true, now(), now())
ON CONFLICT DO NOTHING;

-- Get category IDs for reference
DO $$
DECLARE
    championship_id uuid;
    spl_id uuid;
    sq_id uuid;
    bass_id uuid;
    local_id uuid;
    exhibition_id uuid;
    iasca_org_id uuid;
    dbdrag_org_id uuid;
    meca_org_id uuid;
    bassrace_org_id uuid;
    sqalliance_org_id uuid;
    mobileexpo_org_id uuid;
BEGIN
    -- Get category IDs
    SELECT id INTO championship_id FROM event_categories WHERE name = 'Championship';
    SELECT id INTO spl_id FROM event_categories WHERE name = 'SPL Competition';
    SELECT id INTO sq_id FROM event_categories WHERE name = 'Sound Quality';
    SELECT id INTO bass_id FROM event_categories WHERE name = 'Bass Competition';
    SELECT id INTO local_id FROM event_categories WHERE name = 'Local Event';
    SELECT id INTO exhibition_id FROM event_categories WHERE name = 'Exhibition';
    
    -- Get organization IDs
    SELECT id INTO iasca_org_id FROM organizations WHERE name = 'IASCA International';
    SELECT id INTO dbdrag_org_id FROM organizations WHERE name = 'dB Drag Racing Association';
    SELECT id INTO meca_org_id FROM organizations WHERE name = 'MECA Audio';
    SELECT id INTO bassrace_org_id FROM organizations WHERE name = 'Bass Race Events';
    SELECT id INTO sqalliance_org_id FROM organizations WHERE name = 'Sound Quality Alliance';
    SELECT id INTO mobileexpo_org_id FROM organizations WHERE name = 'Mobile Electronics Expo';

    -- Insert sample events
    INSERT INTO events (
        id, title, description, category_id, start_date, end_date, registration_deadline,
        max_participants, current_participants, registration_fee, early_bird_fee, early_bird_deadline,
        venue_name, address, city, state, zip_code, country, latitude, longitude,
        organization_id, contact_email, contact_phone, website,
        status, approval_status, approved_at, features, rules, prizes, schedule,
        pin_color, pin_style, show_organization_logo, is_featured, is_public,
        created_at, updated_at
    ) VALUES
    (
        gen_random_uuid(),
        'IASCA World Finals 2025',
        'The ultimate car audio championship featuring the world''s best competitors from around the globe. This prestigious event brings together sound quality enthusiasts and SPL competitors to compete for the coveted IASCA World Championship title.',
        championship_id,
        '2025-03-15 10:00:00+00',
        '2025-03-17 18:00:00+00',
        '2025-03-01 23:59:59+00',
        200,
        150,
        150.00,
        125.00,
        '2025-02-15 23:59:59+00',
        'Orange County Convention Center',
        '9800 International Dr',
        'Orlando',
        'FL',
        '32819',
        'US',
        28.5383,
        -81.3792,
        iasca_org_id,
        'worldfinals@iasca.com',
        '+1-555-0123',
        'https://iasca.com/worldfinals',
        'published',
        'approved',
        now(),
        '{"parking": true, "food_vendors": true, "vendor_booths": true, "live_streaming": true}',
        'IASCA official rules apply. All vehicles must pass tech inspection.',
        '[{"place": "1st Place Overall", "prize": "$5,000 + Trophy"}, {"place": "2nd Place Overall", "prize": "$3,000 + Trophy"}, {"place": "3rd Place Overall", "prize": "$1,500 + Trophy"}, {"place": "Best of Show", "prize": "$1,000 + Trophy"}]',
        '[{"time": "08:00", "activity": "Registration & Tech Inspection"}, {"time": "10:00", "activity": "Sound Quality Judging Begins"}, {"time": "12:00", "activity": "SPL Competition Round 1"}, {"time": "14:00", "activity": "Lunch Break"}, {"time": "15:00", "activity": "SPL Competition Finals"}, {"time": "17:00", "activity": "Awards Ceremony"}]',
        '#ef4444',
        'championship',
        true,
        true,
        true,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        'dB Drag National Event',
        'Pure loudness competition - see who can hit the highest decibel levels. This SPL-focused event features multiple classes and the latest in high-powered car audio systems.',
        spl_id,
        '2025-04-22 09:00:00+00',
        '2025-04-24 17:00:00+00',
        '2025-04-10 23:59:59+00',
        150,
        89,
        75.00,
        60.00,
        '2025-04-01 23:59:59+00',
        'Phoenix Raceway',
        '7602 Jimmie Johnson Dr',
        'Phoenix',
        'AZ',
        '85143',
        'US',
        33.4484,
        -112.0740,
        dbdrag_org_id,
        'nationals@dbdrag.com',
        '+1-555-0456',
        'https://dbdrag.com/nationals',
        'published',
        'approved',
        now(),
        '{"parking": true, "food_vendors": true, "sound_meter_rental": true}',
        'dB Drag official rules. Sound meters provided. Safety equipment required.',
        '[{"place": "Loudest Overall", "prize": "$2,500 + Trophy"}, {"place": "Street Class Winner", "prize": "$1,000 + Trophy"}, {"place": "Extreme Class Winner", "prize": "$1,500 + Trophy"}]',
        '[{"time": "09:00", "activity": "Registration Opens"}, {"time": "10:00", "activity": "Tech Inspection"}, {"time": "11:00", "activity": "Practice Runs"}, {"time": "13:00", "activity": "Competition Begins"}, {"time": "16:00", "activity": "Finals"}, {"time": "17:00", "activity": "Awards"}]',
        '#f97316',
        'spl',
        true,
        false,
        true,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        'MECA Spring Championship',
        'Precision and clarity take center stage in this sound quality focused event. Judges will evaluate tonal accuracy, staging, and imaging in this prestigious competition.',
        sq_id,
        '2025-05-10 08:00:00+00',
        '2025-05-12 16:00:00+00',
        '2025-04-25 23:59:59+00',
        100,
        67,
        100.00,
        85.00,
        '2025-04-20 23:59:59+00',
        'Georgia World Congress Center',
        '285 Andrew Young International Blvd NW',
        'Atlanta',
        'GA',
        '30313',
        'US',
        33.7490,
        -84.3880,
        meca_org_id,
        'spring@meca.org',
        '+1-555-0789',
        'https://meca.org/spring',
        'published',
        'approved',
        now(),
        '{"parking": true, "food_vendors": true, "quiet_judging_area": true}',
        'MECA sound quality rules. Judging by certified MECA judges only.',
        '[{"place": "SQ Champion", "prize": "$3,000 + Trophy"}, {"place": "Street SQ Winner", "prize": "$1,500 + Trophy"}, {"place": "Modified SQ Winner", "prize": "$2,000 + Trophy"}]',
        '[{"time": "08:00", "activity": "Registration"}, {"time": "09:00", "activity": "Sound Quality Judging Round 1"}, {"time": "12:00", "activity": "Lunch"}, {"time": "13:00", "activity": "Semi-Finals"}, {"time": "15:00", "activity": "Finals"}, {"time": "16:00", "activity": "Awards"}]',
        '#8b5cf6',
        'sound_quality',
        true,
        true,
        true,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        'Local Sound Off Challenge',
        'Regional competition perfect for newcomers and experienced competitors alike. A great way to get started in car audio competition or tune up for larger events.',
        local_id,
        '2025-06-05 10:00:00+00',
        '2025-06-05 18:00:00+00',
        '2025-05-30 23:59:59+00',
        75,
        45,
        35.00,
        25.00,
        '2025-05-25 23:59:59+00',
        'Dallas Convention Center',
        '650 S Griffin St',
        'Dallas',
        'TX',
        '75202',
        'US',
        32.7767,
        -96.7970,
        NULL,
        'info@localsoundoff.com',
        '+1-555-0321',
        'https://localsoundoff.com',
        'published',
        'approved',
        now(),
        '{"parking": true, "beginner_friendly": true, "equipment_demos": true}',
        'Beginner-friendly rules. Equipment demonstrations available.',
        '[{"place": "Overall Winner", "prize": "$500 + Trophy"}, {"place": "Best Newcomer", "prize": "$250 + Trophy"}, {"place": "People''s Choice", "prize": "$100 + Trophy"}]',
        '[{"time": "10:00", "activity": "Registration"}, {"time": "11:00", "activity": "Equipment Demos"}, {"time": "13:00", "activity": "Competition"}, {"time": "17:00", "activity": "Awards"}]',
        '#10b981',
        'local',
        false,
        false,
        true,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        'Bass Race Championship',
        'Low-end focused competition showcasing the deepest bass systems. Multiple bass categories including sealed, ported, and bandpass enclosures.',
        bass_id,
        '2025-06-18 09:00:00+00',
        '2025-06-20 17:00:00+00',
        '2025-06-10 23:59:59+00',
        125,
        112,
        85.00,
        70.00,
        '2025-06-01 23:59:59+00',
        'Las Vegas Convention Center',
        '3150 Paradise Rd',
        'Las Vegas',
        'NV',
        '89109',
        'US',
        36.1699,
        -115.1398,
        bassrace_org_id,
        'championship@bassrace.com',
        '+1-555-0654',
        'https://bassrace.com/championship',
        'published',
        'approved',
        now(),
        '{"parking": true, "food_vendors": true, "bass_demos": true, "vendor_area": true}',
        'Bass Race official rules. Frequency sweeps and bass demos included.',
        '[{"place": "Bass Champion", "prize": "$2,000 + Trophy"}, {"place": "Sealed Class", "prize": "$1,000 + Trophy"}, {"place": "Ported Class", "prize": "$1,200 + Trophy"}, {"place": "Bandpass Class", "prize": "$800 + Trophy"}]',
        '[{"time": "09:00", "activity": "Registration"}, {"time": "10:00", "activity": "Bass Demos"}, {"time": "12:00", "activity": "Competition Round 1"}, {"time": "15:00", "activity": "Finals"}, {"time": "17:00", "activity": "Awards"}]',
        '#06b6d4',
        'bass',
        true,
        true,
        true,
        now(),
        now()
    ),
    (
        gen_random_uuid(),
        'Mobile Electronics Show',
        'Showcase event featuring the latest in mobile electronics and car audio gear. Perfect for seeing new products and meeting industry professionals.',
        exhibition_id,
        '2025-07-08 10:00:00+00',
        '2025-07-10 18:00:00+00',
        '2025-07-01 23:59:59+00',
        300,
        203,
        25.00,
        20.00,
        '2025-06-20 23:59:59+00',
        'Miami Beach Convention Center',
        '1901 Convention Center Dr',
        'Miami Beach',
        'FL',
        '33139',
        'US',
        25.7617,
        -80.1918,
        mobileexpo_org_id,
        'expo@mobileexpo.com',
        '+1-555-0987',
        'https://mobileexpo.com',
        'published',
        'approved',
        now(),
        '{"parking": true, "food_vendors": true, "vendor_booths": true, "product_demos": true, "seminars": true}',
        'Exhibition rules apply. No competition judging, display only.',
        '[{"place": "Best Display", "prize": "$1,000 + Trophy"}, {"place": "Most Innovative", "prize": "$750 + Trophy"}, {"place": "People''s Choice", "prize": "$500 + Trophy"}]',
        '[{"time": "10:00", "activity": "Doors Open"}, {"time": "11:00", "activity": "Product Seminars"}, {"time": "13:00", "activity": "Vendor Presentations"}, {"time": "15:00", "activity": "Product Demos"}, {"time": "17:00", "activity": "Awards"}]',
        '#6366f1',
        'exhibition',
        true,
        false,
        true,
        now(),
        now()
    );

END $$;

-- Create corresponding event locations for all events
INSERT INTO event_locations (
    event_id, raw_address, city, state, country, latitude, longitude,
    geocoding_status, geocoding_provider, geocoding_accuracy, formatted_address, geocoded_at
)
SELECT 
    e.id,
    e.address,
    e.city,
    e.state,
    e.country,
    e.latitude,
    e.longitude,
    'success',
    'manual',
    'exact',
    e.address || ', ' || e.city || ', ' || e.state || ', ' || e.country,
    now()
FROM events e
WHERE NOT EXISTS (
    SELECT 1 FROM event_locations el WHERE el.event_id = e.id
);