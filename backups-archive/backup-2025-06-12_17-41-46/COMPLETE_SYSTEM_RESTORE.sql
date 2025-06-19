-- COMPLETE SYSTEM RESTORE SCRIPT
-- This script restores the Car Audio Events Platform to full functionality
-- Based on conversation history and all features that were built

-- =============================================
-- 1. CONFIGURATION SYSTEM TABLES & DATA
-- =============================================

-- Insert configuration categories with all the categories we discussed
INSERT INTO configuration_categories (name, description) VALUES
('event_categories', 'Event category options for create event form'),
('venue_types', 'Venue type options'),
('status_options', 'Status options for events'),
('organization_types', 'Types of organizations'),
('competition_classes', 'Competition class categories'),
('audio_equipment_brands', 'Audio equipment brand options'),
('vehicle_makes', 'Vehicle manufacturer options'),
('membership_tiers', 'Membership tier options')
ON CONFLICT (name) DO NOTHING;

-- Insert all configuration options that were discussed
INSERT INTO configuration_options (category_id, name, value, display_order) 
SELECT 
  cc.id,
  options.name,
  options.value,
  options.display_order
FROM configuration_categories cc
CROSS JOIN (
  VALUES 
    -- Event Categories
    ('Bass Competition', 'bass_competition', 1),
    ('Championship', 'championship', 2),
    ('Sound Quality', 'sound_quality', 3),
    ('Install Competition', 'install_competition', 4),
    ('Meet & Greet', 'meet_greet', 5),
    ('dB Drag Racing', 'db_drag_racing', 6),
    ('SPL Competition', 'spl_competition', 7),
    ('Car Show', 'car_show', 8)
) AS options(name, value, display_order)
WHERE cc.name = 'event_categories'
UNION ALL
SELECT 
  cc.id,
  options.name,
  options.value,
  options.display_order
FROM configuration_categories cc
CROSS JOIN (
  VALUES 
    -- Venue Types
    ('Convention Center', 'convention_center', 1),
    ('Parking Lot', 'parking_lot', 2),
    ('Race Track', 'race_track', 3),
    ('Shopping Mall', 'shopping_mall', 4),
    ('Car Dealership', 'car_dealership', 5),
    ('Outdoor Park', 'outdoor_park', 6),
    ('Exhibition Hall', 'exhibition_hall', 7)
) AS options(name, value, display_order)
WHERE cc.name = 'venue_types'
UNION ALL
SELECT 
  cc.id,
  options.name,
  options.value,
  options.display_order
FROM configuration_categories cc
CROSS JOIN (
  VALUES 
    -- Status Options
    ('Draft', 'draft', 1),
    ('Published', 'published', 2),
    ('Cancelled', 'cancelled', 3),
    ('Completed', 'completed', 4),
    ('Registration Open', 'registration_open', 5),
    ('Registration Closed', 'registration_closed', 6)
) AS options(name, value, display_order)
WHERE cc.name = 'status_options'
ON CONFLICT DO NOTHING;

-- =============================================
-- 2. ORGANIZATIONS WITH LOGOS AND RULES
-- =============================================

-- Insert comprehensive organizations that were discussed
INSERT INTO organizations (name, description, organization_type, status, logo_url, small_logo_url, competition_classes, website) VALUES
('IASCA', 'International Auto Sound Challenge Association - Premier car audio competition organization', 'competition', 'active', 
 'https://example.com/logos/iasca.png', 'https://example.com/logos/iasca-small.png',
 '["Rookie", "Street", "Expert", "Pro", "Outlaw"]'::jsonb, 'https://iasca.com'),
 
('MECA', 'Mobile Electronics Competition Association - Sound quality focused competitions', 'competition', 'active',
 'https://example.com/logos/meca.png', 'https://example.com/logos/meca-small.png',
 '["Street", "Modified", "Extreme", "Pro"]'::jsonb, 'https://mecacaraudio.com'),
 
('dB Drag Racing', 'Sound pressure level competition organization', 'competition', 'active',
 'https://example.com/logos/dbdrag.png', 'https://example.com/logos/dbdrag-small.png',
 '["Street", "Pro", "Outlaw", "Extreme"]'::jsonb, 'https://dbdragracing.com'),
 
