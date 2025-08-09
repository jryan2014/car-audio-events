/**
 * Dynamic Feature Registration System
 * Automatically detects and registers new features for permission assignment
 */

import { supabase } from './supabase';

export interface FeatureDefinition {
  name: string;
  displayName: string;
  description?: string;
  category: string;
  modulePath?: string;
  apiEndpoints?: string[];
  subFeatures?: SubFeatureDefinition[];
  defaultPermissions?: {
    tierName: string;
    actions: string[];
    conditions?: Record<string, any>;
  }[];
}

export interface SubFeatureDefinition {
  name: string;
  displayName: string;
  description?: string;
  codeLocation?: string;
  defaultPermissions?: {
    tierName: string;
    actions: string[];
    conditions?: Record<string, any>;
  }[];
}

class DynamicFeatureRegistry {
  private detectedFeatures = new Map<string, FeatureDefinition>();
  private registrationQueue: FeatureDefinition[] = [];

  /**
   * Register a feature for auto-detection
   * Call this in component mount or function initialization
   */
  async registerFeature(definition: FeatureDefinition): Promise<void> {
    try {
      // Check if feature already exists
      const { data: existingFeature } = await supabase
        .from('features')
        .select('id, name')
        .eq('name', definition.name)
        .single();

      if (existingFeature) {
        // Update existing feature metadata
        await this.updateFeatureMetadata(definition);
      } else {
        // Register new feature
        await this.createNewFeature(definition);
      }
    } catch (error) {
      console.error('Error registering feature:', error);
      // Queue for retry
      this.registrationQueue.push(definition);
    }
  }

  /**
   * Auto-detect features from code scanning
   */
  async scanForFeatures(): Promise<FeatureDefinition[]> {
    const detectedFeatures: FeatureDefinition[] = [];

    try {
      // Scan React components for permission checks
      const componentFeatures = await this.scanReactComponents();
      detectedFeatures.push(...componentFeatures);

      // Scan API routes for endpoints
      const apiFeatures = await this.scanApiEndpoints();
      detectedFeatures.push(...apiFeatures);

      // Scan for custom hooks that check permissions
      const hookFeatures = await this.scanCustomHooks();
      detectedFeatures.push(...hookFeatures);

    } catch (error) {
      console.error('Error scanning for features:', error);
    }

    return detectedFeatures;
  }

  /**
   * Create new feature with default permissions
   */
  private async createNewFeature(definition: FeatureDefinition): Promise<void> {
    const { data, error } = await supabase.rpc('register_dynamic_feature', {
      p_feature_name: definition.name,
      p_display_name: definition.displayName,
      p_category: definition.category,
      p_description: definition.description,
      p_module_path: definition.modulePath,
      p_detection_method: 'runtime_discovery'
    });

    if (error) {
      throw error;
    }

    const featureId = data;

    // Register sub-features
    if (definition.subFeatures) {
      for (const subFeature of definition.subFeatures) {
        await this.registerSubFeature(featureId, subFeature);
      }
    }

    // Set up custom permissions if specified
    if (definition.defaultPermissions) {
      await this.assignDefaultPermissions(featureId, definition.defaultPermissions);
    }

    console.log(`✅ Registered new feature: ${definition.name}`);
  }

  /**
   * Update existing feature metadata
   */
  private async updateFeatureMetadata(definition: FeatureDefinition): Promise<void> {
    const { error } = await supabase
      .from('features')
      .update({
        display_name: definition.displayName,
        description: definition.description,
        feature_module: definition.modulePath,
        api_endpoints: definition.apiEndpoints,
        updated_at: new Date().toISOString()
      })
      .eq('name', definition.name);

    if (error) {
      throw error;
    }
  }

  /**
   * Register sub-feature
   */
  private async registerSubFeature(featureId: string, subFeature: SubFeatureDefinition): Promise<void> {
    const { error } = await supabase
      .from('sub_features')
      .insert({
        feature_id: featureId,
        name: subFeature.name,
        display_name: subFeature.displayName,
        description: subFeature.description,
        code_location: subFeature.codeLocation,
        detection_method: 'runtime_discovery',
        auto_detected_at: new Date().toISOString()
      });

    if (error && !error.message.includes('duplicate')) {
      throw error;
    }
  }

