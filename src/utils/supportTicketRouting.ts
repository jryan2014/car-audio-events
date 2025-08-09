/**
 * Support Desk Routing System
 * Routes tickets based on request type, organization context, and field-based rules
 */

import { supabase } from '../lib/supabase';

export interface TicketRoutingRequest {
  requestTypeId: string;
  userId?: string;
  selectedOrganizationId?: number;
  eventId?: number;
  customFields: Record<string, any>;
  issueType: string;
  subject: string;
  description: string;
  priority?: string;
}

export interface RoutingResult {
  routingType: 'internal' | 'organization' | 'hybrid';
  targetOrganizationId?: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  routingReason: string;
  assignedQueue: string;
  estimatedResponseTime?: string;
  customMessage?: string;
}

export interface SupportQueue {
  id: string;
  name: string;
  organizationId?: number;
  supportTeam: Array<{
    userId: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    currentTicketCount: number;
  }>;
  autoAssignEnabled: boolean;
  averageResponseTime: string;
  currentLoad: 'low' | 'medium' | 'high';
}

class SupportTicketRouting {
  /**
   * Determine how a ticket should be routed based on context
   */
  async determineRouting(request: TicketRoutingRequest): Promise<RoutingResult> {
    try {
      const { data, error } = await supabase.rpc('determine_ticket_routing', {
        p_request_type_id: request.requestTypeId,
        p_user_id: request.userId,
        p_selected_org_id: request.selectedOrganizationId,
        p_event_id: request.eventId,
        p_custom_fields: request.customFields
      });

      if (error) {
        console.error('Routing determination error:', error);
        // Fallback to internal routing
        return {
          routingType: 'internal',
          priority: 'normal',
          routingReason: 'routing_error_fallback',
          assignedQueue: 'Platform Support'
        };
      }

      // Get queue information
      const queueInfo = await this.getQueueInfo(data.routing_type, data.target_organization_id);

      return {
        routingType: data.routing_type,
        targetOrganizationId: data.target_organization_id,
        priority: data.priority,
        routingReason: data.routing_reason,
        assignedQueue: queueInfo.name,
        estimatedResponseTime: queueInfo.averageResponseTime,
        customMessage: queueInfo.customMessage
      };
    } catch (error) {
      console.error('Support routing error:', error);
      return {
        routingType: 'internal',
        priority: 'normal',
        routingReason: 'system_error',
        assignedQueue: 'Platform Support'
      };
    }
  }

  /**
   * Get available organizations for user selection based on context
   */
  async getAvailableOrganizations(
    userId?: string,
    eventId?: number,
    requestTypeId?: string
  ): Promise<Array<{
    id: number;
    name: string;
    logoUrl?: string;
    hasSupport: boolean;
    supportResponseTime?: string;
    supportMessage?: string;
    isUserOrganization: boolean;
    isEventOrganization: boolean;
  }>> {
    try {
      const organizations: any[] = [];

      // Get user's organization
      if (userId) {
        const { data: userOrg } = await supabase
          .from('users')
          .select(`
            organization_id,
            organizations!inner(
              id, name, logo_url,
              support_organization_settings(
                is_provisioned,
                custom_message,
                support_email
              )
            )
          `)
          .eq('id', userId)
          .single();

        if (userOrg?.organization_id) {
          organizations.push({
            ...userOrg.organizations,
            hasSupport: userOrg.organizations.support_organization_settings?.[0]?.is_provisioned || false,
            supportMessage: userOrg.organizations.support_organization_settings?.[0]?.custom_message,
            isUserOrganization: true,
            isEventOrganization: false
          });
        }
      }

      // Get event's organization (if different from user's)
      if (eventId) {
        const { data: event } = await supabase
          .from('events')
          .select(`
            organization_id,
            organizations!inner(
              id, name, logo_url,
              support_organization_settings(
                is_provisioned,
                custom_message,
                support_email
              )
            )
          `)
          .eq('id', eventId)
          .single();

        if (event?.organization_id && !organizations.find(org => org.id === event.organization_id)) {
          organizations.push({
            ...event.organizations,
            hasSupport: event.organizations.support_organization_settings?.[0]?.is_provisioned || false,
            supportMessage: event.organizations.support_organization_settings?.[0]?.custom_message,
            isUserOrganization: false,
            isEventOrganization: true
          });
        }
      }

      // Get other organizations with public support (for certain request types)
      if (requestTypeId) {
        const { data: requestType } = await supabase
          .from('support_request_types')
          .select('default_routing, routing_rules')
          .eq('id', requestTypeId)
          .single();

        if (requestType?.default_routing === 'hybrid' || requestType?.routing_rules?.allow_public_organizations) {
          const { data: publicOrgs } = await supabase
            .from('organizations')
            .select(`
              id, name, logo_url,
              support_organization_settings!inner(
                is_provisioned,
                custom_message
              )
            `)
            .eq('support_organization_settings.is_provisioned', true)
            .limit(5);

          publicOrgs?.forEach(org => {
            if (!organizations.find(existing => existing.id === org.id)) {
              organizations.push({
                ...org,
                hasSupport: true,
                supportMessage: org.support_organization_settings?.[0]?.custom_message,
                isUserOrganization: false,
                isEventOrganization: false
              });
            }
          });
        }
      }

      return organizations;
    } catch (error) {
      console.error('Error getting available organizations:', error);
      return [];
    }
  }

