const { createClient } = require('@supabase/supabase-js');

async function debugUserQuery() {
  const supabaseUrl = 'https://nqvisvranvjaghvrdaaz.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmlzdnJhbnZqYWdodnJkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDY2NzcsImV4cCI6MjA2NTE4MjY3N30.OWwP8kH9qTKxgEHCC6ru0QSAJ5KhOupCxMUyxHuYWVY';
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('🔍 Debug: Testing exact User Management queries...');

  try {
    // 1. Test basic select (what our previous test used)
    console.log('\n1️⃣ Basic select query:');
    const { data: basicData, error: basicError } = await supabase
      .from('users')
      .select('*');
    
    if (basicError) {
      console.log('❌ Basic error:', basicError.message);
    } else {
      console.log(`✅ Basic query found ${basicData.length} users`);
      basicData.forEach(user => {
        console.log(`  - ${user.email}: ${user.name} (${user.membership_type})`);
      });
    }

    // 2. Test the exact query from AdminUsers.tsx (first query)
    console.log('\n2️⃣ AdminUsers.tsx first query:');
    const { data: firstData, error: firstError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        first_name,
        last_name,
        membership_type,
        status,
        location,
        address,
        city,
        state,
        zip,
        phone,
        company_name,
        competition_type,
        team_id,
        verification_status,
        subscription_plan,
        last_login_at,
        created_at,
        login_count,
        failed_login_attempts
      `);

    if (firstError) {
      console.log('❌ First query error:', firstError.message);
    } else {
      console.log(`✅ First query found ${firstData.length} users`);
    }

    // 3. Test the exact query from AdminUsers.tsx (second query with count)
    console.log('\n3️⃣ AdminUsers.tsx second query (with count):');
    const statusFilter = 'all';
    const membershipFilter = 'all';
    const verificationFilter = 'all';
    const sortField = 'created_at';
    const sortDirection = 'desc';
    const currentPage = 1;
    const USERS_PER_PAGE = 25;
    
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    
    const { data: secondData, error: secondError, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('status', statusFilter !== 'all' ? statusFilter : undefined)
      .eq('membership_type', membershipFilter !== 'all' ? membershipFilter : undefined)
      .eq('verification_status', verificationFilter !== 'all' ? verificationFilter : undefined)
      .order(sortField, { ascending: sortDirection === 'asc' })
      .range(startIndex, startIndex + USERS_PER_PAGE - 1);

    if (secondError) {
      console.log('❌ Second query error:', secondError.message);
    } else {
      console.log(`✅ Second query found ${secondData.length} users, count: ${count}`);
      secondData?.forEach(user => {
        console.log(`  - ${user.email}: ${user.name} (${user.membership_type}) [${user.status}] {${user.verification_status}}`);
      });
    }

    // 4. Test with explicit filters removed
    console.log('\n4️⃣ Query without undefined filters:');
    const { data: cleanData, error: cleanError, count: cleanCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, 24);

    if (cleanError) {
      console.log('❌ Clean query error:', cleanError.message);
    } else {
      console.log(`✅ Clean query found ${cleanData.length} users, count: ${cleanCount}`);
      cleanData?.forEach(user => {
        console.log(`  - ${user.email}: ${user.name} (${user.membership_type}) [${user.status}] {${user.verification_status}}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugUserQuery(); 