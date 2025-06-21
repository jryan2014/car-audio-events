import { Client } from 'postmark';
import { isDevelopment } from '../utils/version';

// Email service configuration
interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
}

// Email template types for car audio events
export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

// Email types for the platform
export type EmailType = 
  | 'welcome'
  | 'event_registration_confirmation'
  | 'event_reminder'
  | 'event_cancellation'
  | 'password_reset'
  | 'organization_claim_verification'
  | 'event_approval_notification'
  | 'competition_results'
  | 'newsletter'
  | 'system_notification'
  | 'membership_upsell';

class EmailService {
  private client: Client | null = null;
  private config: EmailConfig | null = null;
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the email service with localStorage or environment variables
   */
  private initialize() {
    let apiKey: string | undefined;
    let fromEmail: string | undefined;
    let fromName: string | undefined;
    let replyToEmail: string | undefined;

    // First try to get configuration from localStorage
    try {
      const savedSettings = localStorage.getItem('email_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.postmark_api_key && settings.from_email) {
          apiKey = settings.postmark_api_key;
          fromEmail = settings.from_email;
          fromName = settings.from_name || 'Car Audio Events Platform';
          replyToEmail = settings.reply_to_email || 'support@caraudioevents.com';
          console.log('📧 Using Postmark settings from localStorage');
        }
      }
    } catch (error) {
      console.error('Error loading email settings from localStorage:', error);
    }

    // Fallback to environment variables if localStorage doesn't have settings
    if (!apiKey || !fromEmail) {
      apiKey = import.meta.env.VITE_POSTMARK_API_KEY;
      fromEmail = import.meta.env.VITE_POSTMARK_FROM_EMAIL || 'noreply@caraudioevents.com';
      fromName = import.meta.env.VITE_POSTMARK_FROM_NAME || 'Car Audio Events Platform';
      replyToEmail = import.meta.env.VITE_POSTMARK_REPLY_TO_EMAIL || 'support@caraudioevents.com';
      console.log('📧 Using Postmark settings from environment variables');
    }

