const { createClient } = require('@supabase/supabase-js');

async function testUserManagement() {
  const supabaseUrl = 'https://nqvisvranvjaghvrdaaz.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmlzdnJhbnZqYWdodnJkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDY2NzcsImV4cCI6MjA2NTE4MjY3N30.OWwP8kH9qTKxgEHCC6ru0QSAJ5KhOupCxMUyxHuYWVY';
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('🧪 Testing User Management System...');
  console.log('📡 Database URL:', supabaseUrl);

  try {
    // 1. Check if users table exists now
    console.log('\n📊 Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(10);

    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
      if (usersError.code === '42P01') {
        console.log('📝 The users table still does not exist. You need to run the SQL script first.');
        return;
      }
    } else {
      console.log('✅ Users table found with', users?.length || 0, 'users:');
      users?.forEach(user => {
        console.log(`  - ${user.email}: ${user.name} (${user.membership_type}) [${user.status}]`);
      });
    }

    // 2. Test admin authentication
    console.log('\n🔐 Testing admin authentication...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@caraudioevents.com',
      password: 'password'
    });

    if (authError) {
      console.log('❌ Auth error:', authError.message);
      console.log('📝 You need to create the admin user in Supabase Dashboard → Authentication → Users');
    } else {
      console.log('✅ Admin authentication successful!');
      console.log('👤 Admin user ID:', authData.user.id);
      console.log('📧 Admin email:', authData.user.email);
      
      // 3. Check if admin user has profile in users table
      console.log('\n📋 Checking admin user profile...');
      const { data: adminProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
        
      if (profileError) {
        console.log('❌ Admin profile error:', profileError.message);
        if (profileError.code === 'PGRST116') {
          console.log('📝 Admin user profile not found. The trigger should create it automatically.');
          console.log('   Try logging out and back in to the app to trigger profile creation.');
        }
      } else {
        console.log('✅ Admin profile found:');
        console.log(`  - Name: ${adminProfile.name}`);
        console.log(`  - Type: ${adminProfile.membership_type}`);
        console.log(`  - Status: ${adminProfile.status}`);
        console.log(`  - Verification: ${adminProfile.verification_status}`);
      }
      
      // 4. Test user management query
      console.log('\n🔍 Testing user management query...');
      const { data: allUsers, error: queryError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          membership_type,
          status,
          verification_status,
          subscription_plan,
          last_login_at,
          created_at,
          login_count,
          failed_login_attempts
        `)
        .order('created_at', { ascending: false });

      if (queryError) {
        console.log('❌ User management query error:', queryError.message);
      } else {
        console.log('✅ User management query successful!');
        console.log(`📊 Found ${allUsers.length} users that will show in User Management`);
      }
      
      // Clean up - sign out
      await supabase.auth.signOut();
      console.log('🔓 Signed out');
    }

    console.log('\n🎯 Summary:');
    if (users && users.length > 0) {
      console.log('✅ Users table exists and has data');
    }
    if (!authError) {
      console.log('✅ Admin authentication works');
    }
    console.log('\n📋 Next steps:');
    console.log('1. Run create-user-management-system.sql in Supabase SQL Editor');
    console.log('2. Create admin@caraudioevents.com user in Supabase Authentication');
    console.log('3. Log into the app to test User Management page');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testUserManagement(); 