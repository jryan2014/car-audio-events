interface SendGridEmail {
  personalizations: Array<{
    to: Array<{ email: string; name?: string }>;
    subject?: string;
  }>;
  from: {
    email: string;
    name?: string;
  };
  subject?: string;
  content: Array<{
    type: string;
    value: string;
  }>;
}

interface SendGridResponse {
  errors?: Array<{
    message: string;
    field?: string;
    help?: string;
  }>;
}

export class SendGridEmailService {
  private apiKey: string;
  private defaultFromEmail: string;
  private defaultFromName: string;

  constructor() {
    this.apiKey = Deno.env.get('SENDGRID_API_KEY') || '';
    this.defaultFromEmail = 'noreply@caraudioevents.com';
    this.defaultFromName = 'Car Audio Events';
    
    if (!this.apiKey) {
      console.warn('[SendGrid] API key not configured - service unavailable');
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
    fromEmail?: string,
    fromName?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'SendGrid API key not configured'
      };
    }

    try {
      const email: SendGridEmail = {
        personalizations: [{
          to: [{ email: to }],
          subject: subject
        }],
        from: {
          email: fromEmail || this.defaultFromEmail,
          name: fromName || this.defaultFromName
        },
        content: [
          {
            type: 'text/plain',
            value: textContent || this.stripHtml(htmlContent)
          },
          {
            type: 'text/html',
            value: htmlContent
          }
        ]
      };

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(email)
      });

      if (response.ok || response.status === 202) {
        const messageId = response.headers.get('X-Message-Id') || 'sendgrid-' + Date.now();
        console.log(`[SendGrid] Email sent successfully to ${to}, MessageID: ${messageId}`);
        return {
          success: true,
          messageId: messageId
        };
      } else {
        const errorData = await response.json() as SendGridResponse;
        const errorMessage = errorData.errors?.map(e => e.message).join(', ') || 'Failed to send email';
        console.error(`[SendGrid] Failed to send email: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }
    } catch (error) {
      console.error('[SendGrid] Error sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async sendBulkEmails(
    emails: Array<{ 
      to: string; 
      subject: string; 
      htmlContent: string; 
      textContent?: string;
      fromEmail?: string;
      fromName?: string;
    }>
  ): Promise<Array<{ to: string; success: boolean; messageId?: string; error?: string }>> {
    const results = [];
    
    // SendGrid supports batch sending up to 1000 recipients
    // For now, we'll send individually for consistency
    for (const email of emails) {
      const result = await this.sendEmail(
        email.to,
        email.subject,
        email.htmlContent,
        email.textContent,
        email.fromEmail,
        email.fromName
      );
      results.push({ to: email.to, ...result });
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  private stripHtml(html: string): string {
    // Safe HTML stripping - simply remove all HTML tags and decode entities
    // This approach avoids regex vulnerabilities by using simple tag removal
    return html
      // Remove all HTML tags (simple and safe)
      .replace(/<[^>]*>/g, '')
      // Decode common HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}