    if (apiKey && fromEmail) {
      this.config = {
        apiKey,
        fromEmail,
        fromName: fromName || 'Car Audio Events Platform',
        replyToEmail: replyToEmail || 'support@caraudioevents.com'
      };
      this.client = new Client(apiKey);
      this.isConfigured = true;
      if (isDevelopment()) {
        console.log('✅ Postmark email service initialized successfully');
      }
    } else {
      console.warn('⚠️ Postmark API key not found. Email service will use fallback mode.');
      this.isConfigured = false;
      this.client = null;
    }
  }

  /**
   * Check if email service is properly configured
   */
  isReady(): boolean {
    // First check if already initialized
    if (this.isConfigured && this.client !== null) {
      return true;
    }

    // Check if we have settings in localStorage
    try {
      const savedSettings = localStorage.getItem('email_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.postmark_api_key && settings.from_email) {
          // Re-initialize if we have valid settings but service isn't configured
          if (!this.isConfigured) {
            this.initialize();
          }
          return this.isConfigured && this.client !== null;
        }
      }
    } catch (error) {
      console.error('Error checking email settings:', error);
    }

    // Fallback to environment variables
    const envApiKey = import.meta.env.VITE_POSTMARK_API_KEY;
    const envFromEmail = import.meta.env.VITE_POSTMARK_FROM_EMAIL;
    
    if (envApiKey && envFromEmail && !this.isConfigured) {
      this.initialize();
    }
    
    return this.isConfigured && this.client !== null;
  }

  /**
   * Force reinitialize the email service (useful when settings change)
   */
  reinitialize(): void {
    this.isConfigured = false;
    this.client = null;
    this.config = null;
    this.initialize();
  }

  /**
   * Send a single email
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    textBody?: string,
    options?: {
      cc?: string[];
      bcc?: string[];
      replyTo?: string;
      tag?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isReady()) {
      console.warn('📧 Email service not configured, simulating email send');
      return this.simulateEmailSend(to, subject);
    }

    try {
      const result = await this.client!.sendEmail({
        From: `${this.config!.fromName} <${this.config!.fromEmail}>`,
        To: to,
        Subject: subject,
        HtmlBody: htmlBody,
        TextBody: textBody || this.htmlToText(htmlBody),
        ReplyTo: options?.replyTo || this.config!.replyToEmail,
        Cc: options?.cc?.join(', '),
        Bcc: options?.bcc?.join(', '),
        Tag: options?.tag,
        Metadata: options?.metadata
      });

      console.log(`✅ Email sent successfully to ${to} (MessageID: ${result.MessageID})`);
      return {
        success: true,
        messageId: result.MessageID
      };
    } catch (error: any) {
      console.error('❌ Failed to send email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  /**
   * Send bulk emails (up to 500 at once)
   */
  async sendBulkEmails(
    emails: Array<{
      to: string;
      subject: string;
      htmlBody: string;
      textBody?: string;
      tag?: string;
      metadata?: Record<string, string>;
    }>
  ): Promise<{ success: boolean; results?: any[]; error?: string }> {
    if (!this.isReady()) {
      console.warn('📧 Email service not configured, simulating bulk email send');
      return { success: true, results: emails.map(email => ({ MessageID: 'simulated-' + Date.now() })) };
    }

    try {
      const messages = emails.map(email => ({
        From: `${this.config!.fromName} <${this.config!.fromEmail}>`,
        To: email.to,
        Subject: email.subject,
        HtmlBody: email.htmlBody,
        TextBody: email.textBody || this.htmlToText(email.htmlBody),
        ReplyTo: this.config!.replyToEmail,
        Tag: email.tag,
        Metadata: email.metadata
      }));

      const results = await this.client!.sendEmailBatch(messages);
      console.log(`✅ Bulk emails sent successfully (${results.length} emails)`);
      
      return {
        success: true,
        results
      };
    } catch (error: any) {
      console.error('❌ Failed to send bulk emails:', error);
      return {
        success: false,
        error: error.message || 'Failed to send bulk emails'
      };
    }
  }

  /**
   * Send templated email using predefined templates
   */
  async sendTemplatedEmail(
    to: string,
    emailType: EmailType,
    templateData: Record<string, any>,
    fromName?: string,
    options?: {
      cc?: string[];
      bcc?: string[];
      tag?: string;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getEmailTemplate(emailType, templateData);

    if (!this.isReady()) {
      console.warn(`📧 Email service not configured, simulating '${emailType}' email send`);
      return this.simulateEmailSend(to, template.subject);
    }

    try {
      const result = await this.client!.sendEmail({
        From: `${fromName || this.config!.fromName} <${this.config!.fromEmail}>`,
        To: to,
        Subject: template.subject,
        HtmlBody: template.htmlBody,
        TextBody: template.textBody,
        ReplyTo: this.config!.replyToEmail,
        Cc: options?.cc?.join(', '),
        Bcc: options?.bcc?.join(', '),
        Tag: options?.tag,
        Metadata: {
          emailType,
          timestamp: new Date().toISOString(),
          ...templateData
        }
      });

      console.log(`✅ Email sent successfully to ${to} (MessageID: ${result.MessageID})`);
      return {
        success: true,
        messageId: result.MessageID
      };
    } catch (error: any) {
      console.error('❌ Failed to send templated email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send templated email'
      };
    }
  }

  /**
   * Get email template based on type and data
   */
  private getEmailTemplate(emailType: EmailType, data: Record<string, any>): EmailTemplate {
    const templates: Record<EmailType, (data: Record<string, any>) => EmailTemplate> = {
      welcome: (data) => ({
        subject: `Welcome to Car Audio Events Platform! 🎵`,
        htmlBody: this.generateWelcomeEmailHTML(data),
        textBody: this.generateWelcomeEmailText(data)
      }),
      
      event_registration_confirmation: (data) => ({
        subject: `Registration Confirmed: ${data.eventTitle} 🏆`,
        htmlBody: this.generateRegistrationConfirmationHTML(data),
        textBody: this.generateRegistrationConfirmationText(data)
      }),
      
      event_reminder: (data) => ({
        subject: `Reminder: ${data.eventTitle} is ${data.timeUntil} 📅`,
        htmlBody: this.generateEventReminderHTML(data),
        textBody: this.generateEventReminderText(data)
      }),
      
      event_cancellation: (data) => ({
        subject: `Event Cancelled: ${data.eventTitle} ❌`,
        htmlBody: this.generateEventCancellationHTML(data),
        textBody: this.generateEventCancellationText(data)
      }),
      
      password_reset: (data) => ({
        subject: `Reset Your Password - Car Audio Events Platform 🔐`,
        htmlBody: this.generatePasswordResetHTML(data),
        textBody: this.generatePasswordResetText(data)
      }),
      
      organization_claim_verification: (data) => ({
        subject: `Verify Your Organization Claim - ${data.organizationName} ✅`,
        htmlBody: this.generateOrganizationClaimHTML(data),
        textBody: this.generateOrganizationClaimText(data)
      }),
      
      event_approval_notification: (data) => ({
        subject: `Event ${data.status}: ${data.eventTitle} 📋`,
        htmlBody: this.generateEventApprovalHTML(data),
        textBody: this.generateEventApprovalText(data)
      }),
      
      competition_results: (data) => ({
        subject: `Competition Results: ${data.eventTitle} 🏆`,
        htmlBody: this.generateCompetitionResultsHTML(data),
        textBody: this.generateCompetitionResultsText(data)
      }),
      
      newsletter: (data) => ({
        subject: data.subject || `Car Audio Events Newsletter 📰`,
        htmlBody: this.generateNewsletterHTML(data),
        textBody: this.generateNewsletterText(data)
      }),
      
      system_notification: (data) => ({
        subject: data.subject || `System Notification - Car Audio Events Platform`,
        htmlBody: this.generateSystemNotificationHTML(data),
        textBody: this.generateSystemNotificationText(data)
      }),
      
      membership_upsell: (data) => ({
        subject: `Join Us Today and Unlock Exclusive Benefits! 🎉`,
        htmlBody: this.generateMembershipUpsellHTML(data),
        textBody: this.generateMembershipUpsellText(data)
      })
    };

    return templates[emailType](data);
  }

  /**
   * Generate welcome email HTML
   */
  private generateWelcomeEmailHTML(data: Record<string, any>): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Car Audio Events Platform</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .footer { background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 14px; }
          .button { display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .highlight { background-color: #f0f9ff; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 Welcome to Car Audio Events Platform!</h1>
            <p>Your gateway to the car audio competition community</p>
          </div>
          <div class="content">
            <h2>Hello ${data.firstName || 'Car Audio Enthusiast'}!</h2>
            <p>Welcome to the premier platform for car audio competitions and events. We're excited to have you join our community of sound enthusiasts!</p>
            
            <div class="highlight">
              <h3>🚀 Get Started:</h3>
              <ul>
                <li>Complete your profile to showcase your sound system</li>
                <li>Browse upcoming competitions and events</li>
                <li>Connect with other car audio enthusiasts</li>
                <li>Track your competition scores and achievements</li>
              </ul>
            </div>
            
            <p>Ready to dive in? Click the button below to explore events in your area:</p>
            <a href="${data.dashboardUrl || '#'}" class="button">Explore Events</a>
            
            <p>If you have any questions, our support team is here to help. Just reply to this email!</p>
            
            <p>Turn it up loud!<br>The Car Audio Events Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Car Audio Events Platform. All rights reserved.</p>
            <p>You're receiving this email because you signed up for our platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate welcome email text version
   */
  private generateWelcomeEmailText(data: Record<string, any>): string {
    return `
Welcome to Car Audio Events Platform!

Hello ${data.firstName || 'Car Audio Enthusiast'}!

Welcome to the premier platform for car audio competitions and events. We're excited to have you join our community of sound enthusiasts!

Get Started:
- Complete your profile to showcase your sound system
- Browse upcoming competitions and events  
- Connect with other car audio enthusiasts
- Track your competition scores and achievements

Ready to dive in? Visit your dashboard: ${data.dashboardUrl || 'https://caraudioevents.com/dashboard'}

If you have any questions, our support team is here to help. Just reply to this email!

Turn it up loud!
The Car Audio Events Team

© 2025 Car Audio Events Platform. All rights reserved.
You're receiving this email because you signed up for our platform.
    `;
  }

  /**
   * Generate registration confirmation email HTML
   */
  private generateRegistrationConfirmationHTML(data: Record<string, any>): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .footer { background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 14px; }
          .event-details { background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏆 Registration Confirmed!</h1>
            <p>You're all set for the competition</p>
          </div>
          <div class="content">
            <h2>Hello ${data.firstName || 'Competitor'}!</h2>
            <p>Your registration for <strong>${data.eventTitle}</strong> has been confirmed!</p>
            
            <div class="event-details">
              <h3>📅 Event Details:</h3>
              <p><strong>Event:</strong> ${data.eventTitle}</p>
              <p><strong>Date:</strong> ${data.eventDate}</p>
              <p><strong>Time:</strong> ${data.eventTime || 'TBD'}</p>
              <p><strong>Location:</strong> ${data.eventLocation}</p>
              <p><strong>Registration Fee:</strong> ${data.registrationFee || 'Free'}</p>
              ${data.confirmationNumber ? `<p><strong>Confirmation #:</strong> ${data.confirmationNumber}</p>` : ''}
            </div>
            
            <p><strong>What's Next?</strong></p>
            <ul>
              <li>Prepare your sound system for competition</li>
              <li>Review the event rules and regulations</li>
              <li>Arrive early for registration and tech inspection</li>
              <li>Bring your ID and any required documentation</li>
            </ul>
            
            <a href="${data.eventUrl || '#'}" class="button">View Event Details</a>
            
            <p>Good luck and may the loudest system win!</p>
            
            <p>Best regards,<br>The Car Audio Events Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Car Audio Events Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate registration confirmation text version
   */
  private generateRegistrationConfirmationText(data: Record<string, any>): string {
    return `
Registration Confirmed!

Hello ${data.firstName || 'Competitor'}!

Your registration for ${data.eventTitle} has been confirmed!

Event Details:
- Event: ${data.eventTitle}
- Date: ${data.eventDate}
- Time: ${data.eventTime || 'TBD'}
- Location: ${data.eventLocation}
- Registration Fee: ${data.registrationFee || 'Free'}
${data.confirmationNumber ? `- Confirmation #: ${data.confirmationNumber}` : ''}

What's Next?
- Prepare your sound system for competition
- Review the event rules and regulations
- Arrive early for registration and tech inspection
- Bring your ID and any required documentation

View event details: ${data.eventUrl || 'https://caraudioevents.com'}

Good luck and may the loudest system win!

Best regards,
The Car Audio Events Team

© 2025 Car Audio Events Platform. All rights reserved.
    `;
  }

  // Additional template methods would go here...
  // For brevity, I'll add placeholder methods for the other email types

  private generateEventReminderHTML(data: Record<string, any>): string {
    return `<html><body><h1>Event Reminder: ${data.eventTitle}</h1><p>Don't forget about your upcoming event!</p></body></html>`;
  }

  private generateEventReminderText(data: Record<string, any>): string {
    return `Event Reminder: ${data.eventTitle}\n\nDon't forget about your upcoming event!`;
  }

  private generateEventCancellationHTML(data: Record<string, any>): string {
    return `<html><body><h1>Event Cancelled: ${data.eventTitle}</h1><p>We regret to inform you that this event has been cancelled.</p></body></html>`;
  }

  private generateEventCancellationText(data: Record<string, any>): string {
    return `Event Cancelled: ${data.eventTitle}\n\nWe regret to inform you that this event has been cancelled.`;
  }

  private generatePasswordResetHTML(data: Record<string, any>): string {
    return `<html><body><h1>Password Reset</h1><p>Click <a href="${data.resetUrl}">here</a> to reset your password.</p></body></html>`;
  }

  private generatePasswordResetText(data: Record<string, any>): string {
    return `Password Reset\n\nClick here to reset your password: ${data.resetUrl}`;
  }

  private generateOrganizationClaimHTML(data: Record<string, any>): string {
    return `<html><body><h1>Verify Organization Claim</h1><p>Please verify your claim for ${data.organizationName}.</p></body></html>`;
  }

  private generateOrganizationClaimText(data: Record<string, any>): string {
    return `Verify Organization Claim\n\nPlease verify your claim for ${data.organizationName}.`;
  }

  private generateEventApprovalHTML(data: Record<string, any>): string {
    return `<html><body><h1>Event ${data.status}</h1><p>Your event "${data.eventTitle}" has been ${data.status}.</p></body></html>`;
  }

  private generateEventApprovalText(data: Record<string, any>): string {
    return `Event ${data.status}\n\nYour event "${data.eventTitle}" has been ${data.status}.`;
  }

  private generateCompetitionResultsHTML(data: Record<string, any>): string {
    return `<html><body><h1>Competition Results</h1><p>Results for ${data.eventTitle} are now available!</p></body></html>`;
  }

  private generateCompetitionResultsText(data: Record<string, any>): string {
    return `Competition Results\n\nResults for ${data.eventTitle} are now available!`;
  }

  private generateNewsletterHTML(data: Record<string, any>): string {
    return `<html><body><h1>${data.subject}</h1><div>${data.content}</div></body></html>`;
  }

  private generateNewsletterText(data: Record<string, any>): string {
    return `${data.subject}\n\n${data.content}`;
  }

  private generateSystemNotificationHTML(data: Record<string, any>): string {
    return `<html><body><h1>System Notification</h1><p>${data.message}</p></body></html>`;
  }

  private generateSystemNotificationText(data: Record<string, any>): string {
    return `System Notification\n\n${data.message}`;
  }

  private generateMembershipUpsellHTML(data: Record<string, any>): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Join Us Today and Unlock Exclusive Benefits!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .footer { background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 14px; }
          .button { display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .highlight { background-color: #f0f9ff; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Join Us Today and Unlock Exclusive Benefits!</h1>
            <p>Unlock the full potential of your car audio passion</p>
          </div>
          <div class="content">
            <h2>Hello ${data.firstName || 'Car Audio Enthusiast'}!</h2>
            <p>We're thrilled to have you join our community of sound enthusiasts!</p>
            
            <div class="highlight">
              <h3>🚀 Get Started:</h3>
              <ul>
                <li>Complete your profile to showcase your sound system</li>
                <li>Browse upcoming competitions and events</li>
                <li>Connect with other car audio enthusiasts</li>
                <li>Track your competition scores and achievements</li>
              </ul>
            </div>
            
            <p>Ready to dive in? Click the button below to explore events in your area:</p>
            <a href="${data.dashboardUrl || '#'}" class="button">Explore Events</a>
            
            <p>If you have any questions, our support team is here to help. Just reply to this email!</p>
            
            <p>Turn it up loud!<br>The Car Audio Events Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Car Audio Events Platform. All rights reserved.</p>
            <p>You're receiving this email because you signed up for our platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateMembershipUpsellText(data: Record<string, any>): string {
    return `
Join Us Today and Unlock Exclusive Benefits!

Hello ${data.firstName || 'Car Audio Enthusiast'}!

We're thrilled to have you join our community of sound enthusiasts!

Get Started:
- Complete your profile to showcase your sound system
- Browse upcoming competitions and events  
- Connect with other car audio enthusiasts
- Track your competition scores and achievements

Ready to dive in? Visit your dashboard: ${data.dashboardUrl || 'https://caraudioevents.com/dashboard'}

If you have any questions, our support team is here to help. Just reply to this email!

Turn it up loud!
The Car Audio Events Team

© 2025 Car Audio Events Platform. All rights reserved.
You're receiving this email because you signed up for our platform.
    `;
  }

  /**
   * Convert HTML to plain text (basic implementation)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Simulate email sending for development/testing
   */
  private simulateEmailSend(to: string, subject: string): { success: boolean; messageId: string } {
    console.log(`📧 [SIMULATED] Email sent to: ${to}`);
    console.log(`📧 [SIMULATED] Subject: ${subject}`);
    return {
      success: true,
      messageId: `simulated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  /**
   * Get email delivery statistics (if configured)
   */
  async getDeliveryStats(): Promise<any> {
    if (!this.isReady()) {
      return { error: 'Email service not configured' };
    }

    try {
      // Note: This would require additional Postmark API calls
      // For now, return a placeholder
      return { message: 'Delivery stats would be available with proper Postmark configuration' };
    } catch (error) {
      console.error('Failed to get delivery stats:', error);
      return { error: 'Failed to get delivery stats' };
    }
  }
}

// Export singleton instance
export const emailService = new EmailService(); 