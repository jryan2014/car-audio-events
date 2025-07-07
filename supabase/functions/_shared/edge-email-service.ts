// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EmailType, EmailTemplate } from './email-types.ts';

// Helper function to replace placeholders like {{name}}
function replacePlaceholders(text: string, data: Record<string, any>): string {
  if (!text) return '';
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

class EdgeEmailService {
  private supabaseClient;
  private fromEmail: string;
  private defaultFromName: string;
  private isConfigured = false;

  constructor() {
    this.fromEmail = Deno.env.get("FROM_EMAIL") || 'no-reply@caraudioevents.com';
    this.defaultFromName = Deno.env.get("FROM_NAME") || 'Car Audio Events';

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (supabaseUrl && supabaseAnonKey) {
      this.supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      this.isConfigured = true;
    } else {
      console.warn('⚠️ Missing environment variables (SUPABASE_URL, SUPABASE_ANON_KEY). Email service is disabled.');
    }
  }

  private async getEmailTemplate(emailType: EmailType, membershipLevel: string | null): Promise<EmailTemplate | null> {
    // 1. Try to find a template for the specific membership level
    let query = this.supabaseClient
      .from('email_templates')
      .select('*')
      .eq('email_type', emailType)
      .eq('membership_level', membershipLevel)
      .eq('is_active', true)
      .limit(1);
      
    let { data: templates } = await query;

    // 2. If not found, try to find the default template for that email type
    if (!templates || templates.length === 0) {
      query = this.supabaseClient
        .from('email_templates')
        .select('*')
        .eq('email_type', emailType)
        .eq('membership_level', 'all')
        .eq('is_active', true)
        .limit(1);
        
      let { data: defaultTemplates } = await query;
      templates = defaultTemplates;
    }

    if (!templates || templates.length === 0) {
      return null;
    }
    
    return templates[0] as EmailTemplate;
  }

  async sendTemplatedEmail(
    to: string,
    emailType: EmailType,
    templateData: Record<string, any>,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      const errorMsg = 'Email service is not configured.';
      console.error(`❌ ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    const membershipLevel = templateData.membershipLevel || null;
    const template = await this.getEmailTemplate(emailType, membershipLevel);

    if (!template) {
      const errorMsg = `No active email template found for type "${emailType}" and membership level "${membershipLevel}".`;
      console.error(`❌ ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    const subject = replacePlaceholders(template.subject, templateData);
    const htmlBody = replacePlaceholders(template.body || template.htmlBody, templateData);
    const fromName = template.from_name || this.defaultFromName;

    try {
      // Queue the email for processing
      const { error: queueError } = await this.supabaseClient
        .from('email_queue')
        .insert({
          to_email: to,
          from_email: this.fromEmail,
          from_name: fromName,
          subject: subject,
          body: htmlBody,
          email_type: emailType,
          template_data: templateData,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (queueError) {
        console.error('❌ Failed to queue email:', queueError);
        return { success: false, error: queueError.message };
      }

      // Log the email activity
      await this.supabaseClient
        .from('email_logs')
        .insert({
          to_email: to,
          email_type: emailType,
          status: 'queued',
          created_at: new Date().toISOString()
        });

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send templated email:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }
  }

  // Generic send email method that uses templates
  async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    options?: { fromName?: string; emailType?: string }
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      const errorMsg = 'Email service is not configured.';
      console.error(`❌ ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    try {
      // Queue the email for processing
      const { error: queueError } = await this.supabaseClient
        .from('email_queue')
        .insert({
          to_email: to,
          from_email: this.fromEmail,
          from_name: options?.fromName || this.defaultFromName,
          subject: subject,
          body: htmlBody,
          email_type: options?.emailType || 'custom',
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (queueError) {
        console.error('❌ Failed to queue email:', queueError);
        return { success: false, error: queueError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }
  }
}

export const edgeEmailService = new EdgeEmailService(); 