('USACi', 'United States Autosound Competition International', 'competition', 'active',
 'https://example.com/logos/usaci.png', 'https://example.com/logos/usaci-small.png',
 '["Amateur", "Pro-Am", "Pro"]'::jsonb, 'https://usaci.com'),
 
('BASS', 'Bass Audio Sound Society', 'competition', 'active',
 'https://example.com/logos/bass.png', 'https://example.com/logos/bass-small.png',
 '["Novice", "Expert", "Pro"]'::jsonb, 'https://bassrace.com'),
 
('SQC', 'Sound Quality Championship', 'competition', 'active',
 'https://example.com/logos/sqc.png', 'https://example.com/logos/sqc-small.png',
 '["Street", "Modified", "Competition"]'::jsonb, 'https://soundquality.org'),
 
('Independent', 'Independent competition organizer', 'independent', 'active',
 'https://example.com/logos/independent.png', 'https://example.com/logos/independent-small.png',
 '["Open", "Street", "Pro"]'::jsonb, null),
 
('Local Club', 'Local car audio club or organization', 'local', 'active',
 'https://example.com/logos/local.png', 'https://example.com/logos/local-small.png',
 '["Beginner", "Advanced"]'::jsonb, null)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 3. RULES TEMPLATES WITH ORGANIZATION LINKS
-- =============================================

