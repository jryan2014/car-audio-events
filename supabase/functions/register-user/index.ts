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
  // Add immediate response to test if function is called
  console.log('===== REGISTER USER FUNCTION START =====');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Wrap everything in a try-catch to always return a proper response
  try {
    console.log('Register-user function called');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    let body: any;
    try {
      body = await req.json();
      console.log('Request body parsed successfully:', JSON.stringify(body));
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }
    
    const { email, password, userData, captchaToken } = body as RegisterRequest;
    
    if (!email || !password || !userData) {
      throw new Error('Missing required fields: email, password, or userData');
    }
    
    console.log('Creating admin client...');
    const supabaseAdmin = createSupabaseAdminClient();
    console.log('Admin client created');

    // Verify captcha first
    if (captchaToken && captchaToken !== 'test-token-for-development') {
      console.log('Verifying captcha token...');
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
        console.log('Captcha verification result:', captchaResult);
        
        if (!captchaResult.success) {
          console.error('Captcha verification failed:', captchaResult);
          throw new Error(`Captcha verification failed: ${captchaResult['error-codes']?.join(', ') || 'Unknown error'}`);
        }
      } else {
        console.warn('HCAPTCHA_SECRET_KEY not set, skipping captcha verification');
      }
    } else {
      console.log('Skipping captcha verification (test token or no token provided)');
    }

    // Create auth user with email confirmations disabled
    console.log('Creating auth user for:', email.trim());
    let authData: any;
    let authError: any;
    
    try {
      const result = await supabaseAdmin.auth.admin.createUser({
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
      authData = result.data;
      authError = result.error;
    } catch (createError) {
      console.error('Exception during createUser:', createError);
      throw new Error(`Failed to create auth user: ${createError.message}`);
    }

    if (authError) {
      console.error('Auth creation error:', authError);
      console.error('Auth error details:', {
        message: authError.message,
        status: authError.status,
        code: authError.code
      });
      
      // Check for specific error types
      if (authError.message?.includes('already exists') || authError.message?.includes('duplicate')) {
        throw new Error('A user with this email already exists');
      }
      
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

    // Don't send verification email here - the RegistrationVerificationModal will handle it
    // This prevents duplicate emails from being sent

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

  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack
    });
    
    // Always return 200 with error details to avoid FunctionsHttpError
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Registration failed',
        details: error.details || null,
        code: error.code || null,
        stack: error.stack || null
      }),
      { 
        status: 200, // Return 200 to get the error details in the response
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});