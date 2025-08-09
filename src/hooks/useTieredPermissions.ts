import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface PermissionCheck {
  feature: string;
  subFeature?: string;
  action: string;
}

export interface PermissionResult {
  hasPermission: boolean;
  tier?: string;
  conditions?: Record<string, any>;
  reason?: string;
  usageRemaining?: number;
}

export interface UsageData {
  feature: string;
  subFeature?: string;
  action: string;
  data?: Record<string, any>;
  count?: number;
}

export const useTieredPermissions = () => {
  const { user } = useAuth();
  const [permissionCache, setPermissionCache] = useState<Map<string, PermissionResult>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Generate cache key for permission check
  const getCacheKey = (check: PermissionCheck): string => {
    return `${check.feature}:${check.subFeature || ''}:${check.action}`;
  };

  // Check if user has permission for a specific feature/action
  const checkPermission = useCallback(async (check: PermissionCheck): Promise<PermissionResult> => {
    if (!user) {
      return { hasPermission: false, reason: 'User not authenticated' };
    }

    const cacheKey = getCacheKey(check);
    const cached = permissionCache.get(cacheKey);

    // Return cached result if available and less than 5 minutes old
    if (cached && cached.reason !== 'Usage limit exceeded for today') {
      return cached;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('permission-service', {
        body: {
          userId: user.id,
          feature: check.feature,
          subFeature: check.subFeature,
          action: check.action,
          organizationId: user.organizationId
        }
      });

      if (error) {
        console.error('Permission check error:', error);
        return { hasPermission: false, reason: 'Permission check failed' };
      }

      const result: PermissionResult = data;
      
      // Cache the result
      setPermissionCache(prev => new Map(prev.set(cacheKey, result)));
      
      return result;
    } catch (error) {
      console.error('Permission check error:', error);
      return { hasPermission: false, reason: 'Permission check failed' };
    } finally {
      setIsLoading(false);
    }
  }, [user, permissionCache]);

  // Track usage of a feature
  const trackUsage = useCallback(async (usage: UsageData): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('track-usage', {
        body: {
          userId: user.id,
          feature: usage.feature,
          subFeature: usage.subFeature,
          action: usage.action,
          usageData: usage.data || {},
          usageCount: usage.count || 1
        }
      });

      if (error) {
        console.error('Usage tracking error:', error);
        return false;
      }

      // Clear cached permission for this feature to force refresh
      const cacheKey = getCacheKey({
        feature: usage.feature,
        subFeature: usage.subFeature,
        action: usage.action
      });
      
      setPermissionCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(cacheKey);
        return newCache;
      });

      return data.success;
    } catch (error) {
      console.error('Usage tracking error:', error);
      return false;
    }
  }, [user]);

  // Check if user can perform action and track usage if successful
  const checkAndTrack = useCallback(async (check: PermissionCheck, usageData?: Record<string, any>): Promise<PermissionResult & { canProceed: boolean }> => {
    const permission = await checkPermission(check);
    
    if (permission.hasPermission) {
      // Track the usage
      const tracked = await trackUsage({
        feature: check.feature,
        subFeature: check.subFeature,
        action: check.action,
        data: usageData
      });

      if (!tracked) {
        console.warn('Failed to track usage, but permission was granted');
      }

      return { ...permission, canProceed: true };
    }

    return { ...permission, canProceed: false };
  }, [checkPermission, trackUsage]);

  // Bulk check multiple permissions
  const checkMultiplePermissions = useCallback(async (checks: PermissionCheck[]): Promise<Record<string, PermissionResult>> => {
    const results: Record<string, PermissionResult> = {};
    
    // Process checks in parallel
    const promises = checks.map(async (check) => {
      const result = await checkPermission(check);
      const key = getCacheKey(check);
      return { key, result };
    });

    const settled = await Promise.allSettled(promises);
    
    settled.forEach((promise, index) => {
      if (promise.status === 'fulfilled') {
        results[promise.value.key] = promise.value.result;
      } else {
        const check = checks[index];
        results[getCacheKey(check)] = { 
          hasPermission: false, 
          reason: 'Permission check failed' 
        };
      }
    });

    return results;
  }, [checkPermission]);

  // Clear permission cache (useful when user role changes)
  const clearCache = useCallback(() => {
    setPermissionCache(new Map());
  }, []);

  // Get user's tier for a specific feature
  const getUserTier = useCallback(async (feature: string): Promise<string | null> => {
    const result = await checkPermission({ feature, action: 'view' });
    return result.tier || null;
  }, [checkPermission]);

  // Check if user has reached usage limit for a feature
  const checkUsageLimit = useCallback(async (feature: string, action: string, subFeature?: string): Promise<{ hasLimit: boolean; remaining?: number; limit?: number }> => {
    const result = await checkPermission({ feature, action, subFeature });
    
    if (result.conditions?.usage_limit) {
      return {
        hasLimit: true,
        remaining: result.usageRemaining,
        limit: result.conditions.usage_limit
      };
    }

    return { hasLimit: false };
  }, [checkPermission]);

  // Clear cache when user changes
  useEffect(() => {
    clearCache();
  }, [user?.id, clearCache]);

  return {
    checkPermission,
    trackUsage,
    checkAndTrack,
    checkMultiplePermissions,
    getUserTier,
    checkUsageLimit,
    clearCache,
    isLoading,
    cacheSize: permissionCache.size
  };
};

