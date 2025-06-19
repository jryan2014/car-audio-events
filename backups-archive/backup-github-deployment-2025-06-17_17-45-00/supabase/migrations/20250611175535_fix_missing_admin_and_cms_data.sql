-- Fix Missing Data - Admin User and CMS Pages
-- Only add what's actually missing

-- 1. Create admin user in auth.users table
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
);

-- 2. Create admin user profile (if users table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        INSERT INTO users (
          id,
          email,
          name,
          membership_type,
          status,
          verification_status,
          subscription_plan
        ) VALUES (
          '00000000-0000-0000-0000-000000000001',
          'admin@caraudioevents.com',
          'System Administrator',
          'enterprise',
          'active',
          'verified',
          'enterprise'
        );
    END IF;
END $$;

-- 3. Add categories if they don't exist
INSERT INTO categories (name, description, color, display_order) VALUES
('Bass Competition', 'Bass sound pressure level competitions', '#DC2626', 1),
('Sound Quality', 'Audio quality and clarity competitions', '#059669', 2),
('Install Competition', 'Installation and craftsmanship showcase', '#7C3AED', 3),
('Meet & Greet', 'Social gathering and networking events', '#2563EB', 4),
('Championship', 'Championship and tournament events', '#EA580C', 5)
ON CONFLICT (name) DO NOTHING;

-- 4. Add CMS pages
INSERT INTO cms_pages (title, slug, content, meta_title, meta_description, status, navigation_placement, nav_order, author_id) VALUES
('Home', 'home', '<h1>Welcome to Car Audio Events</h1><p>The premier platform for car audio competitions and events.</p>', 'Car Audio Events - Home', 'Premier car audio competition platform', 'published', 'main', 1, '00000000-0000-0000-0000-000000000001'),
('About Us', 'about', '<h1>About Car Audio Events</h1><p>We are the leading platform connecting car audio enthusiasts worldwide.</p>', 'About Us - Car Audio Events', 'Learn about our car audio competition platform', 'published', 'main', 2, '00000000-0000-0000-0000-000000000001'),
('Events', 'events', '<h1>Upcoming Events</h1><p>Find car audio competitions and events near you.</p>', 'Events - Car Audio Events', 'Discover car audio competitions and events', 'published', 'main', 3, '00000000-0000-0000-0000-000000000001'),
('Organizations', 'organizations', '<h1>Competition Organizations</h1><p>Learn about IASCA, MECA, dB Drag Racing and other organizations.</p>', 'Organizations - Car Audio Events', 'Car audio competition organizations', 'published', 'main', 4, '00000000-0000-0000-0000-000000000001'),
('Privacy Policy', 'privacy', '<h1>Privacy Policy</h1><p>Your privacy is important to us. This policy explains how we collect and use your data.</p>', 'Privacy Policy - Car Audio Events', 'Privacy policy and data protection', 'published', 'footer', 1, '00000000-0000-0000-0000-000000000001'),
('Terms of Service', 'terms', '<h1>Terms of Service</h1><p>Terms and conditions for using our platform.</p>', 'Terms of Service - Car Audio Events', 'Terms and conditions', 'published', 'footer', 2, '00000000-0000-0000-0000-000000000001'),
('Contact', 'contact', '<h1>Contact Us</h1><p>Get in touch with our team.</p>', 'Contact - Car Audio Events', 'Contact our team', 'published', 'footer', 3, '00000000-0000-0000-0000-000000000001');

-- 5. Create necessary security policies
DO $$
BEGIN
    -- Enable RLS on tables if not already enabled
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'cms_pages' AND relrowsecurity = true) THEN
        ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'categories' AND relrowsecurity = true) THEN
        ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Create policy for CMS pages if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cms_pages' AND policyname = 'Public read access') THEN
        EXECUTE 'CREATE POLICY "Public read access" ON cms_pages FOR SELECT TO anon, authenticated USING (status = ''published'')';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cms_pages' AND policyname = 'Admin full access') THEN
        EXECUTE 'CREATE POLICY "Admin full access" ON cms_pages FOR ALL TO authenticated USING (auth.jwt() ->> ''role'' = ''admin'') WITH CHECK (auth.jwt() ->> ''role'' = ''admin'')';
    END IF;
    
    -- Create policies for categories
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Public read access') THEN
        EXECUTE 'CREATE POLICY "Public read access" ON categories FOR SELECT TO anon, authenticated USING (is_active = true)';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Admin full access') THEN
        EXECUTE 'CREATE POLICY "Admin full access" ON categories FOR ALL TO authenticated USING (auth.jwt() ->> ''role'' = ''admin'') WITH CHECK (auth.jwt() ->> ''role'' = ''admin'')';
    END IF;
    
    -- Success message
    RAISE NOTICE '✅ MISSING DATA RESTORED!';
    RAISE NOTICE 'Admin Login: admin@caraudioevents.com / password';
    RAISE NOTICE 'CMS Pages: % created', (SELECT COUNT(*) FROM cms_pages);
    RAISE NOTICE 'Categories: % available', (SELECT COUNT(*) FROM categories);
    RAISE NOTICE 'Organizations: % available', (SELECT COUNT(*) FROM organizations);
END $$;
