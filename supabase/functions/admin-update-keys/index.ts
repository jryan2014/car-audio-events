import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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

    // Parse request body
    const { keys } = await req.json()
    if (!keys || typeof keys !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid keys data' }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      )
    }

    // Try to update admin_settings table, create if it doesn't exist
    const updates = []
    
    // SECURITY: exec_sql removed - table should be created via migration
    // Check if table exists first, then guide user to create it properly
    const { data: tableCheck, error: tableError } = await supabaseClient
      .from('admin_settings')
      .select('id')
      .limit(1)
    
    if (tableError && tableError.message.includes('relation "admin_settings" does not exist')) {
      return new Response(
        JSON.stringify({
          error: 'admin_settings table does not exist',
          message: 'Please create the admin_settings table via database migration first',
          sql: `CREATE TABLE IF NOT EXISTS admin_settings (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            key_name VARCHAR(255) UNIQUE NOT NULL,
            key_value TEXT,
            is_sensitive BOOLEAN DEFAULT false,
            description TEXT,
            updated_by UUID REFERENCES users(id),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
          );`
        }),
        {
          status: 500,
          headers: corsHeaders
        }
      )
    }
    
    for (const [key, value] of Object.entries(keys)) {
      if (value !== undefined && value !== null && value !== '') {
        const { error } = await supabaseClient
          .from('admin_settings')
          .upsert(
            { 
              key_name: key, 
              key_value: typeof value === 'boolean' ? value.toString() : value,
              updated_at: new Date().toISOString(),
              updated_by: user.id
            },
            { onConflict: 'key_name' }
          )
        
        if (error) {
          console.error(`Error updating key ${key}:`, error)
          return new Response(
            JSON.stringify({ error: `Failed to update ${key}: ${error.message}` }),
            { 
              status: 500, 
              headers: corsHeaders 
            }
          )
        }
        updates.push(key)
      }
    }

    // Log the admin activity
    await supabaseClient
      .from('admin_activity_log')
      .insert({
        admin_id: user.id,
        action: 'update_settings',
        details: { updated_keys: updates },
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${updates.length} settings`,
        updated_keys: updates 
      }),
      {
        headers: corsHeaders,
      }
    )

  } catch (error) {
    console.error('Admin update keys error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    )
  }
}) 