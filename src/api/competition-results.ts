/**
 * Competition Results API Layer with Full Security Integration
 * 
 * Centralizes all competition result operations with comprehensive security checks,
 * validation, rate limiting, and audit logging.
 */

import { supabase } from '../lib/supabase';
import { AuthMiddleware, type AuthenticatedUser } from '../middleware/auth-middleware';
import { PermissionGuards, type GuardResult } from '../middleware/permission-guards';
// Security validation is handled by backend Edge Functions
import { RateLimiter, RateLimitConfigs } from '../middleware/rate-limiting';
import { auditLogger } from '../middleware/audit-security';
import { addCSRFHeader, validateCSRFToken } from '../utils/csrfProtection';

// Type definitions
export interface CompetitionResultData {
  id?: string;
  user_id?: string;
  event_id?: number;
  event_attendance_id?: string;
  category: string;
  class?: string;
  division_id?: string;
  class_id?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  score?: number;
  position?: number;
  total_participants?: number;
  points_earned?: number;
  notes?: string;
  is_cae_event?: boolean;
  event_name?: string;
  event_date?: string;
  event_location?: string;
  verified?: boolean;
}

export interface SecureResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  audit_id?: string;
  rateLimitInfo?: {
    remaining: number;
    reset: Date;
  };
}

export interface BulkUpdateData {
  ids: string[];
  updates: Partial<CompetitionResultData>;
  reason?: string;
}

// Rate limiter instances for different operations
const createRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'api_create_result'
});

const updateRateLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'api_update_result'
});

const deleteRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'api_delete_result'
});

const bulkRateLimiter = new RateLimiter(RateLimitConfigs.strict);

/**
 * Competition Results API with Full Security Integration
 */
export class CompetitionResultsAPI {
  
