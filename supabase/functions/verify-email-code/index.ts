import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';

interface RequestBody {
  email: string;
  code: string;
  type: 'registration' | 'support';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, code, type } = await req.json() as RequestBody;
    
    if (!email || !code || !type) {
      throw new Error('Email, code, and type are required');
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // Check if code is valid
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

    // Mark code as used
    const { error: updateError } = await supabaseAdmin
      .from('email_verification_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', verificationData.id);

    if (updateError) {
      console.error('Error updating verification code:', updateError);
      throw new Error('Failed to verify code');
    }

    // For registration, update user verification status
    if (type === 'registration') {
      // Find user by email
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userData && !userError) {
        await supabaseAdmin
          .from('users')
          .update({ 
            verification_status: 'verified',
            verified_at: new Date().toISOString()
          })
          .eq('id', userData.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        verified: true,
        email,
        type 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('Verify email code error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to verify code' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    );
  }
});