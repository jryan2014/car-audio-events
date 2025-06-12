# 🚀 IMMEDIATE REMOTE DATABASE RESTORATION

## Step 1: Access Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/nqvisvranvjaghvrdaaz
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

## Step 2: Execute This SQL (Copy & Paste):

```sql
-- STEP 1: Create admin user in auth.users table
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

-- STEP 2: Add categories if they don't exist
INSERT INTO categories (name, description, color, display_order) VALUES
('Bass Competition', 'Bass sound pressure level competitions', '#DC2626', 1),
('Sound Quality', 'Audio quality and clarity competitions', '#059669', 2),
('Install Competition', 'Installation and craftsmanship showcase', '#7C3AED', 3),
('Meet & Greet', 'Social gathering and networking events', '#2563EB', 4),
('Championship', 'Championship and tournament events', '#EA580C', 5)
ON CONFLICT (name) DO NOTHING;

-- STEP 3: Add CMS pages
INSERT INTO cms_pages (title, slug, content, meta_title, meta_description, status, navigation_placement, nav_order, author_id) VALUES
('Home', 'home', '<h1>Welcome to Car Audio Events</h1><p>The premier platform for car audio competitions and events.</p>', 'Car Audio Events - Home', 'Premier car audio competition platform', 'published', 'main', 1, '00000000-0000-0000-0000-000000000001'),
('About Us', 'about', '<h1>About Car Audio Events</h1><p>We are the leading platform connecting car audio enthusiasts worldwide.</p>', 'About Us - Car Audio Events', 'Learn about our car audio competition platform', 'published', 'main', 2, '00000000-0000-0000-0000-000000000001'),
('Events', 'events', '<h1>Upcoming Events</h1><p>Find car audio competitions and events near you.</p>', 'Events - Car Audio Events', 'Discover car audio competitions and events', 'published', 'main', 3, '00000000-0000-0000-0000-000000000001'),
('Organizations', 'organizations', '<h1>Competition Organizations</h1><p>Learn about IASCA, MECA, dB Drag Racing and other organizations.</p>', 'Organizations - Car Audio Events', 'Car audio competition organizations', 'published', 'main', 4, '00000000-0000-0000-0000-000000000001'),
('Privacy Policy', 'privacy', '<h1>Privacy Policy</h1><p>Your privacy is important to us. This policy explains how we collect and use your data.</p>', 'Privacy Policy - Car Audio Events', 'Privacy policy and data protection', 'published', 'footer', 1, '00000000-0000-0000-0000-000000000001'),
('Terms of Service', 'terms', '<h1>Terms of Service</h1><p>Terms and conditions for using our platform.</p>', 'Terms of Service - Car Audio Events', 'Terms and conditions', 'published', 'footer', 2, '00000000-0000-0000-0000-000000000001'),
('Contact', 'contact', '<h1>Contact Us</h1><p>Get in touch with our team.</p>', 'Contact - Car Audio Events', 'Contact our team', 'published', 'footer', 3, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (slug) DO NOTHING;

-- STEP 4: Enable RLS and create policies
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policies for CMS pages
DROP POLICY IF EXISTS "Public read access" ON cms_pages;
CREATE POLICY "Public read access" ON cms_pages FOR SELECT TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS "Admin full access" ON cms_pages;
CREATE POLICY "Admin full access" ON cms_pages FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin') WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create policies for categories
DROP POLICY IF EXISTS "Public read access" ON categories;
CREATE POLICY "Public read access" ON categories FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Admin full access" ON categories;
CREATE POLICY "Admin full access" ON categories FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin') WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- VERIFICATION: Check restored data
SELECT 'CMS Pages Count' as type, COUNT(*) as count FROM cms_pages
UNION ALL
SELECT 'Categories Count' as type, COUNT(*) as count FROM categories
UNION ALL
SELECT 'Organizations Count' as type, COUNT(*) as count FROM organizations;
```

## Step 3: Click "RUN" button

After running, you should see:
- ✅ CMS Pages: 7 created
- ✅ Categories: 5 created  
- ✅ Organizations: 8 available
- ✅ Admin user created

## Step 4: Test Login

**Admin Credentials:**
- Email: `admin@caraudioevents.com`
- Password: `password`

## Step 5: Restart Development Server

```bash
# Kill any running processes
taskkill /F /IM node.exe

# Start fresh
npm run dev
```

Access your app at: http://localhost:5173 (or the port shown)

---

**⚠️ IMPORTANT:** Make sure your `.env` file has:
```
VITE_SUPABASE_URL=https://nqvisvranvjaghvrdaaz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmlzdnJhbnZqYWdodnJkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM4MDQ5NzQsImV4cCI6MjA0OTM4MDk3NH0.MkuOXm3Y1F_8Q_BFvs5O0v17v3wJxlFADJhbIcKs_ts
``` 