import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';
import { sendEmail } from '../_shared/mailgun-email-service.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Set your secure cron secret here (must match the one in the cron job URL)
const CRON_SECRET = 'n&7i%HgGqyx86MWx@Kgrid5JsL9XAtrzKWEkAYv!^t%SCnEHJD8Q5C2bT!GC';

// This function is designed to be called by a cron job or manually by admin users.
// Example cron schedule: once every minute.
// 0 * * * * *

serve(async (req) => {
  const url = new URL(req.url);
  const cronSecret = url.searchParams.get('cron_secret');
  const authHeader = req.headers.get('authorization');

  // Log all headers for debugging
  console.log('--- Edge Function Triggered ---');
  console.log('Request method:', req.method);
  console.log('Request headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    const origin = req.headers.get('origin');
    const isLocalhost = origin && origin.startsWith('http://localhost:');
    const corsOrigin = (origin === 'https://caraudioevents.com' || isLocalhost) ? origin : 'https://caraudioevents.com';
    
    return new Response(null, { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-schedule-secret'
      }
    });
  }

  // --- AUTH LOGIC: allow if JWT or correct cron_secret ---
  if (!(authHeader || cronSecret === CRON_SECRET)) {
    const origin = req.headers.get('origin');
    const isLocalhost = origin && origin.startsWith('http://localhost:');
    const corsOrigin = (origin === 'https://caraudioevents.com' || isLocalhost) ? origin : 'https://caraudioevents.com';
    
    return new Response(JSON.stringify({
      error: 'Unauthorized: Missing or invalid authentication'
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsOrigin
      }
    });
  }

  try {
    console.log('Creating Supabase admin client...');
    const supabaseAdmin = createSupabaseAdminClient();

    console.log('Fetching pending emails...');
    // 1. Fetch pending emails from the queue, with a reasonable limit
    const { data: pendingEmails, error: fetchError } = await supabaseAdmin
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .limit(50); // Process up to 50 emails per run

    if (fetchError) {
      console.error('Database fetch error:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${pendingEmails?.length || 0} pending emails`);

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log('No pending emails to process');
      const origin = req.headers.get('origin');
      const isLocalhost = origin && origin.startsWith('http://localhost:');
      const corsOrigin = (origin === 'https://caraudioevents.com' || isLocalhost) ? origin : 'https://caraudioevents.com';
      
      return new Response(JSON.stringify({ message: 'No pending emails to process.' }), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': corsOrigin
        },
      });
    }

    console.log('Starting to process emails...');
    // 2. Process each pending email
    const processingPromises = pendingEmails.map(async (email, index) => {
      console.log(`Processing email ${index + 1}/${pendingEmails.length}: ${email.id}`);
      console.log(`Email details:`, { 
        recipient: email.recipient || email.to_email,
        subject: email.subject,
        hasBody: !!(email.body || email.html_content)
      });
      try {
        const result = await sendEmail({
          recipient: email.recipient || email.to_email,
          subject: email.subject,
          body: email.body || email.html_content,
        });

        console.log(`Email send result for ${email.id}:`, result);
        console.log(`Result type: ${typeof result}, Success property: ${result?.success}, Has messageId: ${!!result?.messageId}`);

        // Check if email was sent successfully
        if (result && result.success === true) {
          // Email sent successfully, update status to 'sent'
          await supabaseAdmin
            .from('email_queue')
            .update({
              status: 'sent',
              last_attempt_at: new Date().toISOString(),
              error_message: null,
            })
            .eq('id', email.id);
          console.log(`Email ${email.id} sent successfully with message ID: ${result.messageId}`);
        } else {
          // If send result doesn't indicate success, mark as failed
          await supabaseAdmin
            .from('email_queue')
            .update({
              status: 'failed',
              last_attempt_at: new Date().toISOString(),
              error_message: 'Email service did not return success confirmation',
              attempts: (email.attempts || 0) + 1,
            })
            .eq('id', email.id);
          console.error(`Email ${email.id} failed: No success confirmation`);
        }
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

    console.log('Waiting for all emails to process...');
    await Promise.all(processingPromises);

    console.log('Function completed successfully');
    const origin = req.headers.get('origin');
    const isLocalhost = origin && origin.startsWith('http://localhost:');
    const corsOrigin = (origin === 'https://caraudioevents.com' || isLocalhost) ? origin : 'https://caraudioevents.com';
    
    return new Response(JSON.stringify({ message: `Processed ${pendingEmails.length} emails.` }), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsOrigin
      },
    });

  } catch (error) {
    console.error('Error processing email queue:', error);
    const origin = req.headers.get('origin');
    const isLocalhost = origin && origin.startsWith('http://localhost:');
    const corsOrigin = (origin === 'https://caraudioevents.com' || isLocalhost) ? origin : 'https://caraudioevents.com';
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsOrigin
      },
    });
  }
}); 