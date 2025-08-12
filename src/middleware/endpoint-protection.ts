/**
 * Endpoint Protection Middleware
 * 
 * Pre-configured middleware functions for common API endpoints
 * that integrate IDOR protection with existing security systems.
 */

import { 
  createResourceAuthMiddleware,
  ResourceAuthHelpers,
  type ResourceIdentifier,
  type ResourceType
} from './resource-authorization';
import { AuthMiddleware } from './auth-middleware';
import { IDORProtectionUtils, IdValidators } from '../utils/idorProtection';
import { auditLogger } from './audit-security';

/**
 * Extract resource identifier from different URL patterns
 */
export class ResourceExtractors {
  
  /**
   * Extract user ID from URL patterns like:
   * - /api/users/:userId
   * - /api/users/:userId/profile
   * - /api/users/:userId/notifications
   */
  static userFromUrl(request: Request): ResourceIdentifier {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Look for users path segment
    const userIndex = pathParts.findIndex(part => part === 'users');
    if (userIndex >= 0 && userIndex + 1 < pathParts.length) {
      const userId = pathParts[userIndex + 1];
      return {
        type: 'user',
        id: userId
      };
    }
    
    throw new Error('User ID not found in URL path');
  }
  
  /**
   * Extract event ID from URL patterns like:
   * - /api/events/:eventId
   * - /api/events/:eventId/registrations
   * - /api/events/:eventId/results
   */
  static eventFromUrl(request: Request): ResourceIdentifier {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    const eventIndex = pathParts.findIndex(part => part === 'events');
    if (eventIndex >= 0 && eventIndex + 1 < pathParts.length) {
      const eventId = pathParts[eventIndex + 1];
      return {
        type: 'event',
        id: eventId
      };
    }
    
    throw new Error('Event ID not found in URL path');
  }
  
  /**
   * Extract competition result ID from URL patterns
   */
  static competitionResultFromUrl(request: Request): ResourceIdentifier {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    const resultIndex = pathParts.findIndex(part => 
      part === 'results' || part === 'competition-results'
    );
    
    if (resultIndex >= 0 && resultIndex + 1 < pathParts.length) {
      const resultId = pathParts[resultIndex + 1];
      return {
        type: 'competition_result',
        id: resultId
      };
    }
    
    throw new Error('Competition result ID not found in URL path');
  }
  
  /**
   * Extract payment ID from URL patterns
   */
  static paymentFromUrl(request: Request): ResourceIdentifier {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    const paymentIndex = pathParts.findIndex(part => part === 'payments');
    if (paymentIndex >= 0 && paymentIndex + 1 < pathParts.length) {
      const paymentId = pathParts[paymentIndex + 1];
      return {
        type: 'payment',
        id: paymentId
      };
    }
    
    throw new Error('Payment ID not found in URL path');
  }
  
  /**
   * Extract support ticket ID from URL patterns
   */
  static supportTicketFromUrl(request: Request): ResourceIdentifier {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    const ticketIndex = pathParts.findIndex(part => 
      part === 'support' || part === 'tickets' || part === 'support-tickets'
    );
    
    if (ticketIndex >= 0 && ticketIndex + 1 < pathParts.length) {
      const ticketId = pathParts[ticketIndex + 1];
      return {
        type: 'support_ticket',
        id: ticketId
      };
    }
    
    throw new Error('Support ticket ID not found in URL path');
  }
  
  /**
   * Extract organization ID from URL patterns
   */
  static organizationFromUrl(request: Request): ResourceIdentifier {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    const orgIndex = pathParts.findIndex(part => 
      part === 'organizations' || part === 'orgs'
    );
    
    if (orgIndex >= 0 && orgIndex + 1 < pathParts.length) {
      const orgId = pathParts[orgIndex + 1];
      return {
        type: 'organization',
        id: orgId
      };
    }
    
    throw new Error('Organization ID not found in URL path');
  }
  
  /**
   * Extract advertisement ID from URL patterns
   */
  static advertisementFromUrl(request: Request): ResourceIdentifier {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    const adIndex = pathParts.findIndex(part => 
      part === 'advertisements' || part === 'ads'
    );
    
    if (adIndex >= 0 && adIndex + 1 < pathParts.length) {
      const adId = pathParts[adIndex + 1];
      return {
        type: 'advertisement',
        id: adId
      };
    }
    
    throw new Error('Advertisement ID not found in URL path');
  }
  