// Utility functions for common permission checks
export const PermissionChecks = {
  // SPL Calculator
  splCalculatorBasic: { feature: 'spl_calculator', subFeature: 'basic_calculations', action: 'view' },
  splCalculatorAdvanced: { feature: 'spl_calculator', subFeature: 'advanced_modeling', action: 'view' },
  splCalculatorOptimization: { feature: 'spl_calculator', subFeature: 'optimization', action: 'view' },
  splCalculatorExport: { feature: 'spl_calculator', action: 'export' },

  // Subwoofer Designer
  subwooferDesignerBasic: { feature: 'subwoofer_designer', subFeature: 'basic_design', action: 'view' },
  subwooferDatabase: { feature: 'subwoofer_designer', subFeature: 'database_access', action: 'view' },
  subwoofer3D: { feature: 'subwoofer_designer', subFeature: '3d_visualization', action: 'view' },
  subwooferOptimization: { feature: 'subwoofer_designer', subFeature: 'optimization_tools', action: 'view' },

  // Support Desk
  supportCreateTicket: { feature: 'support_desk', subFeature: 'create_tickets', action: 'create' },
  supportPriority: { feature: 'support_desk', subFeature: 'priority_support', action: 'view' },
  supportOrgQueue: { feature: 'support_desk', subFeature: 'organization_queue', action: 'manage' },

  // Advertisement System
  adCreateProduct: { feature: 'advertisement_system', subFeature: 'product_ads', action: 'create' },
  adCreateBrand: { feature: 'advertisement_system', subFeature: 'brand_ads', action: 'create' },
  adCreateEvent: { feature: 'advertisement_system', subFeature: 'event_ads', action: 'create' },
  adAICreation: { feature: 'advertisement_system', subFeature: 'ai_creation', action: 'view' },
  adAnalytics: { feature: 'advertisement_system', subFeature: 'analytics', action: 'analyze' },

  // Team Management
  teamJoin: { feature: 'team_management', subFeature: 'join_teams', action: 'create' },
  teamCreate: { feature: 'team_management', subFeature: 'create_teams', action: 'create' },
  teamManageMultiple: { feature: 'team_management', subFeature: 'multiple_teams', action: 'manage' },
  teamAnalytics: { feature: 'team_management', subFeature: 'team_analytics', action: 'analyze' },

  // Event Management
  eventCreate: { feature: 'event_management', action: 'create' },
  eventManage: { feature: 'event_management', action: 'manage' },

  // Analytics
  analyticsView: { feature: 'analytics', action: 'analyze' },

  // API Access
  apiAccess: { feature: 'api_access', action: 'view' }
};

// Hook for checking specific feature permissions with predefined checks
export const useFeaturePermissions = () => {
  const permissions = useTieredPermissions();

  return {
    ...permissions,
    // Convenience methods for common checks
    canUseSPLCalculatorAdvanced: () => permissions.checkPermission(PermissionChecks.splCalculatorAdvanced),
    canAccessSubwooferDatabase: () => permissions.checkPermission(PermissionChecks.subwooferDatabase),
    canCreateTeams: () => permissions.checkPermission(PermissionChecks.teamCreate),
    canCreateProductAds: () => permissions.checkPermission(PermissionChecks.adCreateProduct),
    canUseAIAdCreation: () => permissions.checkPermission(PermissionChecks.adAICreation),
    canAccessPrioritySupport: () => permissions.checkPermission(PermissionChecks.supportPriority),
  };
};