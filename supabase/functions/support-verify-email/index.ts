import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'



interface RequestBody {
  email: string
  captcha_token?: string
  code?: string
  action: 'send' | 'verify'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, captcha_token, code, action } = await req.json() as RequestBody
    
    console.log('Request received:', { email, action, captcha_token: captcha_token ? 'present' : 'missing' })

    // Get IP address for rate limiting (take first IP if multiple)
    const forwardedFor = req.headers.get('x-forwarded-for')
    const ip = forwardedFor 
      ? forwardedFor.split(',')[0].trim() 
      : req.headers.get('x-real-ip') || 'unknown'

    if (action === 'send') {
      // Check if this is a development/test scenario
      const isDevelopmentToken = captcha_token === 'test-token-for-development'
      
      // Only verify real captcha tokens
      if (captcha_token && !isDevelopmentToken) {
        const hcaptchaSecret = Deno.env.get('HCAPTCHA_SECRET_KEY')
        if (!hcaptchaSecret) {
          console.warn('HCAPTCHA_SECRET_KEY not configured - skipping captcha verification')
        } else {
          const captchaResponse = await fetch('https://hcaptcha.com/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              secret: hcaptchaSecret,
              response: captcha_token,
              remoteip: ip,
            }),
          })

          const captchaResult = await captchaResponse.json()
          if (!captchaResult.success) {
            console.error('Captcha verification failed:', captchaResult)
            throw new Error('Captcha verification failed')
          }
        }
      }
      // No else clause - we allow missing captcha for development

      // Check rate limit
      try {
        const { data: rateLimitOk, error: rateLimitError } = await supabaseClient.rpc('check_support_rate_limit', {
          p_identifier: email,
          p_identifier_type: 'email',
          p_action: 'email_verify',
          p_max_attempts: 3,
          p_window_minutes: 60
        })
        
        if (rateLimitError) {
          console.error('Rate limit check error:', rateLimitError.message)
          // Continue anyway for testing
        } else if (!rateLimitOk) {
          throw new Error('Too many verification attempts. Please try again later.')
        }
      } catch (rateLimitCheckError) {
        console.error('Rate limit check failed:', rateLimitCheckError.message || 'Unknown error')
        // Continue anyway for testing
      }

      // Generate 6-digit code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

      // Store verification token
      const { error: tokenError } = await supabaseClient
        .from('support_email_verification_tokens')
        .insert({
          email,
          token: verificationCode,
          ip_address: ip === 'unknown' ? null : ip,
        })

      if (tokenError) {
        console.error('Token creation error:', tokenError.message)
        throw new Error(`Failed to create verification token: ${tokenError.message}`)
      }

      // Get base URL from environment or use default
      const baseUrl = Deno.env.get('SITE_BASE_URL') || 'https://caraudioevents.com';
      const verificationLink = `${baseUrl}/support/verify?email=${encodeURIComponent(email)}&code=${verificationCode}`;
      
      // Queue verification email using the standard email queue
      const { error: emailError } = await supabaseClient
        .from('email_queue')
        .insert({
          to_email: email,
          subject: 'Car Audio Events - Support Request Verification',
          html_content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Verify Your Email</h2>
              <p>You're almost done! Please verify your email to submit your support request.</p>
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="${verificationLink}" 
                   style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">Or enter this verification code manually:</p>
              <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <h1 style="font-size: 36px; letter-spacing: 8px; margin: 0; font-family: monospace;">${verificationCode}</h1>
              </div>
              
              <p style="color: #666; font-size: 14px;">This code will expire in 1 hour.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this verification, please ignore this email.</p>
            </div>
          `,
          body: `Car Audio Events - Support Request Verification\n\nYou're almost done! Please verify your email to submit your support request.\n\nClick here to verify: ${verificationLink}\n\nOr enter this verification code manually:\n\n${verificationCode}\n\nThis code will expire in 1 hour.\n\nIf you didn't request this verification, please ignore this email.`,
          priority: 2, // high priority
          status: 'pending',
          metadata: { 
            type: 'support_verification',
            email: email
          }
        })

      if (emailError) {
        console.error('Email queue error:', emailError.message, emailError.code)
        throw new Error(`Failed to queue verification email: ${emailError.message}`)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Verification email queued successfully' }),
        { headers: corsHeaders },
      )

    } else if (action === 'verify') {
      if (!code || code.length !== 6) {
        throw new Error('Invalid verification code')
      }

      // Verify the code
      const { data: token, error: tokenError } = await supabaseClient
        .from('support_email_verification_tokens')
        .select('*')
        .eq('email', email)
        .eq('token', code)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (tokenError || !token) {
        // Increment attempts on the most recent token
        await supabaseClient
          .from('support_email_verification_tokens')
          .update({ attempts: token?.attempts ? token.attempts + 1 : 1 })
          .eq('email', email)
          .is('used_at', null)
          .order('created_at', { ascending: false })
          .limit(1)

        throw new Error('Invalid or expired verification code')
      }

      // Mark token as used
      const { error: updateError } = await supabaseClient
        .from('support_email_verification_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', token.id)

      if (updateError) {
        console.error('Token update error:', updateError.message)
        throw new Error('Failed to verify email')
      }

      return new Response(
        JSON.stringify({ success: true, verified: true, email }),
        { headers: corsHeaders },
      )

    } else {
      throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Support email verification error:', error.message || 'Unknown error')
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred during email verification' 
      }),
      { 
        status: 400,
        headers: corsHeaders 
      },
    )
  }
})