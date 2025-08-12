import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'



serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Update user to admin in users table
    const { error: updateError } = await supabaseClient
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Admin User',
        membership_type: 'admin',
        status: 'active',
      }, { onConflict: 'id' })

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({ error: `Failed to grant admin access: ${updateError.message}` }),
        { status: 500, headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Admin access granted to ${user.email}`,
        user_id: user.id 
      }),
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Grant admin error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
}) 