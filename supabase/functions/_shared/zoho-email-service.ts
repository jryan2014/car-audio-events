import { createTransport } from 'npm:nodemailer';

// Define the interface for the email payload
interface EmailPayload {
  recipient: string;
  subject: string;
  body: string; // HTML body
}

// Reusable email sending service for Zoho
export async function sendEmail(payload: EmailPayload) {
  const { recipient, subject, body } = payload;

  // Retrieve Zoho credentials from environment variables (set as secrets)
  const host = Deno.env.get('ZOHO_SMTP_HOST');
  const port = Deno.env.get('ZOHO_SMTP_PORT');
  const user = Deno.env.get('ZOHO_SMTP_USER');
  const pass = Deno.env.get('ZOHO_SMTP_PASS');

  if (!host || !port || !user || !pass) {
    throw new Error('Zoho SMTP credentials are not configured in secrets.');
  }

  // Create a transporter object using the Zoho SMTP settings
  const transporter = createTransport({
    host: host,
    port: parseInt(port, 10),
    secure: true, // Use SSL
    auth: {
      user: user,
      pass: pass,
    },
  });

  // Define email options
  const mailOptions = {
    from: `"Car Audio Events" <${user}>`, // Sender address (must be the same as the authenticated user)
    to: recipient,
    subject: subject,
    html: body,
  };

  // Send the email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
} 