interface PostmarkEmail {
  From: string;
  To: string;
  Subject: string;
  HtmlBody: string;
  TextBody?: string;
  ReplyTo?: string;
  MessageStream?: string;
}

interface PostmarkResponse {
  To: string;
  SubmittedAt: string;
  MessageID: string;
  ErrorCode: number;
  Message: string;
}

export class PostmarkEmailService {
  private apiKey: string;
  private defaultFromEmail: string;
  private defaultFromName: string;

  constructor() {
    this.apiKey = Deno.env.get('POSTMARK_API_KEY') || '';
    this.defaultFromEmail = 'noreply@caraudioevents.com';
    this.defaultFromName = 'Car Audio Events';
    
    if (!this.apiKey) {
      throw new Error('POSTMARK_API_KEY is not configured');
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
    try {
      const email: PostmarkEmail = {
        From: `${fromName || this.defaultFromName} <${fromEmail || this.defaultFromEmail}>`,
        To: to,
        Subject: subject,
        HtmlBody: htmlContent,
        TextBody: textContent || this.stripHtml(htmlContent),
        MessageStream: 'outbound'
      };

      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': this.apiKey
        },
        body: JSON.stringify(email)
      });

      const data = await response.json() as PostmarkResponse;

      if (response.ok) {
        console.log(`[Postmark] Email sent successfully to ${to}, MessageID: ${data.MessageID}`);
        return {
          success: true,
          messageId: data.MessageID
        };
      } else {
        console.error(`[Postmark] Failed to send email: ${data.Message}`);
        return {
          success: false,
          error: data.Message || 'Failed to send email via Postmark'
        };
      }
    } catch (error) {
      console.error('[Postmark] Error sending email:', error);
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
    
    // Postmark supports batch sending, but for simplicity we'll send individually
    // This can be optimized later to use Postmark's batch API
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