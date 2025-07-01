import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers defined inline to avoid import issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
}

interface EmailRequest {
  to: string
  subject: string
  html: string
  text?: string
  provider: string
}

interface EmailConfiguration {
  api_key: string
  from_email: string
  from_name: string
  reply_to?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { to, subject, html, text, provider }: EmailRequest = await req.json()

    // Get email configuration from database
    const { data: config, error: configError } = await supabaseClient
      .from('email_configurations')
      .select('*')
      .eq('provider', provider)
      .eq('is_active', true)
      .single()

    if (configError || !config) {
      throw new Error(`No active ${provider} email configuration found`)
    }

    const emailConfig: EmailConfiguration = config

    // Get domain from admin_settings
    const { data: domainData, error: domainError } = await supabaseClient
      .from('admin_settings')
      .select('value')
      .eq('key', 'mailgun_domain')
      .single()

    if (domainError || !domainData) {
      throw new Error('Mailgun domain not configured in admin settings')
    }

    const domain = domainData.value

    // Create form data for Mailgun API
    const formData = new FormData()
    formData.append('from', `${emailConfig.from_name} <${emailConfig.from_email}>`)
    formData.append('to', to)
    formData.append('subject', subject)
    formData.append('html', html)
    
    if (text) {
      formData.append('text', text)
    }
    
    if (emailConfig.reply_to) {
      formData.append('h:Reply-To', emailConfig.reply_to)
    }

    // Send email via Mailgun API
    const mailgunApiUrl = `https://api.mailgun.net/v3/${domain}/messages`
    
    const response = await fetch(mailgunApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${emailConfig.api_key}`)}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mailgun API error:', errorText);
      
      // Update email queue status if this was called from queue
      try {
        await supabaseClient
          .from('email_queue')
          .update({ 
            status: 'failed',
            error_message: `Mailgun API error: ${response.statusText} - ${errorText}`,
            failed_at: new Date().toISOString()
          })
          .eq('to_email', to)
          .eq('subject', subject)
      } catch (queueError) {
        console.error('Failed to update email queue:', queueError)
      }

      return new Response(
        JSON.stringify({ success: false, error: `Email sending failed: ${errorText}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const result = await response.json()

    // Update email queue status if this was called from queue
    try {
      await supabaseClient
        .from('email_queue')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('to_email', to)
        .eq('subject', subject)
    } catch (queueError) {
      console.error('Failed to update email queue:', queueError)
    }

    // Update statistics
    try {
      await supabaseClient.rpc('update_email_stats', {
        p_provider: provider,
        p_status: 'sent'
      })
    } catch (statsError) {
      console.error('Failed to update email stats:', statsError)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', messageId: result.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 