  /**
   * Create a new competition result with full security validation
   */
  static async create(
    data: CompetitionResultData,
    authToken?: string
  ): Promise<SecureResponse> {
    const startTime = Date.now();
    const auditId = crypto.randomUUID();
    
    try {
      // 1. Validate authentication
      const authResult = await this.validateAuth(authToken);
      if (!authResult.success || !authResult.user) {
        return this.errorResponse('AUTH_FAILED', authResult.error || 'Authentication failed', 401);
      }
      
      const user = authResult.user;
      const ipAddress = '127.0.0.1'; // Default to localhost for API calls
      
      // 2. Check rate limits
      const rateLimitKey = `${user.id}_${ipAddress}`;
      const rateLimitResult = await createRateLimiter.checkLimit(rateLimitKey);
      
      if (!rateLimitResult.allowed) {
        await auditLogger.logSecurityEvent({
          eventType: 'api_rate_limit_exceeded',
          severity: 'medium',
          userId: user.id,
          ipAddress,
          details: {
            operation: 'create_result',
            limit: rateLimitResult.limit,
            retryAfter: rateLimitResult.retryAfter
          }
        });
        
        return this.errorResponse(
          'RATE_LIMITED', 
          `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
          429
        );
      }
      
      // 3. Input validation handled by backend stored procedures
      
      // 4. Verify permissions
      const permissionContext = {
        user,
        ipAddress,
        userAgent: 'api-client',
        operation: 'create' as const
      };
      
      const guardResult = await PermissionGuards.canCreateResult(
        data.user_id || user.id,
        '', // No competition_id in our schema
        permissionContext
      );
      
      if (!guardResult.allowed) {
        return this.errorResponse('PERMISSION_DENIED', guardResult.reason || 'Permission denied', 403);
      }
      
      // 5. Prepare data for stored procedure
      const resultData = {
        ...data,
        user_id: data.user_id || user.id,
        // Map division_id and class_id to class field if needed since table uses 'class' not separate columns
        class: data.class_id || data.class || data.division_id,
        // Don't set verified directly - let stored procedure handle based on role
      };
      
      // 6. Call stored procedure
      const { data: result, error } = await supabase.rpc('create_competition_result', {
        data: resultData
      });
      
      if (error) {
        await auditLogger.logSecurityEvent({
          eventType: 'api_create_result_failed',
          severity: 'medium',
          userId: user.id,
          details: {
            error: error.message,
            code: error.code,
            data: resultData
          }
        });
        
        return this.errorResponse(
          'CREATE_FAILED',
          this.getHumanReadableError(error),
          500
        );
      }
      
      // Check if stored procedure returned an error
      if (result && !result.success) {
        await auditLogger.logSecurityEvent({
          eventType: 'api_create_result_failed',
          severity: 'medium',
          userId: user.id,
          details: {
            error: result.error,
            errorCode: result.error_code,
            data: resultData
          }
        });
        
        return this.errorResponse(
          result.error_code || 'CREATE_FAILED',
          result.error || 'Failed to create competition result',
          500
        );
      }
      
      // 7. Log audit event
      await auditLogger.logAccessEvent({
        userId: user.id,
        action: 'create_competition_result',
        resource: 'competition_result',
        resourceId: result?.id,
        result: 'allowed',
        details: {
          eventId: data.event_id,
          duration: `${Date.now() - startTime}ms`,
          requiresVerification: guardResult.requiresVerification
        }
      });
      
      // 8. Return standardized response
      return {
        success: true,
        data: result?.data || result,
        audit_id: auditId,
        rateLimitInfo: {
          remaining: rateLimitResult.remaining,
          reset: new Date(Date.now() + rateLimitResult.retryAfter * 1000)
        }
      };
      
    } catch (error) {
      await auditLogger.logSecurityEvent({
        eventType: 'api_create_result_error',
        severity: 'high',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          duration: `${Date.now() - startTime}ms`
        }
      });
      
      return this.errorResponse(
        'INTERNAL_ERROR',
        'An unexpected error occurred',
        500
      );
    }
  }
  
  /**
   * Update an existing competition result
   */
  static async update(
    id: string,
    updates: Partial<CompetitionResultData>,
    authToken?: string
  ): Promise<SecureResponse> {
    const startTime = Date.now();
    const auditId = crypto.randomUUID();
    
    try {
      // 1. Validate authentication
      const authResult = await this.validateAuth(authToken);
      if (!authResult.success || !authResult.user) {
        return this.errorResponse('AUTH_FAILED', authResult.error || 'Authentication failed', 401);
      }
      
      const user = authResult.user;
      const ipAddress = '127.0.0.1'; // Default to localhost for API calls
      
      // 2. Check rate limits
      const rateLimitKey = `${user.id}_${ipAddress}`;
      const rateLimitResult = await updateRateLimiter.checkLimit(rateLimitKey);
      
      if (!rateLimitResult.allowed) {
        return this.errorResponse(
          'RATE_LIMITED',
          `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
          429
        );
      }
      
      // 3. Validate result ID
      if (!id || typeof id !== 'string') {
        return this.errorResponse('INVALID_ID', 'Invalid result ID', 400);
      }
      
      // 4. Input validation handled by backend stored procedures
      
      // 5. Check edit permissions
      const permissionContext = {
        user,
        ipAddress,
        userAgent: 'api-client',
        operation: 'update' as const
      };
      
      const guardResult = await PermissionGuards.canEditResult(
        user.id,
        id,
        permissionContext
      );
      
      if (!guardResult.allowed) {
        // Provide clear error message for verified results
        if (guardResult.reason?.includes('verified')) {
          return this.errorResponse(
            'VERIFIED_RESULT',
            'Verified results cannot be edited. Contact an admin for changes.',
            403
          );
        }
        return this.errorResponse('PERMISSION_DENIED', guardResult.reason || 'Permission denied', 403);
      }
      
      // 6. Call edge function to handle update (bypasses stored procedure UUID issues)
      const { data: result, error } = await supabase.functions.invoke('update-competition-result', {
        body: {
          id: id, // UUID string is handled correctly by edge function
          updates: updates
        }
      });
      
      if (error) {
        await auditLogger.logSecurityEvent({
          eventType: 'api_update_result_failed',
          severity: 'medium',
          userId: user.id,
          details: {
            resultId: id,
            error: error.message,
            updates: updates
          }
        });
        
        return this.errorResponse(
          'UPDATE_FAILED',
          this.getHumanReadableError(error),
          500
        );
      }
      
      // Check if stored procedure returned an error
      if (result && !result.success) {
        await auditLogger.logSecurityEvent({
          eventType: 'api_update_result_failed',
          severity: 'medium',
          userId: user.id,
          details: {
            resultId: id,
            error: result.error,
            errorCode: result.error_code,
            updates: updates
          }
        });
        
        // Special handling for verified result error
        if (result.error_code === 'PERMISSION_DENIED' && result.error?.includes('verified')) {
          return this.errorResponse(
            'VERIFIED_RESULT',
            'Verified results cannot be edited. Contact an admin for changes.',
            403
          );
        }
        
        return this.errorResponse(
          result.error_code || 'UPDATE_FAILED',
          result.error || 'Failed to update competition result',
          result.error_code === 'NOT_FOUND' ? 404 : 500
        );
      }
      
      // 7. Log audit event
      await auditLogger.logAccessEvent({
        userId: user.id,
        action: 'update_competition_result',
        resource: 'competition_result',
        resourceId: id,
        result: 'allowed',
        details: {
          updates: Object.keys(updates),
          restrictions: guardResult.restrictions,
          duration: `${Date.now() - startTime}ms`
        }
      });
      
      return {
        success: true,
        data: result?.data || result,
        audit_id: auditId,
        rateLimitInfo: {
          remaining: rateLimitResult.remaining,
          reset: new Date(Date.now() + rateLimitResult.retryAfter * 1000)
        }
      };
      
    } catch (error) {
      await auditLogger.logSecurityEvent({
        eventType: 'api_update_result_error',
        severity: 'high',
        details: {
          resultId: id,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: `${Date.now() - startTime}ms`
        }
      });
      
      return this.errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
    }
  }
  