  /**
   * Create support ticket with proper routing
   */
  async createTicket(request: TicketRoutingRequest): Promise<{
    success: boolean;
    ticketId?: string;
    ticketNumber?: string;
    routing: RoutingResult;
    error?: string;
  }> {
    try {
      // Determine routing first
      const routing = await this.determineRouting(request);

      // Create the ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: request.userId,
          organization_id: routing.targetOrganizationId,
          title: request.subject,
          description: request.description,
          status: 'open',
          priority: routing.priority,
          request_type_id: request.requestTypeId,
          event_id: request.eventId,
          routing_type: routing.routingType,
          assigned_to_org_id: routing.targetOrganizationId,
          custom_fields: request.customFields,
          source: 'web'
        })
        .select('id, ticket_number')
        .single();

      if (ticketError) {
        return {
          success: false,
          routing,
          error: ticketError.message
        };
      }

      // Auto-assign if organization has auto-assignment enabled
      if (routing.routingType === 'organization' && routing.targetOrganizationId) {
        await this.attemptAutoAssignment(ticket.id, routing.targetOrganizationId);
      }

      return {
        success: true,
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        routing
      };
    } catch (error) {
      console.error('Error creating support ticket:', error);
      const routing = await this.determineRouting(request);
      return {
        success: false,
        routing,
        error: 'system_error'
      };
    }
  }

  /**
   * Get support request types available to user
   */
  async getAvailableRequestTypes(userRole?: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    requiresEvent: boolean;
    defaultRouting: string;
    estimatedResponseTime: string;
    isAvailable: boolean;
  }>> {
    try {
      const { data } = await supabase
        .from('support_request_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      return data?.map(type => ({
        id: type.id,
        name: type.name,
        description: type.description,
        category: type.category,
        requiresEvent: type.requires_event,
        defaultRouting: type.default_routing,
        estimatedResponseTime: this.getEstimatedResponseTime(type.default_routing, type.default_priority),
        isAvailable: !userRole || type.allowed_roles.includes(userRole)
      })).filter(type => type.isAvailable) || [];
    } catch (error) {
      console.error('Error getting request types:', error);
      return [];
    }
  }

  /**
   * Get support queue information
   */
  async getSupportQueues(): Promise<SupportQueue[]> {
    try {
      const queues: SupportQueue[] = [];

      // Internal platform queue
      const { data: platformTickets } = await supabase
        .from('support_tickets')
        .select('id, status, priority')
        .eq('routing_type', 'internal')
        .in('status', ['open', 'in_progress']);

      queues.push({
        id: 'internal',
        name: 'Platform Support',
        supportTeam: await this.getPlatformSupportTeam(),
        autoAssignEnabled: true,
        averageResponseTime: '2-4 hours',
        currentLoad: this.calculateLoad(platformTickets?.length || 0)
      });

      // Organization queues
      const { data: orgSettings } = await supabase
        .from('support_organization_settings')
        .select(`
          organization_id,
          auto_assign_enabled,
          custom_message,
          organizations!inner(id, name)
        `)
        .eq('is_provisioned', true);

      for (const setting of orgSettings || []) {
        const { data: orgTickets } = await supabase
          .from('support_tickets')
          .select('id')
          .eq('assigned_to_org_id', setting.organization_id)
          .in('status', ['open', 'in_progress']);

        queues.push({
          id: `org_${setting.organization_id}`,
          name: `${setting.organizations.name} Support`,
          organizationId: setting.organization_id,
          supportTeam: await this.getOrganizationSupportTeam(setting.organization_id),
          autoAssignEnabled: setting.auto_assign_enabled,
          averageResponseTime: '1-6 hours',
          currentLoad: this.calculateLoad(orgTickets?.length || 0)
        });
      }

      return queues;
    } catch (error) {
      console.error('Error getting support queues:', error);
      return [];
    }
  }

  // Private helper methods

  private async getQueueInfo(routingType: string, organizationId?: number): Promise<{
    name: string;
    averageResponseTime: string;
    customMessage?: string;
  }> {
    if (routingType === 'organization' && organizationId) {
      const { data } = await supabase
        .from('support_organization_settings')
        .select('custom_message, organizations!inner(name)')
        .eq('organization_id', organizationId)
        .single();

      return {
        name: `${data?.organizations.name} Support` || 'Organization Support',
        averageResponseTime: '1-6 hours',
        customMessage: data?.custom_message
      };
    }

    return {
      name: 'Platform Support',
      averageResponseTime: '2-4 hours'
    };
  }

  private async attemptAutoAssignment(ticketId: string, organizationId: number): Promise<void> {
    try {
      const { data: settings } = await supabase
        .from('support_organization_settings')
        .select('auto_assign_enabled, support_team_user_ids')
        .eq('organization_id', organizationId)
        .single();

      if (!settings?.auto_assign_enabled || !settings.support_team_user_ids?.length) {
        return;
      }

      // Find support rep with lowest current ticket count
      const teamMembers = settings.support_team_user_ids;
      let assigneeId = teamMembers[0]; // Default to first member
      let lowestCount = Infinity;

      for (const memberId of teamMembers) {
        const { count } = await supabase
          .from('support_tickets')
          .select('id', { count: 'exact' })
          .eq('assigned_to_user_id', memberId)
          .in('status', ['open', 'in_progress']);

        if ((count || 0) < lowestCount) {
          lowestCount = count || 0;
          assigneeId = memberId;
        }
      }

      // Assign ticket
      await supabase
        .from('support_tickets')
        .update({
          assigned_to_user_id: assigneeId,
          status: 'in_progress'
        })
        .eq('id', ticketId);

      // Log assignment
      await supabase
        .from('support_ticket_assignments')
        .insert({
          ticket_id: ticketId,
          assigned_to_user_id: assigneeId,
          assignment_reason: 'auto_assignment'
        });
    } catch (error) {
      console.error('Auto-assignment error:', error);
    }
  }

  private async getPlatformSupportTeam(): Promise<SupportQueue['supportTeam']> {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, name, email, membership_type')
        .in('membership_type', ['admin', 'sub_admin', 'support_rep'])
        .eq('status', 'active');

      return data?.map(user => ({
        userId: user.id,
        name: user.name || 'Support Team',
        email: user.email,
        role: user.membership_type,
        isActive: true,
        currentTicketCount: 0 // This would be calculated separately
      })) || [];
    } catch (error) {
      console.error('Error getting platform support team:', error);
      return [];
    }
  }

  private async getOrganizationSupportTeam(organizationId: number): Promise<SupportQueue['supportTeam']> {
    try {
      const { data } = await supabase
        .from('organization_employees')
        .select(`
          user_id,
          employee_role,
          users!inner(name, email)
        `)
        .eq('organization_id', organizationId)
        .in('employee_role', ['admin', 'support_rep'])
        .eq('status', 'active');

      return data?.map(emp => ({
        userId: emp.user_id,
        name: emp.users.name || 'Support Rep',
        email: emp.users.email,
        role: emp.employee_role,
        isActive: true,
        currentTicketCount: 0 // This would be calculated separately
      })) || [];
    } catch (error) {
      console.error('Error getting organization support team:', error);
      return [];
    }
  }

  private getEstimatedResponseTime(routingType: string, priority: string): string {
    const baseTimes = {
      internal: { urgent: '1 hour', high: '2-4 hours', normal: '4-8 hours', low: '1-2 days' },
      organization: { urgent: '30 mins', high: '1-2 hours', normal: '2-6 hours', low: '6-24 hours' },
      hybrid: { urgent: '1 hour', high: '2-4 hours', normal: '4-8 hours', low: '1-2 days' }
    };

    return baseTimes[routingType as keyof typeof baseTimes]?.[priority as keyof typeof baseTimes.internal] || '2-4 hours';
  }

  private calculateLoad(ticketCount: number): 'low' | 'medium' | 'high' {
    if (ticketCount < 10) return 'low';
    if (ticketCount < 25) return 'medium';
    return 'high';
  }
}

// Export singleton instance
export const supportRouting = new SupportTicketRouting();