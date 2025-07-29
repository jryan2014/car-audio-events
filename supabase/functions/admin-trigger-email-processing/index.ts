import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { AuditLogger } from '../_shared/audit-logger.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const auditLogger = new AuditLogger();
  const requestInfo = auditLogger.getRequestInfo(req);

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user is admin
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('membership_type')
      .eq('id', user.id)
      .single()

    if (profileError || !userData || userData.membership_type !== 'admin') {
      // Log unauthorized access attempt
      await auditLogger.log({
        user_id: user.id,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        metadata: { 
          endpoint: 'admin-trigger-email-processing',
          membership_type: userData?.membership_type || 'unknown'
        },
        ...requestInfo
      });

      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the cron secret from environment
    const cronSecret = Deno.env.get('EMAIL_QUEUE_CRON_SECRET');
    
    if (!cronSecret) {
      console.error('EMAIL_QUEUE_CRON_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Email processing not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Call the email processing function with the secret
    const response = await fetch(
      `${supabaseUrl}/functions/v1/process-email-queue?cron_secret=${encodeURIComponent(cronSecret)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      }
    );

    const result = await response.json();

    // Log the admin action
    await auditLogger.log({
      user_id: user.id,
      action: 'ADMIN_TRIGGERED_EMAIL_PROCESSING',
      metadata: {
        success: response.ok,
        result: result.message || result.error
      },
      ...requestInfo
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Email processing failed',
          details: result.error || 'Unknown error'
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: result.message || 'Email processing triggered successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in admin email processing:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to trigger email processing',
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})