  /**
   * Delete a competition result
   */
  static async delete(
    id: string,
    authToken?: string
  ): Promise<SecureResponse> {
    const startTime = Date.now();
    const auditId = crypto.randomUUID();
    
    try {
      // 1. Validate authentication
      const authResult = await this.validateAuth(authToken);
      if (!authResult.success || !authResult.user) {
        return this.errorResponse('AUTH_FAILED', authResult.error || 'Authentication failed', 401);
      }
      
      const user = authResult.user;
      const ipAddress = '127.0.0.1'; // Default to localhost for API calls
      
      // 2. Check rate limits (stricter for deletes)
      const rateLimitKey = `${user.id}_${ipAddress}`;
      const rateLimitResult = await deleteRateLimiter.checkLimit(rateLimitKey);
      
      if (!rateLimitResult.allowed) {
        return this.errorResponse(
          'RATE_LIMITED',
          `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
          429
        );
      }
      
      // 3. Validate result ID
      if (!id || typeof id !== 'string') {
        return this.errorResponse('INVALID_ID', 'Invalid result ID', 400);
      }
      
      // 4. Check delete permissions
      const permissionContext = {
        user,
        ipAddress,
        userAgent: 'api-client',
        operation: 'delete' as const
      };
      
      const guardResult = await PermissionGuards.canDeleteResult(
        user.id,
        id,
        permissionContext
      );
      
      if (!guardResult.allowed) {
        return this.errorResponse('PERMISSION_DENIED', guardResult.reason || 'Permission denied', 403);
      }
      
      // 5. Call stored procedure with proper type conversion
      let resultId: any = id;
      
      // Convert string UUID to proper type if needed
      if (typeof id === 'string' && id.length > 10) {
        resultId = id;
      } else if (typeof id === 'string') {
        const parsedId = parseInt(id, 10);
        if (!isNaN(parsedId)) {
          resultId = parsedId;
        }
      }
      
      const { data: result, error } = await supabase.rpc('delete_competition_result', {
        id: resultId // Use 'id' parameter name as defined in the function
      });
      
      if (error) {
        await auditLogger.logSecurityEvent({
          eventType: 'api_delete_result_failed',
          severity: 'high',
          userId: user.id,
          details: {
            resultId: id,
            error: error.message
          }
        });
        
        return this.errorResponse(
          'DELETE_FAILED',
          this.getHumanReadableError(error),
          500
        );
      }
      
      // Check if stored procedure returned an error
      if (result && !result.success) {
        await auditLogger.logSecurityEvent({
          eventType: 'api_delete_result_failed',
          severity: 'high',
          userId: user.id,
          details: {
            resultId: id,
            error: result.error,
            errorCode: result.error_code
          }
        });
        
        return this.errorResponse(
          result.error_code || 'DELETE_FAILED',
          result.error || 'Failed to delete competition result',
          result.error_code === 'NOT_FOUND' ? 404 : 500
        );
      }
      
      // 6. Log audit event
      await auditLogger.logAccessEvent({
        userId: user.id,
        action: 'delete_competition_result',
        resource: 'competition_result',
        resourceId: id,
        result: 'allowed',
        details: {
          restrictions: guardResult.restrictions,
          duration: `${Date.now() - startTime}ms`
        }
      });
      
      return {
        success: true,
        data: { deleted: true, id },
        audit_id: auditId,
        rateLimitInfo: {
          remaining: rateLimitResult.remaining,
          reset: new Date(Date.now() + rateLimitResult.retryAfter * 1000)
        }
      };
      
    } catch (error) {
      await auditLogger.logSecurityEvent({
        eventType: 'api_delete_result_error',
        severity: 'high',
        details: {
          resultId: id,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: `${Date.now() - startTime}ms`
        }
      });
      
      return this.errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
    }
  }
  
  /**
   * Bulk update competition results (Admin only)
   */
  static async bulkUpdate(
    data: BulkUpdateData,
    authToken?: string
  ): Promise<SecureResponse> {
    const startTime = Date.now();
    const auditId = crypto.randomUUID();
    let authResult: any = null;
    
    try {
      // 1. Validate authentication
      authResult = await this.validateAuth(authToken);
      if (!authResult.success || !authResult.user) {
        return this.errorResponse('AUTH_FAILED', authResult.error || 'Authentication failed', 401);
      }
      
      const user = authResult.user;
      const ipAddress = '127.0.0.1'; // Default to localhost for API calls
      
      // 2. Admin-only operation
      if (user.membershipType !== 'admin') {
        await auditLogger.logSecurityEvent({
          eventType: 'unauthorized_bulk_update_attempt',
          severity: 'high',
          userId: user.id,
          details: {
            membershipType: user.membershipType,
            attemptedIds: data.ids
          }
        });
        
        return this.errorResponse('ADMIN_REQUIRED', 'Admin access required for bulk operations', 403);
      }
      
      // 3. Check strict rate limits for bulk operations
      const rateLimitKey = `bulk_${user.id}_${ipAddress}`;
      const rateLimitResult = await bulkRateLimiter.checkLimit(rateLimitKey);
      
      if (!rateLimitResult.allowed) {
        return this.errorResponse(
          'RATE_LIMITED',
          `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
          429
        );
      }
      
      // 4. Validate bulk data
      if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
        return this.errorResponse('INVALID_DATA', 'No IDs provided for bulk update', 400);
      }
      
      if (data.ids.length > 100) {
        return this.errorResponse('TOO_MANY_ITEMS', 'Maximum 100 items per bulk operation', 400);
      }
      
      // 5. Input validation handled by backend stored procedures
      
      // 6. Log the bulk operation intent
      await auditLogger.logAccessEvent({
        userId: user.id,
        action: 'bulk_update_attempt',
        resource: 'competition_result',
        resourceId: `bulk_${data.ids.length}`,
        result: 'allowed',
        details: {
          count: data.ids.length,
          updates: Object.keys(data.updates),
          reason: data.reason
        }
      });
      
      // 7. Process bulk update with progress tracking
      const results = {
        success: [] as string[],
        failed: [] as { id: string; error: string }[]
      };
      
      // Process in batches of 10 for better performance
      const batchSize = 10;
      for (let i = 0; i < data.ids.length; i += batchSize) {
        const batch = data.ids.slice(i, i + batchSize);
        
        // Update each result in the batch
        await Promise.all(
          batch.map(async (id) => {
            try {
              const { error } = await supabase.rpc('update_competition_result', {
                result_id: id,
                updates: data.updates
              });
              
              if (error) {
                results.failed.push({ id, error: error.message });
              } else {
                results.success.push(id);
              }
            } catch (err) {
              results.failed.push({ 
                id, 
                error: err instanceof Error ? err.message : 'Unknown error' 
              });
            }
          })
        );
      }
      
      // 8. Log final audit event
      await auditLogger.logAccessEvent({
        userId: user.id,
        action: 'bulk_update_completed',
        resource: 'competition_result',
        resourceId: `bulk_${data.ids.length}`,
        result: 'allowed',
        details: {
          successCount: results.success.length,
          failedCount: results.failed.length,
          duration: `${Date.now() - startTime}ms`,
          reason: data.reason
        }
      });
      
      return {
        success: results.failed.length === 0,
        data: {
          updated: results.success.length,
          failed: results.failed.length,
          details: results
        },
        audit_id: auditId,
        rateLimitInfo: {
          remaining: rateLimitResult.remaining,
          reset: new Date(Date.now() + rateLimitResult.retryAfter * 1000)
        }
      };
      
    } catch (error) {
      await auditLogger.logSecurityEvent({
        eventType: 'api_bulk_update_error',
        severity: 'high',
        userId: authResult?.user?.id,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: `${Date.now() - startTime}ms`
        }
      });
      
