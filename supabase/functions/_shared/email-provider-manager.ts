import { PostmarkEmailService } from './postmark-email-service.ts';
import { SendGridEmailService } from './sendgrid-email-service.ts';
import { SMTPEmailService } from './smtp-email-service.ts';

export type EmailProvider = 'postmark' | 'sendgrid' | 'smtp' | 'auto';

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: EmailProvider;
}

export class EmailProviderManager {
  private postmark: PostmarkEmailService;
  private sendgrid: SendGridEmailService;
  private smtp: SMTPEmailService;
  private primaryProvider: EmailProvider;
  private providerOrder: EmailProvider[] = [];

  constructor(primaryProvider: EmailProvider = 'auto') {
    this.postmark = new PostmarkEmailService();
    this.sendgrid = new SendGridEmailService();
    this.smtp = new SMTPEmailService();
    this.primaryProvider = primaryProvider;
    
    // Set up provider order based on configuration
    this.setupProviderOrder();
  }

  private setupProviderOrder() {
    // If auto mode, determine order based on what's configured
    if (this.primaryProvider === 'auto') {
      // Priority: Postmark -> SendGrid -> SMTP
      if (this.postmark.isConfigured()) {
        this.providerOrder.push('postmark');
      }
      if (this.sendgrid.isConfigured()) {
        this.providerOrder.push('sendgrid');
      }
      if (this.smtp.isConfigured()) {
        this.providerOrder.push('smtp');
      }
      
      if (this.providerOrder.length === 0) {
        console.error('[EmailManager] No email providers configured!');
      } else {
        console.log(`[EmailManager] Provider order: ${this.providerOrder.join(' -> ')}`);
      }
    } else {
      // Use specified provider as primary, others as fallback
      this.providerOrder = [this.primaryProvider];
      
      // Add other providers as fallbacks
      if (this.primaryProvider !== 'postmark' && this.postmark.isConfigured()) {
        this.providerOrder.push('postmark');
      }
      if (this.primaryProvider !== 'sendgrid' && this.sendgrid.isConfigured()) {
        this.providerOrder.push('sendgrid');
      }
      if (this.primaryProvider !== 'smtp' && this.smtp.isConfigured()) {
        this.providerOrder.push('smtp');
      }
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
    fromEmail?: string,
    fromName?: string
  ): Promise<EmailResult> {
    if (this.providerOrder.length === 0) {
      return {
        success: false,
        error: 'No email providers configured'
      };
    }

    let lastError = '';
    
    // Try each provider in order
    for (const provider of this.providerOrder) {
      console.log(`[EmailManager] Attempting to send via ${provider}...`);
      
      try {
        let result;
        
        switch (provider) {
          case 'postmark':
            if (!this.postmark.isConfigured()) {
              lastError = 'Postmark not configured';
              continue;
            }
            result = await this.postmark.sendEmail(to, subject, htmlContent, textContent, fromEmail, fromName);
            break;
            
          case 'sendgrid':
            if (!this.sendgrid.isConfigured()) {
              lastError = 'SendGrid not configured';
              continue;
            }
            result = await this.sendgrid.sendEmail(to, subject, htmlContent, textContent, fromEmail, fromName);
            break;
            
          case 'smtp':
            if (!this.smtp.isConfigured()) {
              lastError = 'SMTP not configured';
              continue;
            }
            result = await this.smtp.sendEmail(to, subject, htmlContent, textContent, fromEmail, fromName);
            break;
            
          default:
            continue;
        }
        
        if (result.success) {
          console.log(`[EmailManager] Successfully sent via ${provider}`);
          return {
            ...result,
            provider
          };
        } else {
          lastError = result.error || `Failed to send via ${provider}`;
          console.warn(`[EmailManager] Failed to send via ${provider}: ${lastError}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[EmailManager] Error with ${provider}: ${lastError}`);
      }
    }
    
    // All providers failed
    return {
      success: false,
      error: `All email providers failed. Last error: ${lastError}`
    };
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
  ): Promise<Array<{ to: string; success: boolean; messageId?: string; error?: string; provider?: EmailProvider }>> {
    const results = [];
    
    // For bulk emails, we'll use the first available provider to maintain consistency
    // If it fails for some recipients, we'll try other providers for those
    const primaryProvider = this.providerOrder[0];
    
    if (!primaryProvider) {
      return emails.map(email => ({
        to: email.to,
        success: false,
        error: 'No email providers configured'
      }));
    }
    
    console.log(`[EmailManager] Sending bulk emails via ${primaryProvider}...`);
    
    // Group send by provider for efficiency
    let bulkResults;
    
    switch (primaryProvider) {
      case 'postmark':
        bulkResults = await this.postmark.sendBulkEmails(emails);
        break;
      case 'sendgrid':
        bulkResults = await this.sendgrid.sendBulkEmails(emails);
        break;
      case 'smtp':
        bulkResults = await this.smtp.sendBulkEmails(emails);
        break;
      default:
        bulkResults = [];
    }
    
    // Check for failures and retry with other providers
    for (let i = 0; i < emails.length; i++) {
      const result = bulkResults[i];
      
      if (!result.success && this.providerOrder.length > 1) {
        // Try other providers for failed emails
        console.log(`[EmailManager] Retrying failed email to ${emails[i].to} with fallback providers...`);
        const retryResult = await this.sendEmail(
          emails[i].to,
          emails[i].subject,
          emails[i].htmlContent,
          emails[i].textContent,
          emails[i].fromEmail,
          emails[i].fromName
        );
        results.push(retryResult);
      } else {
        results.push({
          ...result,
          provider: primaryProvider
        });
      }
    }
    
    return results;
  }

  getConfiguredProviders(): EmailProvider[] {
    const configured: EmailProvider[] = [];
    
    if (this.postmark.isConfigured()) {
      configured.push('postmark');
    }
    if (this.sendgrid.isConfigured()) {
      configured.push('sendgrid');
    }
    if (this.smtp.isConfigured()) {
      configured.push('smtp');
    }
    
    return configured;
  }

  getProviderStatus(): Record<EmailProvider, boolean> {
    return {
      postmark: this.postmark.isConfigured(),
      sendgrid: this.sendgrid.isConfigured(),
      smtp: this.smtp.isConfigured(),
      auto: this.providerOrder.length > 0
    };
  }
}