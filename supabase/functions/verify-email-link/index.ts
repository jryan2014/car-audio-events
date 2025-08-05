import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';

interface VerifyEmailLinkRequest {
  token: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json() as VerifyEmailLinkRequest;
    
    if (!token) {
      throw new Error('No verification token provided');
    }
    
    const supabaseAdmin = createSupabaseAdminClient();
    
    // Get the token data
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .eq('type', 'email_verification')
      .single();

    if (tokenError || !tokenData) {
      console.error('Token lookup error:', tokenError);
      throw new Error('Invalid or expired verification link');
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      throw new Error('This verification link has expired');
    }

    // Check if token was already used
    if (tokenData.used_at) {
      throw new Error('This verification link has already been used');
    }

    // Update user's email verification status
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        verification_status: 'verified',
        email_verified_at: new Date().toISOString()
      })
      .eq('id', tokenData.user_id);

    if (updateError) {
      console.error('Failed to update user:', updateError);
      throw new Error('Failed to verify email');
    }

    // Mark token as used
    const { error: tokenUpdateError } = await supabaseAdmin
      .from('email_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    if (tokenUpdateError) {
      console.error('Failed to mark token as used:', tokenUpdateError);
    }

    // Also update the auth.users email_confirmed_at if needed
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenData.user_id,
      { email_confirm: true }
    );

    if (authUpdateError) {
      console.error('Failed to update auth user:', authUpdateError);
      // Don't throw - the main verification is done
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email verified successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Error verifying email link:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to verify email'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});