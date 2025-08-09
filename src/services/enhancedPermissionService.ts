/**
 * Enhanced Permission Service
 * Manages tiered permissions, usage tracking, and feature access
 * Feature flag controlled for safe rollout
 */

import { supabase } from '../lib/supabase';

interface FeatureAccess {
  allowed: boolean;
  reason?: string;
  remainingUsage?: number;
  limit?: number;
  upgradeRequired?: boolean;
}

interface FeatureRegistry {
  feature_name: string;
  feature_category: string;
  tiers: string[];
  actions: string[];
  default_limits: Record<string, any>;
  is_active: boolean;
}

interface UsageTracking {
  feature_name: string;
  action: string;
  usage_count: number;
  usage_date: string;
}

class EnhancedPermissionService {
  private static instance: EnhancedPermissionService;
  private featureFlags: Map<string, boolean> = new Map();
  private featureRegistry: Map<string, FeatureRegistry> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): EnhancedPermissionService {
    if (!EnhancedPermissionService.instance) {
      EnhancedPermissionService.instance = new EnhancedPermissionService();
    }
    return EnhancedPermissionService.instance;
  }

  /**
   * Initialize the service by loading feature flags and registry
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load feature flags
      const { data: flags } = await supabase
        .from('feature_flags')
        .select('feature_name, is_enabled')
        .in('feature_name', [
          'enhanced_permissions',
          'organization_hierarchy',
          'usage_tracking',
          'support_routing_rules'
        ]);

      if (flags) {
        flags.forEach(flag => {
          this.featureFlags.set(flag.feature_name, flag.is_enabled);
        });
      }

      // Only load feature registry if enhanced permissions are enabled
      if (this.isFeatureEnabled('enhanced_permissions')) {
        const { data: features } = await supabase
          .from('feature_registry')
          .select('*')
          .eq('is_active', true);

        if (features) {
          features.forEach(feature => {
            this.featureRegistry.set(feature.feature_name, feature);
          });
        }
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize permission service:', error);
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isFeatureEnabled(featureName: string): boolean {
    return this.featureFlags.get(featureName) || false;
  }

  /**
   * Check if user has access to a feature with usage tracking
   */
  async checkFeatureAccess(
    userId: string,
    featureName: string,
    action: string = 'view',
    membershipType?: string
  ): Promise<FeatureAccess> {
    // If enhanced permissions are disabled, fall back to basic check
    if (!this.isFeatureEnabled('enhanced_permissions')) {
      // Simple permission check based on membership type
      const hasAccess = await this.legacyPermissionCheck(userId, featureName, membershipType);
      return { allowed: hasAccess };
    }

    try {
      // Get feature configuration
      const feature = this.featureRegistry.get(featureName);
      if (!feature) {
        return { allowed: true }; // Allow by default if feature not registered
      }

      // Check if user's tier has access
      const userTier = membershipType || 'public';
      if (!feature.tiers.includes(userTier) && userTier !== 'admin') {
        return {
          allowed: false,
          reason: `${featureName} requires ${feature.tiers.join(' or ')} membership`,
          upgradeRequired: true
        };
      }

      // Check usage limits if tracking is enabled
      if (this.isFeatureEnabled('usage_tracking')) {
        const usageCheck = await this.checkUsageLimits(userId, featureName, action, userTier);
        if (!usageCheck.allowed) {
          return usageCheck;
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking feature access:', error);
      return { allowed: false, reason: 'Error checking permissions' };
    }
  }

  /**
   * Track feature usage
   */
  async trackUsage(
    userId: string,
    featureName: string,
    action: string = 'use',
    metadata?: any
  ): Promise<void> {
    if (!this.isFeatureEnabled('usage_tracking')) return;

    try {
      const { error } = await supabase
        .from('feature_usage_tracking')
        .upsert({
          user_id: userId,
          feature_name: featureName,
          action: action,
          usage_date: new Date().toISOString().split('T')[0],
          metadata: metadata || {},
          usage_count: 1
        }, {
          onConflict: 'user_id,feature_name,action,usage_date',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Failed to track usage:', error);
      }
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  }

  /**
   * Check usage limits for a feature
   */
  private async checkUsageLimits(
    userId: string,
    featureName: string,
    action: string,
    userTier: string
  ): Promise<FeatureAccess> {
    try {
      // Get feature configuration
      const feature = this.featureRegistry.get(featureName);
      if (!feature || !feature.default_limits[userTier]) {
        return { allowed: true }; // No limits defined
      }

      const limit = feature.default_limits[userTier][action];
      if (limit === -1 || limit === undefined) {
        return { allowed: true }; // Unlimited or no limit
      }

      // Get current usage
      const today = new Date().toISOString().split('T')[0];
      const { data: usage } = await supabase
        .from('feature_usage_tracking')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('feature_name', featureName)
        .eq('action', action)
        .eq('usage_date', today)
        .single();

      const currentUsage = usage?.usage_count || 0;
      const remaining = limit - currentUsage;

      if (remaining <= 0) {
        return {
          allowed: false,
          reason: `Daily limit reached (${limit} ${action}s per day)`,
          remainingUsage: 0,
          limit: limit,
          upgradeRequired: true
        };
      }

      return {
        allowed: true,
        remainingUsage: remaining,
        limit: limit
      };
    } catch (error) {
      console.error('Error checking usage limits:', error);
      return { allowed: true }; // Allow on error to not block users
    }
  }

  /**
   * Legacy permission check for backward compatibility
   */
  private async legacyPermissionCheck(
    userId: string,
    featureName: string,
    membershipType?: string
  ): Promise<boolean> {
    // Admin always has access
    if (membershipType === 'admin') return true;

    // Basic feature access by membership type
    const accessMap: Record<string, string[]> = {
      'spl_calculator': ['pro_competitor', 'retailer', 'manufacturer', 'organization', 'admin'],
      'subwoofer_designer': ['pro_competitor', 'retailer', 'manufacturer', 'organization', 'admin'],
      'event_creation': ['organization', 'admin'],
      'advertisement': ['retailer', 'manufacturer', 'organization', 'admin'],
      'support_desk': ['all'] // Everyone can create support tickets
    };

    const allowedTypes = accessMap[featureName];
    if (!allowedTypes) return true; // Allow if not defined

    if (allowedTypes.includes('all')) return true;
    
    return allowedTypes.includes(membershipType || 'free');
  }

  /**
   * Get all registered features
   */
  async getRegisteredFeatures(): Promise<FeatureRegistry[]> {
    if (!this.isFeatureEnabled('enhanced_permissions')) {
      return [];
    }

    return Array.from(this.featureRegistry.values());
  }

  /**
   * Get usage statistics for a user
   */
  async getUserUsageStats(userId: string): Promise<UsageTracking[]> {
    if (!this.isFeatureEnabled('usage_tracking')) {
      return [];
    }

    try {
      const { data } = await supabase
        .from('feature_usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('usage_date', new Date().toISOString().split('T')[0]);

      return data || [];
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      return [];
    }
  }

  /**
   * Configure feature limits (admin only)
   */
  async configureFeatureLimits(
    featureName: string,
    limits: Record<string, any>
  ): Promise<boolean> {
    if (!this.isFeatureEnabled('enhanced_permissions')) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('feature_registry')
        .update({ default_limits: limits })
        .eq('feature_name', featureName);

      if (error) {
        console.error('Failed to update feature limits:', error);
        return false;
      }

      // Update local cache
      const feature = this.featureRegistry.get(featureName);
      if (feature) {
        feature.default_limits = limits;
        this.featureRegistry.set(featureName, feature);
      }

      return true;
    } catch (error) {
      console.error('Error configuring feature limits:', error);
      return false;
    }
  }

  /**
   * Register a new feature dynamically
   */
  async registerFeature(
    featureName: string,
    category: string,
    tiers: string[],
    actions: string[],
    defaultLimits: Record<string, any>
  ): Promise<boolean> {
    if (!this.isFeatureEnabled('enhanced_permissions')) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('feature_registry')
        .insert({
          feature_name: featureName,
          feature_category: category,
          tiers: tiers,
          actions: actions,
          default_limits: defaultLimits,
          auto_discovered: true,
          is_active: true
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('Failed to register feature:', error);
        return false;
      }

      // Reload registry
      await this.initialize();
      return true;
    } catch (error) {
      console.error('Error registering feature:', error);
      return false;
    }
  }
}

// Export singleton instance
export const permissionService = EnhancedPermissionService.getInstance();

// Export types
export type { FeatureAccess, FeatureRegistry, UsageTracking };