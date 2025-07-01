import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface EmailRequest {
  to: string
  subject: string
  html: string
  text?: string
  provider: string
}

interface EmailConfiguration {
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  smtp_username: string
  smtp_password: string
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

    // Get email configuration
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

    // Create nodemailer transporter for Zoho
    const transporterConfig = {
      host: emailConfig.smtp_host,
      port: emailConfig.smtp_port,
      secure: emailConfig.smtp_secure,
      auth: {
        user: emailConfig.smtp_username,
        pass: emailConfig.smtp_password,
      },
    }

    // Use fetch to send email via SMTP API (simplified approach for Deno)
    const emailData = {
      from: `${emailConfig.from_name} <${emailConfig.from_email}>`,
      to: to,
      subject: subject,
      html: html,
      text: text || '',
      replyTo: emailConfig.reply_to || emailConfig.from_email,
    }

    // For Zoho Mail API, we'll use their REST API instead of SMTP
    const zohoApiUrl = 'https://mail.zoho.com/api/accounts/accountid/messages'
    
    // Create basic auth header
    const auth = btoa(`${emailConfig.smtp_username}:${emailConfig.smtp_password}`)
    
    const response = await fetch(zohoApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: emailConfig.from_email,
        toAddress: to,
        subject: subject,
        content: html,
        mailFormat: 'html'
      })
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoho API error:', errorText);
      // Update email queue status
      await supabaseClient
        .from('email_queue')
        .update({ 
          status: 'failed',
          error_message: `Zoho API error: ${response.statusText} - ${errorText}`,
          failed_at: new Date().toISOString()
        })
        .eq('to_email', to)
        .eq('subject', subject)

      return new Response(
        JSON.stringify({ success: false, error: `Email sending failed: ${errorText}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Update statistics
    await supabaseClient.rpc('update_email_stats', {
      p_provider: provider,
      p_status: 'sent'
    })

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
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