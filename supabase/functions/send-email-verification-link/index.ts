import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';

interface SendVerificationLinkRequest {
  email: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, userId } = await req.json() as SendVerificationLinkRequest;
    
    if (!email || !userId) {
      throw new Error('Email and userId are required');
    }
    
    const supabaseAdmin = createSupabaseAdminClient();
    
    // Generate a unique verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store the verification token
    const { error: tokenError } = await supabaseAdmin
      .from('email_verification_tokens')
      .insert({
        user_id: userId,
        email: email.trim(),
        token: verificationToken,
        expires_at: expiresAt.toISOString(),
        type: 'email_verification'
      });
    
    if (tokenError) {
      console.error('Failed to store verification token:', tokenError);
      throw new Error('Failed to create verification token');
    }
    
    // Get the site URL from environment or use default
    const siteUrl = Deno.env.get('SITE_URL') || 'https://caraudioevents.com';
    const verificationLink = `${siteUrl}/verify-email?token=${verificationToken}`;
    
    // Queue the verification email
    const { error: emailError } = await supabaseAdmin
      .from('email_queue')
      .insert({
        to_email: email.trim(),
        subject: 'Complete Your Email Verification - Car Audio Events',
        html_content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; margin: 0;">Car Audio Events</h1>
              <p style="color: #666; margin-top: 10px;">Competition Platform</p>
            </div>
            
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
              <h2 style="color: #333; margin-top: 0;">Complete Your Email Verification</h2>
              <p style="color: #666; line-height: 1.6;">
                Thank you for registering! You're almost done. Please click the button below to verify your email address and complete your account setup.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationLink}" 
                   style="display: inline-block; background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Verify Email & Complete Setup
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px; text-align: center;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #666; font-size: 14px; word-break: break-all; text-align: center;">
                ${verificationLink}
              </p>
            </div>
            
            <div style="text-align: center; color: #999; font-size: 12px;">
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account, you can safely ignore this email.</p>
            </div>
          </div>
        `,
        body: `Car Audio Events - Complete Your Email Verification

Thank you for registering! Please click the link below to verify your email address and complete your account setup:

${verificationLink}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.`,
        status: 'pending',
        priority: 2,
        metadata: { 
          type: 'email_verification_link',
          user_id: userId
        }
      });
    
    if (emailError) {
      console.error('Failed to queue email:', emailError);
      throw new Error('Failed to queue verification email');
    }
    
    // Trigger email processor
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
        message: 'Verification email sent successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Error sending verification link:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to send verification email'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});