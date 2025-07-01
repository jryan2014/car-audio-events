import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
};

// Create Supabase admin client
function createSupabaseAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Email sending function using database configuration
async function sendEmail({ recipient, subject, body }: { recipient: string; subject: string; body: string }) {
  const supabaseAdmin = createSupabaseAdminClient();
  
  // Get email configuration from database
  const { data: config, error: configError } = await supabaseAdmin
    .from('email_configurations')
    .select('*')
    .eq('provider', 'mailgun')
    .eq('is_active', true)
    .single();

  if (configError || !config) {
    throw new Error('No active Mailgun email configuration found in database');
  }

  // Get domain from admin_settings
  const { data: domainData, error: domainError } = await supabaseAdmin
    .from('admin_settings')
    .select('value')
    .eq('key', 'mailgun_domain')
    .single();

  if (domainError || !domainData) {
    throw new Error('Mailgun domain not configured in admin settings');
  }

  const domain = domainData.value;

  // For Mailgun API, we'll use their REST API
  const mailgunApiUrl = `https://api.mailgun.net/v3/${domain}/messages`;
  
  // Create form data for Mailgun API
  const formData = new FormData();
  formData.append('from', `${config.from_name} <${config.from_email}>`);
  formData.append('to', recipient);
  formData.append('subject', subject);
  formData.append('html', body);
  
  const response = await fetch(mailgunApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`api:${config.api_key}`)}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email sending failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Process each pending email
    const processingPromises = pendingEmails.map(async (email) => {
      try {
        await sendEmail({
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
        });

        // If sending is successful, update status to 'sent'
        await supabaseAdmin
          .from('email_queue')
          .update({
            status: 'sent',
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', email.id);
      } catch (error) {
        // If sending fails, update status to 'failed' and log the error
        await supabaseAdmin
          .from('email_queue')
          .update({
            status: 'failed',
            last_attempt_at: new Date().toISOString(),
            error_message: error.message,
            attempts: email.attempts + 1,
          })
          .eq('id', email.id);
      }
    });

    await Promise.all(processingPromises);

    return new Response(JSON.stringify({ message: `Processed ${pendingEmails.length} emails.` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing email queue:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 