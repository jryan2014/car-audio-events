/**
 * Authentication and Authorization Middleware for Car Audio Events Platform
 * 
 * Implements Role-Based Access Control (RBAC) with zero-trust security principles
 * and defense-in-depth protection for competition_results CRUD operations.
 */

import { supabase } from '../lib/supabase';
import { RateLimiter, RateLimitConfigs, createRateLimitHeaders } from './rate-limiting';
import { auditLogger } from './audit-security';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { addCSRFHeader, validateCSRFToken } from '../utils/csrfProtection';

export interface AuthenticatedUser {
  id: string;
  email: string;
  membershipType: 'competitor' | 'pro_competitor' | 'retailer' | 'manufacturer' | 'organization' | 'admin';
  role?: string;
  organizationId?: number;
  status: string;
  verificationStatus: string;
  permissions: string[];
}

export interface AuthContext {
  user: AuthenticatedUser;
  session: Session;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  rateLimited?: boolean;
  retryAfter?: number;
}

/**
 * JWT Token Validation and User Role Extraction
 */
export class AuthMiddleware {
  private static adminRateLimiter = new RateLimiter(RateLimitConfigs.strict);
  private static generalRateLimiter = new RateLimiter(RateLimitConfigs.api);

  /**
   * Validates JWT token and extracts user information with comprehensive security checks
   */
  static async validateToken(
    token: string | null,
    request: Request
  ): Promise<AuthResult> {
    const startTime = Date.now();
    const ipAddress = this.extractIPAddress(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
      // 🛡️ SECURITY: Rate limiting check first
      const rateLimitKey = `auth_${ipAddress}`;
      const rateLimitResult = await this.generalRateLimiter.checkLimit(rateLimitKey);
      
      if (!rateLimitResult.allowed) {
        await auditLogger.logSecurityEvent({
          eventType: 'rate_limit_exceeded',
          severity: 'medium',
          ipAddress,
          userAgent,
          details: {
            endpoint: 'auth_validation',
            limit: rateLimitResult.limit,
            retryAfter: rateLimitResult.retryAfter
          }
        });

        return {
          success: false,
          error: 'Rate limit exceeded',
          rateLimited: true,
          retryAfter: rateLimitResult.retryAfter
        };
      }

      // 🛡️ SECURITY: Token presence validation
      if (!token) {
        await auditLogger.logSecurityEvent({
          eventType: 'missing_auth_token',
          severity: 'low',
          ipAddress,
          userAgent,
          details: { endpoint: 'auth_validation' }
        });

        return {
          success: false,
          error: 'Authentication token required'
        };
      }

      // 🛡️ SECURITY: Token format validation
      if (!this.validateTokenFormat(token)) {
        await auditLogger.logSecurityEvent({
          eventType: 'invalid_token_format',
          severity: 'medium',
          ipAddress,
          userAgent,
          details: { tokenLength: token.length }
        });

        return {
          success: false,
          error: 'Invalid token format'
        };
      }

      // 🔐 JWT Validation with Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        await auditLogger.logSecurityEvent({
          eventType: 'invalid_jwt_token',
          severity: 'medium',
          ipAddress,
          userAgent,
          details: { 
            error: authError?.message,
            tokenExpired: authError?.message?.includes('expired')
          }
        });

