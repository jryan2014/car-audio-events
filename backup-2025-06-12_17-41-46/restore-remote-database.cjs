const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Remote Supabase configuration
const supabaseUrl = 'https://nqvisvranvjaghvrdaaz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmlzdnJhbnZqYWdodnJkYWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTYwNjY3NywiZXhwIjoyMDY1MTgyNjc3fQ.QflFYxMtYzmsveSkjIOKNqSeQhxQBglJcfRgvpNF7qg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreDatabase() {
  console.log('🚀 Starting remote database restoration...');
  
  try {
    // 1. Create admin user directly in auth.users
    console.log('1. Creating admin user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@caraudioevents.com',
      password: 'password',
      email_confirm: true,
      user_metadata: { name: 'System Administrator', role: 'admin' }
    });
    
    if (authError && !authError.message.includes('already been registered')) {
      console.error('Auth user creation error:', authError);
    } else {
      console.log('✅ Admin user created/exists');
    }

    // 2. Add categories
    console.log('2. Adding categories...');
    const categories = [
      { name: 'Bass Competition', description: 'Bass sound pressure level competitions', color: '#DC2626', display_order: 1, is_active: true },
      { name: 'Sound Quality', description: 'Audio quality and clarity competitions', color: '#059669', display_order: 2, is_active: true },
      { name: 'Install Competition', description: 'Installation and craftsmanship showcase', color: '#7C3AED', display_order: 3, is_active: true },
      { name: 'Meet & Greet', description: 'Social gathering and networking events', color: '#2563EB', display_order: 4, is_active: true },
      { name: 'Championship', description: 'Championship and tournament events', color: '#EA580C', display_order: 5, is_active: true }
    ];

    for (const category of categories) {
      const { data, error } = await supabase.from('categories').upsert(category, { onConflict: 'name' });
      if (error) {
        console.log(`❌ Category ${category.name} error:`, error.message);
      } else {
        console.log(`✅ Category ${category.name} added/updated`);
      }
    }

    // 3. Add CMS pages (with author_id as UUID string)
    console.log('3. Adding CMS pages...');
    const pages = [
      { title: 'Home', slug: 'home', content: '<h1>Welcome to Car Audio Events</h1><p>The premier platform for car audio competitions and events.</p>', meta_title: 'Car Audio Events - Home', meta_description: 'Premier car audio competition platform', status: 'published', navigation_placement: 'main', nav_order: 1, author_id: null, show_in_sitemap: true },
      { title: 'About Us', slug: 'about', content: '<h1>About Car Audio Events</h1><p>We are the leading platform connecting car audio enthusiasts worldwide.</p>', meta_title: 'About Us - Car Audio Events', meta_description: 'Learn about our car audio competition platform', status: 'published', navigation_placement: 'main', nav_order: 2, author_id: null, show_in_sitemap: true },
      { title: 'Events', slug: 'events', content: '<h1>Upcoming Events</h1><p>Find car audio competitions and events near you.</p>', meta_title: 'Events - Car Audio Events', meta_description: 'Discover car audio competitions and events', status: 'published', navigation_placement: 'main', nav_order: 3, author_id: null, show_in_sitemap: true },
      { title: 'Organizations', slug: 'organizations', content: '<h1>Competition Organizations</h1><p>Learn about IASCA, MECA, dB Drag Racing and other organizations.</p>', meta_title: 'Organizations - Car Audio Events', meta_description: 'Car audio competition organizations', status: 'published', navigation_placement: 'main', nav_order: 4, author_id: null, show_in_sitemap: true },
      { title: 'Privacy Policy', slug: 'privacy', content: '<h1>Privacy Policy</h1><p>Your privacy is important to us. This policy explains how we collect and use your data.</p>', meta_title: 'Privacy Policy - Car Audio Events', meta_description: 'Privacy policy and data protection', status: 'published', navigation_placement: 'footer', nav_order: 1, author_id: null, show_in_sitemap: true },
      { title: 'Terms of Service', slug: 'terms', content: '<h1>Terms of Service</h1><p>Terms and conditions for using our platform.</p>', meta_title: 'Terms of Service - Car Audio Events', meta_description: 'Terms and conditions', status: 'published', navigation_placement: 'footer', nav_order: 2, author_id: null, show_in_sitemap: true },
      { title: 'Contact', slug: 'contact', content: '<h1>Contact Us</h1><p>Get in touch with our team.</p>', meta_title: 'Contact - Car Audio Events', meta_description: 'Contact our team', status: 'published', navigation_placement: 'footer', nav_order: 3, author_id: null, show_in_sitemap: true }
    ];

    for (const page of pages) {
      const { data, error } = await supabase.from('cms_pages').upsert(page, { onConflict: 'slug' });
      if (error) {
        console.log(`❌ Page ${page.title} error:`, error.message);
      } else {
        console.log(`✅ Page ${page.title} added/updated`);
      }
    }

    // 4. Verify data
    console.log('\n4. Verifying restoration...');
    const { data: pagesData, count: pagesCount } = await supabase.from('cms_pages').select('*', { count: 'exact' });
    const { data: categoriesData, count: categoriesCount } = await supabase.from('categories').select('*', { count: 'exact' });
    const { data: orgsData, count: orgsCount } = await supabase.from('organizations').select('*', { count: 'exact' });

    console.log(`\n✅ Remote database restored successfully!`);
    console.log(`📄 CMS Pages: ${pagesCount || 0}`);
    console.log(`🏷️  Categories: ${categoriesCount || 0}`);
    console.log(`🏢 Organizations: ${orgsCount || 0}`);
    console.log(`\n👤 Admin Login: admin@caraudioevents.com / password`);
    console.log(`🌐 Access your app at: http://localhost:5173 (or current port)`);

  } catch (error) {
    console.error('❌ Restoration failed:', error);
  }
}

restoreDatabase(); 