export class SMTPEmailService {
  private host: string;
  private port: number;
  private username: string;
  private password: string;
  private defaultFromEmail: string;
  private defaultFromName: string;
  private secure: boolean;

  constructor() {
    this.host = Deno.env.get('SMTP_HOST') || '';
    this.port = parseInt(Deno.env.get('SMTP_PORT') || '587');
    this.username = Deno.env.get('SMTP_USER') || '';  // Changed from SMTP_USERNAME to SMTP_USER
    this.password = Deno.env.get('SMTP_PASS') || '';  // Changed from SMTP_PASSWORD to SMTP_PASS
    this.defaultFromEmail = Deno.env.get('SMTP_FROM_EMAIL') || 'noreply@caraudioevents.com';
    this.defaultFromName = Deno.env.get('SMTP_FROM_NAME') || 'Car Audio Events';
    this.secure = Deno.env.get('SMTP_SECURE') === 'true';
    
    if (!this.host || !this.username || !this.password) {
      console.warn('[SMTP] SMTP configuration incomplete - service unavailable');
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
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'SMTP not configured'
      };
    }

    try {
      // Build email headers and body
      const finalFromEmail = fromEmail || this.defaultFromEmail;
      const finalFromName = fromName || this.defaultFromName;
      const messageId = `<${crypto.randomUUID()}@${finalFromEmail.split('@')[1]}>`;
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const headers = [
        `From: "${finalFromName}" <${finalFromEmail}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `Message-ID: ${messageId}`,
        `Date: ${new Date().toUTCString()}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`
      ].join('\r\n');

      const textPart = [
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        textContent || this.stripHtml(htmlContent)
      ].join('\r\n');

      const htmlPart = [
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        htmlContent,
        `--${boundary}--`
      ].join('\r\n');

      const fullMessage = [headers, '', textPart, htmlPart].join('\r\n');

      // For Deno/Edge Functions, we need to use a service that provides SMTP-over-HTTP
      // or implement a basic SMTP client. For now, we'll use a webhook approach
      // This is a simplified implementation - in production, you'd use a proper SMTP library
      
      const smtpPayload = {
        host: this.host,
        port: this.port,
        secure: this.secure,
        auth: {
          user: this.username,
          pass: this.password
        },
        from: `"${finalFromName}" <${finalFromEmail}>`,
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent)
      };

      // Note: In a real implementation, you'd need an SMTP relay service
      // or a serverless SMTP solution. For now, we'll simulate success
      // but log that this needs proper implementation
      
      console.warn('[SMTP] Direct SMTP not available in Edge Functions - needs relay service');
      console.log(`[SMTP] Would send email to ${to} with subject: ${subject}`);
      
      // Simulate failure since we can't actually send via SMTP from Edge Functions
      return {
        success: false,
        error: 'SMTP relay not implemented - use Postmark or SendGrid'
      };
      
    } catch (error) {
      console.error('[SMTP] Error preparing email:', error);
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
    return !!(this.host && this.username && this.password);
  }
}