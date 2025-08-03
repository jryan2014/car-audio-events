import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateRequest {
  id: string;
  updates: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  console.log('Edge function called with method:', req.method)

  try {
    // Log environment variables status
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceRoleKey,
      hasAnonKey: !!anonKey,
      urlLength: supabaseUrl?.length || 0,
      serviceKeyLength: serviceRoleKey?.length || 0
    })
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { 
            code: 'CONFIG_ERROR', 
            message: 'Missing required environment variables' 
          } 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Create service role client for bypassing RLS
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'AUTH_FAILED', message: 'No authorization header' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create regular client to verify user
    if (!anonKey) {
      console.error('Missing SUPABASE_ANON_KEY for user verification')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { 
            code: 'CONFIG_ERROR', 
            message: 'Missing anon key for user verification' 
          } 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(
      supabaseUrl,
      anonKey
    )

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'AUTH_FAILED', message: 'Invalid token' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user details from our users table
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('membership_type')
      .eq('id', user.id)
      .single()

    if (userDataError) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found in users table' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    console.log('Request body:', JSON.stringify(body))
    
    const { id, updates }: UpdateRequest = body

    if (!id || !updates) {
      console.error('Invalid input:', { id, updates })
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing id or updates' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('Processing update for result:', id)
    console.log('Updates:', JSON.stringify(updates))

    // Get current record
    console.log('Fetching competition result with id:', id)
    const { data: currentRecord, error: fetchError } = await supabaseAdmin
      .from('competition_results')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error fetching record:', fetchError)
      return new Response(
        JSON.stringify({ success: false, error: { code: 'FETCH_ERROR', message: `Failed to fetch record: ${fetchError.message}` } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!currentRecord) {
      console.error('Competition result not found for id:', id)
      return new Response(
        JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Competition result not found' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('Found record:', currentRecord)

    // Check permissions
    let canUpdate = false
    if (userData.membership_type === 'admin') {
      canUpdate = true
    } else if (currentRecord.user_id === user.id && !currentRecord.verified) {
      // Users can only update their own unverified results
      canUpdate = true
      // Remove verified field from updates for non-admins
      delete updates.verified
    }

    if (!canUpdate) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { 
            code: 'PERMISSION_DENIED', 
            message: 'Insufficient permissions to update this competition result' 
          } 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate numeric fields
    if ('score' in updates && updates.score !== null && updates.score < 0) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_SCORE', message: 'Score must be non-negative' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if ('placement' in updates && updates.placement !== null && updates.placement < 1) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_PLACEMENT', message: 'Placement must be positive' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if ('total_participants' in updates && updates.total_participants !== null && updates.total_participants < 1) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_PARTICIPANTS', message: 'Total participants must be positive' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if ('points_earned' in updates && updates.points_earned !== null && updates.points_earned < 0) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INVALID_POINTS', message: 'Points earned must be non-negative' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Perform the update
    const { data: updatedRecord, error: updateError } = await supabaseAdmin
      .from('competition_results')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { 
            code: 'UPDATE_FAILED', 
            message: `Database error: ${updateError.message}` 
          } 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the update to security_audit_log (non-blocking)
    try {
      await supabaseAdmin
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          action: 'update_competition_result',
          resource_type: 'competition_results',
          resource_id: id,
          ip_address: '127.0.0.1',
          user_agent: req.headers.get('User-Agent') || 'Edge Function',
          risk_level: 'low',
          details: {
            old_data: currentRecord,
            new_data: updatedRecord,
            updates: updates
          },
          timestamp: new Date().toISOString()
        })
    } catch (auditError) {
      console.error('Failed to log security audit (non-blocking):', auditError)
      // Don't throw - audit logging failure shouldn't block the update
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: updatedRecord,
        message: 'Competition result updated successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    console.error('Error type:', typeof error)
    console.error('Error details:', JSON.stringify(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    // Try to get more specific error information
    let errorMessage = 'An unexpected error occurred'
    let errorCode = 'INTERNAL_ERROR'
    
    if (error instanceof Error) {
      errorMessage = error.message
      if (error.message.includes('JWT')) {
        errorCode = 'AUTH_ERROR'
      } else if (error.message.includes('JSON')) {
        errorCode = 'PARSE_ERROR'
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: { 
          code: errorCode, 
          message: errorMessage 
        } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})