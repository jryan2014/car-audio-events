/**
 * Hierarchical Permission System
 * Handles user permissions with organization hierarchy, employee restrictions, and usage limits
 */

import { supabase } from '../lib/supabase';

export interface PermissionResult {
  granted: boolean;
  reason?: string;
  conditions?: Record<string, any>;
  usageToday?: number;
  tierName?: string;
  organizationRole?: string;
  restrictions?: string[];
}

export interface PermissionRequest {
  featureName: string;
  actionName: string;
  subFeatureName?: string;
  organizationId?: number;
  context?: Record<string, any>;
}

export interface UserPermissionContext {
  userId: string;
  membershipType: string;
  organizationId?: number;
  organizationRole?: string;
  featureRestrictions?: Record<string, any>;
}

class PermissionSystem {
  private permissionCache = new Map<string, { result: PermissionResult; expiry: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if user has permission for a specific action
   */
  async checkPermission(
    userId: string,
    request: PermissionRequest
  ): Promise<PermissionResult> {
    const cacheKey = this.getCacheKey(userId, request);
    const cached = this.permissionCache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }

    try {
      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: userId,
        p_feature_name: request.featureName,
        p_action_name: request.actionName,
        p_sub_feature_name: request.subFeatureName,
        p_organization_id: request.organizationId
      });

      if (error) {
        console.error('Permission check error:', error);
        return { granted: false, reason: 'permission_check_failed' };
      }

      const result: PermissionResult = {
        granted: data.granted,
        reason: data.granted ? undefined : (data.conditions?.restriction_reason || 'permission_denied'),
        conditions: data.conditions,
        usageToday: data.usage_today,
        tierName: data.tier_name,
        organizationRole: data.organization_role
      };

      // Cache successful result
      this.permissionCache.set(cacheKey, {
        result,
        expiry: Date.now() + this.CACHE_TTL
      });

