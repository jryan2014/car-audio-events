// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const HCAPTCHA_SECRET_KEY = Deno.env.get('HCAPTCHA_SECRET_KEY');

interface HCaptchaVerificationResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts: string;
  hostname: string;
  credit?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing hCaptcha token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!HCAPTCHA_SECRET_KEY) {
      console.error('hCaptcha secret key is not set in environment variables.');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const params = new URLSearchParams();
    params.append('response', token);
    params.append('secret', HCAPTCHA_SECRET_KEY);

    const verifyUrl = 'https://api.hcaptcha.com/siteverify';

    const verificationRequest = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const verificationData: HCaptchaVerificationResponse = await verificationRequest.json();

    if (verificationData.success) {
      return new Response(JSON.stringify({ success: true, message: 'hCaptcha verification successful.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      console.log('hCaptcha verification failed:', verificationData['error-codes']);
      return new Response(JSON.stringify({ success: false, error: 'hCaptcha verification failed.', details: verificationData['error-codes'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
  } catch (error) {
    console.error('Error during hCaptcha verification:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 