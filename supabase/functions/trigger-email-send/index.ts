import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';

// This function triggers the email queue processor immediately
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    
    // Check if there are pending emails
    const { data: pendingEmails } = await supabaseAdmin
      .from('email_queue')
      .select('id')
      .eq('status', 'pending')
      .limit(1);

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending emails to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger the email processor with the cron secret
    const cronSecret = Deno.env.get('EMAIL_QUEUE_CRON_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL not configured');
    }

    const processUrl = `${supabaseUrl}/functions/v1/process-email-queue${cronSecret ? `?cron_secret=${cronSecret}` : ''}`;
    
    const response = await fetch(processUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to trigger email processor:', errorText);
      throw new Error(`Failed to trigger email processor: ${response.status}`);
    }

    const result = await response.json();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email processor triggered successfully',
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Trigger email error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to trigger email processing' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});