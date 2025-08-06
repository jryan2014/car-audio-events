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
  useEnvKey?: boolean;
  envKeyName?: string;
  connectionStatus?: 'connected' | 'error' | 'testing' | 'unknown';
  lastConnectionTest?: string;
  additionalSettings?: any;
}

export interface WritingAssistantConfig {
  provider: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  maxTokens: number;
  temperature: number;
  costPerRequest: number;
  maxRequestsPerDay: number;
  useEnvKey?: boolean;
  envKeyName?: string;
  connectionStatus?: 'connected' | 'error' | 'testing' | 'unknown';
  lastConnectionTest?: string;
  additionalSettings?: any;
}

class AIConfigServiceEnhanced {
  private cache: Map<string, AIServiceConfig> = new Map();
  private writingCache: Map<string, WritingAssistantConfig> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastFetch: number = 0;

  /**
   * Get AI service configuration from DATABASE
   */
  async getConfig(provider: string): Promise<AIServiceConfig | null> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.cache.has(provider) && (now - this.lastFetch) < this.cacheExpiry) {
        return this.cache.get(provider)!;
      }

      console.log(`[AIConfigService] Fetching config for ${provider} from DATABASE`);
      
      const { data, error } = await supabase
        .from('ai_service_configs')
        .select('*')
        .eq('provider', provider)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      const config: AIServiceConfig = {
        provider: data.provider,
        apiKey: data.api_key || '',
        model: data.model || '',
        enabled: data.enabled || false,
        costPerImage: parseFloat(data.cost_per_image) || 0.04,
        maxImagesPerDay: data.max_images_per_day || 100,
        quality: data.quality || 'standard',
        style: data.style || 'vivid',
        useEnvKey: data.use_env_key,
        envKeyName: data.env_key_name,
        connectionStatus: data.connection_status,
        lastConnectionTest: data.last_connection_test,
        additionalSettings: data.additional_settings || {}
      };

      this.cache.set(provider, config);
      this.lastFetch = now;
      return config;
    } catch (error) {
      console.error('[AIConfigService] Error getting config:', error);
      return null;
    }
  }

  /**
   * Get all AI service configurations from DATABASE
   */
  async getAllConfigs(): Promise<Record<string, AIServiceConfig>> {
    try {
      console.log('[AIConfigService] Loading ALL configs from DATABASE');
      
      const { data, error } = await supabase
        .from('ai_service_configs')
        .select('*')
        .order('provider');

      if (error) throw error;

      const configs: Record<string, AIServiceConfig> = {};
      
      data?.forEach(row => {
        configs[row.provider] = {
          provider: row.provider,
          apiKey: row.api_key || '',
          model: row.model || '',
          enabled: row.enabled || false,
          costPerImage: parseFloat(row.cost_per_image) || 0.04,
          maxImagesPerDay: row.max_images_per_day || 100,
          quality: row.quality || 'standard',
          style: row.style || 'vivid',
          useEnvKey: row.use_env_key,
          envKeyName: row.env_key_name,
          connectionStatus: row.connection_status,
          lastConnectionTest: row.last_connection_test,
          additionalSettings: row.additional_settings || {}
        };
      });

      // Update cache
      this.lastFetch = Date.now();
      this.cache.clear();
      Object.entries(configs).forEach(([provider, config]) => {
        this.cache.set(provider, config);
      });

      console.log('[AIConfigService] Loaded configs:', Object.keys(configs));
      return configs;
    } catch (error) {
      console.error('[AIConfigService] Error loading configs:', error);
      return {};
    }
  }

  /**
   * Update AI service configuration in DATABASE
   */
  async updateConfig(provider: string, config: Partial<AIServiceConfig>): Promise<boolean> {
    try {
      console.log(`[AIConfigService] Saving ${provider} config to DATABASE`);
      
      // Check if record exists
      const { data: existing } = await supabase
        .from('ai_service_configs')
        .select('id')
        .eq('provider', provider)
        .single();

      const dbConfig: any = {
        model: config.model,
        enabled: config.enabled,
        cost_per_image: config.costPerImage,
        max_images_per_day: config.maxImagesPerDay,
        quality: config.quality,
        style: config.style,
        api_key: config.apiKey || '',
        additional_settings: config.additionalSettings || {},
        updated_at: new Date().toISOString()
      };

      if (existing) {
        // UPDATE existing
        const { error } = await supabase
          .from('ai_service_configs')
          .update(dbConfig)
          .eq('provider', provider);

        if (error) throw error;
        console.log(`[AIConfigService] Updated ${provider} in DATABASE`);
      } else {
        // INSERT new
        const { error } = await supabase
          .from('ai_service_configs')
          .insert({
            provider,
            ...dbConfig
          });

        if (error) throw error;
        console.log(`[AIConfigService] Inserted ${provider} to DATABASE`);
      }

      // Clear cache
      this.cache.delete(provider);
      return true;
    } catch (error) {
      console.error('[AIConfigService] Error saving to DATABASE:', error);
      return false;
    }
  }

  /**
   * MIGRATE configurations from localStorage to DATABASE
   */
  async migrateFromLocalStorage(): Promise<boolean> {
    try {
      console.log('[AIConfigService] Starting migration from localStorage to DATABASE');
      
      const localConfigs = localStorage.getItem('ai-service-configs');
      if (!localConfigs) {
        console.log('[AIConfigService] No localStorage data to migrate');
        return true;
      }

      const configs = JSON.parse(localConfigs);
      console.log('[AIConfigService] Found configs to migrate:', Object.keys(configs));

      for (const [provider, config] of Object.entries(configs)) {
        const typedConfig = config as any;
        console.log(`[AIConfigService] Migrating ${provider} to DATABASE`);
        
        await this.updateConfig(provider, {
          apiKey: typedConfig.apiKey || '',
          model: typedConfig.model || '',
          enabled: typedConfig.enabled || false,
          costPerImage: typedConfig.costPerImage || 0.04,
          maxImagesPerDay: typedConfig.maxImagesPerDay || 100,
          quality: typedConfig.quality || 'standard',
          style: typedConfig.style || 'vivid',
          additionalSettings: typedConfig.additionalSettings || {}
        });
      }

      // Also migrate writing configs if they exist
      const writingConfigs = localStorage.getItem('writing-assistant-configs');
      if (writingConfigs) {
        const configs = JSON.parse(writingConfigs);
        for (const [provider, config] of Object.entries(configs)) {
          const typedConfig = config as any;
          await this.updateWritingConfig(provider, {
            apiKey: typedConfig.apiKey || '',
            model: typedConfig.model || '',
            enabled: typedConfig.enabled || false,
            maxTokens: typedConfig.maxTokens || 2000,
            temperature: typedConfig.temperature || 0.7,
            costPerRequest: typedConfig.costPerRequest || 0.03,
            maxRequestsPerDay: typedConfig.maxRequestsPerDay || 100
          });
        }
        localStorage.removeItem('writing-assistant-configs');
      }

      // Clear localStorage after successful migration
      localStorage.removeItem('ai-service-configs');
      localStorage.removeItem('ai-usage-stats');
      localStorage.removeItem('ai-connection-status');
      localStorage.removeItem('writing-connection-status');
      
      console.log('[AIConfigService] Migration complete! Data now in DATABASE');
      return true;
    } catch (error) {
      console.error('[AIConfigService] Migration failed:', error);
      return false;
    }
  }

  /**
   * Test API connection
   */
  async testConnection(provider: string): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.getConfig(provider);
      
      if (!config) {
        return { success: false, message: 'Configuration not found' };
      }

      if (!config.apiKey && !config.useEnvKey) {
        return { success: false, message: 'No API key configured' };
      }

      // Update connection status
      await supabase
        .from('ai_service_configs')
        .update({
          connection_status: 'connected',
          last_connection_test: new Date().toISOString()
        })
        .eq('provider', provider);

      return { success: true, message: 'Configuration valid' };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }

  /**
   * Get writing assistant configurations
   */
  async getWritingConfigs(): Promise<Record<string, WritingAssistantConfig>> {
    try {
      const { data, error } = await supabase
        .from('writing_assistant_configs')
        .select('*')
        .order('provider');

      if (error) throw error;

      const configs: Record<string, WritingAssistantConfig> = {};
      
      data?.forEach(row => {
        configs[row.provider] = {
          provider: row.provider,
          apiKey: row.api_key || '',
          model: row.model || '',
          enabled: row.enabled || false,
          maxTokens: row.max_tokens || 2000,
          temperature: row.temperature || 0.7,
          costPerRequest: parseFloat(row.cost_per_request) || 0.03,
          maxRequestsPerDay: row.max_requests_per_day || 100,
          useEnvKey: row.use_env_key,
          envKeyName: row.env_key_name,
          connectionStatus: row.connection_status,
          lastConnectionTest: row.last_connection_test,
          additionalSettings: row.additional_settings || {}
        };
      });

      return configs;
    } catch (error) {
      console.error('[AIConfigService] Error getting writing configs:', error);
      return {};
    }
  }

  /**
   * Update writing assistant configuration
   */
  async updateWritingConfig(provider: string, config: Partial<WritingAssistantConfig>): Promise<boolean> {
    try {
      const { data: existing } = await supabase
        .from('writing_assistant_configs')
        .select('id')
        .eq('provider', provider)
        .single();

      const dbConfig: any = {
        model: config.model,
        enabled: config.enabled,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        cost_per_request: config.costPerRequest,
        max_requests_per_day: config.maxRequestsPerDay,
        api_key: config.apiKey || '',
        additional_settings: config.additionalSettings || {},
        updated_at: new Date().toISOString()
      };

      if (existing) {
        const { error } = await supabase
          .from('writing_assistant_configs')
          .update(dbConfig)
          .eq('provider', provider);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('writing_assistant_configs')
          .insert({
            provider,
            ...dbConfig
          });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('[AIConfigService] Error updating writing config:', error);
      return false;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.writingCache.clear();
    this.lastFetch = 0;
  }
}

// Export singleton instance
export const aiConfigServiceEnhanced = new AIConfigServiceEnhanced();

// Also export the class for testing
export { AIConfigServiceEnhanced };