/**
 * Resource Authorization Middleware for IDOR Protection
 * 
 * Implements comprehensive Insecure Direct Object Reference (IDOR) protection
 * for the Car Audio Events platform with object-level access control,
 * ownership validation, and UUID verification.
 */

import { supabase } from '../lib/supabase';
import { AuthMiddleware, type AuthenticatedUser } from './auth-middleware';
import { auditLogger } from './audit-security';
import { RateLimiter, RateLimitConfigs } from './rate-limiting';

// Rate limiter for authorization checks
const authorizationRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'resource_auth'
});

export interface ResourceAuthContext {
  user: AuthenticatedUser;
  ipAddress: string;
  userAgent: string;
  operation: 'read' | 'create' | 'update' | 'delete';
  timestamp: Date;
}

export interface ResourceAuthResult {
  allowed: boolean;
  reason?: string;
  requiresElevation?: boolean;
  restrictions?: string[];
  auditId: string;
}

export interface ResourceIdentifier {
  type: ResourceType;
  id: string;
  parentId?: string;
  ownerId?: string;
  organizationId?: string;
}

export type ResourceType = 
  | 'user' 
  | 'event' 
  | 'competition_result' 
  | 'payment' 
  | 'support_ticket'
  | 'advertisement'
  | 'organization'
  | 'registration'
  | 'notification'
  | 'email_template'
  | 'campaign'
  | 'backup';

/**
 * Resource Authorization Middleware Class
 * 
 * Provides comprehensive IDOR protection with ownership validation,
 * permission checking, and resource existence verification.
 */
export class ResourceAuthorizationMiddleware {
  
  /**
   * Main authorization check method
   * Validates resource access based on ownership, permissions, and context
   */
  static async authorize(
    resource: ResourceIdentifier,
    context: ResourceAuthContext
  ): Promise<ResourceAuthResult> {
    const auditId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      // 1. Rate limiting check
      const rateLimitKey = `${context.user.id}_${context.ipAddress}`;
      const rateLimitResult = await authorizationRateLimiter.checkLimit(rateLimitKey);
      
      if (!rateLimitResult.allowed) {
        await auditLogger.logSecurityEvent({
          eventType: 'resource_auth_rate_limited',
          severity: 'medium',
          userId: context.user.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            resourceType: resource.type,
            resourceId: resource.id,
            operation: context.operation,
            retryAfter: rateLimitResult.retryAfter
          }
        });
        
        return {
          allowed: false,
          reason: 'Rate limit exceeded for authorization checks',
          auditId
        };
      }
      
      // 2. Input validation
      const validationResult = this.validateResourceInput(resource);
      if (!validationResult.valid) {
        await auditLogger.logSecurityEvent({
          eventType: 'invalid_resource_format',
          severity: 'high',
          userId: context.user.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            resourceType: resource.type,
            resourceId: resource.id,
            validationErrors: validationResult.errors
          }
        });
        
