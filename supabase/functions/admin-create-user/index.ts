import { createClient } from 'npm:@supabase/supabase-js@2';

;

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
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: corsHeaders 
        }
      );
    }

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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: corsHeaders 
        }
      );
    }

    // Verify the user is authenticated and is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: corsHeaders 
        }
      );
    }

    // Check if the requesting user is an admin
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('users')
      .select('membership_type')
      .eq('id', user.id)
      .single();

    if (adminError || !adminData || adminData.membership_type !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only administrators can create users' }),
        { 
          status: 403, 
          headers: corsHeaders 
        }
      );
    }

    // Parse request body
    const { 
      email, 
      password, 
      name, 
      membership_type, 
      location, 
      phone, 
      company_name, 
      status, 
      verification_status, 
      subscription_plan 
    } = await req.json();

    if (!email || !password || !name || !membership_type) {
      return new Response(
        JSON.stringify({ error: 'Email, password, name, and membership_type are required' }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }

    console.log('🚀 Starting user creation process...');

    // Step 1: Create user in Supabase Auth
    console.log('🔐 Creating auth user...');
    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        membership_type
      }
    });

    if (authCreateError) {
      console.error('❌ Failed to create auth user:', authCreateError);
      return new Response(
        JSON.stringify({ error: 'Failed to create auth user', details: authCreateError.message }),
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }

    if (!authData.user) {
      console.error('❌ No user returned from auth creation');
      return new Response(
        JSON.stringify({ error: 'No user returned from auth creation' }),
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }

    const newUserId = authData.user.id;
    console.log('✅ Auth user created:', newUserId);

    // Step 2: Create the user profile
    console.log('👤 Creating user profile...');
    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: newUserId,
        email,
        name,
        membership_type,
        status: status || 'pending',
        verification_status: verification_status || 'pending',
        subscription_plan: subscription_plan || 'free',
        location,
        phone,
        company_name
      }, {
        onConflict: 'id'
      });

    if (upsertError) {
      console.error('❌ Failed to create user profile:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile', details: upsertError.message }),
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }

    console.log('✅ User profile created successfully');

    // Step 3: Create user preferences
    try {
      const { error: prefError } = await supabaseAdmin
        .from('user_preferences')
        .insert({
          user_id: newUserId
        });

      if (prefError) {
        console.warn('⚠️ Failed to create user preferences, but user was created:', prefError);
      }
    } catch (prefError) {
      console.warn('⚠️ Error creating user preferences, but user was created:', prefError);
    }

    // Step 4: Log the user creation in audit log
    try {
      await supabaseAdmin
        .from('admin_audit_log')
        .insert({
          admin_id: user.id,
          action: 'user_created',
          details: {
            created_user_id: newUserId,
            created_user_email: email,
            created_user_name: name,
            created_by: user.email,
            membership_type,
            status: status || 'pending'
          }
        });
    } catch (auditError) {
      console.warn('⚠️ Failed to log user creation in audit log:', auditError);
    }

    console.log('🎉 User creation completed successfully!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User created successfully',
        user: {
          id: newUserId,
          email,
          name,
          membership_type,
          status: status || 'pending',
          verification_status: verification_status || 'pending',
          subscription_plan: subscription_plan || 'free'
        }
      }),
      { 
        headers: corsHeaders 
      }
    );

  } catch (error) {
    console.error('💥 Unexpected error in user creation:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});