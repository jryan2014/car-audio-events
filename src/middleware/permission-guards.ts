/**
 * Permission Guards for Competition Results CRUD Operations
 * 
 * Implements granular access control with ownership validation, admin overrides,
 * and comprehensive audit logging for the Car Audio Events leaderboard system.
 */

import { supabase } from '../lib/supabase';
import { AuthMiddleware, type AuthenticatedUser } from './auth-middleware';
import { auditLogger } from './audit-security';
import { securityValidator } from './security-validation';

export interface CompetitionResult {
  id: string;
  user_id: string;
  event_id?: number;
  category?: string;
  position?: number;
  score?: number;
  notes?: string;
  verified?: boolean;
  verified_by?: string;
  verified_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PermissionContext {
  user: AuthenticatedUser;
  ipAddress: string;
  userAgent: string;
  operation: 'create' | 'read' | 'update' | 'delete';
  resource?: CompetitionResult;
  targetUserId?: string;
}

export interface GuardResult {
  allowed: boolean;
  reason?: string;
  requiresVerification?: boolean;
  restrictions?: string[];
}

/**
 * Competition Results Permission Guard System
 */
export class PermissionGuards {

  /**
   * 🔐 Guard: Can Create Competition Result
   * 
   * Validates that user can create new competition results
   * Checks competitor eligibility, event participation, and rate limits
   */
  static async canCreateResult(
    userId: string,
    competitionId: string,
    context: PermissionContext
  ): Promise<GuardResult> {
    const startTime = Date.now();

    try {
      // 🛡️ SECURITY: Input validation
      const validationResult = await securityValidator.validateCompetitionResultInput({
        competition_id: competitionId,
        user_id: userId
      });

      if (!validationResult.isValid) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'create_result_attempt',
          resource: 'competition_result',
          resourceId: competitionId,
          result: 'denied',
          details: {
            reason: 'input_validation_failed',
            errors: validationResult.errors,
            ipAddress: context.ipAddress
          }
        });

        return {
          allowed: false,
          reason: `Input validation failed: ${validationResult.errors.join(', ')}`
        };
      }

