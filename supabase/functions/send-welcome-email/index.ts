import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/zoho-email-service.ts';

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

    const emailResult = await sendEmail({
      recipient: to,
      subject: 'Welcome to Car Audio Events!',
      body: `
        <h2>Welcome to Car Audio Events, ${firstName}!</h2>
        <p>Thank you for joining our community. We're excited to have you on board!</p>
        <p>You can now access your dashboard at: <a href="https://caraudioevents.com/dashboard">https://caraudioevents.com/dashboard</a></p>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <br>
        <p>Best regards,<br>The Car Audio Events Team</p>
      `
    });

    if (!emailResult.success) {
      throw new Error("Failed to send welcome email.");
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