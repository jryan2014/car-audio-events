-- COMPLETE REMOTE DATABASE RESTORATION - FIXED VERSION
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/nqvisvranvjaghvrdaaz

-- 1. CREATE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. CREATE CMS_PAGES TABLE
CREATE TABLE IF NOT EXISTS cms_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT,
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT[],
  status VARCHAR(20) DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT false,
  author_id UUID,
  published_at TIMESTAMP,
  navigation_placement VARCHAR(50),
  parent_nav_item VARCHAR(255),
  footer_section VARCHAR(50),
  nav_order INTEGER DEFAULT 0,
  nav_title VARCHAR(255),
  show_in_sitemap BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. CREATE ORGANIZATIONS TABLE (if not exists)
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  logo_url VARCHAR(500),
  small_logo_url VARCHAR(500),
  description TEXT,
  website VARCHAR(500),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  organization_type VARCHAR(50) DEFAULT 'competition',
  status VARCHAR(20) DEFAULT 'active',
  competition_classes JSONB DEFAULT '[]',
  default_rules_template_id INTEGER,
  address TEXT,
  city VARCHAR(255),
  state VARCHAR(255),
  zip_code VARCHAR(20),
  country VARCHAR(255) DEFAULT 'USA',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. INSERT CATEGORIES
INSERT INTO categories (name, description, color, display_order, is_active) VALUES
('Bass Competition', 'Bass sound pressure level competitions', '#DC2626', 1, true),
('Sound Quality', 'Audio quality and clarity competitions', '#059669', 2, true),
('Install Competition', 'Installation and craftsmanship showcase', '#7C3AED', 3, true),
('Meet & Greet', 'Social gathering and networking events', '#2563EB', 4, true),
('Championship', 'Championship and tournament events', '#EA580C', 5, true)
ON CONFLICT (name) DO NOTHING;

-- 5. INSERT CMS PAGES
INSERT INTO cms_pages (title, slug, content, meta_title, meta_description, status, navigation_placement, nav_order, show_in_sitemap) VALUES
('Home', 'home', '<h1>Welcome to Car Audio Events</h1><p>The premier platform for car audio competitions and events.</p>', 'Car Audio Events - Home', 'Premier car audio competition platform', 'published', 'main', 1, true),
('About Us', 'about', '<h1>About Car Audio Events</h1><p>We are the leading platform connecting car audio enthusiasts worldwide.</p>', 'About Us - Car Audio Events', 'Learn about our car audio competition platform', 'published', 'main', 2, true),
('Events', 'events', '<h1>Upcoming Events</h1><p>Find car audio competitions and events near you.</p>', 'Events - Car Audio Events', 'Discover car audio competitions and events', 'published', 'main', 3, true),
('Organizations', 'organizations', '<h1>Competition Organizations</h1><p>Learn about IASCA, MECA, dB Drag Racing and other organizations.</p>', 'Organizations - Car Audio Events', 'Car audio competition organizations', 'published', 'main', 4, true),
('Privacy Policy', 'privacy', '<h1>Privacy Policy</h1><p>Your privacy is important to us. This policy explains how we collect and use your data.</p>', 'Privacy Policy - Car Audio Events', 'Privacy policy and data protection', 'published', 'footer', 1, true),
('Terms of Service', 'terms', '<h1>Terms of Service</h1><p>Terms and conditions for using our platform.</p>', 'Terms of Service - Car Audio Events', 'Terms and conditions', 'published', 'footer', 2, true),
('Contact', 'contact', '<h1>Contact Us</h1><p>Get in touch with our team.</p>', 'Contact - Car Audio Events', 'Contact our team', 'published', 'footer', 3, true)
ON CONFLICT (slug) DO NOTHING;

-- 6. INSERT ORGANIZATIONS (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'IASCA') THEN
    INSERT INTO organizations (name, description, organization_type, status, country) VALUES
    ('IASCA', 'International Auto Sound Challenge Association', 'competition', 'active', 'USA'),
    ('MECA', 'Mobile Electronics Competition Association', 'competition', 'active', 'USA'),
    ('dB Drag Racing', 'dB Drag Racing Association', 'competition', 'active', 'USA'),
    ('USACi', 'United Sound & Audio Competition International', 'competition', 'active', 'USA'),
    ('BASS', 'Bass Audio Sound Society', 'competition', 'active', 'USA'),
    ('SQC', 'Sound Quality Competition', 'competition', 'active', 'USA'),
    ('Independent', 'Independent event organizers', 'independent', 'active', 'USA'),
    ('Local Club', 'Local car audio clubs', 'local', 'active', 'USA');
  END IF;
END $$;

-- 7. CREATE ADMIN USER IN AUTH.USERS
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@caraudioevents.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '{"provider": "email", "providers": ["email"], "role": "admin"}',
  '{"name": "System Administrator", "role": "admin"}'
) ON CONFLICT (email) DO NOTHING;

-- 8. ENABLE ROW LEVEL SECURITY
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 9. CREATE SECURITY POLICIES
-- CMS Pages policies
DROP POLICY IF EXISTS "Public read access" ON cms_pages;
CREATE POLICY "Public read access" ON cms_pages FOR SELECT TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS "Admin full access" ON cms_pages;
CREATE POLICY "Admin full access" ON cms_pages FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin') WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Categories policies
DROP POLICY IF EXISTS "Public read access" ON categories;
CREATE POLICY "Public read access" ON categories FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Admin full access" ON categories;
CREATE POLICY "Admin full access" ON categories FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin') WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- 10. VERIFICATION QUERY
SELECT 'CMS Pages' as table_name, COUNT(*) as count FROM cms_pages
UNION ALL
SELECT 'Categories' as table_name, COUNT(*) as count FROM categories
UNION ALL
SELECT 'Organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'Auth Users' as table_name, COUNT(*) as count FROM auth.users WHERE email = 'admin@caraudioevents.com';

-- SUCCESS MESSAGE
DO $$
BEGIN
  RAISE NOTICE '🎉 REMOTE DATABASE RESTORATION COMPLETE!';
  RAISE NOTICE '✅ Tables created and data inserted';
  RAISE NOTICE '👤 Admin Login: admin@caraudioevents.com / password';
  RAISE NOTICE '🌐 Access your app and refresh the page';
END $$; 