      return result;
    } catch (error) {
      console.error('Permission system error:', error);
      return { granted: false, reason: 'system_error' };
    }
  }

  /**
   * Check multiple permissions at once
   */
  async checkMultiplePermissions(
    userId: string,
    requests: PermissionRequest[]
  ): Promise<Record<string, PermissionResult>> {
    const results: Record<string, PermissionResult> = {};

    // Process in parallel
    const promises = requests.map(async (request) => {
      const key = `${request.featureName}:${request.actionName}${request.subFeatureName ? `:${request.subFeatureName}` : ''}`;
      const result = await this.checkPermission(userId, request);
      return { key, result };
    });

    const resolvedResults = await Promise.all(promises);
    
    resolvedResults.forEach(({ key, result }) => {
      results[key] = result;
    });

    return results;
  }

  /**
   * Log feature usage (must be called after successful action)
   */
  async logUsage(
    userId: string,
    featureName: string,
    actionName: string,
    subFeatureName?: string,
    usageData?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.rpc('log_feature_usage', {
        p_user_id: userId,
        p_feature_name: featureName,
        p_action_name: actionName,
        p_sub_feature_name: subFeatureName,
        p_usage_data: usageData || {}
      });

      // Invalidate cache for this feature/action
      this.invalidateCache(userId, featureName, actionName);
    } catch (error) {
      console.error('Usage logging error:', error);
    }
  }

  /**
   * Get user's current permissions summary
   */
  async getUserPermissionSummary(userId: string): Promise<{
    membershipType: string;
    organizationId?: number;
    organizationRole?: string;
    availableFeatures: Array<{
      featureName: string;
      displayName: string;
      category: string;
      allowedActions: string[];
      usageLimits?: Record<string, number>;
      usageToday?: Record<string, number>;
    }>;
  }> {
    try {
      // Get user context
      const { data: userContext } = await supabase
        .from('users')
        .select(`
          membership_type,
          organization_id,
          organization_employees!inner(
            employee_role,
            feature_restrictions,
            status
          )
        `)
        .eq('id', userId)
        .eq('organization_employees.status', 'active')
        .single();

      // Get available features based on user's tiers
      const { data: features } = await supabase
        .from('features')
        .select(`
          name,
          display_name,
          category,
          tier_feature_permissions!inner(
            action_id,
            conditions,
            permission_actions!inner(name, display_name)
          )
        `)
        .eq('is_active', true);

      const availableFeatures = features?.map(feature => ({
        featureName: feature.name,
        displayName: feature.display_name,
        category: feature.category,
        allowedActions: feature.tier_feature_permissions.map(p => p.permission_actions.name),
        usageLimits: this.extractUsageLimits(feature.tier_feature_permissions),
        usageToday: {} // This would be populated by querying usage tracking
      })) || [];

      return {
        membershipType: userContext.membership_type,
        organizationId: userContext.organization_id,
        organizationRole: userContext.organization_employees?.[0]?.employee_role,
        availableFeatures
      };
    } catch (error) {
      console.error('Error getting user permission summary:', error);
      return {
        membershipType: 'public',
        availableFeatures: []
      };
    }
  }

  /**
   * Check organization seat availability
   */
  async checkSeatAvailability(organizationId: number): Promise<{
    available: boolean;
    seatsUsed: number;
    seatLimit: number;
    canAddEmployee: boolean;
  }> {
    try {
      const { data } = await supabase
        .from('organization_subscriptions')
        .select('seat_limit, seats_used, billing_status')
        .eq('organization_id', organizationId)
        .eq('billing_status', 'active')
        .single();

      if (!data) {
        return { available: false, seatsUsed: 0, seatLimit: 0, canAddEmployee: false };
      }

      return {
        available: data.seats_used < data.seat_limit,
        seatsUsed: data.seats_used,
        seatLimit: data.seat_limit,
        canAddEmployee: data.seats_used < data.seat_limit && data.billing_status === 'active'
      };
    } catch (error) {
      console.error('Error checking seat availability:', error);
      return { available: false, seatsUsed: 0, seatLimit: 0, canAddEmployee: false };
    }
  }

  /**
   * Add employee to organization (with seat management)
   */
  async addOrganizationEmployee(
    organizationId: number,
    userId: string,
    employeeRole: string,
    invitedBy: string,
    featureRestrictions?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check seat availability first
      const seatCheck = await this.checkSeatAvailability(organizationId);
      if (!seatCheck.canAddEmployee) {
        return { success: false, error: 'no_seats_available' };
      }

      const { error } = await supabase
        .from('organization_employees')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          employee_role: employeeRole,
          invited_by: invitedBy,
          feature_restrictions: featureRestrictions,
          status: 'active',
          invitation_accepted_at: new Date().toISOString()
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Clear permission cache for this user
      this.invalidateUserCache(userId);

      return { success: true };
    } catch (error) {
      console.error('Error adding organization employee:', error);
      return { success: false, error: 'system_error' };
    }
  }

  /**
   * Update employee restrictions
   */
  async updateEmployeeRestrictions(
    organizationId: number,
    userId: string,
    restrictions: Record<string, any>,
    updatedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('organization_employees')
        .update({
          feature_restrictions: restrictions,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Clear permission cache for this user
      this.invalidateUserCache(userId);

      return { success: true };
    } catch (error) {
      console.error('Error updating employee restrictions:', error);
      return { success: false, error: 'system_error' };
    }
  }

  /**
   * Get organization employees with their permissions
   */
  async getOrganizationEmployees(organizationId: number): Promise<Array<{
    userId: string;
    email: string;
    name?: string;
    employeeRole: string;
    department?: string;
    jobTitle?: string;
    status: string;
    lastActive?: string;
    featureRestrictions?: Record<string, any>;
    invitationAcceptedAt?: string;
  }>> {
    try {
      const { data } = await supabase
        .from('organization_employees')
        .select(`
          user_id,
          employee_role,
          department,
          job_title,
          status,
          last_active_at,
          feature_restrictions,
          invitation_accepted_at,
          users!inner(
            email,
            name
          )
        `)
        .eq('organization_id', organizationId);

      return data?.map(emp => ({
        userId: emp.user_id,
        email: emp.users.email,
        name: emp.users.name,
        employeeRole: emp.employee_role,
        department: emp.department,
        jobTitle: emp.job_title,
        status: emp.status,
        lastActive: emp.last_active_at,
        featureRestrictions: emp.feature_restrictions,
        invitationAcceptedAt: emp.invitation_accepted_at
      })) || [];
    } catch (error) {
      console.error('Error getting organization employees:', error);
      return [];
    }
  }

  /**
   * Check if user can perform admin actions on organization
   */
  async canManageOrganization(userId: string, organizationId: number): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('organization_employees')
        .select('employee_role')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single();

      return data?.employee_role === 'admin';
    } catch {
      return false;
    }
  }

  // Private helper methods

  private getCacheKey(userId: string, request: PermissionRequest): string {
    return `${userId}:${request.featureName}:${request.actionName}:${request.subFeatureName || ''}:${request.organizationId || ''}`;
  }

  private invalidateCache(userId: string, featureName: string, actionName: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(`${userId}:${featureName}:${actionName}`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.permissionCache.delete(key));
  }

  private invalidateUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.permissionCache.delete(key));
  }

  private extractUsageLimits(permissions: any[]): Record<string, number> {
    const limits: Record<string, number> = {};
    
    permissions.forEach(permission => {
      if (permission.conditions?.usage_limit) {
        limits[permission.permission_actions.name] = permission.conditions.usage_limit;
      }
    });
    
    return limits;
  }
}

// Export singleton instance
export const permissionSystem = new PermissionSystem();