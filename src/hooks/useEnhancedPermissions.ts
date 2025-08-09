/**
 * Enhanced Permissions Hook
 * Integrates with the new tiered permission system while maintaining backward compatibility
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { permissionService, FeatureAccess } from '../services/enhancedPermissionService';

interface UseEnhancedPermissions {
  // Basic permission checks (backward compatible)
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  
  // Enhanced permission checks
  checkFeatureAccess: (feature: string, action?: string) => Promise<FeatureAccess>;
  trackUsage: (feature: string, action?: string) => Promise<void>;
  
  // Usage stats
  getRemainingUsage: (feature: string, action?: string) => Promise<number | null>;
  
  // State
  permissions: string[];
  isLoading: boolean;
  error: string | null;
  isEnhancedMode: boolean;
}

export const useEnhancedPermissions = (): UseEnhancedPermissions => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnhancedMode, setIsEnhancedMode] = useState(false);

  // Initialize permission service and load permissions
  useEffect(() => {
    const initializePermissions = async () => {
      if (!user) {
        setPermissions([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Initialize the permission service
        await permissionService.initialize();
        
        // Check if enhanced mode is enabled
        const enhancedEnabled = permissionService.isFeatureEnabled('enhanced_permissions');
        setIsEnhancedMode(enhancedEnabled);

        if (enhancedEnabled) {
          // Load permissions from feature registry
          const features = await permissionService.getRegisteredFeatures();
          const userPermissions = features
            .filter(f => f.tiers.includes(user.membershipType) || user.membershipType === 'admin')
            .map(f => f.feature_name);
          
          setPermissions(userPermissions);
        } else {
          // Fall back to legacy permission loading
          await loadLegacyPermissions();
        }
      } catch (err) {
        console.error('Failed to initialize permissions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load permissions');
        // Fall back to legacy permissions on error
        await loadLegacyPermissions();
      } finally {
        setIsLoading(false);
      }
    };

    initializePermissions();
  }, [user]);

  // Legacy permission loading (backward compatibility)
  const loadLegacyPermissions = async () => {
    if (!user) return;

    try {
      // Get permissions from membership plan
      const { data: planData } = await supabase
        .from('membership_plans')
        .select('permissions')
        .eq('type', user.membershipType)
        .eq('is_active', true)
        .maybeSingle();

      if (planData?.permissions && Array.isArray(planData.permissions)) {
        setPermissions(planData.permissions);
      } else {
        // Fall back to role permissions
        const { data: rolePermissions } = await supabase
          .from('role_permissions')
          .select('permission')
          .eq('role_name', user.membershipType);

        if (rolePermissions) {
          setPermissions(rolePermissions.map(p => p.permission));
        } else {
          // Use default permissions based on membership type
          setPermissions(getDefaultPermissions(user.membershipType));
        }
      }

      // Admin gets all permissions
      if (user.membershipType === 'admin') {
        const { data: allPermissions } = await supabase
          .from('role_permissions')
          .select('permission');
        
        if (allPermissions) {
          setPermissions(allPermissions.map(p => p.permission));
        }
      }
    } catch (err) {
      console.error('Failed to load legacy permissions:', err);
      setPermissions(getDefaultPermissions(user?.membershipType || 'free'));
    }
  };

  // Get default permissions based on membership type
  const getDefaultPermissions = (membershipType: string): string[] => {
    const defaultPerms: Record<string, string[]> = {
      admin: ['all'],
      organization: [
        'create_events', 'manage_events', 'member_management', 
        'event_hosting', 'community_building', 'custom_branding',
        'advertising', 'sponsorship_tools', 'api_access'
      ],
      manufacturer: [
        'directory_listing', 'customer_analytics', 'advertising',
        'sponsorship_tools', 'api_access', 'bulk_operations'
      ],
      retailer: [
        'directory_listing', 'customer_analytics', 'advertising',
        'sponsorship_tools', 'create_events'
      ],
      pro_competitor: [
        'view_events', 'register_events', 'track_scores', 'create_profile',
        'join_teams', 'create_team', 'manage_team', 'advanced_analytics',
        'priority_registration', 'custom_showcase', 'export_history'
      ],
      competitor: [
        'view_events', 'register_events', 'track_scores', 
        'create_profile', 'join_teams'
      ],
      free: ['view_events', 'create_profile']
    };

    return defaultPerms[membershipType] || defaultPerms.free;
  };

  // Basic permission check (backward compatible)
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.membershipType === 'admin') return true;
    if (permissions.includes('all')) return true;
    return permissions.includes(permission);
  }, [user, permissions]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((perms: string[]): boolean => {
    if (!user) return false;
    if (user.membershipType === 'admin') return true;
    if (permissions.includes('all')) return true;
    return perms.some(p => permissions.includes(p));
  }, [user, permissions]);

  // Check if user has all specified permissions
  const hasAllPermissions = useCallback((perms: string[]): boolean => {
    if (!user) return false;
    if (user.membershipType === 'admin') return true;
    if (permissions.includes('all')) return true;
    return perms.every(p => permissions.includes(p));
  }, [user, permissions]);

  // Enhanced feature access check with usage limits
  const checkFeatureAccess = useCallback(async (
    feature: string,
    action: string = 'view'
  ): Promise<FeatureAccess> => {
    if (!user) {
      return { allowed: false, reason: 'Not authenticated' };
    }

    if (isEnhancedMode) {
      // Use enhanced permission service
      return await permissionService.checkFeatureAccess(
        user.id,
        feature,
        action,
        user.membershipType
      );
    } else {
      // Fall back to basic permission check
      const hasAccess = hasPermission(feature);
      return { allowed: hasAccess };
    }
  }, [user, isEnhancedMode, hasPermission]);

  // Track feature usage
  const trackUsage = useCallback(async (
    feature: string,
    action: string = 'use'
  ): Promise<void> => {
    if (!user || !isEnhancedMode) return;

    await permissionService.trackUsage(user.id, feature, action);
  }, [user, isEnhancedMode]);

  // Get remaining usage for a feature
  const getRemainingUsage = useCallback(async (
    feature: string,
    action: string = 'use'
  ): Promise<number | null> => {
    if (!user || !isEnhancedMode) return null;

    const access = await permissionService.checkFeatureAccess(
      user.id,
      feature,
      action,
      user.membershipType
    );

    return access.remainingUsage ?? null;
  }, [user, isEnhancedMode]);

  return {
    // Basic checks (backward compatible)
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Enhanced checks
    checkFeatureAccess,
    trackUsage,
    getRemainingUsage,
    
    // State
    permissions,
    isLoading,
    error,
    isEnhancedMode
  };
};

// Export utility functions for common permission checks
export const permissionUtils = {
  canCreateEvents: (permissions: UseEnhancedPermissions) => 
    permissions.hasPermission('create_events'),
  
  canManageTeams: (permissions: UseEnhancedPermissions) => 
    permissions.hasPermission('manage_team'),
  
  canUseAIAdCreation: (permissions: UseEnhancedPermissions) => 
    permissions.hasPermission('ai_ad_creation'),
  
  canAccessAdvancedAnalytics: (permissions: UseEnhancedPermissions) => 
    permissions.hasPermission('advanced_analytics'),
  
  canUseSPLCalculator: async (permissions: UseEnhancedPermissions) => {
    const access = await permissions.checkFeatureAccess('spl_calculator', 'calculate');
    return access.allowed;
  },
  
  canUseSubwooferDesigner: async (permissions: UseEnhancedPermissions) => {
    const access = await permissions.checkFeatureAccess('subwoofer_designer', 'design');
    return access.allowed;
  }
};