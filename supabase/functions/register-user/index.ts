import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';

interface RegisterRequest {
  email: string;
  password: string;
  userData: {
    name: string;
    membershipType: string;
    location?: string;
    phone?: string;
    companyName?: string;
  };
  captchaToken: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, userData, captchaToken } = await req.json() as RegisterRequest;
    const supabaseAdmin = createSupabaseAdminClient();

    // Verify captcha first
    if (captchaToken && captchaToken !== 'test-token-for-development') {
      const hcaptchaSecret = Deno.env.get('HCAPTCHA_SECRET_KEY');
      if (hcaptchaSecret) {
        const captchaResponse = await fetch('https://hcaptcha.com/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: hcaptchaSecret,
            response: captchaToken,
          }),
        });

        const captchaResult = await captchaResponse.json();
        if (!captchaResult.success) {
          throw new Error('Captcha verification failed');
        }
      }
    }

    // Create auth user with email confirmations disabled
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: false, // Don't send confirmation email
      user_metadata: {
        name: userData.name,
        membership_type: userData.membershipType,
        location: userData.location,
        phone: userData.phone,
        company_name: userData.companyName
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('User creation failed');
    }

    // Determine status based on membership type
    let initialStatus = 'active';
    let verificationStatus = 'pending'; // We'll handle email verification ourselves
    
    if (['retailer', 'manufacturer', 'organization'].includes(userData.membershipType)) {
      initialStatus = 'pending'; // Will be pending until manual approval
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authData.user.id,
        email: email.trim(),
        membership_type: userData.membershipType,
        phone: userData.phone || null,
        company_name: userData.companyName || null,
        status: initialStatus,
        verification_status: verificationStatus,
        name: userData.name || null,
        first_name: userData.name ? userData.name.split(' ')[0] : null,
        last_name: userData.name ? userData.name.split(' ').slice(1).join(' ') : null,
        location: userData.location || null,
        created_at: new Date().toISOString()
      }]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Try to clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error('Failed to create user profile');
    }

    // Queue verification email using our system
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store verification code
    await supabaseAdmin
      .from('email_verification_codes')
      .insert({
        email: email.trim(),
        code: verificationCode,
        type: 'registration',
        expires_at: new Date(Date.now() + 600000).toISOString(), // 10 minutes
      });

    // Queue the email
    await supabaseAdmin
      .from('email_queue')
      .insert({
        to_email: email.trim(),
        subject: 'Verify Your Email - Car Audio Events',
        html_content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Car Audio Events!</h2>
            <p>Please verify your email address by entering this code:</p>
            <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <h1 style="font-size: 36px; letter-spacing: 8px; margin: 0; font-family: monospace;">${verificationCode}</h1>
            </div>
            <p style="color: #666;">This code expires in 10 minutes.</p>
          </div>
        `,
        body: `Welcome to Car Audio Events!\n\nYour verification code is: ${verificationCode}\n\nThis code expires in 10 minutes.`,
        status: 'pending',
        priority: 3,
        metadata: { 
          type: 'registration_verification',
          immediate: true
        }
      });

    // Trigger email processor immediately
    try {
      await supabaseAdmin.functions.invoke('process-email-queue', {
        body: {}
      });
    } catch (processError) {
      console.error('Could not trigger email processor:', processError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authData.user.id,
          email: authData.user.email
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Registration failed' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});