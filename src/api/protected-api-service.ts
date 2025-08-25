/**
 * Protected API Service with Comprehensive IDOR Protection
 * 
 * Demonstrates how to integrate ResourceAuthorizationMiddleware
 * with all API endpoints to prevent Insecure Direct Object Reference vulnerabilities.
 */

import { supabase } from '../lib/supabase';
import { type AuthenticatedUser } from '../middleware/auth-middleware';
import { 
  ResourceAuthorizationMiddleware, 
  type ResourceIdentifier, 
  type ResourceAuthContext,
  type ResourceType 
} from '../middleware/resource-authorization';
import { IDORProtectionUtils, IdValidators, IDORValidationError, IDORAccessDeniedError } from '../utils/idorProtection';
import { auditLogger } from '../middleware/audit-security';

export interface ProtectedAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  auditId?: string;
  metadata?: {
    resourceAuth?: any;
    validationResults?: any;
  };
}

export interface APIRequestContext {
  user: AuthenticatedUser;
  ipAddress: string;
  userAgent: string;
  requestId: string;
  timestamp: Date;
}

/**
 * Protected API Service Class
 * 
 * Provides secure API methods with comprehensive IDOR protection
 * for all resource operations.
 */
export class ProtectedAPIService {
  
  /**
   * Get user profile with IDOR protection
   */
  static async getUserProfile(
    userId: string,
    context: APIRequestContext
  ): Promise<ProtectedAPIResponse> {
    const requestId = crypto.randomUUID();
    
    try {
      // 1. Validate user ID format
      const idValidation = IdValidators.user(userId);
      if (!idValidation.valid) {
        throw new IDORValidationError(
          'Invalid user ID format',
          idValidation,
          'INVALID_USER_ID'
        );
      }
      
      // 2. Create resource identifier
      const resource: ResourceIdentifier = {
        type: 'user',
        id: idValidation.sanitized!
      };
      
      // 3. Check authorization
      const authContext: ResourceAuthContext = {
        user: context.user,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        operation: 'read',
        timestamp: new Date()
      };
      
      const authResult = await ResourceAuthorizationMiddleware.authorize(resource, authContext);
      
      if (!authResult.allowed) {
        throw new IDORAccessDeniedError(
          authResult.reason || 'Access denied',
          'user',
          userId,
          context.user.id
        );
      }
      
      // 4. Fetch user data with appropriate field restrictions
      let selectFields = 'id, email, membership_type, status';
      
      // Add additional fields based on authorization level
      if (authResult.restrictions?.includes('own_profile')) {
        selectFields += ', phone, created_at, updated_at, preferences, notification_settings';
      } else if (authResult.restrictions?.includes('organization_member')) {
        selectFields += ', phone';
      }
      
      const { data: userData, error } = await supabase
        .from('users')
        .select(selectFields)
        .eq('id', resource.id)
        .single();
      
      if (error || !userData) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'get_user_profile',
          resource: 'user',
          resourceId: userId,
          result: 'denied',
          details: {
            reason: 'user_not_found',
            error: error?.message
          }
        });
        
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or access denied'
          },
          auditId: requestId
        };
      }
      
      // 5. Log successful access
      await auditLogger.logAccessEvent({
        userId: context.user.id,
        action: 'get_user_profile',
        resource: 'user',
        resourceId: userId,
        result: 'allowed',
        details: {
          restrictions: authResult.restrictions,
          fieldsReturned: selectFields.split(', ').length
        }
      });
      
      return {
        success: true,
        data: userData,
        auditId: requestId,
        metadata: {
          resourceAuth: authResult
        }
      };
      
    } catch (error) {
      return this.handleAPIError(error, 'get_user_profile', { userId, contextUserId: context.user.id });
    }
  }
  
  /**
   * Update user profile with IDOR protection
   */
  static async updateUserProfile(
    userId: string,
    updates: Record<string, any>,
    context: APIRequestContext
  ): Promise<ProtectedAPIResponse> {
    const requestId = crypto.randomUUID();
    
    try {
      // 1. Validate user ID
      const idValidation = IdValidators.user(userId);
      if (!idValidation.valid) {
        throw new IDORValidationError('Invalid user ID format', idValidation);
      }
      
      // 2. Sanitize and validate updates
      const safeUpdates = IDORProtectionUtils.createSafeQueryParams(updates);
      
      // 3. Create resource identifier
      const resource: ResourceIdentifier = {
        type: 'user',
        id: idValidation.sanitized!
      };
      
      // 4. Check authorization
      const authContext: ResourceAuthContext = {
        user: context.user,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        operation: 'update',
        timestamp: new Date()
      };
      
      const authResult = await ResourceAuthorizationMiddleware.authorize(resource, authContext);
      
      if (!authResult.allowed) {
        throw new IDORAccessDeniedError(
          authResult.reason || 'Update access denied',
          'user',
          userId,
          context.user.id
        );
      }
      
      // 5. Apply field restrictions based on authorization
      let allowedFields = ['email', 'phone', 'preferences', 'notification_settings'];
      
      if (authResult.restrictions?.includes('organization_member')) {
        allowedFields = ['phone']; // Limited fields for org members
      }
      
      const filteredUpdates: Record<string, any> = {};
      for (const [key, value] of Object.entries(safeUpdates)) {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = value;
        }
      }
      
      if (Object.keys(filteredUpdates).length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_VALID_UPDATES',
            message: 'No valid fields to update with current permissions'
          },
          auditId: requestId
        };
      }
      
      // 6. Perform update
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
          ...filteredUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', resource.id)
        .select()
        .single();
      
      if (error) {
        await auditLogger.logSecurityEvent({
          eventType: 'user_update_failed',
          severity: 'medium',
          userId: context.user.id,
          details: {
            targetUserId: userId,
            error: error.message,
            attemptedFields: Object.keys(filteredUpdates)
          }
        });
        
        return {
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update user profile',
            details: error.message
          },
          auditId: requestId
        };
      }
      
      // 7. Log successful update
      await auditLogger.logAccessEvent({
        userId: context.user.id,
        action: 'update_user_profile',
        resource: 'user',
        resourceId: userId,
        result: 'allowed',
        details: {
          updatedFields: Object.keys(filteredUpdates),
          restrictions: authResult.restrictions
        }
      });
      
      return {
        success: true,
        data: updatedUser,
        auditId: requestId,
        metadata: {
          resourceAuth: authResult
        }
      };
      
    } catch (error) {
      return this.handleAPIError(error, 'update_user_profile', { 
        userId, 
        updates: Object.keys(updates),
        contextUserId: context.user.id 
      });
    }
  }
  
  /**
   * Get event details with IDOR protection
   */
  static async getEvent(
    eventId: string,
    context: APIRequestContext
  ): Promise<ProtectedAPIResponse> {
    const requestId = crypto.randomUUID();
    
    try {
      // 1. Validate event ID
      const idValidation = IdValidators.event(eventId);
      if (!idValidation.valid) {
        throw new IDORValidationError('Invalid event ID format', idValidation);
      }
      
      // 2. Create resource identifier
      const resource: ResourceIdentifier = {
        type: 'event',
        id: idValidation.sanitized!
      };
      
      // 3. Check authorization
      const authContext: ResourceAuthContext = {
        user: context.user,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        operation: 'read',
        timestamp: new Date()
      };
      
      const authResult = await ResourceAuthorizationMiddleware.authorize(resource, authContext);
      
      if (!authResult.allowed) {
        throw new IDORAccessDeniedError(
          authResult.reason || 'Event access denied',
          'event',
          eventId,
          context.user.id
        );
      }
      
      // 4. Fetch event with appropriate field restrictions
      let selectFields = 'id, title, description, start_date, end_date, venue_name, city, state, country, is_public';
      
      if (authResult.restrictions?.includes('event_owner') || 
          authResult.restrictions?.includes('organization_event')) {
        selectFields += ', contact_email, contact_phone, registration_fee, max_participants, organizer_id';
      }
      
      const { data: eventData, error } = await supabase
        .from('events')
        .select(selectFields)
        .eq('id', resource.id)
        .single();
      
      if (error || !eventData) {
        return {
          success: false,
          error: {
            code: 'EVENT_NOT_FOUND',
            message: 'Event not found or access denied'
          },
          auditId: requestId
        };
      }
      
      // 5. Log access
      await auditLogger.logAccessEvent({
        userId: context.user.id,
        action: 'get_event',
        resource: 'event',
        resourceId: eventId,
        result: 'allowed',
        details: {
          restrictions: authResult.restrictions
        }
      });
      
      return {
        success: true,
        data: eventData,
        auditId: requestId,
        metadata: {
          resourceAuth: authResult
        }
      };
      
    } catch (error) {
      return this.handleAPIError(error, 'get_event', { eventId, contextUserId: context.user.id });
    }
  }
  
  /**
   * Get payment information with IDOR protection
   */
  static async getPayment(
    paymentId: string,
    context: APIRequestContext
  ): Promise<ProtectedAPIResponse> {
    const requestId = crypto.randomUUID();
    
    try {
      // 1. Validate payment ID
      const idValidation = IdValidators.payment(paymentId);
      if (!idValidation.valid) {
        throw new IDORValidationError('Invalid payment ID format', idValidation);
      }
      
      // 2. Create resource identifier
      const resource: ResourceIdentifier = {
        type: 'payment',
        id: idValidation.sanitized!
      };
      
      // 3. Check authorization
      const authContext: ResourceAuthContext = {
        user: context.user,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        operation: 'read',
        timestamp: new Date()
      };
      
      const authResult = await ResourceAuthorizationMiddleware.authorize(resource, authContext);
      
      if (!authResult.allowed) {
        throw new IDORAccessDeniedError(
          authResult.reason || 'Payment access denied',
          'payment',
          paymentId,
          context.user.id
        );
      }
      
      // 4. Fetch payment with sensitive data protection
      const { data: paymentData, error } = await supabase
        .from('payments')
        .select(`
          id,
          user_id,
          amount,
          currency,
          status,
          payment_method,
          created_at,
          event_id,
          description
        `)
        .eq('id', resource.id)
        .single();
      
      if (error || !paymentData) {
        return {
          success: false,
          error: {
            code: 'PAYMENT_NOT_FOUND',
            message: 'Payment not found or access denied'
          },
          auditId: requestId
        };
      }
      
      // 5. Remove sensitive fields for non-owners
      if (!authResult.restrictions?.includes('own_payment') && 
          context.user.membershipType !== 'admin') {
        delete paymentData.payment_method;
      }
      
      // 6. Log access
      await auditLogger.logAccessEvent({
        userId: context.user.id,
        action: 'get_payment',
        resource: 'payment',
        resourceId: paymentId,
        result: 'allowed',
        details: {
          restrictions: authResult.restrictions,
          amount: paymentData.amount,
          status: paymentData.status
        }
      });
      
      return {
        success: true,
        data: paymentData,
        auditId: requestId,
        metadata: {
          resourceAuth: authResult
        }
      };
      
    } catch (error) {
      return this.handleAPIError(error, 'get_payment', { paymentId, contextUserId: context.user.id });
    }
  }
  
  /**
   * Bulk resource authorization check
   */
  static async checkBulkAuthorization(
    resources: { type: ResourceType; id: string }[],
    context: APIRequestContext,
    operation: 'read' | 'create' | 'update' | 'delete' = 'read'
  ): Promise<ProtectedAPIResponse<{ authorized: string[]; denied: string[] }>> {
    const requestId = crypto.randomUUID();
    
    try {
      // 1. Validate all resource IDs
      const validationResults: Array<{ id: string; valid: boolean; errors?: string[] }> = [];
      
      for (const resource of resources) {
        const validation = IDORProtectionUtils.validateResourceId(resource.id, resource.type);
        validationResults.push({
          id: resource.id,
          valid: validation.valid,
          errors: validation.errors
        });
      }
      
      // 2. Filter out invalid IDs
      const validResources = resources.filter((_, index) => validationResults[index].valid);
      const invalidIds = resources
        .filter((_, index) => !validationResults[index].valid)
        .map(r => r.id);
      
      // 3. Check authorization for valid resources
      const authContext: ResourceAuthContext = {
        user: context.user,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        operation,
        timestamp: new Date()
      };
      
      const authorized: string[] = [];
      const denied: string[] = [...invalidIds];
      
      for (const resource of validResources) {
        const resourceId: ResourceIdentifier = {
          type: resource.type,
          id: resource.id
        };
        
        const authResult = await ResourceAuthorizationMiddleware.authorize(resourceId, authContext);
        
        if (authResult.allowed) {
          authorized.push(resource.id);
        } else {
          denied.push(resource.id);
        }
      }
      
      // 4. Log bulk check results
      await auditLogger.logAccessEvent({
        userId: context.user.id,
        action: 'bulk_authorization_check',
        resource: 'multiple',
        result: 'allowed' as const,
        details: {
          totalRequested: resources.length,
          authorized: authorized.length,
          denied: denied.length,
          operation
        }
      });
      
      return {
        success: true,
        data: {
          authorized,
          denied
        },
        auditId: requestId,
        metadata: {
          validationResults
        }
      };
      
    } catch (error) {
      return this.handleAPIError(error, 'bulk_authorization_check', { 
        resourceCount: resources.length,
        contextUserId: context.user.id 
      });
    }
  }
  
  /**
   * Centralized error handling for API operations
   */
  private static async handleAPIError(
    error: unknown,
    operation: string,
    context: Record<string, any>
  ): Promise<ProtectedAPIResponse> {
    const requestId = crypto.randomUUID();
    
    if (error instanceof IDORValidationError) {
      await auditLogger.logSecurityEvent({
        eventType: 'idor_validation_failure',
        severity: 'medium',
        details: {
          operation,
          context,
          validationErrors: error.details.errors
        }
      });
      
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details.errors
        },
        auditId: requestId
      };
    }
    
    if (error instanceof IDORAccessDeniedError) {
      await auditLogger.logSecurityEvent({
        eventType: 'idor_access_denied',
        severity: 'medium',
        userId: error.userId,
        details: {
          operation,
          resourceType: error.resourceType,
          resourceId: error.resourceId,
          context
        }
      });
      
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message
        },
        auditId: requestId
      };
    }
    
    // Generic error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await auditLogger.logSecurityEvent({
      eventType: 'api_service_error',
      severity: 'high',
      details: {
        operation,
        error: errorMessage,
        context
      }
    });
    
    return {
      success: false,
      error: {
        code: 'API_SERVICE_ERROR',
        message: 'An unexpected error occurred'
      },
      auditId: requestId
    };
  }
  
  /**
   * Create API request context from HTTP request
   */
  static createRequestContext(
    request: Request,
    user: AuthenticatedUser
  ): APIRequestContext {
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      request.headers.get('cf-connecting-ip') || 
                      'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    return {
      user,
      ipAddress,
      userAgent,
      requestId: crypto.randomUUID(),
      timestamp: new Date()
    };
  }
}

/**
 * Convenience wrapper functions for common operations
 */
export const SecureAPI = {
  
  /**
   * Secure user profile operations
   */
  users: {
    get: (userId: string, context: APIRequestContext) => 
      ProtectedAPIService.getUserProfile(userId, context),
    
    update: (userId: string, updates: Record<string, any>, context: APIRequestContext) => 
      ProtectedAPIService.updateUserProfile(userId, updates, context)
  },
  
  /**
   * Secure event operations
   */
  events: {
    get: (eventId: string, context: APIRequestContext) => 
      ProtectedAPIService.getEvent(eventId, context)
  },
  
  /**
   * Secure payment operations
   */
  payments: {
    get: (paymentId: string, context: APIRequestContext) => 
      ProtectedAPIService.getPayment(paymentId, context)
  },
  
  /**
   * Bulk operations
   */
  bulk: {
    checkAuthorization: (
      resources: { type: ResourceType; id: string }[],
      context: APIRequestContext,
      operation?: 'read' | 'create' | 'update' | 'delete'
    ) => ProtectedAPIService.checkBulkAuthorization(resources, context, operation)
  }
};