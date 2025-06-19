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
        };
        Update: {
          status?: string;
          updated_at?: string;
        };
      };
      admin_audit_log: {
        Insert: {
          admin_id: string;
          action: string;
          details: any;
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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

    if (userError || !userData || userData.membership_type !== 'admin' || userData.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { userId, action } = await req.json();

    if (!userId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or action' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Perform the requested action
    let updateData: any = { updated_at: new Date().toISOString() };
    let auditAction = '';

    switch (action) {
      case 'activate':
        updateData.status = 'active';
        auditAction = 'User activated';
        break;
      case 'approve':
        updateData.status = 'active';
        updateData.verification_status = 'verified';
        auditAction = 'User approved';
        break;
      case 'suspend':
        updateData.status = 'suspended';
        auditAction = 'User suspended';
        break;
      case 'ban':
        updateData.status = 'banned';
        auditAction = 'User banned';
        break;
      case 'delete':
        // For delete, we'll actually just ban the user to preserve data integrity
        updateData.status = 'banned';
        auditAction = 'User deleted (banned)';
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

    // Update the user
    const { error: updateError } = await supabaseClient
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update user' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log the action in audit log
    const { error: auditError } = await supabaseClient
      .from('admin_audit_log')
      .insert({
        admin_id: user.id,
        action: auditAction,
        details: { userId, action, timestamp: new Date().toISOString() }
      });

    if (auditError) {
      console.error('Error logging audit action:', auditError);
      // Don't fail the request if audit logging fails
    }

    return new Response(
      JSON.stringify({ success: true, message: `User ${action} successful` }),
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