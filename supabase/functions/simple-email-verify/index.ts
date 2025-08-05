import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';

interface RequestBody {
  email: string;
  code?: string;
  action: 'send' | 'verify';
  captcha_token?: string;
  type?: 'support' | 'registration';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, code, action, captcha_token, type = 'support' } = await req.json() as RequestBody;
    const supabaseAdmin = createSupabaseAdminClient();

    if (action === 'send') {
      // For support tickets, verify captcha (registration uses Supabase Auth captcha)
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

      // Generate simple 6-digit code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store it in email_verification_codes table
      const { error: storeError } = await supabaseAdmin
        .from('email_verification_codes')
        .insert({
          email,
          code: verificationCode,
          type: type,
          expires_at: new Date(Date.now() + 600000).toISOString(), // 10 minutes instead of 1 hour
        });

      if (storeError) {
        console.error('Error storing code:', storeError);
        throw new Error('Failed to create verification code');
      }

      // Queue the email in email_queue for IMMEDIATE processing
      const { error: queueError } = await supabaseAdmin
        .from('email_queue')
        .insert({
          to_email: email,
          subject: 'Your Verification Code - Car Audio Events',
          html_content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Your Verification Code</h2>
              <p>Please enter this code to continue:</p>
              <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <h1 style="font-size: 36px; letter-spacing: 8px; margin: 0; font-family: monospace;">${verificationCode}</h1>
              </div>
              <p style="color: #666;">This code expires in 10 minutes.</p>
            </div>
          `,
          body: `Your verification code is: ${verificationCode}\n\nThis code expires in 10 minutes.`,
          status: 'pending',
          priority: 3, // highest priority
          metadata: { 
            type: type === 'registration' ? 'registration_verification' : 'support_verification',
            immediate: true
          }
        });

      if (queueError) {
        console.error('Error queuing email:', queueError);
        throw new Error('Failed to queue verification email');
      }

      // IMMEDIATELY trigger the email processor
      try {
        const processResult = await supabaseAdmin.functions.invoke('process-email-queue', {
          body: {}
        });
        console.log('Email processor triggered:', processResult);
      } catch (processError) {
        console.error('Could not trigger email processor:', processError);
        // Don't throw - email is queued and will be sent eventually
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Verification code sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'verify') {
      if (!code || code.length !== 6) {
        throw new Error('Invalid verification code');
      }

      // Check the code
      const { data: verificationData, error: verifyError } = await supabaseAdmin
        .from('email_verification_codes')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .eq('type', type)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (verifyError || !verificationData) {
        throw new Error('Invalid or expired verification code');
      }

      // Mark as used
      await supabaseAdmin
        .from('email_verification_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', verificationData.id);

      return new Response(
        JSON.stringify({ success: true, verified: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Email verification error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Verification failed' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});