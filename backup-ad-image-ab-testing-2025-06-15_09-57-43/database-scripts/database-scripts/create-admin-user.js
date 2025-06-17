const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Create admin client with service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // First, check if user already exists in auth
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }
    
    const existingUser = existingUsers.users.find(user => user.email === 'admin@caraudioevents.com');
    
    if (existingUser) {
      console.log('Admin user already exists in auth. Updating password...');
      
      // Update password for existing user
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: 'admin123!' }
      );
      
      if (updateError) {
        console.error('Error updating password:', updateError);
        return;
      }
      
      console.log('Password updated successfully!');
      console.log('You can now login with:');
      console.log('Email: admin@caraudioevents.com');
      console.log('Password: admin123!');
      return;
    }
    
    // Create new auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@caraudioevents.com',
      password: 'admin123!',
      email_confirm: true,
      user_metadata: {
        name: 'System Administrator',
        role: 'admin'
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return;
    }

    console.log('Auth user created successfully!');
    console.log('User ID:', authUser.user.id);

    // Update the users table with the correct auth ID
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        id: authUser.user.id,
        email: 'admin@caraudioevents.com',
        name: 'System Administrator',
        status: 'active',
        membership_type: 'enterprise'
      })
      .eq('email', 'admin@caraudioevents.com');

    if (updateError) {
      console.error('Error updating users table:', updateError);
      return;
    }

    console.log('✅ Admin user created successfully!');
    console.log('Login credentials:');
    console.log('Email: admin@caraudioevents.com');
    console.log('Password: admin123!');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createAdminUser(); 