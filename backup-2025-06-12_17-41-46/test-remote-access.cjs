const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nqvisvranvjaghvrdaaz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmlzdnJhbnZqYWdodnJkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDY2NzcsImV4cCI6MjA2NTE4MjY3N30.OWwP8kH9qTKxgEHCC6ru0QSAJ5KhOupCxMUyxHuYWVY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRemoteAccess() {
  console.log('🔍 Testing remote database access...');
  
  try {
    // Test CMS pages
    console.log('\n1. Testing CMS pages...');
    const { data: pages, error: pagesError } = await supabase.from('cms_pages').select('*');
    if (pagesError) {
      console.log('❌ CMS pages error:', pagesError.message);
    } else {
      console.log(`✅ CMS pages: ${pages ? pages.length : 0} found`);
      if (pages && pages.length > 0) {
        console.log('   First page:', pages[0].title);
      }
    }

    // Test categories
    console.log('\n2. Testing categories...');
    const { data: categories, error: categoriesError } = await supabase.from('categories').select('*');
    if (categoriesError) {
      console.log('❌ Categories error:', categoriesError.message);
    } else {
      console.log(`✅ Categories: ${categories ? categories.length : 0} found`);
      if (categories && categories.length > 0) {
        console.log('   First category:', categories[0].name);
      }
    }

    // Test organizations
    console.log('\n3. Testing organizations...');
    const { data: orgs, error: orgsError } = await supabase.from('organizations').select('*');
    if (orgsError) {
      console.log('❌ Organizations error:', orgsError.message);
    } else {
      console.log(`✅ Organizations: ${orgs ? orgs.length : 0} found`);
      if (orgs && orgs.length > 0) {
        console.log('   First org:', orgs[0].name);
      }
    }

    // Test login
    console.log('\n4. Testing admin login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@caraudioevents.com',
      password: 'password'
    });
    
    if (loginError) {
      console.log('❌ Login error:', loginError.message);
    } else {
      console.log('✅ Admin login successful!');
      console.log('   User ID:', loginData.user?.id);
      console.log('   Email:', loginData.user?.email);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRemoteAccess(); 