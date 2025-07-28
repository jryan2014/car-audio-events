import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';
import { sendEmail } from '../_shared/mailgun-email-service.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Get the cron secret from environment variables
const CRON_SECRET = Deno.env.get('EMAIL_QUEUE_CRON_SECRET');

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
  if (!(authHeader || (CRON_SECRET && cronSecret === CRON_SECRET))) {
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
        hasBody: !!(email.body || email.html_content),
        hasTemplate: !!email.template_id,
        templateVars: email.template_variables
      });
      
      let finalHtmlBody = '';
      let finalTextBody = '';
      let finalSubject = email.subject;
      
      // Determine initial content based on what's in the email record
      if (email.html_content) {
        finalHtmlBody = email.html_content;
        finalTextBody = email.body || '';
      } else if (email.body) {
        // Check if body contains HTML
        if (email.body.includes('<!DOCTYPE') || email.body.includes('<html')) {
          finalHtmlBody = email.body;
          finalTextBody = '';
        } else {
          finalTextBody = email.body;
          finalHtmlBody = '';
        }
      }
      
      // If email has a template, fetch and process it
      if (email.template_id) {
        console.log(`Fetching template ${email.template_id}...`);
        const { data: template, error: templateError } = await supabaseAdmin
          .from('email_templates')
          .select('subject, body, html_body, text_body, variables')
          .eq('id', email.template_id)
          .single();
          
        if (template && !templateError) {
          console.log('Template found, processing variables...');
          // Use template content
          finalHtmlBody = template.html_body || finalHtmlBody;
          finalTextBody = template.text_body || template.body || finalTextBody;
          finalSubject = template.subject || finalSubject;
          
          // Replace template variables
          if (email.template_variables) {
            const vars = typeof email.template_variables === 'string' 
              ? JSON.parse(email.template_variables) 
              : email.template_variables;
              
            Object.entries(vars).forEach(([key, value]) => {
              const regex = new RegExp(`{{${key}}}`, 'g');
              finalHtmlBody = finalHtmlBody.replace(regex, String(value));
              finalTextBody = finalTextBody.replace(regex, String(value));
              finalSubject = finalSubject.replace(regex, String(value));
            });
            console.log('Template variables replaced');
          }
        } else {
          console.error('Failed to fetch template:', templateError);
        }
      }
      
      try {
        const result = await sendEmail({
          recipient: email.recipient || email.to_email,
          subject: finalSubject,
          body: finalHtmlBody,
          textBody: finalTextBody,
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
          
          // If this email is part of a newsletter campaign, update the campaign stats
          if (email.metadata?.campaign_id) {
            console.log(`Updating campaign ${email.metadata.campaign_id} stats...`);
            
            // Get current campaign stats
            const { data: campaign } = await supabaseAdmin
              .from('newsletter_campaigns')
              .select('sent_count, status')
              .eq('id', email.metadata.campaign_id)
              .single();
            
            if (campaign) {
              // Increment sent count
              const updates: any = {
                sent_count: (campaign.sent_count || 0) + 1
              };
              
              // If this is the first email sent, update status and sent_at
              if (campaign.sent_count === 0) {
                updates.status = 'sending';
                updates.sent_at = new Date().toISOString();
              }
              
              // Check if all emails have been sent
              const { data: pendingCount } = await supabaseAdmin
                .from('email_queue')
                .select('id', { count: 'exact' })
                .eq('status', 'pending')
                .eq('metadata->>campaign_id', email.metadata.campaign_id);
              
              if (pendingCount && pendingCount.length === 0) {
                updates.status = 'sent';
              }
              
              await supabaseAdmin
                .from('newsletter_campaigns')
                .update(updates)
                .eq('id', email.metadata.campaign_id);
            }
          }
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