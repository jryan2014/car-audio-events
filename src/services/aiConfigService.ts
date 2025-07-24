import { supabase } from '../lib/supabase';

export interface AIServiceConfig {
  provider: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  costPerImage: number;
  maxImagesPerDay: number;
  quality: string;
  style: string;
  additionalSettings?: any;
}

class AIConfigService {
  private cache: Map<string, AIServiceConfig> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastFetch: number = 0;

  /**
   * Get AI service configuration from database
   */
  async getConfig(provider: string): Promise<AIServiceConfig | null> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.cache.has(provider) && (now - this.lastFetch) < this.cacheExpiry) {
        console.log(`[AIConfigService] Returning cached config for ${provider}`);
        return this.cache.get(provider)!;
      }

      console.log(`[AIConfigService] Fetching config for ${provider} from database`);
      
      // Direct table query instead of RPC (to avoid schema cache issues)
      const { data, error } = await supabase
        .from('ai_service_configs')
        .select('*')
        .eq('provider', provider)
        .single();

      if (error) {
        console.error('[AIConfigService] Error fetching config:', error);
        
        // If not found, return null
        if (error.code === 'PGRST116') {
          console.log(`[AIConfigService] No config found for provider: ${provider}`);
          return null;
        }
        
        throw error;
      }

      if (!data) {
        console.log(`[AIConfigService] No config found for provider: ${provider}`);
        return null;
      }

      const config: AIServiceConfig = {
        provider: data.provider,
        apiKey: data.api_key,
        model: data.model,
        enabled: data.enabled,
        costPerImage: parseFloat(data.cost_per_image),
        maxImagesPerDay: data.max_images_per_day,
        quality: data.quality,
        style: data.style,
        additionalSettings: data.additional_settings || {}
      };

      // Update cache
      this.cache.set(provider, config);
      this.lastFetch = now;

      return config;
    } catch (error) {
      console.error('[AIConfigService] Error in getConfig:', error);
      return null;
    }
  }

  /**
   * Get all AI service configurations
   */
  async getAllConfigs(): Promise<Record<string, AIServiceConfig>> {
    try {
      console.log('[AIConfigService] Fetching all configs from database');
      
      const { data, error } = await supabase
        .from('ai_service_configs')
        .select('*')
        .order('provider');

      if (error) {
        console.error('[AIConfigService] Error fetching all configs:', error);
        throw error;
      }

      const configs: Record<string, AIServiceConfig> = {};
      
      data?.forEach(row => {
        configs[row.provider] = {
          provider: row.provider,
          apiKey: row.api_key,
          model: row.model,
          enabled: row.enabled,
          costPerImage: parseFloat(row.cost_per_image),
          maxImagesPerDay: row.max_images_per_day,
          quality: row.quality,
          style: row.style,
          additionalSettings: row.additional_settings || {}
        };
      });

      // Update cache
      this.lastFetch = Date.now();
      this.cache.clear();
      Object.entries(configs).forEach(([provider, config]) => {
        this.cache.set(provider, config);
      });

      return configs;
    } catch (error) {
      console.error('[AIConfigService] Error in getAllConfigs:', error);
      return {};
    }
  }

  /**
   * Update AI service configuration
   */
  async updateConfig(provider: string, config: Partial<AIServiceConfig>): Promise<boolean> {
    try {
      console.log(`[AIConfigService] Updating config for ${provider}`);
      
      // First check if the record exists
      const { data: existing } = await supabase
        .from('ai_service_configs')
        .select('id')
        .eq('provider', provider)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('ai_service_configs')
          .update({
            api_key: config.apiKey,
            model: config.model,
            enabled: config.enabled,
            cost_per_image: config.costPerImage,
            max_images_per_day: config.maxImagesPerDay,
            quality: config.quality,
            style: config.style,
            additional_settings: config.additionalSettings || {},
            updated_at: new Date().toISOString()
          })
          .eq('provider', provider);

        if (error) {
          console.error('[AIConfigService] Error updating config:', error);
          throw error;
        }
      } else {
        // Insert new record
        const { error } = await supabase
          .from('ai_service_configs')
          .insert({
            provider: provider,
            api_key: config.apiKey || '',
            model: config.model || (provider === 'openai-dalle' ? 'dall-e-3' : 'stable-diffusion-xl-1024-v1-0'),
            enabled: config.enabled ?? false,
            cost_per_image: config.costPerImage || (provider === 'openai-dalle' ? 0.04 : 0.02),
            max_images_per_day: config.maxImagesPerDay || 100,
            quality: config.quality || 'standard',
            style: config.style || 'vivid',
            additional_settings: config.additionalSettings || {}
          });

        if (error) {
          console.error('[AIConfigService] Error inserting config:', error);
          throw error;
        }
      }

      // Clear cache to force reload
      this.cache.delete(provider);
      
      return true;
    } catch (error) {
      console.error('[AIConfigService] Error in updateConfig:', error);
      return false;
    }
  }

  /**
   * Clear cache to force fresh fetch
   */
  clearCache() {
    this.cache.clear();
    this.lastFetch = 0;
  }

  /**
   * Migrate configurations from localStorage to database
   */
  async migrateFromLocalStorage(): Promise<boolean> {
    try {
      const localConfigs = localStorage.getItem('ai-service-configs');
      if (!localConfigs) {
        console.log('[AIConfigService] No localStorage configs to migrate');
        return true;
      }

      const configs = JSON.parse(localConfigs);
      console.log('[AIConfigService] Migrating configs from localStorage:', Object.keys(configs));

      for (const [provider, config] of Object.entries(configs)) {
        const typedConfig = config as any;
        if (typedConfig.apiKey && typedConfig.apiKey.length > 0) {
          console.log(`[AIConfigService] Migrating ${provider} config to database`);
          
          await this.updateConfig(provider, {
            apiKey: typedConfig.apiKey,
            model: typedConfig.model,
            enabled: typedConfig.enabled,
            costPerImage: typedConfig.costPerImage || 0.04,
            maxImagesPerDay: typedConfig.maxImagesPerDay || 100,
            quality: typedConfig.quality || 'standard',
            style: typedConfig.style || 'vivid',
            additionalSettings: typedConfig.additionalSettings || {}
          });
        }
      }

      // After successful migration, remove from localStorage
      localStorage.removeItem('ai-service-configs');
      console.log('[AIConfigService] Migration complete, localStorage cleared');
      
      return true;
    } catch (error) {
      console.error('[AIConfigService] Error migrating from localStorage:', error);
      return false;
    }
  }
}

// Export singleton instance
export const aiConfigService = new AIConfigService();

// Also export the class for testing
export { AIConfigService };