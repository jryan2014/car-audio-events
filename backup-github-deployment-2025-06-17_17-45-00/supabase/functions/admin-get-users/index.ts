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
          location?: string;
          phone?: string;
          company_name?: string;
          verification_status: string;
          subscription_plan: string;
          last_login_at?: string;
          created_at: string;
          login_count: number;
          failed_login_attempts: number;
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
    // Create Supabase client with service role key
    const supabaseClient = createClient<Database>(
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify the user is authenticated and is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('membership_type, status')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('User not found in database:', userError);
      
      // Special case for admin@caraudioevents.com - allow access even if profile doesn't exist yet
      if (user.email === 'admin@caraudioevents.com') {
        console.log('Admin email detected but profile not found, allowing access');
        
        // Attempt to create admin profile
        const { error: createError } = await supabaseClient
          .from('users')
          .upsert({
            id: user.id,
            email: user.email || '',
            name: 'System Administrator',
            membership_type: 'admin',
            status: 'active',
            verification_status: 'verified',
            subscription_plan: 'enterprise',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (createError) {
          console.error('Failed to create admin profile:', createError);
        } else {
          console.log('Created admin profile successfully');
        }
        
        // Continue with admin access
        const mockUsers = [
          {
            id: user.id,
            email: user.email,
            name: 'System Administrator',
            membership_type: 'admin',
            status: 'active',
            verification_status: 'verified',
            subscription_plan: 'enterprise',
            created_at: new Date().toISOString(),
            login_count: 1,
            failed_login_attempts: 0
          }
        ];
        
        return new Response(
          JSON.stringify({ users: mockUsers }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'User profile not found in database' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (userData.membership_type !== 'admin' || userData.status !== 'active') {
      console.error('Insufficient permissions:', { membership_type: userData.membership_type, status: userData.status });
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient permissions',
          details: `User has membership_type: ${userData.membership_type}, status: ${userData.status}. Required: membership_type: admin, status: active`
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch all users
    const { data: users, error: usersError } = await supabaseClient
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
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ users: users || [] }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});