  /**
   * Generic resource extractor - tries to detect resource type and ID
   */
  static autoDetectFromUrl(request: Request): ResourceIdentifier {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Resource type mapping
    const resourceTypeMap: Record<string, ResourceType> = {
      'users': 'user',
      'events': 'event',
      'results': 'competition_result',
      'competition-results': 'competition_result',
      'payments': 'payment',
      'support': 'support_ticket',
      'tickets': 'support_ticket',
      'support-tickets': 'support_ticket',
      'organizations': 'organization',
      'orgs': 'organization',
      'advertisements': 'advertisement',
      'ads': 'advertisement',
      'campaigns': 'campaign',
      'templates': 'email_template',
      'notifications': 'notification',
      'registrations': 'registration'
    };
    
    // Find resource type and ID
    for (let i = 0; i < pathParts.length - 1; i++) {
      const segment = pathParts[i];
      const resourceType = resourceTypeMap[segment];
      
      if (resourceType) {
        const potentialId = pathParts[i + 1];
        
        // Validate ID format for the resource type
        const validation = IDORProtectionUtils.validateResourceId(potentialId, resourceType);
        
        if (validation.valid && validation.sanitized) {
          return {
            type: resourceType,
            id: validation.sanitized
          };
        }
      }
    }
    
    throw new Error('Could not auto-detect resource from URL');
  }
}

/**
 * Pre-configured middleware functions for common endpoints
 */
export class EndpointProtection {
  
  /**
   * User profile protection middleware
   */
  static userProfile = createResourceAuthMiddleware(ResourceExtractors.userFromUrl);
  
  /**
   * Event protection middleware
   */
  static event = createResourceAuthMiddleware(ResourceExtractors.eventFromUrl);
  
  /**
   * Competition result protection middleware
   */
  static competitionResult = createResourceAuthMiddleware(ResourceExtractors.competitionResultFromUrl);
  
  /**
   * Payment protection middleware
   */
  static payment = createResourceAuthMiddleware(ResourceExtractors.paymentFromUrl);
  
  /**
   * Support ticket protection middleware
   */
  static supportTicket = createResourceAuthMiddleware(ResourceExtractors.supportTicketFromUrl);
  
  /**
   * Organization protection middleware
   */
  static organization = createResourceAuthMiddleware(ResourceExtractors.organizationFromUrl);
  
  /**
   * Advertisement protection middleware
   */
  static advertisement = createResourceAuthMiddleware(ResourceExtractors.advertisementFromUrl);
  
  /**
   * Auto-detecting protection middleware
   */
  static autoDetect = createResourceAuthMiddleware(ResourceExtractors.autoDetectFromUrl);
  
