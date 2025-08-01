import { supabase } from '../../../lib/supabase';
import { supportEmailService } from './email-service';
import type { 
  SupportTicket, 
  SupportTicketWithRelations,
  SupportTicketMessage,
  SupportRequestType,
  CreateTicketFormData,
  CreateMessageFormData,
  UpdateTicketFormData,
  TicketFilters,
  PaginationParams,
  PaginatedResponse,
  SupportFieldDefinition,
  SupportFieldVisibilityRule,
  SupportOrganizationSettings,
  OrganizationSupportSettings,
  SupportAgent,
  SupportAgentWithUser
} from '../types';

// Helper function to build ticket query with relations
function buildTicketQuery(includeRelations = true) {
  let query = supabase.from('support_tickets').select('*');
  
  if (includeRelations) {
    // Use separate queries to avoid complex joins with auth.users
    query = supabase.from('support_tickets').select(`
      *,
      request_type:support_request_types(*),
      organization:organizations!support_tickets_organization_id_fkey(id, name, logo_url),
      event:events!support_tickets_event_id_fkey(id, title, event_name, start_date, organization_id),
      assigned_to_org:organizations!support_tickets_assigned_to_org_id_fkey(id, name)
    `);
  }
  
  return query;
}

// Ticket operations
export const ticketService = {
  // Get tickets with filters and pagination
  async getTickets(
    filters: TicketFilters = {}, 
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<SupportTicketWithRelations>> {
    try {
      let query = buildTicketQuery(true);
      
      // Apply filters
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters.priority?.length) {
        query = query.in('priority', filters.priority);
      }
      if (filters.request_type_id?.length) {
        query = query.in('request_type_id', filters.request_type_id);
      }
      if (filters.assigned_to_user_id?.length) {
        query = query.in('assigned_to_user_id', filters.assigned_to_user_id);
      }
      if (filters.assigned_to_org_id?.length) {
        query = query.in('assigned_to_org_id', filters.assigned_to_org_id);
      }
      if (filters.organization_id?.length) {
        query = query.in('organization_id', filters.organization_id);
      }
      if (filters.user_id?.length) {
        query = query.in('user_id', filters.user_id);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%`);
      }
      if (filters.is_spam !== undefined) {
        query = query.eq('is_spam', filters.is_spam);
      }
      
      // Get total count
      const countQuery = supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true });
      
      // Apply same filters to count query
      // ... (apply filters)
      
      const { count } = await countQuery;
      
      // Apply pagination
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
      
      // Apply sorting
      const sortBy = pagination.sort_by || 'created_at';
      const sortOrder = pagination.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Get user info for tickets
      const ticketsWithUsers = await Promise.all(
        (data || []).map(async (ticket) => {
          // Get user info if user_id exists
          let userInfo = null;
          if (ticket.user_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('id, email, name, membership_type')
              .eq('id', ticket.user_id)
              .single();
            userInfo = userData;
          }
          
          // Get assigned user info if assigned_to_user_id exists
          let assignedUserInfo = null;
          if (ticket.assigned_to_user_id) {
            const { data: assignedUserData } = await supabase
              .from('users')
              .select('id, email, name')
              .eq('id', ticket.assigned_to_user_id)
              .single();
            assignedUserInfo = assignedUserData;
          }
          
          // Get message count
          const { count: messageCount } = await supabase
            .from('support_ticket_messages')
            .select('*', { count: 'exact', head: true })
            .eq('ticket_id', ticket.id);
          
          return {
            ...ticket,
            user: userInfo,
            assigned_to_user: assignedUserInfo,
            message_count: messageCount || 0
          };
        })
      );
      
      return {
        data: ticketsWithUsers,
        total: count || 0,
        page: pagination.page,
        limit: pagination.limit,
        total_pages: Math.ceil((count || 0) / pagination.limit)
      };
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw error;
    }
  },

  // Get single ticket with full details
  async getTicket(ticketId: string): Promise<SupportTicketWithRelations | null> {
    try {
      const { data, error } = await buildTicketQuery(true)
        .eq('id', ticketId)
        .single();
      
      if (error) throw error;
      
      // Get user info if user_id exists
      let userInfo = null;
      if (data.user_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, email, name, membership_type')
          .eq('id', data.user_id)
          .single();
        userInfo = userData;
      }
      
      // Get assigned user info if assigned_to_user_id exists
      let assignedUserInfo = null;
      if (data.assigned_to_user_id) {
        const { data: assignedUserData } = await supabase
          .from('users')
          .select('id, email, name')
          .eq('id', data.assigned_to_user_id)
          .single();
        assignedUserInfo = assignedUserData;
      }
      
      // Get last message
      const { data: messages } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      // Get message count
      const { count: messageCount } = await supabase
        .from('support_ticket_messages')
        .select('*', { count: 'exact', head: true })
        .eq('ticket_id', ticketId);
      
      return {
        ...data,
        user: userInfo,
        assigned_to_user: assignedUserInfo,
        last_message: messages?.[0] || undefined,
        message_count: messageCount || 0
      };
    } catch (error) {
      console.error('Error fetching ticket:', error);
      return null;
    }
  },

  // Create new ticket
  async createTicket(formData: CreateTicketFormData): Promise<SupportTicket | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const ticketData: Partial<SupportTicket> = {
        title: formData.title,
        description: formData.description,
        request_type_id: formData.request_type_id,
        event_id: formData.event_id,
        priority: formData.priority || 'normal',
        custom_fields: formData.custom_fields || {},
        user_id: user?.id,
        captcha_verified: !!formData.captcha_token,
        source: 'web'
      };
      
      // Get request type to determine routing
      const { data: requestType } = await supabase
        .from('support_request_types')
        .select('default_routing, default_priority')
        .eq('id', formData.request_type_id)
        .single();
      
      if (requestType) {
        ticketData.routing_type = requestType.default_routing;
        ticketData.priority = formData.priority || requestType.default_priority;
      }
      
      const { data, error } = await supabase
        .from('support_tickets')
        .insert([ticketData])
        .select()
        .single();
      
      if (error) throw error;
      
      // Handle attachments if any
      if (formData.attachments?.length) {
        // Upload attachments and create initial message with them
        const attachmentUrls = await uploadAttachments(formData.attachments, data.id);
        
        await supabase
          .from('support_ticket_messages')
          .insert([{
            ticket_id: data.id,
            user_id: user?.id,
            message: 'Initial attachments',
            attachments: attachmentUrls,
            message_type: 'reply'
          }]);
      }
      
      // Send email notification
      if (user) {
        await supportEmailService.sendTicketCreatedEmail(data, user);
      }
      
      return data;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  },

  // Update ticket
  async updateTicket(ticketId: string, updates: UpdateTicketFormData): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get ticket details for email notifications
      const ticket = await this.getTicket(ticketId);
      if (!ticket) {
        console.error('Ticket not found for update');
        return false;
      }
      
      // Update ticket
      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);
      
      if (error) throw error;
      
      // Create system message for status/assignment changes
      const messages: Partial<SupportTicketMessage>[] = [];
      
      if (updates.status) {
        messages.push({
          ticket_id: ticketId,
          user_id: user?.id,
          message: `Status changed to ${updates.status}`,
          message_type: 'status_change',
          metadata: { new_status: updates.status }
        });
        
        // Send email notifications for status changes
        if (ticket.user) {
          if (updates.status === 'resolved') {
            await supportEmailService.sendTicketResolvedEmail(
              { ...ticket, status: updates.status },
              ticket.user
            );
          } else if (updates.status === 'closed') {
            await supportEmailService.sendTicketClosedEmail(
              { ...ticket, status: updates.status },
              ticket.user
            );
          }
        }
      }
      
      if (updates.assigned_to_user_id || updates.assigned_to_org_id) {
        messages.push({
          ticket_id: ticketId,
          user_id: user?.id,
          message: 'Ticket reassigned',
          message_type: 'assignment_change',
          metadata: { 
            assigned_to_user_id: updates.assigned_to_user_id,
            assigned_to_org_id: updates.assigned_to_org_id
          }
        });
        
        // Create assignment record
        await supabase
          .from('support_ticket_assignments')
          .insert([{
            ticket_id: ticketId,
            assigned_from_user_id: user?.id,
            assigned_to_user_id: updates.assigned_to_user_id,
            assigned_to_org_id: updates.assigned_to_org_id
          }]);
          
        // Send email notification to assigned user
        if (updates.assigned_to_user_id) {
          const { data: assignedUser } = await supabase
            .from('users')
            .select('id, email, name')
            .eq('id', updates.assigned_to_user_id)
            .single();
            
          if (assignedUser) {
            await supportEmailService.sendTicketAssignedEmail(ticket, assignedUser);
          }
        }
      }
      
      if (messages.length) {
        await supabase
          .from('support_ticket_messages')
          .insert(messages);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating ticket:', error);
      return false;
    }
  }
};

// Message operations
export const messageService = {
  // Get messages for a ticket
  async getMessages(ticketId: string): Promise<SupportTicketMessage[]> {
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Get user info for each message
      const messagesWithUsers = await Promise.all(
        (data || []).map(async (message) => {
          let userInfo = null;
          if (message.user_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('id, email, name, membership_type')
              .eq('id', message.user_id)
              .single();
            userInfo = userData;
          }
          
          return {
            ...message,
            user: userInfo
          };
        })
      );
      
      return messagesWithUsers;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  },

  // Create new message
  async createMessage(ticketId: string, formData: CreateMessageFormData): Promise<SupportTicketMessage | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const messageData: Partial<SupportTicketMessage> = {
        ticket_id: ticketId,
        user_id: user?.id,
        message: formData.message,
        is_internal_note: formData.is_internal_note || false,
        message_type: 'reply',
        attachments: []
      };
      
      // Handle attachments
      if (formData.attachments?.length) {
        messageData.attachments = await uploadAttachments(formData.attachments, ticketId);
      }
      
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .insert([messageData])
        .select()
        .single();
      
      if (error) throw error;
      
      // Update ticket to waiting_on_user or in_progress based on who replied
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('user_id, status')
        .eq('id', ticketId)
        .single();
      
      if (ticket && ticket.status !== 'closed' && ticket.status !== 'resolved') {
        const newStatus = ticket.user_id === user?.id ? 'waiting_on_user' : 'in_progress';
        await supabase
          .from('support_tickets')
          .update({ status: newStatus })
          .eq('id', ticketId);
      }
      
      // Send email notification to the other party
      if (data && !formData.is_internal_note) {
        // Get full ticket details
        const fullTicket = await ticketService.getTicket(ticketId);
        if (fullTicket) {
          // If the message is from the ticket creator, notify support
          if (ticket?.user_id === user?.id) {
            // Send to admin
            await supportEmailService.sendTicketReplyEmail(
              fullTicket,
              data,
              { id: 'admin', email: 'admin@caraudioevents.com' }
            );
          } else {
            // If message is from support, notify the ticket creator
            if (fullTicket.user) {
              await supportEmailService.sendTicketReplyEmail(
                fullTicket,
                data,
                fullTicket.user
              );
            }
          }
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }
};

// Request type operations
export const requestTypeService = {
  // Get all request types (including inactive for admin)
  async getRequestTypes(): Promise<SupportRequestType[]> {
    try {
      const { data, error } = await supabase
        .from('support_request_types')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching request types:', error);
      return [];
    }
  },

  // Get active request types only
  async getActiveRequestTypes(): Promise<SupportRequestType[]> {
    try {
      const { data, error } = await supabase
        .from('support_request_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching active request types:', error);
      return [];
    }
  },

  // Get request types for specific role
  async getRequestTypesForRole(role: string): Promise<SupportRequestType[]> {
    try {
      const { data, error } = await supabase
        .from('support_request_types')
        .select('*')
        .eq('is_active', true)
        .contains('allowed_roles', [role])
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching request types for role:', error);
      return [];
    }
  },

  // Create new request type
  async createRequestType(requestTypeData: Omit<SupportRequestType, 'id' | 'created_at' | 'updated_at'>): Promise<SupportRequestType> {
    try {
      const { data, error } = await supabase
        .from('support_request_types')
        .insert([requestTypeData])
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error creating request type:', error);
      throw error;
    }
  },

  // Update request type
  async updateRequestType(id: string, updates: Partial<SupportRequestType>): Promise<SupportRequestType> {
    try {
      const { data, error } = await supabase
        .from('support_request_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error updating request type:', error);
      throw error;
    }
  },

  // Delete request type
  async deleteRequestType(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('support_request_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting request type:', error);
      throw error;
    }
  }
};

// Field definition operations
export const fieldService = {
  // Get all field definitions (for admin)
  async getFields(): Promise<SupportFieldDefinition[]> {
    try {
      const { data, error } = await supabase
        .from('support_field_definitions')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching fields:', error);
      return [];
    }
  },

  // Get field definitions with visibility rules
  async getFieldsForContext(
    requestTypeId?: string, 
    userRole?: string, 
    isBackend = false
  ): Promise<SupportFieldDefinition[]> {
    try {
      // Get all active fields
      const { data: fields, error: fieldsError } = await supabase
        .from('support_field_definitions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (fieldsError) throw fieldsError;
      
      if (!fields?.length) return [];
      
      // Get visibility rules
      const { data: rules, error: rulesError } = await supabase
        .from('support_field_visibility_rules')
        .select('*');
      
      if (rulesError) throw rulesError;
      
      // Filter fields based on visibility rules
      return fields.filter(field => {
        const fieldRules = rules?.filter(r => r.field_definition_id === field.id) || [];
        
        // If no rules, field is visible to all
        if (!fieldRules.length) return true;
        
        // Check each rule
        return fieldRules.some(rule => {
          // Check context (frontend/backend)
          if (isBackend && !rule.show_on_backend) return false;
          if (!isBackend && !rule.show_on_frontend) return false;
          
          // Check request type
          if (rule.request_type_ids.length && requestTypeId) {
            if (!rule.request_type_ids.includes(requestTypeId)) return false;
          }
          
          // Check user role
          if (rule.user_roles.length && userRole) {
            if (!rule.user_roles.includes(userRole as any)) return false;
          }
          
          return true;
        });
      });
    } catch (error) {
      console.error('Error fetching fields:', error);
      return [];
    }
  },

  // Create new field definition
  async createField(fieldData: Omit<SupportFieldDefinition, 'id' | 'created_at' | 'updated_at'>): Promise<SupportFieldDefinition> {
    try {
      const { data, error } = await supabase
        .from('support_field_definitions')
        .insert([fieldData])
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error creating field:', error);
      throw error;
    }
  },

  // Update field definition
  async updateField(id: string, updates: Partial<SupportFieldDefinition>): Promise<SupportFieldDefinition> {
    try {
      const { data, error } = await supabase
        .from('support_field_definitions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error updating field:', error);
      throw error;
    }
  },

  // Delete field definition
  async deleteField(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('support_field_definitions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting field:', error);
      throw error;
    }
  }
};

// Organization settings operations
export const organizationService = {
  // Get organization settings
  async getOrganizationSettings(orgId: number): Promise<SupportOrganizationSettings | null> {
    try {
      const { data, error } = await supabase
        .from('support_organization_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching organization settings:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching organization settings:', error);
      return null;
    }
  },

  // Check if organization is provisioned for support
  async isOrganizationProvisioned(orgId: number): Promise<boolean> {
    const settings = await this.getOrganizationSettings(orgId);
    return settings?.is_provisioned || false;
  },

  // Get organization support settings (different table)
  async getSupportSettings(orgId: number): Promise<OrganizationSupportSettings | null> {
    try {
      const { data, error } = await supabase
        .from('organization_support_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching support settings:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching support settings:', error);
      return null;
    }
  },

  // Update organization support settings
  async updateSupportSettings(orgId: number, settings: Partial<OrganizationSupportSettings>): Promise<boolean> {
    try {
      // Check if settings exist
      const existing = await this.getSupportSettings(orgId);
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('organization_support_settings')
          .update(settings)
          .eq('organization_id', orgId);
        
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('organization_support_settings')
          .insert([{ ...settings, organization_id: orgId }]);
        
        if (error) throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating support settings:', error);
      throw error;
    }
  }
};

// Support agents operations
export const supportAgentService = {
  // Get all support agents with user details
  async getAgents(): Promise<SupportAgentWithUser[]> {
    try {
      const { data, error } = await supabase
        .from('support_agents_with_users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching support agents:', error);
      return [];
    }
  },

  // Get active support agents
  async getActiveAgents(): Promise<SupportAgentWithUser[]> {
    try {
      const { data, error } = await supabase
        .from('support_agents_with_users')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching active support agents:', error);
      return [];
    }
  },

  // Get support agent by user ID
  async getAgentByUserId(userId: string): Promise<SupportAgent | null> {
    try {
      const { data, error } = await supabase
        .from('support_agents')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      
      return data;
    } catch (error) {
      console.error('Error fetching support agent:', error);
      return null;
    }
  },

  // Create support agent
  async createAgent(agentData: Omit<SupportAgent, 'id' | 'created_at' | 'updated_at'>): Promise<SupportAgent> {
    try {
      const { data, error } = await supabase
        .from('support_agents')
        .insert([agentData])
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error creating support agent:', error);
      throw error;
    }
  },

  // Update support agent
  async updateAgent(id: string, updates: Partial<SupportAgent>): Promise<SupportAgent> {
    try {
      const { data, error } = await supabase
        .from('support_agents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error updating support agent:', error);
      throw error;
    }
  },

  // Delete support agent
  async deleteAgent(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('support_agents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting support agent:', error);
      throw error;
    }
  },

  // Check if user has support agent permissions
  async checkAgentPermissions(userId: string): Promise<SupportAgent | null> {
    return this.getAgentByUserId(userId);
  }
};

// Helper function to upload attachments
async function uploadAttachments(files: File[], ticketId: string): Promise<any[]> {
  const attachments = [];
  
  for (const file of files) {
    const fileName = `${ticketId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('support-attachments')
      .upload(fileName, file);
    
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage
        .from('support-attachments')
        .getPublicUrl(fileName);
      
      attachments.push({
        url: publicUrl,
        filename: file.name,
        size: file.size,
        type: file.type
      });
    }
  }
  
  return attachments;
}

// Real-time subscription helper
export function subscribeToTicket(
  ticketId: string, 
  onUpdate: (payload: any) => void
) {
  return supabase
    .channel(`ticket:${ticketId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'support_tickets',
        filter: `id=eq.${ticketId}`
      },
      onUpdate
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'support_ticket_messages',
        filter: `ticket_id=eq.${ticketId}`
      },
      onUpdate
    )
    .subscribe();
}