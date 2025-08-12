import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCors } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }
  
  // Get secure CORS headers for this request
  const corsHeaders = getCorsHeaders(req);

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: corsHeaders
        }
      )
    }

    // Extract the JWT token
    const jwt = authHeader.replace('Bearer ', '')
    
    // Verify the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: corsHeaders
        }
      )
    }

    // Check if user is admin - special case for admin email or check users table
    if (user.email === 'admin@caraudioevents.com') {
      // Admin user is always allowed
    } else {
      const { data: profile, error: profileError } = await supabaseClient
        .from('users')
        .select('membership_type')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || profile.membership_type !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { 
            status: 403, 
            headers: corsHeaders
          }
        )
      }
    }

    // Try to get settings from admin_settings table
    let keys = {
      stripe_publishable_key: '',
      stripe_secret_key: '',
      stripe_webhook_secret: '',
      stripe_webhook_endpoint: '',
      stripe_test_mode: true,
      supabase_url: '',
      supabase_anon_key: '',
      supabase_service_role_key: '',
      google_maps_api_key: ''
    }

    try {
      // Try to get all admin settings - handle both column naming schemes
      const { data: settings, error: settingsError } = await supabaseClient
        .from('admin_settings')
        .select('*')

      if (!settingsError && settings) {
        // Convert array of key-value pairs to object
        settings.forEach(setting => {
          // Handle both naming schemes: key/value and key_name/key_value
          const keyName = setting.key || setting.key_name
          const keyValue = setting.value || setting.key_value
          
          if (keyName && keys.hasOwnProperty(keyName)) {
            if (keyName === 'stripe_test_mode') {
              keys[keyName] = keyValue === 'true' || keyValue === true
            } else {
              keys[keyName] = keyValue || ''
            }
          }
        })
      }
    } catch (error) {
      console.log('Admin settings table not found or empty, using defaults')
    }

    // Fill in defaults from environment variables where not set
    if (!keys.supabase_url) {
      keys.supabase_url = Deno.env.get('SUPABASE_URL') || ''
    }
    if (!keys.supabase_anon_key) {
      keys.supabase_anon_key = Deno.env.get('SUPABASE_ANON_KEY') || ''
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        keys: keys
      }),
      {
        headers: corsHeaders,
      }
    )

  } catch (error) {
    console.error('Admin get keys error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: corsHeaders
      }
    )
  }
}) 