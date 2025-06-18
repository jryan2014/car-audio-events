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
          location?: string;
          phone?: string;
          company_name?: string;
          created_at: string;
          updated_at: string;
        };
        Update: {
          name?: string;
          membership_type?: string;
          status?: string;
          verification_status?: string;
          subscription_plan?: string;
          location?: string;
          phone?: string;
          company_name?: string;
          updated_at?: string;
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
    // Only allow PUT requests
    if (req.method !== 'PUT') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
        JSON.stringify({ error: 'Only administrators can update users' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { userId, userData } = await req.json();

    if (!userId || !userData) {
      return new Response(
        JSON.stringify({ error: 'User ID and update data are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🚀 Starting user update process...');

    // Prepare update data
    const updateData: Database['public']['Tables']['users']['Update'] = {
      ...userData,
      updated_at: new Date().toISOString()
    };

    // Update user profile
    console.log('👤 Updating user profile...');
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Failed to update user profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update user profile', details: updateError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ User profile updated successfully');

    // Update auth user metadata if name or membership_type changed
    if (userData.name || userData.membership_type) {
      console.log('🔄 Updating auth user metadata...');
      
      // Get current user data first
      const { data: currentUser } = await supabaseAdmin
        .from('users')
        .select('name, membership_type')
        .eq('id', userId)
        .single();
        
      if (currentUser) {
        const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            user_metadata: {
              name: userData.name || currentUser.name,
              membership_type: userData.membership_type || currentUser.membership_type
            }
          }
        );

        if (metadataError) {
          console.warn('⚠️ Failed to update auth metadata, but profile was updated:', metadataError);
        } else {
          console.log('✅ Auth metadata updated successfully');
        }
      }
    }

    // Log the user update in audit log
    try {
      await supabaseAdmin
        .from('admin_audit_log')
        .insert({
          admin_id: user.id,
          action: 'user_updated',
          details: {
            updated_user_id: userId,
            updated_by: user.email,
            changes: userData
          }
        });
    } catch (auditError) {
      console.warn('⚠️ Failed to log user update in audit log:', auditError);
    }

    // Get the updated user data
    const { data: updatedUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.warn('⚠️ Failed to fetch updated user data:', fetchError);
    }

    console.log('🎉 User update completed successfully!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User updated successfully',
        user: updatedUser || null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Unexpected error in user update:', error);
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