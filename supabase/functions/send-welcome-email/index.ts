import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { edgeEmailService } from '../_shared/edge-email-service.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();

    if (!record?.email) {
      throw new Error("User email is missing in the webhook payload.");
    }
    
    const to = record.email;
    const firstName = record.raw_user_meta_data?.first_name || 'there';

    const { success, error } = await edgeEmailService.sendTemplatedEmail(
      to,
      'welcome',
      { firstName: firstName, dashboardUrl: 'https://caraudioevents.com/dashboard' },
      'Car Audio Events Account Team'
    );

    if (!success) {
      throw new Error(error || "Failed to send welcome email.");
    }

    return new Response(JSON.stringify({ message: `Welcome email sent to ${to}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Error sending welcome email:', err);
    return new Response(String(err?.message || err), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 