      // 🔑 Admin bypass with full audit trail
      if (context.user.membershipType === 'admin') {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'create_result_admin_bypass',
          resource: 'competition_result',
          resourceId: competitionId,
          result: 'allowed',
          details: {
            targetUserId: userId,
            method: 'admin_override',
            duration: `${Date.now() - startTime}ms`
          }
        });

        return { allowed: true, restrictions: ['admin_created'] };
      }

      // 🏁 Check if user has create_results permission
      const hasPermission = context.user.permissions.includes('create_results') || 
                           context.user.permissions.includes('edit_results');

      if (!hasPermission) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'create_result_attempt',
          resource: 'competition_result',
          resourceId: competitionId,
          result: 'denied',
          details: {
            reason: 'insufficient_permissions',
            userPermissions: context.user.permissions,
            requiredPermission: 'create_results'
          }
        });

        return {
          allowed: false,
          reason: 'Insufficient permissions to create competition results'
        };
      }

      // 🎯 Validate competition exists and user can participate
      const competitionCheck = await this.validateCompetitionAccess(
        competitionId,
        context.user.id,
        'create'
      );

      if (!competitionCheck.allowed) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'create_result_attempt',
          resource: 'competition_result',
          resourceId: competitionId,
          result: 'denied',
          details: {
            reason: 'competition_access_denied',
            competitionCheckReason: competitionCheck.reason
          }
        });

        return competitionCheck;
      }

      // 🚫 Check for duplicate results
      const duplicateCheck = await this.checkDuplicateResult(competitionId, userId);
      if (!duplicateCheck.allowed) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'create_result_attempt',
          resource: 'competition_result',
          resourceId: competitionId,
          result: 'denied',
          details: { reason: 'duplicate_result_prevented' }
        });

        return duplicateCheck;
      }

      // ⏱️ Rate limiting for result creation
      const rateLimitCheck = await this.checkCreationRateLimit(context.user.id, context.ipAddress);
      if (!rateLimitCheck.allowed) {
        return rateLimitCheck;
      }

      // ✅ Permission granted
      await auditLogger.logAccessEvent({
        userId: context.user.id,
        action: 'create_result_granted',
        resource: 'competition_result',
        resourceId: competitionId,
        result: 'allowed',
        details: {
          targetUserId: userId,
          duration: `${Date.now() - startTime}ms`,
          validationsPassed: ['permission', 'competition_access', 'duplicate_check', 'rate_limit']
        }
      });

      return { 
        allowed: true,
        requiresVerification: !['admin', 'organization'].includes(context.user.membershipType)
      };

    } catch (error) {
      await auditLogger.logSecurityEvent({
        eventType: 'create_result_guard_error',
        severity: 'high',
        userId: context.user.id,
        ipAddress: context.ipAddress,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          competitionId,
          targetUserId: userId
        }
      });

      return {
        allowed: false,
        reason: 'Permission validation error'
      };
    }
  }

  /**
   * 👁️ Guard: Can View Competition Result
   * 
   * Validates read access with privacy controls and organization boundaries
   */
  static async canViewResult(
    userId: string,
    resultId: string,
    context: PermissionContext
  ): Promise<GuardResult> {
    try {
      // 🔍 Fetch the result to check ownership and privacy settings
      const { data: result, error } = await supabase
        .from('competition_results')
        .select(`
          id,
          user_id,
          event_id,
          verified,
          verified_by,
          verified_at,
          category,
          placement,
          score,
          notes
        `)
        .eq('id', resultId)
        .single();

      if (error || !result) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'view_result_attempt',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'denied',
          details: { reason: 'result_not_found', error: error?.message }
        });

        return {
          allowed: false,
          reason: 'Competition result not found'
        };
      }

      // 🔑 Admin can view everything
      if (context.user.membershipType === 'admin') {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'view_result_admin',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'allowed',
          details: { method: 'admin_access' }
        });

        return { allowed: true };
      }

      // 👤 Owner can always view their own results
      if (result.user_id === context.user.id) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'view_result_owner',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'allowed',
          details: { method: 'ownership' }
        });

        return { allowed: true };
      }

      // 🏢 Organization members can view organization results
      if (result.organization_id && result.organization_id === context.user.organizationId) {
        const hasOrgPermission = context.user.permissions.includes('view_organization_results') ||
                                context.user.permissions.includes('manage_organization');

        if (hasOrgPermission) {
          await auditLogger.logAccessEvent({
            userId: context.user.id,
            action: 'view_result_organization',
            resource: 'competition_result',
            resourceId: resultId,
            result: 'allowed',
            details: { method: 'organization_access', organizationId: result.organization_id }
          });

          return { allowed: true };
        }
      }

      // 🌐 Public results can be viewed by anyone with view_results permission
      if (result.verified && context.user.permissions.includes('view_results')) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'view_result_public',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'allowed',
          details: { method: 'public_access' }
        });

        return { allowed: true };
      }

      // 🚫 Access denied
      await auditLogger.logAccessEvent({
        userId: context.user.id,
        action: 'view_result_attempt',
        resource: 'competition_result',
        resourceId: resultId,
        result: 'denied',
        details: {
          reason: 'insufficient_access',
          isPublic: result.verified,
          hasViewPermission: context.user.permissions.includes('view_results'),
          organizationMatch: result.organization_id === context.user.organizationId
        }
      });

      return {
        allowed: false,
        reason: 'Insufficient permissions to view this result'
      };

    } catch (error) {
      await auditLogger.logSecurityEvent({
        eventType: 'view_result_guard_error',
        severity: 'medium',
        userId: context.user.id,
        details: { error: error instanceof Error ? error.message : 'Unknown error', resultId }
      });

      return {
        allowed: false,
        reason: 'Permission validation error'
      };
    }
  }

  /**
   * ✏️ Guard: Can Edit Competition Result
   * 
   * Validates edit access with ownership checks, time restrictions, and admin overrides
   */
  static async canEditResult(
    userId: string,
    resultId: string,
    context: PermissionContext
  ): Promise<GuardResult> {
    try {
      // 🔍 Fetch the result with full details
      const { data: result, error } = await supabase
        .from('competition_results')
        .select(`
          id,
          user_id,
          event_id,
          verified,
          verified_by,
          verified_at,
          created_at,
          updated_at,
          category,
          placement,
          score,
          notes
        `)
        .eq('id', resultId)
        .single();

      if (error || !result) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'edit_result_attempt',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'denied',
          details: { reason: 'result_not_found' }
        });

        return {
          allowed: false,
          reason: 'Competition result not found'
        };
      }

      // 🔑 Admin can edit anything (with audit trail)
      if (context.user.membershipType === 'admin') {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'edit_result_admin',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'allowed',
          details: {
            method: 'admin_override',
            originalCreator: result.created_by,
            wasVerified: result.verified
          }
        });

        return { allowed: true, restrictions: ['admin_modified'] };
      }

      // 🏁 Check edit permissions
      const hasEditPermission = context.user.permissions.includes('edit_own_results') ||
                               context.user.permissions.includes('edit_results') ||
                               context.user.permissions.includes('manage_organization');

      if (!hasEditPermission) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'edit_result_attempt',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'denied',
          details: {
            reason: 'insufficient_permissions',
            userPermissions: context.user.permissions,
            requiredPermission: 'edit_own_results'
          }
        });

        return {
          allowed: false,
          reason: 'Insufficient permissions to edit results'
        };
      }

      // 👤 Ownership validation
      const isOwner = result.user_id === context.user.id;
      const canEditOthers = context.user.permissions.includes('edit_results') ||
                            context.user.permissions.includes('manage_organization');

      if (!isOwner && !canEditOthers) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'edit_result_attempt',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'denied',
          details: {
            reason: 'ownership_violation',
            resultOwner: result.user_id
          }
        });

        return {
          allowed: false,
          reason: 'Can only edit your own results'
        };
      }

      // 🏢 Organization boundary check
      if (!isOwner && result.organization_id !== context.user.organizationId) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'edit_result_attempt',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'denied',
          details: {
            reason: 'organization_boundary_violation',
            resultOrganization: result.organization_id,
            userOrganization: context.user.organizationId
          }
        });

        return {
          allowed: false,
          reason: 'Cannot edit results from other organizations'
        };
      }

      // ⏰ Time-based restrictions (results can only be edited for 24 hours after creation)
      const createdAt = new Date(result.created_at);
      const now = new Date();
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCreation > 24 && !canEditOthers) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'edit_result_attempt',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'denied',
          details: {
            reason: 'time_limit_exceeded',
            hoursSinceCreation: Math.round(hoursSinceCreation),
            timeLimit: 24
          }
        });

        return {
          allowed: false,
          reason: 'Results can only be edited within 24 hours of creation'
        };
      }

      // 🔒 Verified results require special permission
      if (result.verified && !context.user.permissions.includes('edit_verified_results')) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'edit_result_attempt',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'denied',
          details: { reason: 'verified_result_protection' }
        });

        return {
          allowed: false,
          reason: 'Cannot edit verified results without special permission'
        };
      }

      // ✅ Edit permission granted
      await auditLogger.logAccessEvent({
        userId: context.user.id,
        action: 'edit_result_granted',
        resource: 'competition_result',
        resourceId: resultId,
        result: 'allowed',
        details: {
          method: isOwner ? 'ownership' : 'organizational_permission',
          timeWindow: `${Math.round(hoursSinceCreation)}h`,
          wasVerified: result.verified
        }
      });

      const restrictions: string[] = [];
      if (result.verified) restrictions.push('verified_edit');
      if (!isOwner) restrictions.push('organizational_edit');

      return {
        allowed: true,
        restrictions: restrictions.length > 0 ? restrictions : undefined,
        requiresVerification: result.verified
      };

    } catch (error) {
      await auditLogger.logSecurityEvent({
        eventType: 'edit_result_guard_error',
        severity: 'high',
        userId: context.user.id,
        details: { error: error instanceof Error ? error.message : 'Unknown error', resultId }
      });

      return {
        allowed: false,
        reason: 'Permission validation error'
      };
    }
  }

  /**
   * 🗑️ Guard: Can Delete Competition Result
   * 
   * Validates delete access with strict ownership and admin controls
   */
  static async canDeleteResult(
    userId: string,
    resultId: string,
    context: PermissionContext
  ): Promise<GuardResult> {
    try {
      // 🔍 Fetch result details
      const { data: result, error } = await supabase
        .from('competition_results')
        .select(`
          id,
          user_id,
          event_id,
          verified,
          verified_by,
          verified_at,
          created_at,
          category,
          placement,
          score,
          notes
        `)
        .eq('id', resultId)
        .single();

      if (error || !result) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'delete_result_attempt',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'denied',
          details: { reason: 'result_not_found' }
        });

        return {
          allowed: false,
          reason: 'Competition result not found'
        };
      }

      // 🔑 Admin can delete with full audit trail
      if (context.user.membershipType === 'admin') {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'delete_result_admin',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'allowed',
          details: {
            method: 'admin_deletion',
            originalCreator: result.created_by,
            wasVerified: result.verified,
            competitionId: result.competition_id
          }
        });

        return { allowed: true, restrictions: ['admin_deletion'] };
      }

      // 🏁 Check delete permissions
      const hasDeletePermission = context.user.permissions.includes('delete_own_results') ||
                                 context.user.permissions.includes('delete_results') ||
                                 context.user.permissions.includes('manage_organization');

      if (!hasDeletePermission) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'delete_result_attempt',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'denied',
          details: {
            reason: 'insufficient_permissions',
            userPermissions: context.user.permissions
          }
        });

        return {
          allowed: false,
          reason: 'Insufficient permissions to delete results'
        };
      }

      // 👤 Strict ownership validation for deletions
      const isOwner = result.user_id === context.user.id;
      const canDeleteOthers = context.user.permissions.includes('delete_results') ||
                             (context.user.permissions.includes('manage_organization') &&
                              result.organization_id === context.user.organizationId);

      if (!isOwner && !canDeleteOthers) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'delete_result_attempt',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'denied',
          details: {
            reason: 'ownership_violation',
            resultOwner: result.user_id
          }
        });

        return {
          allowed: false,
          reason: 'Can only delete your own results'
        };
      }

      // ⏰ Time-based deletion restrictions (stricter than edit)
      const createdAt = new Date(result.created_at);
      const now = new Date();
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCreation > 1 && !canDeleteOthers) { // Only 1 hour for self-deletion
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'delete_result_attempt',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'denied',
          details: {
            reason: 'deletion_time_limit_exceeded',
            hoursSinceCreation: Math.round(hoursSinceCreation * 10) / 10,
            timeLimit: 1
          }
        });

        return {
          allowed: false,
          reason: 'Results can only be deleted within 1 hour of creation'
        };
      }

      // 🔒 Verified results cannot be deleted by regular users
      if (result.verified && !context.user.permissions.includes('delete_verified_results')) {
        await auditLogger.logAccessEvent({
          userId: context.user.id,
          action: 'delete_result_attempt',
          resource: 'competition_result',
          resourceId: resultId,
          result: 'denied',
          details: { reason: 'verified_result_protection' }
        });

        return {
          allowed: false,
          reason: 'Verified results cannot be deleted'
        };
      }

      // ✅ Deletion permission granted
      await auditLogger.logAccessEvent({
        userId: context.user.id,
        action: 'delete_result_granted',
        resource: 'competition_result',
        resourceId: resultId,
        result: 'allowed',
        details: {
          method: isOwner ? 'ownership' : 'organizational_permission',
          timeWindow: `${Math.round(hoursSinceCreation * 10) / 10}h`,
          wasVerified: result.verified
        }
      });

      return {
        allowed: true,
        requiresVerification: true, // Always require confirmation for deletions
        restrictions: isOwner ? [] : ['organizational_deletion']
      };

    } catch (error) {
      await auditLogger.logSecurityEvent({
        eventType: 'delete_result_guard_error',
        severity: 'high',
        userId: context.user.id,
        details: { error: error instanceof Error ? error.message : 'Unknown error', resultId }
      });

      return {
        allowed: false,
        reason: 'Permission validation error'
      };
    }
  }

  // 🛡️ HELPER METHODS

  private static async validateCompetitionAccess(
    competitionId: string,
    userId: string,
    operation: string
  ): Promise<GuardResult> {
    try {
      const { data: competition, error } = await supabase
        .from('competitions')
        .select(`
          id,
          event_id,
          is_active,
          registration_deadline,
          results_deadline,
          organization_id
        `)
        .eq('id', competitionId)
        .single();

      if (error || !competition) {
        return { allowed: false, reason: 'Competition not found' };
      }

      if (!competition.is_active) {
        return { allowed: false, reason: 'Competition is not active' };
      }

      // Check deadlines
      const now = new Date();
      if (operation === 'create' && competition.results_deadline) {
        const deadline = new Date(competition.results_deadline);
        if (now > deadline) {
          return { allowed: false, reason: 'Results submission deadline has passed' };
        }
      }

      return { allowed: true };

    } catch (error) {
      return { allowed: false, reason: 'Competition validation error' };
    }
  }

  private static async checkDuplicateResult(
    competitionId: string,
    userId: string
  ): Promise<GuardResult> {
    try {
      const { data: existing, error } = await supabase
        .from('competition_results')
        .select('id')
        .eq('competition_id', competitionId)
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        return { allowed: false, reason: 'Error checking for duplicates' };
      }

      if (existing && existing.length > 0) {
        return { allowed: false, reason: 'Result already exists for this competition' };
      }

      return { allowed: true };

    } catch (error) {
      return { allowed: false, reason: 'Duplicate check error' };
    }
  }

  private static async checkCreationRateLimit(
    userId: string,
    ipAddress: string
  ): Promise<GuardResult> {
    // Rate limit: 10 results per hour per user
    const rateLimitKey = `create_result_${userId}_${ipAddress}`;
    const rateLimiter = new (await import('./rate-limiting')).RateLimiter({
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
      keyPrefix: 'result_creation'
    });

    const result = await rateLimiter.checkLimit(rateLimitKey);

    if (!result.allowed) {
      await auditLogger.logSecurityEvent({
        eventType: 'result_creation_rate_limited',
        severity: 'medium',
        userId,
        ipAddress,
        details: {
          limit: result.limit,
          retryAfter: result.retryAfter
        }
      });

      return {
        allowed: false,
        reason: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`
      };
    }

    return { allowed: true };
  }
}

/**
 * Convenience wrapper functions for easy integration
 */
export const resultGuards = {
  canCreate: PermissionGuards.canCreateResult,
  canView: PermissionGuards.canViewResult,
  canEdit: PermissionGuards.canEditResult,
  canDelete: PermissionGuards.canDeleteResult
};

/**
 * Express middleware wrapper for result operations
 */
export const createResultGuard = (operation: 'create' | 'read' | 'update' | 'delete') => {
  return async (request: Request, context: any) => {
    const authContext = context.user as AuthenticatedUser;
    const resultId = context.params?.resultId;
    const targetUserId = context.body?.user_id || context.params?.userId;

    if (!authContext) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const permissionContext: PermissionContext = {
      user: authContext,
      ipAddress: context.ipAddress || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      operation,
      targetUserId
    };

    let guardResult: GuardResult;

    switch (operation) {
      case 'create':
        const competitionId = context.body?.competition_id || context.params?.competitionId;
        guardResult = await PermissionGuards.canCreateResult(
          targetUserId || authContext.id,
          competitionId,
          permissionContext
        );
        break;

      case 'read':
        guardResult = await PermissionGuards.canViewResult(
          authContext.id,
          resultId,
          permissionContext
        );
        break;

      case 'update':
        guardResult = await PermissionGuards.canEditResult(
          authContext.id,
          resultId,
          permissionContext
        );
        break;

      case 'delete':
        guardResult = await PermissionGuards.canDeleteResult(
          authContext.id,
          resultId,
          permissionContext
        );
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid operation' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!guardResult.allowed) {
      return new Response(JSON.stringify({ 
        error: guardResult.reason,
        requiresVerification: guardResult.requiresVerification 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add guard result to context for use in handlers
    context.guardResult = guardResult;
    return null; // Continue to next middleware/handler
  };
};