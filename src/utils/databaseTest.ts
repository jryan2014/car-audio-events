import { supabase } from '../lib/supabase';

export const testDatabaseConnection = async () => {
  console.log('🔍 DATABASE CONNECTION TEST STARTED');
  
  try {
    // Test 1: Basic connection
    console.log('📡 Testing basic database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Basic connection failed:', connectionError);
      return { success: false, error: 'Connection failed', details: connectionError };
    }
    
    console.log('✅ Basic connection successful');
    
    // Test 2: Check if users table exists and has data
    console.log('📊 Testing users table access...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Users table access failed:', usersError);
      return { success: false, error: 'Users table access failed', details: usersError };
    }
    
    console.log('✅ Users table accessible, found', usersData?.length || 0, 'users');
    
    // Test 3: Check admin user specifically
    console.log('👤 Testing admin user lookup...');
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@caraudioevents.com')
      .single();
    
    if (adminError) {
      console.error('❌ Admin user lookup failed:', adminError);
      return { success: false, error: 'Admin user not found', details: adminError };
    }
    
    console.log('✅ Admin user found:', adminData);
    
    // Test 4: Test the exact query from AuthContext
    console.log('🔍 Testing AuthContext query...');
    const { data: authData, error: authError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        membership_type,
        status,
        location,
        phone,
        company_name,
        verification_status,
        subscription_plan,
        last_login_at,
        created_at,
        login_count,
        failed_login_attempts
      `)
      .eq('email', 'admin@caraudioevents.com')
      .single();
    
    if (authError) {
      console.error('❌ AuthContext query failed:', authError);
      return { success: false, error: 'AuthContext query failed', details: authError };
    }
    
    console.log('✅ AuthContext query successful:', authData);
    
    return { 
      success: true, 
      message: 'All database tests passed',
      adminUser: authData,
      totalUsers: usersData?.length || 0
    };
    
  } catch (error) {
    console.error('💥 Database test crashed:', error);
    return { success: false, error: 'Test crashed', details: error };
  }
};

// Export for console testing
(window as any).testDatabaseConnection = testDatabaseConnection; 