        return {
          allowed: false,
          reason: `Invalid resource format: ${validationResult.errors.join(', ')}`,
          auditId
        };
      }
      
      // 3. Resource existence check
      const existenceCheck = await this.verifyResourceExists(resource, context);
      if (!existenceCheck.exists) {
        await auditLogger.logSecurityEvent({
          eventType: 'resource_not_found',
          severity: 'medium',
          userId: context.user.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            resourceType: resource.type,
            resourceId: resource.id,
            operation: context.operation
          }
        });
        
        return {
          allowed: false,
          reason: 'Resource not found or has been deleted',
          auditId
        };
      }
      
      // 4. Admin bypass (with comprehensive logging)
      if (context.user.membershipType === 'admin') {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'admin_resource_access',
          resource: resource.type,
          resourceId: resource.id,
          result: 'allowed',
          details: {
            operation: context.operation,
            method: 'admin_bypass',
            duration: `${Date.now() - startTime}ms`
          }
        });
        
        return {
          allowed: true,
          restrictions: ['admin_bypass'],
          auditId
        };
      }
      
      // 5. Resource-specific authorization
      const authResult = await this.checkResourceSpecificAuthorization(
        resource,
        context,
        existenceCheck.metadata
      );
      
      // 6. Log the authorization result
      await auditLogger.logAccessEvent({
        userId: context.user.id,
        action: 'resource_authorization',
        resource: resource.type,
        resourceId: resource.id,
        result: authResult.allowed ? 'allowed' : 'denied',
        details: {
          operation: context.operation,
          reason: authResult.reason,
          restrictions: authResult.restrictions,
          duration: `${Date.now() - startTime}ms`
        }
      });
      
      return {
        ...authResult,
        auditId
      };
      
    } catch (error) {
      await auditLogger.logSecurityEvent({
        eventType: 'resource_auth_error',
        severity: 'high',
        userId: context.user.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: {
          resourceType: resource.type,
          resourceId: resource.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: `${Date.now() - startTime}ms`
        }
      });
      
      return {
        allowed: false,
        reason: 'Authorization service error',
        auditId
      };
    }
  }
  
  /**
   * Validate resource input format and detect potential attacks
   */
  private static validateResourceInput(resource: ResourceIdentifier): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Validate resource type
    const validResourceTypes: ResourceType[] = [
      'user', 'event', 'competition_result', 'payment', 'support_ticket',
      'advertisement', 'organization', 'registration', 'notification',
      'email_template', 'campaign', 'backup'
    ];
    
    if (!validResourceTypes.includes(resource.type)) {
      errors.push(`Invalid resource type: ${resource.type}`);
    }
    
    // Validate resource ID
    if (!resource.id || typeof resource.id !== 'string') {
      errors.push('Resource ID is required and must be a string');
    } else {
      // Check for common injection patterns
      if (this.containsSuspiciousPatterns(resource.id)) {
        errors.push('Resource ID contains suspicious patterns');
      }
      
      // Validate UUID format for UUID-based resources
      if (this.isUuidBasedResource(resource.type) && !this.isValidUUID(resource.id)) {
        errors.push('Resource ID must be a valid UUID');
      }
      
      // Validate integer format for integer-based resources
      if (this.isIntegerBasedResource(resource.type) && !this.isValidInteger(resource.id)) {
        errors.push('Resource ID must be a valid integer');
      }
    }
    
    // Validate parent ID if provided
    if (resource.parentId && !this.isValidIdentifier(resource.parentId)) {
      errors.push('Parent ID format is invalid');
    }
    
    // Validate owner ID if provided
    if (resource.ownerId && !this.isValidUUID(resource.ownerId)) {
      errors.push('Owner ID must be a valid UUID');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Verify that a resource exists in the database
   */
  private static async verifyResourceExists(
    resource: ResourceIdentifier,
    context: ResourceAuthContext
  ): Promise<{ exists: boolean; metadata?: any }> {
    try {
      let query: any;
      let tableName: string;
      
      // Map resource types to database tables and queries
      switch (resource.type) {
        case 'user':
          tableName = 'users';
          query = supabase
            .from('users')
            .select('id, membership_type, status, organization_id')
            .eq('id', resource.id)
            .single();
          break;
          
        case 'event':
          tableName = 'events';
          query = supabase
            .from('events')
            .select('id, organizer_id, status, is_public')
            .eq('id', resource.id)
            .single();
          break;
          
        case 'competition_result':
          tableName = 'competition_results';
          query = supabase
            .from('competition_results')
            .select('id, user_id, event_id, verified')
            .eq('id', resource.id)
            .single();
          break;
          
        case 'payment':
          tableName = 'payments';
          query = supabase
            .from('payments')
            .select('id, user_id, status, amount')
            .eq('id', resource.id)
            .single();
          break;
          
        case 'support_ticket':
          tableName = 'support_tickets';
          query = supabase
            .from('support_tickets')
            .select('id, user_id, status, priority')
            .eq('id', resource.id)
            .single();
          break;
          
        case 'advertisement':
          tableName = 'advertisements';
          query = supabase
            .from('advertisements')
            .select('id, user_id, organization_id, status')
            .eq('id', resource.id)
            .single();
          break;
          
        case 'organization':
          tableName = 'organizations';
          query = supabase
            .from('organizations')
            .select('id, name, status')
            .eq('id', resource.id)
            .single();
          break;
          
        case 'registration':
          tableName = 'event_attendance';
          query = supabase
            .from('event_attendance')
            .select('id, user_id, event_id, status')
            .eq('id', resource.id)
            .single();
          break;
          
        case 'notification':
          tableName = 'notifications';
          query = supabase
            .from('notifications')
            .select('id, user_id, type, status')
            .eq('id', resource.id)
            .single();
          break;
          
        case 'email_template':
          tableName = 'email_templates';
          query = supabase
            .from('email_templates')
            .select('id, name, type, is_active')
            .eq('id', resource.id)
            .single();
          break;
          
        case 'campaign':
          tableName = 'campaigns';
          query = supabase
            .from('campaigns')
            .select('id, created_by, status, type')
            .eq('id', resource.id)
            .single();
          break;
          
        default:
          return { exists: false };
      }
      
      const { data, error } = await query;
      
      if (error || !data) {
        return { exists: false };
      }
      
      return {
        exists: true,
        metadata: {
          ...data,
          tableName
        }
      };
      
    } catch (error) {
      await auditLogger.logSecurityEvent({
        eventType: 'resource_existence_check_error',
        severity: 'medium',
        userId: context.user.id,
        details: {
          resourceType: resource.type,
          resourceId: resource.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      return { exists: false };
    }
  }
  
  /**
   * Resource-specific authorization logic
   */
  private static async checkResourceSpecificAuthorization(
    resource: ResourceIdentifier,
    context: ResourceAuthContext,
    metadata: any
  ): Promise<ResourceAuthResult> {
    
    switch (resource.type) {
      case 'user':
        return this.authorizeUserAccess(resource, context, metadata);
        
      case 'event':
        return this.authorizeEventAccess(resource, context, metadata);
        
      case 'competition_result':
        return this.authorizeCompetitionResultAccess(resource, context, metadata);
        
      case 'payment':
        return this.authorizePaymentAccess(resource, context, metadata);
        
      case 'support_ticket':
        return this.authorizeSupportTicketAccess(resource, context, metadata);
        
      case 'advertisement':
        return this.authorizeAdvertisementAccess(resource, context, metadata);
        
      case 'organization':
        return this.authorizeOrganizationAccess(resource, context, metadata);
        
      case 'registration':
        return this.authorizeRegistrationAccess(resource, context, metadata);
        
      case 'notification':
        return this.authorizeNotificationAccess(resource, context, metadata);
        
      case 'email_template':
        return this.authorizeEmailTemplateAccess(resource, context, metadata);
        
      case 'campaign':
        return this.authorizeCampaignAccess(resource, context, metadata);
        
      case 'backup':
        return this.authorizeBackupAccess(resource, context, metadata);
        
      default:
        return {
          allowed: false,
          reason: `Unknown resource type: ${resource.type}`,
          auditId: crypto.randomUUID()
        };
    }
  }
  
  /**
   * User resource authorization
   */
  private static async authorizeUserAccess(
    resource: ResourceIdentifier,
    context: ResourceAuthContext,
    metadata: any
  ): Promise<ResourceAuthResult> {
    const auditId = crypto.randomUUID();
    
    // Users can always read/update their own profile
    if (resource.id === context.user.id) {
      return {
        allowed: true,
        restrictions: ['own_profile'],
        auditId
      };
    }
    
    // Organization admins can access users in their organization
    if (context.user.membershipType === 'organization' && 
        context.user.organizationId && 
        metadata.organization_id === context.user.organizationId) {
      
      // Read-only for organization members
      if (context.operation === 'read') {
        return {
          allowed: true,
          restrictions: ['organization_member', 'read_only'],
          auditId
        };
      }
    }
    
    // Special permissions for certain membership types
    const hasUserManagementPermission = context.user.permissions.includes('manage_users');
    if (hasUserManagementPermission && context.operation === 'read') {
      return {
        allowed: true,
        restrictions: ['limited_user_management'],
        auditId
      };
    }
    
    return {
      allowed: false,
      reason: 'Cannot access other users\' profiles',
      auditId
    };
  }
  
  /**
   * Event resource authorization
   */
  private static async authorizeEventAccess(
    resource: ResourceIdentifier,
    context: ResourceAuthContext,
    metadata: any
  ): Promise<ResourceAuthResult> {
    const auditId = crypto.randomUUID();
    
    // Public events can be read by anyone
    if (metadata.is_public && context.operation === 'read') {
      return {
        allowed: true,
        restrictions: ['public_read_only'],
        auditId
      };
    }
    
    // Event organizers can manage their own events
    if (metadata.organizer_id === context.user.id) {
      return {
        allowed: true,
        restrictions: ['event_owner'],
        auditId
      };
    }
    
    // Organization members can access organization events
    if (context.user.organizationId && context.user.membershipType === 'organization') {
      // Check if event belongs to user's organization
      const { data: eventOrg } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', metadata.organizer_id)
        .single();
      
      if (eventOrg?.organization_id === context.user.organizationId) {
        return {
          allowed: true,
          restrictions: ['organization_event'],
          auditId
        };
      }
    }
    
    // Users with event management permissions
    if (context.user.permissions.includes('manage_events')) {
      return {
        allowed: true,
        restrictions: ['event_management_permission'],
        auditId
      };
    }
    
    return {
      allowed: false,
      reason: 'Insufficient permissions to access this event',
      auditId
    };
  }
  
  /**
   * Competition result authorization
   */
  private static async authorizeCompetitionResultAccess(
    resource: ResourceIdentifier,
    context: ResourceAuthContext,
    metadata: any
  ): Promise<ResourceAuthResult> {
    const auditId = crypto.randomUUID();
    
    // Users can always access their own results
    if (metadata.user_id === context.user.id) {
      // Can delete only unverified results
      if (context.operation === 'delete' && metadata.verified) {
        return {
          allowed: false,
          reason: 'Cannot delete verified results',
          auditId
        };
      }
      
      // Can update only unverified results (except admins)
      if (context.operation === 'update' && metadata.verified) {
        return {
          allowed: false,
          reason: 'Cannot modify verified results',
          auditId
        };
      }
      
      return {
        allowed: true,
        restrictions: ['own_result'],
        auditId
      };
    }
    
    // Event organizers can view and verify results for their events
    const { data: eventData } = await supabase
      .from('events')
      .select('organizer_id')
      .eq('id', metadata.event_id)
      .single();
    
    if (eventData?.organizer_id === context.user.id) {
      return {
        allowed: true,
        restrictions: ['event_organizer'],
        auditId
      };
    }
    
    // Anyone can read verified results
    if (context.operation === 'read' && metadata.verified) {
      return {
        allowed: true,
        restrictions: ['verified_result_public'],
        auditId
      };
    }
    
    return {
      allowed: false,
      reason: 'Cannot access other users\' competition results',
      auditId
    };
  }
  
  /**
   * Payment resource authorization
   */
  private static async authorizePaymentAccess(
    resource: ResourceIdentifier,
    context: ResourceAuthContext,
    metadata: any
  ): Promise<ResourceAuthResult> {
    const auditId = crypto.randomUUID();
    
    // Users can only access their own payments
    if (metadata.user_id !== context.user.id) {
      return {
        allowed: false,
        reason: 'Cannot access other users\' payment information',
        auditId
      };
    }
    
    // No one can modify completed payments except admins
    if (['completed', 'refunded'].includes(metadata.status) && 
        context.operation !== 'read' && 
        context.user.membershipType !== 'admin') {
      return {
        allowed: false,
        reason: 'Cannot modify completed or refunded payments',
        auditId
      };
    }
    
    return {
      allowed: true,
      restrictions: ['own_payment'],
      auditId
    };
  }
  
  /**
   * Support ticket authorization
   */
  private static async authorizeSupportTicketAccess(
    resource: ResourceIdentifier,
    context: ResourceAuthContext,
    metadata: any
  ): Promise<ResourceAuthResult> {
    const auditId = crypto.randomUUID();
    
    // Users can access their own support tickets
    if (metadata.user_id === context.user.id) {
      return {
        allowed: true,
        restrictions: ['own_ticket'],
        auditId
      };
    }
    
    // Support staff can access all tickets
    if (context.user.permissions.includes('manage_support')) {
      return {
        allowed: true,
        restrictions: ['support_staff'],
        auditId
      };
    }
    
    return {
      allowed: false,
      reason: 'Cannot access other users\' support tickets',
      auditId
    };
  }
  
  /**
   * Advertisement authorization
   */
  private static async authorizeAdvertisementAccess(
    resource: ResourceIdentifier,
    context: ResourceAuthContext,
    metadata: any
  ): Promise<ResourceAuthResult> {
    const auditId = crypto.randomUUID();
    
    // Users can manage their own advertisements
    if (metadata.user_id === context.user.id) {
      return {
        allowed: true,
        restrictions: ['own_advertisement'],
        auditId
      };
    }
    
    // Organization members can manage organization ads
    if (metadata.organization_id && 
        context.user.organizationId === metadata.organization_id) {
      return {
        allowed: true,
        restrictions: ['organization_advertisement'],
        auditId
      };
    }
    
    // Anyone can read active advertisements
    if (context.operation === 'read' && metadata.status === 'active') {
      return {
        allowed: true,
        restrictions: ['public_advertisement'],
        auditId
      };
    }
    
    return {
      allowed: false,
      reason: 'Cannot access this advertisement',
      auditId
    };
  }
  
  /**
   * Organization authorization
   */
  private static async authorizeOrganizationAccess(
    resource: ResourceIdentifier,
    context: ResourceAuthContext,
    metadata: any
  ): Promise<ResourceAuthResult> {
    const auditId = crypto.randomUUID();
    
    // Anyone can read active organizations (public directory)
    if (context.operation === 'read' && metadata.status === 'active') {
      return {
        allowed: true,
        restrictions: ['public_organization'],
        auditId
      };
    }
    
    // Organization members can manage their organization
    if (context.user.organizationId === metadata.id && 
        context.user.membershipType === 'organization') {
      return {
        allowed: true,
        restrictions: ['own_organization'],
        auditId
      };
    }
    
    return {
      allowed: false,
      reason: 'Cannot access this organization',
      auditId
    };
  }
  
  /**
   * Registration authorization
   */
  private static async authorizeRegistrationAccess(
    resource: ResourceIdentifier,
    context: ResourceAuthContext,
    metadata: any
  ): Promise<ResourceAuthResult> {
    const auditId = crypto.randomUUID();
    
    // Users can manage their own registrations
    if (metadata.user_id === context.user.id) {
      return {
        allowed: true,
        restrictions: ['own_registration'],
        auditId
      };
    }
    
    // Event organizers can view registrations for their events
    const { data: eventData } = await supabase
      .from('events')
      .select('organizer_id')
      .eq('id', metadata.event_id)
      .single();
    
    if (eventData?.organizer_id === context.user.id && context.operation === 'read') {
      return {
        allowed: true,
        restrictions: ['event_organizer_view'],
        auditId
      };
    }
    
    return {
      allowed: false,
      reason: 'Cannot access this registration',
      auditId
    };
  }
  
  /**
   * Notification authorization
   */
  private static async authorizeNotificationAccess(
    resource: ResourceIdentifier,
    context: ResourceAuthContext,
    metadata: any
  ): Promise<ResourceAuthResult> {
    const auditId = crypto.randomUUID();
    
    // Users can only access their own notifications
    if (metadata.user_id !== context.user.id) {
      return {
        allowed: false,
        reason: 'Cannot access other users\' notifications',
        auditId
      };
    }
    
    return {
      allowed: true,
      restrictions: ['own_notification'],
      auditId
    };
  }
  
  /**
   * Email template authorization
   */
  private static async authorizeEmailTemplateAccess(
    resource: ResourceIdentifier,
    context: ResourceAuthContext,
    metadata: any
  ): Promise<ResourceAuthResult> {
    const auditId = crypto.randomUUID();
    
    // Only admins can manage email templates
    if (context.user.membershipType !== 'admin') {
      // Allow read access to active templates for certain operations
      if (context.operation === 'read' && metadata.is_active &&
          context.user.permissions.includes('manage_emails')) {
        return {
          allowed: true,
          restrictions: ['read_only_template'],
          auditId
        };
      }
      
      return {
        allowed: false,
        reason: 'Email template management requires admin privileges',
        auditId
      };
    }
    
    return {
      allowed: true,
      restrictions: ['admin_template_management'],
      auditId
    };
  }
  
  /**
   * Campaign authorization
   */
  private static async authorizeCampaignAccess(
    resource: ResourceIdentifier,
    context: ResourceAuthContext,
    metadata: any
  ): Promise<ResourceAuthResult> {
    const auditId = crypto.randomUUID();
    
    // Campaign creators can manage their campaigns
    if (metadata.created_by === context.user.id) {
      return {
        allowed: true,
        restrictions: ['campaign_creator'],
        auditId
      };
    }
    
    // Marketing permission holders can access campaigns
    if (context.user.permissions.includes('manage_campaigns')) {
      return {
        allowed: true,
        restrictions: ['campaign_management'],
        auditId
      };
    }
    
    return {
      allowed: false,
      reason: 'Cannot access this campaign',
      auditId
    };
  }
  
  /**
   * Backup authorization
   */
  private static async authorizeBackupAccess(
    resource: ResourceIdentifier,
    context: ResourceAuthContext,
    metadata: any
  ): Promise<ResourceAuthResult> {
    const auditId = crypto.randomUUID();
    
    // Only admins can access backup operations
    if (context.user.membershipType !== 'admin') {
      return {
        allowed: false,
        reason: 'Backup access requires admin privileges',
        auditId
      };
    }
    
    return {
      allowed: true,
      restrictions: ['admin_backup_access'],
      auditId
    };
  }
  
  // Utility methods for validation
  
  private static containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
      /[<>]/,           // HTML/XML tags
      /['"]/,           // SQL injection attempts
      /[;&|]/,          // Command injection
      /\.\./,           // Path traversal
      /\0/,             // Null bytes
      /javascript:/i,   // JavaScript protocol
      /data:/i,         // Data protocol
      /vbscript:/i      // VBScript protocol
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(input));
  }
  
  private static isUuidBasedResource(resourceType: ResourceType): boolean {
    const uuidResources: ResourceType[] = [
      'user', 'competition_result', 'payment', 'support_ticket', 
      'notification', 'registration'
    ];
    return uuidResources.includes(resourceType);
  }
  
  private static isIntegerBasedResource(resourceType: ResourceType): boolean {
    const integerResources: ResourceType[] = [
      'event', 'advertisement', 'organization', 'email_template', 'campaign'
    ];
    return integerResources.includes(resourceType);
  }
  
  private static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
  
  private static isValidInteger(id: string): boolean {
    const num = parseInt(id, 10);
    return !isNaN(num) && num > 0 && num.toString() === id;
  }
  
  private static isValidIdentifier(id: string): boolean {
    return this.isValidUUID(id) || this.isValidInteger(id);
  }
}

/**
 * Express-style middleware wrapper for resource authorization
 */
export const createResourceAuthMiddleware = (
  resourceExtractor: (req: any) => ResourceIdentifier
) => {
  return async (request: Request, context: any) => {
    try {
      // Extract user from auth middleware (should run before this)
      if (!context.user) {
        return new Response(JSON.stringify({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Extract resource identifier
      const resource = resourceExtractor(request);
      
      // Create authorization context
      const authContext: ResourceAuthContext = {
        user: context.user,
        ipAddress: context.ipAddress || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        operation: request.method.toLowerCase() as any,
        timestamp: new Date()
      };
      
      // Check authorization
      const authResult = await ResourceAuthorizationMiddleware.authorize(
        resource, 
        authContext
      );
      
      if (!authResult.allowed) {
        return new Response(JSON.stringify({
          error: authResult.reason || 'Access denied',
          code: 'ACCESS_DENIED',
          auditId: authResult.auditId
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Add authorization context to request
      context.resourceAuth = authResult;
      context.resource = resource;
      
      return null; // Continue to next middleware/handler
      
    } catch (error) {
      await auditLogger.logSecurityEvent({
        eventType: 'resource_auth_middleware_error',
        severity: 'high',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      return new Response(JSON.stringify({
        error: 'Authorization service error',
        code: 'AUTH_SERVICE_ERROR'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
};

/**
 * Helper functions for common authorization patterns
 */
export const ResourceAuthHelpers = {
  
  /**
   * Quick ownership check for simple resources
   */
  async checkOwnership(
    resourceType: ResourceType,
    resourceId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const mockContext: ResourceAuthContext = {
        user: { id: userId } as AuthenticatedUser,
        ipAddress: 'internal',
        userAgent: 'helper-function',
        operation: 'read',
        timestamp: new Date()
      };
      
      const resource: ResourceIdentifier = {
        type: resourceType,
        id: resourceId
      };
      
      const result = await ResourceAuthorizationMiddleware.authorize(
        resource,
        mockContext
      );
      
      return result.allowed && result.restrictions?.includes('own_');
      
    } catch (error) {
      return false;
    }
  },
  
  /**
   * Bulk authorization check for multiple resources
   */
  async checkBulkAuthorization(
    resources: ResourceIdentifier[],
    context: ResourceAuthContext
  ): Promise<{ [resourceId: string]: ResourceAuthResult }> {
    const results: { [resourceId: string]: ResourceAuthResult } = {};
    
    // Process in parallel for better performance
    await Promise.all(
      resources.map(async (resource) => {
        const result = await ResourceAuthorizationMiddleware.authorize(
          resource,
          context
        );
        results[resource.id] = result;
      })
    );
    
    return results;
  },
  
  /**
   * Extract resource identifier from common URL patterns
   */
  extractResourceFromUrl(url: string, resourceType: ResourceType): ResourceIdentifier | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Look for resource ID in various positions
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        
        // Check if this looks like a resource ID
        if (ResourceAuthorizationMiddleware['isValidUUID'](part) || 
            ResourceAuthorizationMiddleware['isValidInteger'](part)) {
          
          return {
            type: resourceType,
            id: part
          };
        }
      }
      
      return null;
      
    } catch (error) {
      return null;
    }
  }
};