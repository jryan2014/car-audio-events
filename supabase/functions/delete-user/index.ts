// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getCorsHeaders, handleCors } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }
  
  // Get secure CORS headers for this request
  const corsHeaders = getCorsHeaders(req);

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create client to verify the requesting user is an admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify the user making the request
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('membership_type')
      .eq('id', user.id)
      .single()

    if (profileError || userData?.membership_type !== 'admin') {
      throw new Error('Only admins can delete users')
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the user ID to delete from the request
    const { userId } = await req.json()
    
    if (!userId) {
      throw new Error('User ID is required')
    }

    // Delete from users table first
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (usersError) {
      console.error('Error deleting from users table:', usersError)
      throw new Error(`Failed to delete from users table: ${usersError.message}`)
    }

    // Delete from auth.users using service role privileges
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Error deleting from auth:', authError)
      throw new Error(`Failed to delete from auth: ${authError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User completely deleted from system' 
      }),
      {
        headers: corsHeaders,
        status: 200,
      }
    )
  } catch (error) {
    console.error('Delete user error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: corsHeaders,
        status: error.message === 'Unauthorized' || error.message === 'Only admins can delete users' ? 403 : 400,
      }
    )
  }
})