-- Insert comprehensive rules templates
INSERT INTO rules_templates (name, organization_name, rules_content, category, is_public) VALUES
('IASCA Standard Rules', 'IASCA', 
 'IASCA Official Competition Rules:
 
1. VEHICLE REQUIREMENTS:
   - Vehicle must be street legal and driveable
   - All safety equipment must be properly installed
   - Battery disconnects required for high power systems
   
2. SOUND PRESSURE LEVEL (SPL):
   - Measurements taken at 1 meter from vehicle
   - 30-second maximum measurement time
   - Multiple attempts allowed with best score counting
   
3. SOUND QUALITY JUDGING:
   - Technical merit: 40 points
   - Musical accuracy: 35 points  
   - Presentation: 25 points
   
4. INSTALLATION STANDARDS:
   - Professional appearance and functionality
   - Safety considerations paramount
   - Innovation and creativity encouraged
   
5. CLASSES:
   - Rookie: Under $2000 system value
   - Street: $2000-$5000 system value
   - Expert: $5000-$15000 system value
   - Pro: Over $15000 system value
   - Outlaw: Unlimited', 'competition', true),

('MECA Basic Rules', 'MECA',
 'MECA Competition Guidelines:
 
1. SOUND QUALITY FOCUS:
   - Emphasis on musical accuracy and listening experience
   - Judged by trained audio professionals
   - Real music tracks used for evaluation
   
2. TECHNICAL SPECIFICATIONS:
   - RTA measurements for frequency response
   - Phase alignment verification
   - Noise floor measurements
   
3. JUDGING CRITERIA:
   - Tonal accuracy: 50%
   - Staging and imaging: 30%
   - Technical execution: 20%
   
4. VEHICLE CLASSES:
   - Street: Minimal modifications, daily driver friendly
   - Modified: Extensive modifications allowed
   - Extreme: No limitations on modifications
   - Pro: Professional installer class', 'sound_quality', true),

('dB Drag Racing Rules', 'dB Drag Racing',
 'dB Drag Racing Competition Rules:
 
1. MEASUREMENT PROTOCOL:
   - 30-second burp measurement
   - Microphone placement at dash level
   - Multiple run format with best score
   
2. SAFETY REQUIREMENTS:
   - Hearing protection mandatory
   - Vehicle restraints for high SPL
   - Emergency shut-off systems
   
3. POWER LIMITATIONS:
   - Electrical system regulations by class
   - Alternator and battery specifications
   - Power consumption monitoring
   
4. COMPETITION CLASSES:
   - Street: Under 149.9 dB
   - Pro: 150.0-159.9 dB  
   - Outlaw: 160.0+ dB
   - Extreme: No limits', 'spl', true),

('Local Club Rules', 'Local Club',
 'Local Club Competition Format:
 
1. FRIENDLY COMPETITION:
   - Emphasis on fun and learning
   - Supportive environment for newcomers
   - Educational components included
   
2. SIMPLIFIED JUDGING:
   - Basic sound pressure measurements
   - Subjective sound quality evaluation
   - Best installation awards
   
3. CATEGORIES:
   - Beginner: First-time competitors
   - Advanced: Experienced competitors
   - Best of Show: Overall excellence
   
4. PRIZES AND RECOGNITION:
   - Trophies for top finishers
   - Participation certificates
   - Vendor door prizes', 'local', true)
ON CONFLICT (name) DO NOTHING;

-- Link rules templates to organizations
UPDATE organizations SET default_rules_template_id = (
  SELECT id FROM rules_templates WHERE name = 'IASCA Standard Rules' LIMIT 1
) WHERE name = 'IASCA';

UPDATE organizations SET default_rules_template_id = (
  SELECT id FROM rules_templates WHERE name = 'MECA Basic Rules' LIMIT 1
) WHERE name = 'MECA';

UPDATE organizations SET default_rules_template_id = (
  SELECT id FROM rules_templates WHERE name = 'dB Drag Racing Rules' LIMIT 1
) WHERE name = 'dB Drag Racing';

UPDATE organizations SET default_rules_template_id = (
  SELECT id FROM rules_templates WHERE name = 'Local Club Rules' LIMIT 1
) WHERE name = 'Local Club';

-- =============================================
-- 4. FORM FIELD CONFIGURATIONS FOR CREATE EVENT
-- =============================================

INSERT INTO form_field_configurations (form_name, field_name, field_type, field_label, placeholder_text, is_required, display_order, validation_rules, default_value, help_text) VALUES
('create_event', 'title', 'text', 'Event Title', 'Enter event title...', true, 1, '{"minLength": 3, "maxLength": 100}', '', 'Give your event a descriptive title'),
('create_event', 'description', 'textarea', 'Event Description', 'Describe your event...', true, 2, '{"minLength": 10, "maxLength": 2000}', '', 'Provide details about what attendees can expect'),
('create_event', 'date', 'date', 'Event Date', '', true, 3, '{"futureDate": true}', '', 'Select the date when your event will take place'),
('create_event', 'time', 'time', 'Start Time', '', true, 4, '{}', '09:00', 'What time does the event start?'),
('create_event', 'end_time', 'time', 'End Time', '', false, 5, '{}', '17:00', 'What time does the event end?'),
('create_event', 'location', 'text', 'Venue Location', 'Enter venue address...', true, 6, '{"minLength": 5}', '', 'Full address including city and state'),
('create_event', 'venue_name', 'text', 'Venue Name', 'Enter venue name...', false, 7, '{}', '', 'Name of the venue or location'),
('create_event', 'category_id', 'select', 'Event Category', '', true, 8, '{}', '', 'Select the type of event'),
('create_event', 'max_participants', 'number', 'Maximum Participants', '', false, 9, '{"min": 1, "max": 10000}', '100', 'Leave blank for unlimited participants'),
('create_event', 'registration_fee', 'number', 'Registration Fee ($)', '0.00', false, 10, '{"min": 0, "step": 0.01}', '0', 'Cost to register for the event'),
('create_event', 'organization_id', 'select', 'Organizing Body', '', false, 11, '{}', '', 'Select the organization hosting this event'),
('create_event', 'rules', 'textarea', 'Event Rules', 'Enter event rules and regulations...', false, 12, '{}', '', 'Specific rules for this event'),
('create_event', 'prizes', 'textarea', 'Prizes & Awards', 'List prizes and awards...', false, 13, '{}', '', 'What prizes are available for winners?'),
('create_event', 'contact_email', 'email', 'Contact Email', 'organizer@example.com', true, 14, '{"email": true}', '', 'Email for event inquiries'),
('create_event', 'contact_phone', 'tel', 'Contact Phone', '(555) 123-4567', false, 15, '{}', '', 'Phone number for event inquiries'),
('create_event', 'website', 'url', 'Event Website', 'https://...', false, 16, '{}', '', 'Website with more event information'),
('create_event', 'facebook_event', 'url', 'Facebook Event', 'https://facebook.com/events/...', false, 17, '{}', '', 'Link to Facebook event page'),
('create_event', 'instagram', 'text', 'Instagram Handle', '@eventname', false, 18, '{}', '', 'Instagram account for the event'),
('create_event', 'parking_info', 'textarea', 'Parking Information', 'Parking details...', false, 19, '{}', '', 'Parking instructions and costs'),
('create_event', 'food_vendors', 'checkbox', 'Food Vendors Present', '', false, 20, '{}', 'false', 'Will there be food vendors at the event?'),
('create_event', 'spectator_fee', 'number', 'Spectator Fee ($)', '0.00', false, 21, '{"min": 0, "step": 0.01}', '0', 'Cost for spectators to attend'),
('create_event', 'setup_time', 'time', 'Setup Start Time', '', false, 22, '{}', '07:00', 'When can competitors start setting up?'),
('create_event', 'tech_inspection', 'checkbox', 'Tech Inspection Required', '', false, 23, '{}', 'true', 'Is technical inspection required?'),
('create_event', 'sound_limit', 'number', 'Sound Limit (dB)', '', false, 24, '{"min": 80, "max": 200}', '', 'Maximum sound level allowed'),
('create_event', 'age_restriction', 'select', 'Age Restrictions', '', false, 25, '{}', 'all_ages', 'Any age restrictions for participants?'),
('create_event', 'weather_policy', 'textarea', 'Weather Policy', 'Rain or shine...', false, 26, '{}', 'Rain or shine event', 'What happens in case of bad weather?')
ON CONFLICT (form_name, field_name) DO NOTHING;

-- =============================================
-- 5. SAMPLE CMS PAGES THAT WERE MENTIONED
-- =============================================

INSERT INTO cms_pages (title, slug, content, meta_title, meta_description, status, navigation_placement, nav_order, nav_title, is_featured) VALUES
('About Us', 'about', 
 '<h1>About Car Audio Events</h1>
 <p>Welcome to the premier platform for car audio competitions and events. We connect enthusiasts, competitors, and organizations in the car audio community.</p>
 
 <h2>Our Mission</h2>
 <p>To provide a comprehensive platform where car audio enthusiasts can discover events, connect with fellow competitors, and showcase their audio systems.</p>
 
 <h2>What We Offer</h2>
 <ul>
   <li>Event discovery and registration</li>
   <li>Competition results tracking</li>
   <li>Community forums and networking</li>
   <li>Technical resources and guides</li>
   <li>Organization partnerships</li>
 </ul>', 
 'About Car Audio Events Platform', 
 'Learn about our platform connecting car audio enthusiasts and competition organizers', 
 'published', 'header', 1, 'About', true),

('Competition Rules', 'rules',
 '<h1>General Competition Guidelines</h1>
 
 <h2>Safety First</h2>
 <p>All events prioritize competitor and spectator safety. Safety requirements vary by organization and competition type.</p>
 
 <h2>Fair Competition</h2>
 <p>We promote fair and honest competition. Cheating, unsportsmanlike conduct, or equipment tampering will result in disqualification.</p>
 
 <h2>Equipment Standards</h2>
 <p>Equipment must meet organization standards. Technical inspections may be required.</p>
 
 <h2>Judging</h2>
 <p>Qualified judges evaluate competitions based on organization-specific criteria.</p>',
 'Competition Rules and Guidelines',
 'General rules and guidelines for car audio competitions',
 'published', 'footer', 1, 'Rules', false),

('Getting Started', 'getting-started',
 '<h1>Getting Started in Car Audio Competition</h1>
 
 <h2>New to Competition?</h2>
 <p>Car audio competition is an exciting hobby that combines technical skill, creativity, and passion for music.</p>
 
 <h2>First Steps</h2>
 <ol>
   <li><strong>Attend an Event</strong> - Visit a local competition to see what its about</li>
   <li><strong>Join an Organization</strong> - IASCA, MECA, and others offer different competition styles</li>
   <li><strong>Learn the Rules</strong> - Each organization has specific rules and classes</li>
   <li><strong>Start Small</strong> - Begin in novice or street classes</li>
   <li><strong>Connect with Competitors</strong> - The community is welcoming and helpful</li>
 </ol>
 
 <h2>Competition Types</h2>
 <ul>
   <li><strong>Sound Quality</strong> - Judged on musical accuracy and presentation</li>
   <li><strong>Sound Pressure</strong> - Measured maximum volume output</li>
   <li><strong>Install Quality</strong> - Craftsmanship and innovation</li>
 </ul>',
 'Getting Started in Car Audio Competition',
 'Complete guide for newcomers to car audio competition',
 'published', 'header', 2, 'Get Started', true),

('Privacy Policy', 'privacy',
 '<h1>Privacy Policy</h1>
 <p><em>Last updated: June 11, 2025</em></p>
 
 <h2>Information We Collect</h2>
 <p>We collect information you provide when registering for events, creating an account, or contacting us.</p>
 
 <h2>How We Use Information</h2>
 <ul>
   <li>Event registration and communication</li>
   <li>Competition results tracking</li>
   <li>Platform improvements</li>
   <li>Community features</li>
 </ul>
 
 <h2>Information Sharing</h2>
 <p>We do not sell personal information. We may share information with event organizers for registration purposes.</p>
 
 <h2>Contact Us</h2>
 <p>Questions about privacy? Contact us at privacy@caraudioevents.com</p>',
 'Privacy Policy - Car Audio Events',
 'Privacy policy explaining how we handle your personal information',
 'published', 'footer', 2, 'Privacy', false),

('Terms of Service', 'terms',
 '<h1>Terms of Service</h1>
 <p><em>Last updated: June 11, 2025</em></p>
 
 <h2>Acceptance of Terms</h2>
 <p>By using this platform, you agree to these terms and conditions.</p>
 
 <h2>User Accounts</h2>
 <p>You are responsible for maintaining account security and all activities under your account.</p>
 
 <h2>Event Registration</h2>
 <p>Event registration is subject to organizer terms. Refund policies vary by event.</p>
 
 <h2>Prohibited Activities</h2>
 <ul>
   <li>Harassment or abuse of other users</li>
   <li>Spam or unauthorized commercial content</li>
   <li>Violation of applicable laws</li>
   <li>Interference with platform operation</li>
 </ul>',
 'Terms of Service - Car Audio Events',
 'Terms and conditions for using the Car Audio Events platform',
 'published', 'footer', 3, 'Terms', false),

('Contact Us', 'contact',
 '<h1>Contact Us</h1>
 
 <h2>Get in Touch</h2>
 <p>We would love to hear from you! Whether you have questions, suggestions, or need support, we are here to help.</p>
 
 <div class="contact-info">
   <h3>General Inquiries</h3>
   <p><strong>Email:</strong> info@caraudioevents.com</p>
   <p><strong>Phone:</strong> (555) 123-4567</p>
   
   <h3>Event Organizers</h3>
   <p><strong>Email:</strong> organizers@caraudioevents.com</p>
   
   <h3>Technical Support</h3>
   <p><strong>Email:</strong> support@caraudioevents.com</p>
   
   <h3>Business Hours</h3>
   <p>Monday - Friday: 9:00 AM - 6:00 PM EST<br>
   Saturday: 10:00 AM - 4:00 PM EST<br>
   Sunday: Closed</p>
 </div>',
 'Contact Car Audio Events Platform',
 'Get in touch with the Car Audio Events team for support and inquiries',
 'published', 'footer', 4, 'Contact', false)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- 6. SAMPLE EVENTS FOR DEMONSTRATION
-- =============================================

INSERT INTO events (title, description, date, time, end_time, location, venue_name, category_id, max_participants, registration_fee, organization_id, rules, prizes, contact_email, contact_phone, website, parking_info, food_vendors, spectator_fee, setup_time, tech_inspection, sound_limit, weather_policy, status, created_by) VALUES
('Summer Bass Bash 2025', 
 'Annual summer bass competition featuring multiple categories and exciting prizes. Open to all skill levels with classes for beginners through professionals.',
 CURRENT_DATE + INTERVAL '30 days',
 '09:00:00',
 '17:00:00',
 '123 Competition Way, Orlando, FL 32801',
 'Orlando Convention Center',
 1, -- Bass Competition category
 150,
 25.00,
 1, -- IASCA
 'IASCA standard rules apply. Technical inspection at 8:00 AM. Setup begins at 7:00 AM.',
 '1st Place: $500 + Trophy, 2nd Place: $300 + Trophy, 3rd Place: $150 + Trophy. Best of Show: $200',
 'bassmaster@example.com',
 '(407) 555-0123',
 'https://summerbass2025.com',
 'Free parking available. RV parking $20/night.',
 true,
 5.00,
 '07:00:00',
 true,
 175,
 'Rain or shine event. Indoor venue with backup areas.',
 'published',
 '00000000-0000-0000-0000-000000000001'),

('MECA Sound Quality Championship',
 'Premium sound quality competition judged by certified MECA judges. Focus on musical accuracy, staging, and technical execution.',
 CURRENT_DATE + INTERVAL '45 days',
 '08:00:00',
 '18:00:00',
 '456 Audio Street, Nashville, TN 37201',
 'Music City Convention Center',
 3, -- Sound Quality category
 75,
 40.00,
 2, -- MECA
 'MECA sound quality rules. Real-time analyzer measurements included. Professional judging panel.',
 '1st Place: $1000 + Trophy, 2nd Place: $600 + Trophy, 3rd Place: $400 + Trophy',
 'sqchamp@mecaevents.com',
 '(615) 555-0199',
 'https://mecasq2025.com',
 'Paid parking $10/day. VIP parking available.',
 true,
 10.00,
 '06:30:00',
 true,
 null,
 'Indoor event, weather not a factor.',
 'published',
 '00000000-0000-0000-0000-000000000001'),

('Local Club Meet & Greet',
 'Casual gathering for local car audio enthusiasts. No competition pressure, just good music and great people. Bring your ride and enjoy!',
 CURRENT_DATE + INTERVAL '15 days',
 '10:00:00',
 '16:00:00',
 '789 Park Avenue, Denver, CO 80202',
 'Mile High Shopping Center',
 5, -- Meet & Greet category
 200,
 0.00,
 8, -- Local Club
 'No formal rules. Friendly atmosphere. Sound demonstrations welcome but not required.',
 'Door prizes and vendor giveaways. Fun awards for various categories.',
 'denver.caraudio@gmail.com',
 '(303) 555-0177',
 null,
 'Free parking all day.',
 true,
 0.00,
 '09:00:00',
 false,
 150,
 'Will reschedule if severe weather.',
 'published',
 '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- =============================================
-- 7. ADMIN USER CREATION
-- =============================================

-- Create admin user (you'll need to set your preferred email/password)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@caraudioevents.com',
  crypt('admin123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"],"role":"admin"}',
  '{"role":"admin","name":"System Administrator"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Create corresponding user profile
INSERT INTO users (id, email, name, membership_type, status) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@caraudioevents.com', 'System Administrator', 'enterprise', 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  membership_type = EXCLUDED.membership_type,
  status = EXCLUDED.status;

-- =============================================
-- 8. ADDITIONAL SYSTEM CONFIGURATIONS
-- =============================================

-- Update admin settings with comprehensive configuration
UPDATE admin_settings SET setting_value = 'Car Audio Events Platform' WHERE setting_key = 'site_name';
UPDATE admin_settings SET setting_value = 'The premier platform for car audio competitions, events, and community' WHERE setting_key = 'site_description';

-- Insert additional admin settings
INSERT INTO admin_settings (setting_key, setting_value, setting_type, description) VALUES
('enable_event_registration', 'true', 'boolean', 'Allow users to register for events'),
('max_events_per_user', '10', 'number', 'Maximum events a user can create'),
('default_event_duration', '8', 'number', 'Default event duration in hours'),
('require_event_approval', 'false', 'boolean', 'Require admin approval for new events'),
('enable_photo_uploads', 'true', 'boolean', 'Allow photo uploads for events'),
('max_photo_size_mb', '10', 'number', 'Maximum photo size in MB'),
('contact_email', 'admin@caraudioevents.com', 'email', 'Main contact email'),
('facebook_url', 'https://facebook.com/caraudioevents', 'url', 'Facebook page URL'),
('instagram_url', 'https://instagram.com/caraudioevents', 'url', 'Instagram page URL'),
('twitter_url', 'https://twitter.com/caraudioevents', 'url', 'Twitter page URL')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

SELECT 'SYSTEM RESTORE COMPLETE - All data has been restored!' as status,
       COUNT(*) as total_organizations FROM organizations UNION ALL
SELECT 'Configuration Categories', COUNT(*)::text FROM configuration_categories UNION ALL  
SELECT 'Configuration Options', COUNT(*)::text FROM configuration_options UNION ALL
SELECT 'Rules Templates', COUNT(*)::text FROM rules_templates UNION ALL
SELECT 'CMS Pages', COUNT(*)::text FROM cms_pages UNION ALL
SELECT 'Sample Events', COUNT(*)::text FROM events UNION ALL
SELECT 'Form Configurations', COUNT(*)::text FROM form_field_configurations; 