  /**
   * Assign default permissions for new feature
   */
  private async assignDefaultPermissions(featureId: string, permissions: FeatureDefinition['defaultPermissions']): Promise<void> {
    if (!permissions) return;

    for (const permission of permissions) {
      const { data: tier } = await supabase
        .from('permission_tiers')
        .select('id')
        .eq('name', permission.tierName)
        .single();

      if (!tier) continue;

      for (const actionName of permission.actions) {
        const { data: action } = await supabase
          .from('permission_actions')
          .select('id')
          .eq('name', actionName)
          .single();

        if (!action) continue;

        await supabase
          .from('tier_feature_permissions')
          .insert({
            tier_id: tier.id,
            feature_id: featureId,
            action_id: action.id,
            conditions: permission.conditions || null
          });
      }
    }
  }

  /**
   * Scan React components for permission usage
   */
  private async scanReactComponents(): Promise<FeatureDefinition[]> {
    // This would be implemented as a build-time script
    // For runtime, we can detect based on component registration
    const features: FeatureDefinition[] = [];

    // Check for components that use permission hooks
    if (typeof window !== 'undefined' && (window as any).__FEATURE_REGISTRY__) {
      const registry = (window as any).__FEATURE_REGISTRY__;
      for (const [name, definition] of Object.entries(registry)) {
        features.push(definition as FeatureDefinition);
      }
    }

    return features;
  }

  /**
   * Scan API endpoints for feature detection
   */
  private async scanApiEndpoints(): Promise<FeatureDefinition[]> {
    const features: FeatureDefinition[] = [];

    try {
      // Get list of registered API routes from build manifest or runtime detection
      const apiRoutes = await this.getApiRoutes();
      
      for (const route of apiRoutes) {
        const featureName = this.extractFeatureFromRoute(route);
        if (featureName) {
          features.push({
            name: featureName,
            displayName: this.humanizeFeatureName(featureName),
            category: 'api',
            apiEndpoints: [route],
            modulePath: route
          });
        }
      }
    } catch (error) {
      console.warn('Could not scan API endpoints:', error);
    }

    return features;
  }

  /**
   * Scan custom hooks for permission checks
   */
  private async scanCustomHooks(): Promise<FeatureDefinition[]> {
    const features: FeatureDefinition[] = [];

    // This would detect hooks like usePermission, useFeatureAccess, etc.
    // Implementation depends on build system integration

    return features;
  }

  /**
   * Get API routes (implementation depends on framework)
   */
  private async getApiRoutes(): Promise<string[]> {
    // This would be implemented based on your API structure
    // Could read from route manifest, OpenAPI spec, etc.
    return [];
  }

  /**
   * Extract feature name from API route
   */
  private extractFeatureFromRoute(route: string): string | null {
    const match = route.match(/\/api\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Convert snake_case to human readable
   */
  private humanizeFeatureName(name: string): string {
    return name
      .replace(/[_-]/g, ' ')
      .replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
  }

  /**
   * Process queued registrations
   */
  async processQueue(): Promise<void> {
    const queue = [...this.registrationQueue];
    this.registrationQueue = [];

    for (const definition of queue) {
      try {
        await this.registerFeature(definition);
      } catch (error) {
        console.error(`Failed to process queued feature ${definition.name}:`, error);
        // Re-queue on failure
        this.registrationQueue.push(definition);
      }
    }
  }
}

// Export singleton instance
export const featureRegistry = new DynamicFeatureRegistry();

/**
 * Decorator for automatic feature registration
 */
export function RegisterFeature(definition: FeatureDefinition) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    // Register feature when class is instantiated
    featureRegistry.registerFeature(definition);
    return constructor;
  };
}

/**
 * Hook for components to register features
 */
export function useFeatureRegistration(definition: FeatureDefinition) {
  React.useEffect(() => {
    featureRegistry.registerFeature(definition);
  }, []);
}

/**
 * Build-time feature scanning utility
 */
export async function generateFeatureManifest(): Promise<FeatureDefinition[]> {
  const registry = new DynamicFeatureRegistry();
  return await registry.scanForFeatures();
}

// Global registry for runtime detection
if (typeof window !== 'undefined') {
  (window as any).__FEATURE_REGISTRY__ = (window as any).__FEATURE_REGISTRY__ || new Map();
}

/**
 * Register feature globally for runtime detection
 */
export function registerGlobalFeature(name: string, definition: FeatureDefinition): void {
  if (typeof window !== 'undefined') {
    (window as any).__FEATURE_REGISTRY__.set(name, definition);
  }
}