  /**
   * Combined auth + IDOR protection middleware
   */
  static createCombinedMiddleware = (
    resourceExtractor: (req: Request) => ResourceIdentifier,
    options: {
      requireAdmin?: boolean;
      requiredPermission?: string;
      requireCSRF?: boolean;
    } = {}
  ) => {
    return async (request: Request, context: any) => {
      try {
        // 1. First run authentication middleware
        const authMiddleware = createAuthMiddleware({
          adminOnly: options.requireAdmin,
          requiredPermission: options.requiredPermission,
          requireCSRF: options.requireCSRF
        });
        
        const authResult = await authMiddleware(request, context);
        if (authResult) {
          return authResult; // Auth failed, return error response
        }
        
        // 2. Then run resource authorization
        const resourceAuthMiddleware = createResourceAuthMiddleware(resourceExtractor);
        const resourceAuthResult = await resourceAuthMiddleware(request, context);
        
        return resourceAuthResult;
        
      } catch (error) {
        await auditLogger.logSecurityEvent({
          eventType: 'combined_middleware_error',
          severity: 'high',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            url: request.url,
            method: request.method
          }
        });
        
        return new Response(JSON.stringify({
          error: 'Security middleware error',
          code: 'MIDDLEWARE_ERROR'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    };
  };
}

/**
 * Middleware composition utilities
 */
export class MiddlewareComposer {
  
  /**
   * Compose multiple middleware functions
   */
  static compose(...middlewares: Array<(req: Request, ctx: any) => Promise<Response | null>>) {
    return async (request: Request, context: any) => {
      for (const middleware of middlewares) {
        const result = await middleware(request, context);
        if (result) {
          return result; // Middleware returned a response, stop processing
        }
      }
      return null; // All middleware passed
    };
  }
  
  /**
   * Create a middleware stack with common patterns
   */
  static createStack(
    resourceType: ResourceType,
    options: {
      requireAuth?: boolean;
      requireAdmin?: boolean;
      requiredPermission?: string;
      requireCSRF?: boolean;
      customExtractor?: (req: Request) => ResourceIdentifier;
    } = {}
  ) {
    const middlewares: Array<(req: Request, ctx: any) => Promise<Response | null>> = [];
    
    // Add authentication if required
    if (options.requireAuth !== false) {
      const authOptions: any = {};
      if (options.requireAdmin) authOptions.adminOnly = true;
      if (options.requiredPermission) authOptions.requiredPermission = options.requiredPermission;
      if (options.requireCSRF) authOptions.requireCSRF = true;
      
      middlewares.push(createAuthMiddleware(authOptions));
    }
    
    // Add resource authorization
    const extractor = options.customExtractor || this.getDefaultExtractor(resourceType);
    middlewares.push(createResourceAuthMiddleware(extractor));
    
    return this.compose(...middlewares);
  }
  
  /**
   * Get default resource extractor for a resource type
   */
  private static getDefaultExtractor(resourceType: ResourceType): (req: Request) => ResourceIdentifier {
    switch (resourceType) {
      case 'user':
        return ResourceExtractors.userFromUrl;
      case 'event':
        return ResourceExtractors.eventFromUrl;
      case 'competition_result':
        return ResourceExtractors.competitionResultFromUrl;
      case 'payment':
        return ResourceExtractors.paymentFromUrl;
      case 'support_ticket':
        return ResourceExtractors.supportTicketFromUrl;
      case 'organization':
        return ResourceExtractors.organizationFromUrl;
      case 'advertisement':
        return ResourceExtractors.advertisementFromUrl;
      default:
        return ResourceExtractors.autoDetectFromUrl;
    }
  }
}

/**
 * Request validation utilities for common patterns
 */
export class RequestValidation {
  
  /**
   * Validate request body for resource updates
   */
  static validateUpdateRequest(
    body: unknown,
    resourceType: ResourceType,
    allowedFields: string[]
  ): { valid: boolean; sanitized?: Record<string, any>; errors: string[] } {
    const errors: string[] = [];
    
    if (!body || typeof body !== 'object') {
      errors.push('Request body must be a JSON object');
      return { valid: false, errors };
    }
    
    const updateData = body as Record<string, unknown>;
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(updateData)) {
      // Check if field is allowed
      if (!allowedFields.includes(key)) {
        errors.push(`Field '${key}' is not allowed for ${resourceType} updates`);
        continue;
      }
      
      // Basic value validation
      if (value !== null && value !== undefined) {
        // Check for dangerous patterns in string values
        if (typeof value === 'string' && IDORProtectionUtils.containsDangerousPatterns(value)) {
          errors.push(`Field '${key}' contains potentially dangerous patterns`);
          continue;
        }
        
        sanitized[key] = value;
      }
    }
    
    if (Object.keys(sanitized).length === 0) {
      errors.push('No valid fields provided for update');
      return { valid: false, errors };
    }
    
    return {
      valid: errors.length === 0,
      sanitized,
      errors
    };
  }
  
  /**
   * Validate bulk operation request
   */
  static validateBulkRequest(
    body: unknown,
    resourceType: ResourceType,
    maxItems: number = 100
  ): { valid: boolean; sanitized?: { ids: string[]; operation: string; data?: any }; errors: string[] } {
    const errors: string[] = [];
    
    if (!body || typeof body !== 'object') {
      errors.push('Request body must be a JSON object');
      return { valid: false, errors };
    }
    
    const bulkData = body as Record<string, unknown>;
    
    // Validate IDs array
    if (!bulkData.ids || !Array.isArray(bulkData.ids)) {
      errors.push('Bulk request must include an "ids" array');
      return { valid: false, errors };
    }
    
    const idValidation = IDORProtectionUtils.validateIdArray(
      bulkData.ids,
      resourceType,
      maxItems
    );
    
    if (!idValidation.valid) {
      errors.push(...idValidation.errors);
      return { valid: false, errors };
    }
    
    // Validate operation
    const allowedOperations = ['read', 'update', 'delete'];
    if (!bulkData.operation || !allowedOperations.includes(String(bulkData.operation))) {
      errors.push(`Operation must be one of: ${allowedOperations.join(', ')}`);
      return { valid: false, errors };
    }
    
    const sanitized = {
      ids: idValidation.sanitized!.split(','),
      operation: String(bulkData.operation),
      data: bulkData.data
    };
    
    return {
      valid: true,
      sanitized,
      errors: []
    };
  }
}

// Import helper function from auth middleware
function createAuthMiddleware(options: {
  requiredPermission?: string;
  requireCSRF?: boolean;
  adminOnly?: boolean;
} = {}) {
  return async (request: Request, context: any) => {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // Validate CSRF if required
    if (options.requireCSRF && !await AuthMiddleware.validateCSRFToken(request)) {
      return new Response(JSON.stringify({ error: 'CSRF token validation failed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate authentication
    const authResult = await AuthMiddleware.validateToken(token, request);
    
    if (!authResult.success) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      if (authResult.rateLimited && authResult.retryAfter) {
        headers['Retry-After'] = authResult.retryAfter.toString();
        return new Response(JSON.stringify({ error: authResult.error }), {
          status: 429,
          headers
        });
      }

      return new Response(JSON.stringify({ error: authResult.error }), {
        status: 401,
        headers
      });
    }

    // Check admin requirement
    if (options.adminOnly && authResult.user!.membershipType !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check specific permission
    if (options.requiredPermission) {
      const permissionResult = await AuthMiddleware.checkPermission(
        authResult.user!,
        options.requiredPermission
      );

      if (!permissionResult.allowed) {
        return new Response(JSON.stringify({ error: permissionResult.reason }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Add user to context
    context.user = authResult.user;
    context.ipAddress = extractIPAddress(request);
    
    return null; // Continue to next middleware/handler
  };
}

function extractIPAddress(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  
  return 'unknown';
}