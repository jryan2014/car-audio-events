// Mailgun email service for sending emails via Mailgun API
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

interface EmailPayload {
  recipient: string;
  subject: string;
  body: string; // HTML body
}

interface MailgunConfig {
  apiKey: string;
  domain: string;
  fromEmail: string;
  fromName: string;
}

// Reusable email sending service for Mailgun
export async function sendEmail(payload: EmailPayload) {
  const { recipient, subject, body } = payload;

  // Get Mailgun configuration from environment variables
  const apiKey = Deno.env.get('MAILGUN_API_KEY');
  const domain = Deno.env.get('MAILGUN_DOMAIN');
  const fromEmail = Deno.env.get('MAILGUN_FROM_EMAIL') || 'noreply@caraudioevents.com';
  const fromName = Deno.env.get('MAILGUN_FROM_NAME') || 'Car Audio Events';

  if (!apiKey || !domain) {
    throw new Error('Mailgun API credentials are not configured in secrets.');
  }

  // Create form data for Mailgun API
  const formData = new FormData();
  formData.append('from', `${fromName} <${fromEmail}>`);
  formData.append('to', recipient);
  formData.append('subject', subject);
  formData.append('html', body);

  // Send email via Mailgun API
  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`api:${apiKey}`)}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Mailgun API error:', errorText);
    throw new Error(`Email sending failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log('Message sent: %s', result.id);
  return { success: true, messageId: result.id };
}

// Alternative function that accepts Mailgun config as parameter
export async function sendEmailWithConfig(payload: EmailPayload, config: MailgunConfig) {
  const { recipient, subject, body } = payload;

  // Create form data for Mailgun API
  const formData = new FormData();
  formData.append('from', `${config.fromName} <${config.fromEmail}>`);
  formData.append('to', recipient);
  formData.append('subject', subject);
  formData.append('html', body);

  // Send email via Mailgun API
  const response = await fetch(`https://api.mailgun.net/v3/${config.domain}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`api:${config.apiKey}`)}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Mailgun API error:', errorText);
    throw new Error(`Email sending failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log('Message sent: %s', result.id);
  return { success: true, messageId: result.id };
} 