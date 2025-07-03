import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface UserPermissions {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isLoading: boolean;
  error: string | null;
}

export const usePermissions = (): UserPermissions => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // First, get the user's membership plan and its permissions
      const { data: planData, error: planError } = await supabase
        .from('membership_plans')
        .select('permissions')
        .eq('type', user.membershipType)
        .eq('is_active', true)
        .single();

      if (planError && planError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw planError;
      }

      let userPermissions: string[] = [];

      // If user has a membership plan with specific permissions, use those
      if (planData?.permissions && Array.isArray(planData.permissions)) {
        userPermissions = planData.permissions;
      } else {
        // Fallback: Get permissions based on membership type from role_permissions table
        const { data: rolePermissions, error: roleError } = await supabase
          .from('role_permissions')
          .select('permission')
          .eq('role_name', user.membershipType);

        if (roleError) {
          console.warn('Could not load role permissions:', roleError);
          // Fallback to basic permissions based on membership type
          userPermissions = getDefaultPermissions(user.membershipType);
        } else {
          userPermissions = rolePermissions.map(p => p.permission);
        }
      }

      // Admin users get all permissions
      if (user.membershipType === 'admin') {
        const { data: allPermissions, error: allPermError } = await supabase
          .from('role_permissions')
          .select('permission')
          .eq('role_name', 'admin');

        if (!allPermError && allPermissions) {
          userPermissions = allPermissions.map(p => p.permission);
        }
      }

      setPermissions(userPermissions);
    } catch (err) {
      console.error('Failed to load user permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
      // Fallback to basic permissions
      setPermissions(getDefaultPermissions(user.membershipType));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadUserPermissions();
  }, [loadUserPermissions]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.membershipType === 'admin') return true; // Admin has all permissions
    return permissions.includes(permission);
  }, [user, permissions]);

  const hasAnyPermission = useCallback((permissionList: string[]): boolean => {
    if (!user) return false;
    if (user.membershipType === 'admin') return true;
    return permissionList.some(permission => permissions.includes(permission));
  }, [user, permissions]);

  const hasAllPermissions = useCallback((permissionList: string[]): boolean => {
    if (!user) return false;
    if (user.membershipType === 'admin') return true;
    return permissionList.every(permission => permissions.includes(permission));
  }, [user, permissions]);

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    error
  };
};

// Fallback permissions for when database is not available
const getDefaultPermissions = (membershipType: string): string[] => {
  switch (membershipType) {
    case 'competitor':
      return ['view_events', 'register_events', 'track_scores', 'create_profile', 'join_teams'];
    
    case 'pro_competitor':
      return [
        'view_events', 'register_events', 'track_scores', 'create_profile', 'join_teams',
        'create_team', 'manage_team', 'advanced_analytics', 'priority_registration',
        'custom_showcase', 'export_history'
      ];
    
    case 'retailer':
      return [
        'view_events', 'register_events', 'track_scores', 'create_profile', 'join_teams',
        'create_team', 'manage_team', 'directory_listing', 'create_events',
        'customer_analytics', 'advertising', 'sponsorship_tools', 'ai_ad_creation',
        'priority_support'
      ];
    
    case 'manufacturer':
      return [
        'view_events', 'register_events', 'track_scores', 'create_profile', 'join_teams',
        'create_team', 'manage_team', 'directory_listing', 'create_events',
        'customer_analytics', 'advertising', 'sponsorship_tools', 'ai_ad_creation',
        'api_access', 'priority_support', 'bulk_operations', 'white_label'
      ];
    
    case 'organization':
      return [
        'view_events', 'register_events', 'track_scores', 'create_profile', 'join_teams',
        'create_team', 'manage_team', 'directory_listing', 'create_events',
        'customer_analytics', 'advertising', 'sponsorship_tools', 'ai_ad_creation',
        'member_management', 'judge_management', 'multiple_member_accounts',
        'event_hosting', 'community_building', 'custom_branding', 'api_access',
        'priority_support', 'bulk_operations'
      ];
    
    case 'admin':
      return []; // Admin permissions will be loaded from database
    
    default:
      return ['view_events', 'create_profile'];
  }
};

// Permission checking utility functions for use in components
export const PermissionUtils = {
  /**
   * Check if user can create events
   */
  canCreateEvents: (userPermissions: UserPermissions): boolean => {
    return userPermissions.hasPermission('create_events');
  },

  /**
   * Check if user can manage teams
   */
  canManageTeams: (userPermissions: UserPermissions): boolean => {
    return userPermissions.hasAnyPermission(['create_team', 'manage_team']);
  },

  /**
   * Check if user can create teams
   */
  canCreateTeams: (userPermissions: UserPermissions): boolean => {
    return userPermissions.hasPermission('create_team');
  },

  /**
   * Check if user can access AI ad creation
   */
  canUseAIAdCreation: (userPermissions: UserPermissions): boolean => {
    return userPermissions.hasPermission('ai_ad_creation');
  },

  /**
   * Check if user can manage judges
   */
  canManageJudges: (userPermissions: UserPermissions): boolean => {
    return userPermissions.hasPermission('judge_management');
  },

  /**
   * Check if user can create directory listings
   */
  canCreateDirectoryListings: (userPermissions: UserPermissions): boolean => {
    return userPermissions.hasPermission('directory_listing');
  },

  /**
   * Check if user can access advanced analytics
   */
  canAccessAdvancedAnalytics: (userPermissions: UserPermissions): boolean => {
    return userPermissions.hasPermission('advanced_analytics');
  },

  /**
   * Check if user can manage organization members
   */
  canManageOrganizationMembers: (userPermissions: UserPermissions): boolean => {
    return userPermissions.hasPermission('member_management');
  },

  /**
   * Check if user can use API access
   */
  canUseAPI: (userPermissions: UserPermissions): boolean => {
    return userPermissions.hasPermission('api_access');
  },

  /**
   * Check if user has priority support
   */
  hasPrioritySupport: (userPermissions: UserPermissions): boolean => {
    return userPermissions.hasPermission('priority_support');
  }
}; 