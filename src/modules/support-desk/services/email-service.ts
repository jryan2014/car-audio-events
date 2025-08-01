import { supabase } from '../../../lib/supabase';
import type { SupportTicket, SupportTicketMessage } from '../types';

interface SupportEmailData {
  ticket: SupportTicket;
  user?: { id: string; email: string; name?: string };
  message?: string;
  action: 'ticket_created' | 'ticket_updated' | 'ticket_replied' | 'ticket_assigned' | 'ticket_resolved' | 'ticket_closed';
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  html_body?: string;
  text_body?: string;
}

export const supportEmailService = {
  templateCache: new Map<string, EmailTemplate>(),
  
  /**
   * Get email template by name
   */
  async getTemplate(templateName: string): Promise<EmailTemplate | null> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }
    
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('id, name, subject, body, html_body, text_body')
        .eq('name', templateName)
        .eq('is_active', true)
        .single();
        
      if (error || !data) {
        console.error('Error fetching email template:', error);
        return null;
      }
      
      // Cache the template
      this.templateCache.set(templateName, data);
      return data;
    } catch (error) {
      console.error('Error fetching email template:', error);
      return null;
    }
  },
  
  /**
   * Replace template variables with actual values
   */
  replaceTemplateVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    });
    
    return result;
  },
  
  /**
   * Calculate resolution time for a ticket
   */
  calculateResolutionTime(ticket: SupportTicket): string {
    if (!ticket.resolved_at) {
      return 'N/A';
    }
    
    const created = new Date(ticket.created_at);
    const resolved = new Date(ticket.resolved_at);
    const diffMs = resolved.getTime() - created.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  },
  
  /**
   * Queue a support email notification using existing email templates
   */
  async queueSupportEmail(data: SupportEmailData): Promise<boolean> {
    try {
      const { ticket, user, message, action } = data;
      
      // Determine email recipient
      const toEmail = user?.email || 'admin@caraudioevents.com';
      const toName = user?.name || 'User';
      
      // Map action to template name
      const templateMap: Record<string, string> = {
        'ticket_created': 'Support Ticket Created',
        'ticket_replied': 'Support Reply Received',
        'ticket_updated': 'Support Request Received', // Using as fallback
        'ticket_assigned': 'Support Request Received', // Using as fallback
        'ticket_resolved': 'Support Ticket Resolved',
        'ticket_closed': 'Support Ticket Closed'
      };
      
      const templateName = templateMap[action];
      const template = await this.getTemplate(templateName);
      
      // Prepare template variables
      // Use base URL from environment or fallback to safe default
      const baseUrl = import.meta.env?.VITE_BASE_URL || 'https://caraudioevents.com';
      
      const variables: Record<string, string> = {
        ticketNumber: ticket.ticket_number,
        firstName: toName,
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        supportAgent: 'Support Team',
        resolutionDate: new Date().toLocaleDateString(),
        resolutionTime: this.calculateResolutionTime(ticket),
        resolutionSummary: message || 'Your ticket has been resolved.',
        feedbackUrl: `${baseUrl}/support/feedback/${ticket.id}`,
        companyName: 'Car Audio Events',
        ticketUrl: `${baseUrl}/dashboard/support/ticket/${ticket.id}`
      };
      
      let subject = '';
      let htmlContent = '';
      
      if (template) {
        // Use existing template
        subject = this.replaceTemplateVariables(template.subject, variables);
        htmlContent = this.replaceTemplateVariables(template.body || template.html_body || '', variables);
        
        // Add ticket link if not already in template
        if (!htmlContent.includes('{{ticketUrl}}') && !htmlContent.includes('/support/')) {
          htmlContent += `<hr><p>View ticket: <a href="${variables.ticketUrl}">Click here</a></p>`;
        }
      } else {
        // Fallback to basic content if template not found
        subject = `Support Ticket #${ticket.ticket_number} - ${this.getActionText(action)}`;
        htmlContent = this.getFallbackHtml(ticket, action, message);
      }
      
      // Insert into email queue
      // Map priority strings to integers for email_queue table
      const getPriorityNumber = (priority: string): number => {
        switch (priority) {
          case 'urgent': return 3;
          case 'high': return 2;
          case 'normal': return 1;
          case 'low': return 0;
          default: return 1; // default to normal
        }
      };

      const { error } = await supabase
        .from('email_queue')
        .insert({
          to_email: toEmail,
          subject,
          html_content: htmlContent,
          priority: getPriorityNumber(ticket.priority),
          status: 'pending',
          created_at: new Date().toISOString(),
          template_id: template?.id,
          metadata: {
            type: 'support_notification',
            ticket_id: ticket.id,
            action,
            variables
          }
        });
        
      if (error) {
        console.error('Error queueing support email:', error);
        return false;
      }
      
      console.log(`✓ Queued support email for ${action} on ticket ${ticket.ticket_number}`);
      return true;
      
    } catch (error) {
      console.error('Failed to queue support email:', error);
      return false;
    }
  },
  
  /**
   * Get action text for fallback subject
   */
  getActionText(action: string): string {
    const actionTexts: Record<string, string> = {
      'ticket_created': 'Created',
      'ticket_updated': 'Updated',
      'ticket_replied': 'New Reply',
      'ticket_assigned': 'Assigned',
      'ticket_resolved': 'Resolved',
      'ticket_closed': 'Closed'
    };
    return actionTexts[action] || 'Update';
  },
  
  /**
   * Get fallback HTML content
   */
  getFallbackHtml(ticket: SupportTicket, action: string, message?: string): string {
    const baseInfo = `
      <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
      <p><strong>Title:</strong> ${ticket.title}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <p><strong>Status:</strong> ${ticket.status}</p>
    `;
    
    let content = '';
    switch (action) {
      case 'ticket_created':
        content = `
          <h2>New Support Ticket Created</h2>
          ${baseInfo}
          <p><strong>Description:</strong></p>
          <p>${ticket.description}</p>
        `;
        break;
      case 'ticket_replied':
        content = `
          <h2>New Reply on Support Ticket</h2>
          ${baseInfo}
          <p><strong>New Reply:</strong></p>
          <p>${message || 'No message content'}</p>
        `;
        break;
      case 'ticket_resolved':
        content = `
          <h2>Support Ticket Resolved</h2>
          ${baseInfo}
          <p>Your support ticket has been resolved. If you need further assistance, please create a new ticket.</p>
        `;
        break;
      case 'ticket_closed':
        content = `
          <h2>Support Ticket Closed</h2>
          ${baseInfo}
          <p>Your support ticket has been closed. Thank you for contacting support.</p>
        `;
        break;
      default:
        content = `
          <h2>Support Ticket ${this.getActionText(action)}</h2>
          ${baseInfo}
        `;
    }
    
    const baseUrl = import.meta.env?.VITE_BASE_URL || 'https://caraudioevents.com';
    content += `<hr><p>View ticket: <a href="${baseUrl}/dashboard/support/ticket/${ticket.id}">Click here</a></p>`;
    return content;
  },
  
  /**
   * Send email when ticket is created
   */
  async sendTicketCreatedEmail(ticket: SupportTicket, user: { id: string; email: string; name?: string }): Promise<boolean> {
    return this.queueSupportEmail({
      ticket,
      user,
      action: 'ticket_created'
    });
  },
  
  /**
   * Send email when ticket receives a reply
   */
  async sendTicketReplyEmail(
    ticket: SupportTicket, 
    message: SupportTicketMessage,
    toUser: { id: string; email: string; name?: string }
  ): Promise<boolean> {
    return this.queueSupportEmail({
      ticket,
      user: toUser,
      message: message.message,
      action: 'ticket_replied'
    });
  },
  
  /**
   * Send email when ticket is updated
   */
  async sendTicketUpdatedEmail(ticket: SupportTicket, user: { id: string; email: string; name?: string }): Promise<boolean> {
    return this.queueSupportEmail({
      ticket,
      user,
      action: 'ticket_updated'
    });
  },
  
  /**
   * Send email when ticket is assigned
   */
  async sendTicketAssignedEmail(ticket: SupportTicket, assignedTo: { id: string; email: string; name?: string }): Promise<boolean> {
    return this.queueSupportEmail({
      ticket,
      user: assignedTo,
      action: 'ticket_assigned'
    });
  },
  
  /**
   * Send email when ticket is resolved
   */
  async sendTicketResolvedEmail(ticket: SupportTicket, user: { id: string; email: string; name?: string }): Promise<boolean> {
    return this.queueSupportEmail({
      ticket,
      user,
      action: 'ticket_resolved'
    });
  },
  
  /**
   * Send email when ticket is closed
   */
  async sendTicketClosedEmail(ticket: SupportTicket, user: { id: string; email: string; name?: string }): Promise<boolean> {
    return this.queueSupportEmail({
      ticket,
      user,
      action: 'ticket_closed'
    });
  }
};