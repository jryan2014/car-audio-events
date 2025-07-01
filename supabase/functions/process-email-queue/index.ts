import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';
import { sendEmail } from '../_shared/mailgun-email-service.ts';
import { corsHeaders } from '../_shared/cors.ts';

// This function is designed to be called by a cron job or manually by admin users.
// Example cron schedule: once every minute.
// 0 * * * * *

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': 'https://caraudioevents.com',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-schedule-secret'
      }
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    const scheduleSecret = req.headers.get('x-supabase-schedule-secret');
    
    // Allow if it's a cron job (has schedule secret) or if it's an admin user with valid JWT
    if (!scheduleSecret && !authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing authentication' }), {
        status: 401,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://caraudioevents.com'
        },
      });
    }

    // If it's not a cron job, require authorization header
    if (!scheduleSecret && !authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing authentication' }), {
        status: 401,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://caraudioevents.com'
        },
      });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // 1. Fetch pending emails from the queue, with a reasonable limit
    const { data: pendingEmails, error: fetchError } = await supabaseAdmin
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .limit(50); // Process up to 50 emails per run

    if (fetchError) {
      throw fetchError;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
          return new Response(JSON.stringify({ message: 'No pending emails to process.' }), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://caraudioevents.com'
      },
    });
    }

    // 2. Process each pending email
    const processingPromises = pendingEmails.map(async (email) => {
      try {
        const result = await sendEmail({
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
        });

        if (result && result.success === false) {
          // If send-mailgun-email returned an error, mark as failed
          await supabaseAdmin
            .from('email_queue')
            .update({
              status: 'failed',
              last_attempt_at: new Date().toISOString(),
              error_message: 'Unknown error from send-mailgun-email',
              attempts: (email.attempts || 0) + 1,
            })
            .eq('id', email.id);
          console.error(`Email ${email.id} failed: Unknown error`);
          return;
        }

        // If sending is successful, update status to 'sent'
        await supabaseAdmin
          .from('email_queue')
          .update({
            status: 'sent',
            last_attempt_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', email.id);
        console.log(`Email ${email.id} sent successfully`);
      } catch (error) {
        console.error(`Error sending email ${email.id}:`, error);
        await supabaseAdmin
          .from('email_queue')
          .update({
            status: 'failed',
            last_attempt_at: new Date().toISOString(),
            error_message: error.message || String(error),
            attempts: (email.attempts || 0) + 1,
          })
          .eq('id', email.id);
      }
    });

    await Promise.all(processingPromises);

    return new Response(JSON.stringify({ message: `Processed ${pendingEmails.length} emails.` }), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://caraudioevents.com'
      },
    });

  } catch (error) {
    console.error('Error processing email queue:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://caraudioevents.com'
      },
    });
  }
}); 