        return {
          success: false,
          error: 'Invalid or expired token'
        };
      }

      // 🔍 Fetch user profile with security validation
      const userProfile = await this.fetchUserProfile(user.id, ipAddress, userAgent);
      
      if (!userProfile) {
        await auditLogger.logSecurityEvent({
          eventType: 'user_profile_not_found',
          severity: 'high',
          userId: user.id,
          ipAddress,
          userAgent,
          details: { supabaseUserId: user.id }
        });

        return {
          success: false,
          error: 'User profile not found'
        };
      }

      // 🛡️ SECURITY: Account status validation
      const statusCheck = this.validateAccountStatus(userProfile);
      if (!statusCheck.valid) {
        await auditLogger.logSecurityEvent({
          eventType: 'account_status_blocked',
          severity: 'medium',
          userId: userProfile.id,
          ipAddress,
          userAgent,
          details: { 
            status: userProfile.status,
            verificationStatus: userProfile.verificationStatus,
            reason: statusCheck.reason
          }
        });

        return {
          success: false,
          error: statusCheck.reason
        };
      }

      // ✅ Successful authentication
      const duration = Date.now() - startTime;
      await auditLogger.logSecurityEvent({
        eventType: 'successful_authentication',
        severity: 'info',
        userId: userProfile.id,
        ipAddress,
        userAgent,
        details: {
          membershipType: userProfile.membershipType,
          duration: `${duration}ms`,
          permissionCount: userProfile.permissions.length
        }
      });

      return {
        success: true,
        user: userProfile
      };

    } catch (error) {
      await auditLogger.logSecurityEvent({
        eventType: 'auth_middleware_error',
        severity: 'high',
        ipAddress,
        userAgent,
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: `${Date.now() - startTime}ms`
        }
      });

      return {
        success: false,
        error: 'Authentication service error'
      };
    }
  }

  /**
   * Role-Based Access Control (RBAC) Implementation
   */
  static async checkPermission(
    user: AuthenticatedUser,
    requiredPermission: string,
    resource?: { type: string; id: string; ownerId?: string }
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // 🔑 Admin bypass (with audit logging)
      if (user.membershipType === 'admin') {
        await auditLogger.logAccessEvent({
          userId: user.id,
          action: 'permission_check',
          resource: resource?.type || 'unknown',
          resourceId: resource?.id,
          result: 'allowed',
          details: { permission: requiredPermission, method: 'admin_bypass' }
        });

        return { allowed: true };
      }

      // 🛡️ SECURITY: Check if user has the required permission
      if (!user.permissions.includes(requiredPermission)) {
        await auditLogger.logAccessEvent({
          userId: user.id,
          action: 'permission_check',
          resource: resource?.type || 'unknown',
          resourceId: resource?.id,
          result: 'denied',
          details: { 
            permission: requiredPermission,
            userPermissions: user.permissions,
            reason: 'permission_not_granted'
          }
        });

        return { 
          allowed: false, 
          reason: `Permission '${requiredPermission}' not granted for role '${user.membershipType}'`
        };
      }

      // 🔐 Resource ownership validation (if applicable)
      if (resource?.ownerId && resource.ownerId !== user.id) {
        // Check if user has permission to access other users' resources
        const canAccessOthers = user.permissions.includes('admin_access') || 
                               user.permissions.includes('manage_all_resources');
        
        if (!canAccessOthers) {
          await auditLogger.logAccessEvent({
            userId: user.id,
            action: 'permission_check',
            resource: resource.type,
            resourceId: resource.id,
            result: 'denied',
            details: { 
              permission: requiredPermission,
              reason: 'resource_ownership_violation',
              resourceOwnerId: resource.ownerId
            }
          });

          return { 
            allowed: false, 
            reason: 'Access denied: insufficient privileges for this resource'
          };
        }
      }

      // ✅ Permission granted
      await auditLogger.logAccessEvent({
        userId: user.id,
        action: 'permission_check',
        resource: resource?.type || 'unknown',
        resourceId: resource?.id,
        result: 'allowed',
        details: { permission: requiredPermission }
      });

      return { allowed: true };

    } catch (error) {
      await auditLogger.logSecurityEvent({
        eventType: 'permission_check_error',
        severity: 'high',
        userId: user.id,
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          permission: requiredPermission,
          resource: resource?.type
        }
      });

      return { 
        allowed: false, 
        reason: 'Permission validation error'
      };
    }
  }

  /**
   * Admin operation rate limiting with enhanced security
   */
  static async checkAdminRateLimit(
    userId: string,
    ipAddress: string,
    operation: string
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const rateLimitKey = `admin_${operation}_${userId}_${ipAddress}`;
    const result = await this.adminRateLimiter.checkLimit(rateLimitKey);

    if (!result.allowed) {
      await auditLogger.logSecurityEvent({
        eventType: 'admin_rate_limit_exceeded',
        severity: 'high',
        userId,
        ipAddress,
        details: {
          operation,
          limit: result.limit,
          retryAfter: result.retryAfter
        }
      });
    }

    return {
      allowed: result.allowed,
      retryAfter: result.retryAfter
    };
  }

  /**
   * CSRF Protection Integration
   */
  static async validateCSRFToken(request: Request): Promise<boolean> {
    const csrfToken = request.headers.get('X-CSRF-Token');
    return validateCSRFToken(csrfToken);
  }

  /**
   * Enhanced session validation with security checks
   */
  static async validateSession(
    sessionToken: string,
    request: Request
  ): Promise<AuthContext | null> {
    const ipAddress = this.extractIPAddress(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        await auditLogger.logSecurityEvent({
          eventType: 'invalid_session',
          severity: 'medium',
          ipAddress,
          userAgent,
          details: { error: error?.message }
        });
        return null;
      }

      const authResult = await this.validateToken(session.access_token, request);
      if (!authResult.success || !authResult.user) {
        return null;
      }

      return {
        user: authResult.user,
        session,
        ipAddress,
        userAgent,
        timestamp: new Date()
      };

    } catch (error) {
      await auditLogger.logSecurityEvent({
        eventType: 'session_validation_error',
        severity: 'high',
        ipAddress,
        userAgent,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      return null;
    }
  }

  // 🛡️ SECURITY HELPER METHODS

  private static validateTokenFormat(token: string): boolean {
    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Basic length validation to prevent extremely short/long tokens
    if (token.length < 100 || token.length > 2000) return false;

    // Check for basic JWT structure
    return parts.every(part => part.length > 0 && /^[A-Za-z0-9_-]+$/.test(part));
  }

  private static validateAccountStatus(user: AuthenticatedUser): { valid: boolean; reason?: string } {
    // Suspended or banned accounts
    if (['suspended', 'banned', 'deleted'].includes(user.status)) {
      return { valid: false, reason: `Account ${user.status}` };
    }

    // Email verification required (except for admins)
    if (user.verificationStatus === 'pending' && user.membershipType !== 'admin') {
      return { valid: false, reason: 'Email verification required' };
    }

    // Business accounts awaiting manual approval can access with limited features
    if (user.status === 'pending' && 
        ['retailer', 'manufacturer', 'organization'].includes(user.membershipType)) {
      // Allow access but log for monitoring
      auditLogger.logSecurityEvent({
        eventType: 'pending_account_access',
        severity: 'info',
        userId: user.id,
        details: { membershipType: user.membershipType }
      });
    }

    return { valid: true };
  }

  private static async fetchUserProfile(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<AuthenticatedUser | null> {
    try {
      // Fetch user profile with permissions
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          membership_type,
          role,
          organization_id,
          status,
          verification_status
        `)
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        return null;
      }

      // Fetch user permissions based on membership type
      const permissions = await this.fetchUserPermissions(userData.membership_type);

      return {
        id: userData.id,
        email: userData.email,
        membershipType: userData.membership_type,
        role: userData.role,
        organizationId: userData.organization_id,
        status: userData.status || 'active',
        verificationStatus: userData.verification_status || 'verified',
        permissions
      };

    } catch (error) {
      await auditLogger.logSecurityEvent({
        eventType: 'user_profile_fetch_error',
        severity: 'high',
        userId,
        ipAddress,
        userAgent,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      return null;
    }
  }

  private static async fetchUserPermissions(membershipType: string): Promise<string[]> {
    try {
      // Admin gets all permissions
      if (membershipType === 'admin') {
        const { data: adminPerms } = await supabase
          .from('role_permissions')
          .select('permission')
          .eq('role_name', 'admin');
        
        return adminPerms?.map(p => p.permission) || this.getDefaultPermissions(membershipType);
      }

      // Get permissions from role_permissions table
      const { data: permissions } = await supabase
        .from('role_permissions')
        .select('permission')
        .eq('role_name', membershipType);

      if (permissions && permissions.length > 0) {
        return permissions.map(p => p.permission);
      }

      // Fallback to default permissions
      return this.getDefaultPermissions(membershipType);

    } catch (error) {
      // Fallback to default permissions on error
      return this.getDefaultPermissions(membershipType);
    }
  }

  private static getDefaultPermissions(membershipType: string): string[] {
    const permissionMap: Record<string, string[]> = {
      competitor: ['view_events', 'register_events', 'view_results', 'create_results'],
      pro_competitor: ['view_events', 'register_events', 'view_results', 'create_results', 'edit_own_results'],
      retailer: ['view_events', 'register_events', 'view_results', 'create_results', 'edit_own_results', 'create_events'],
      manufacturer: ['view_events', 'register_events', 'view_results', 'create_results', 'edit_own_results', 'create_events'],
      organization: ['view_events', 'register_events', 'view_results', 'create_results', 'edit_own_results', 'create_events', 'manage_organization'],
      admin: ['*'] // All permissions
    };

    return permissionMap[membershipType] || ['view_events'];
  }

  private static extractIPAddress(request: Request): string {
    // Extract IP from various headers (considering proxies and load balancers)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwardedFor) return forwardedFor.split(',')[0].trim();
    
    return 'unknown';
  }
}

/**
 * Middleware wrapper for Express-style applications
 */
export const createAuthMiddleware = (options: {
  requiredPermission?: string;
  requireCSRF?: boolean;
  adminOnly?: boolean;
} = {}) => {
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
    context.ipAddress = AuthMiddleware['extractIPAddress'](request);
    
    return null; // Continue to next middleware/handler
  };
};