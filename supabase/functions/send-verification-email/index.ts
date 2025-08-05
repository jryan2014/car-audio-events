import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';
import { sendEmail } from '../_shared/mailgun-email-service.ts';

interface RequestBody {
  email: string;
  type: 'registration' | 'support';
  captcha_token?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, type, captcha_token } = await req.json() as RequestBody;
    
    if (!email || !type) {
      throw new Error('Email and type are required');
    }

    // For support verification, check captcha
    if (type === 'support' && captcha_token && captcha_token !== 'test-token-for-development') {
      const hcaptchaSecret = Deno.env.get('HCAPTCHA_SECRET_KEY');
      if (hcaptchaSecret) {
        const captchaResponse = await fetch('https://hcaptcha.com/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: hcaptchaSecret,
            response: captcha_token,
          }),
        });

        const captchaResult = await captchaResponse.json();
        if (!captchaResult.success) {
          throw new Error('Captcha verification failed');
        }
      }
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // Generate a simple 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store the code with expiry
    const { error: storeError } = await supabaseAdmin
      .from('email_verification_codes')
      .insert({
        email,
        code: verificationCode,
        type,
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      });

    if (storeError) {
      console.error('Error storing verification code:', storeError);
      throw new Error('Failed to create verification code');
    }

    // Send email directly using Mailgun (no queue)
    const subject = type === 'registration' 
      ? 'Verify Your Car Audio Events Account'
      : 'Verify Your Email for Support Request';
      
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${subject}</h2>
        <p>Please use the verification code below to continue:</p>
        
        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <h1 style="font-size: 36px; letter-spacing: 8px; margin: 0; font-family: monospace;">${verificationCode}</h1>
        </div>
        
        <p style="color: #666; font-size: 14px;">This code will expire in 1 hour.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this verification, please ignore this email.</p>
      </div>
    `;

    const text = `${subject}\n\nYour verification code is: ${verificationCode}\n\nThis code will expire in 1 hour.`;

    // Send email immediately
    const emailResult = await sendEmail({
      recipient: email,
      subject,
      body: html,
      textBody: text,
    });

    if (!emailResult || !emailResult.success) {
      throw new Error('Failed to send verification email');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Verification email sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('Send verification email error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send verification email' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    );
  }
});