import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          membership_type: string;
          status: string;
          verification_status: string;
          subscription_plan: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          membership_type: string;
          status: string;
          verification_status: string;
          subscription_plan: string;
        };
      };
    };
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const adminEmail = 'admin@caraudioevents.com';
    const adminPassword = 'TempAdmin123!';

    console.log('🚀 Starting admin user creation process...');

    // Step 1: Check if admin user already exists in auth
    const { data: existingAuthUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error checking existing users:', listError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing users', details: listError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const existingAuthUser = existingAuthUsers.users.find(user => user.email === adminEmail);
    let adminUserId: string;

    if (existingAuthUser) {
      console.log('✅ Admin auth user already exists:', existingAuthUser.id);
      adminUserId = existingAuthUser.id;
    } else {
      // Step 2: Create admin user in Supabase Auth
      console.log('🔐 Creating admin auth user...');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: 'System Administrator'
        }
      });

      if (authError) {
        console.error('❌ Failed to create auth user:', authError);
        return new Response(
          JSON.stringify({ error: 'Failed to create admin auth user', details: authError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (!authData.user) {
        console.error('❌ No user returned from auth creation');
        return new Response(
          JSON.stringify({ error: 'No user returned from auth creation' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      adminUserId = authData.user.id;
      console.log('✅ Admin auth user created:', adminUserId);
    }

    // Step 3: Always upsert the admin profile to ensure correct permissions
    console.log('👤 Creating/updating admin profile...');
    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: adminUserId,
        email: adminEmail,
        name: 'System Administrator',
        membership_type: 'admin',
        status: 'active',
        verification_status: 'verified',
        subscription_plan: 'enterprise'
      }, {
        onConflict: 'id'
      });

    if (upsertError) {
      console.error('❌ Failed to upsert admin profile:', upsertError);
      
      // Try an alternative approach if the upsert fails
      console.log('🔄 Trying alternative approach to create admin profile...');
      
      // First check if the profile already exists
      const { data: existingProfile } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', adminUserId)
        .single();
        
      if (existingProfile) {
        // Profile exists, try to update it
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            email: adminEmail,
            name: 'System Administrator',
            membership_type: 'admin',
            status: 'active',
            verification_status: 'verified',
            subscription_plan: 'enterprise',
            updated_at: new Date().toISOString()
          })
          .eq('id', adminUserId);
          
        if (updateError) {
          console.error('❌ Alternative update also failed:', updateError);
        } else {
          console.log('✅ Admin profile updated via alternative method');
          // Continue with the function
          upsertError.message = 'Handled via alternative method';
        }
      } else {
        // Profile doesn't exist, try to insert it
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: adminUserId,
            email: adminEmail,
            name: 'System Administrator',
            membership_type: 'admin',
            status: 'active',
            verification_status: 'verified',
            subscription_plan: 'enterprise'
          });
          
        if (insertError) {
          console.error('❌ Alternative insert also failed:', insertError);
        } else {
          console.log('✅ Admin profile created via alternative method');
          // Continue with the function
          upsertError.message = 'Handled via alternative method';
        }
      }
      
      // If we still have an error and haven't handled it, return the error
      if (upsertError.message !== 'Handled via alternative method') {
      return new Response(
        JSON.stringify({ error: 'Failed to create/update admin profile', details: upsertError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
      }
    }

    console.log('✅ Admin profile created/updated successfully');

    // Step 4: Verify the admin profile was created correctly
    const { data: verifyProfile, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, membership_type, status, verification_status')
      .eq('id', adminUserId)
      .single();

    if (verifyError) {
      console.error('❌ Failed to verify admin profile:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin profile', details: verifyError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Admin profile verified:', verifyProfile);

    // Ensure the profile has correct admin permissions
    if (verifyProfile.membership_type !== 'admin' || verifyProfile.status !== 'active') {
      console.error('❌ Admin profile does not have correct permissions:', verifyProfile);
      return new Response(
        JSON.stringify({ 
          error: 'Admin profile created but permissions are incorrect',
          profile: verifyProfile
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🎉 Admin user creation/update completed successfully!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user created successfully',
        profile: verifyProfile,
        credentials: {
          email: adminEmail,
          password: adminPassword
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Unexpected error in admin user creation:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});