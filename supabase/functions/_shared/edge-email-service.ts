// @ts-nocheck
import { Client } from "https://cdn.skypack.dev/postmark";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EmailType, EmailTemplate } from './email-types.ts';

// Helper function to replace placeholders like {{name}}
function replacePlaceholders(text: string, data: Record<string, any>): string {
  if (!text) return '';
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

class EdgeEmailService {
  private postmarkClient: Client | null = null;
  private supabaseClient;
  private fromEmail: string;
  private defaultFromName: string;
  private isConfigured = false;

  constructor() {
    const postmarkApiKey = Deno.env.get("POSTMARK_API_KEY");
    this.fromEmail = Deno.env.get("POSTMARK_FROM_EMAIL") || 'no-reply@caraudioevents.com';
    this.defaultFromName = Deno.env.get("POSTMARK_FROM_NAME") || 'Car Audio Events';

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (postmarkApiKey && supabaseUrl && supabaseAnonKey) {
      this.postmarkClient = new Client(postmarkApiKey);
      this.supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      this.isConfigured = true;
    } else {
      console.warn('⚠️ Missing environment variables (POSTMARK_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY). Email service is disabled.');
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
        .is('membership_level', null)
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
    if (!this.isConfigured || !this.postmarkClient) {
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
    const htmlBody = replacePlaceholders(template.htmlBody, templateData);
    const textBody = replacePlaceholders(template.textBody, templateData);
    const fromName = template.from_name || this.defaultFromName;

    try {
      await this.postmarkClient.sendEmail({
        From: `${fromName} <${this.fromEmail}>`,
        To: to,
        Subject: subject,
        HtmlBody: htmlBody,
        TextBody: textBody,
        MessageStream: "outbound",
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send templated email:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }
  }
}

export const edgeEmailService = new EdgeEmailService(); 