      return this.errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
    }
  }
  
  /**
   * Helper: Validate authentication token
   */
  private static async validateAuth(authToken?: string): Promise<{ success: boolean; user?: AuthenticatedUser; error?: string }> {
    if (!authToken) {
      // Try to get token from current session
      const { data: { session } } = await supabase.auth.getSession();
      authToken = session?.access_token;
    }
    
    if (!authToken) {
      return { success: false, error: 'No authentication token provided' };
    }
    
    // Create a mock request object for AuthMiddleware
    const mockRequest = new Request('https://api.example.com', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'User-Agent': 'CompetitionResultsAPI'
      }
    });
    
    const authResult = await AuthMiddleware.validateToken(authToken, mockRequest);
    return authResult;
  }
  
  /**
   * Helper: Create standardized error response
   */
  private static errorResponse(
    code: string,
    message: string,
    status: number,
    details?: any
  ): SecureResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details
      }
    };
  }
  
  /**
   * Helper: Convert database errors to human-readable messages
   */
  private static getHumanReadableError(error: any): string {
    if (!error) return 'An unknown error occurred';
    
    // Common database error patterns
    if (error.message?.includes('duplicate key')) {
      return 'A result already exists for this competition';
    }
    
    if (error.message?.includes('foreign key violation')) {
      return 'Invalid reference to competition, event, or user';
    }
    
    if (error.message?.includes('permission denied')) {
      return 'You do not have permission to perform this action';
    }
    
    if (error.message?.includes('results_deadline')) {
      return 'The submission deadline for this competition has passed';
    }
    
    if (error.message?.includes('verified')) {
      return 'Verified results cannot be modified without admin privileges';
    }
    
    // Default to the original message if no pattern matches
    return error.message || 'An error occurred while processing your request';
  }
}

// Export convenience functions for easy use
export const competitionResultsAPI = {
  create: (data: CompetitionResultData, token?: string) => 
    CompetitionResultsAPI.create(data, token),
  
  update: (id: string, updates: Partial<CompetitionResultData>, token?: string) => 
    CompetitionResultsAPI.update(id, updates, token),
  
  delete: (id: string, token?: string) => 
    CompetitionResultsAPI.delete(id, token),
  
  bulkUpdate: (data: BulkUpdateData, token?: string) => 
    CompetitionResultsAPI.bulkUpdate(data, token)
};