import { supabase } from '../lib/supabase';

// =====================================================
// TYPES - Matching Database Schema
// =====================================================

export interface AIServiceProvider {
  id: string;
  provider_name: string;
  display_name: string;
  service_type: 'image' | 'text';
  is_active: boolean;
}

export interface AIProviderConfig {
  id: string;
  user_id?: string;
  organization_id?: string;
  provider_id: string;
  provider_name?: string; // Joined from provider table
  display_name?: string; // Joined from provider table
  service_type?: 'image' | 'text'; // Joined from provider table
  
  // Configuration
  api_key_encrypted?: string;
  model: string;
  enabled: boolean;
  
  // Image settings
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  
  // Text settings
  max_tokens?: number;
  temperature?: number;
  
  // Limits
  cost_per_request: number;
  daily_request_limit: number;
  monthly_cost_limit: number;
  
  created_at: string;
  updated_at: string;
}

export interface AIUsageLog {
  id: string;
  config_id: string;
  request_type: 'image' | 'text';
  prompt: string;
  model_used: string;
  success: boolean;
  response_data?: any;
  error_message?: string;
  tokens_used?: number;
  cost_incurred: number;
  processing_time_ms?: number;
  source_feature?: string;
  source_id?: string;
  created_at: string;
}

export interface AIProviderStats {
  config_id: string;
  provider_name: string;
  display_name: string;
  service_type: 'image' | 'text';
  enabled: boolean;
  daily_request_limit: number;
  monthly_cost_limit: number;
  requests_today: number;
  cost_today: number;
  requests_this_month: number;
  cost_this_month: number;
  total_requests_all_time: number;
  total_cost_all_time: number;
  last_used?: string;
}

export interface ContentDirections {
  id?: string;
  user_id?: string;
  organization_id?: string;
  brand_voice: string;
  writing_style: string;
  target_audience: string;
  key_messages: string[];
  tone_guidelines?: string;
  format_preferences: {
    includeIntroduction: boolean;
    includeConclusion: boolean;
    includeCallToAction: boolean;
    useHeadings: boolean;
    useSubheadings: boolean;
    useBulletPoints: boolean;
    useNumberedLists: boolean;
    useEmphasisFormatting: boolean;
    includeTechnicalSpecs: boolean;
    includeStatistics: boolean;
    useQuotes: boolean;
    addSourceReferences: boolean;
    preferredLength: string;
  };
  content_types: {
    productDescriptions: boolean;
    eventAnnouncements: boolean;
    blogPosts: boolean;
    socialMediaPosts: boolean;
    emailCampaigns: boolean;
  };
  restrictions: {
    avoidSuperlatives: boolean;
    requireFactChecking: boolean;
    includeDisclaimer: boolean;
    followBrandGuidelines: boolean;
  };
}

export interface ImageGuidelines {
  id?: string;
  user_id?: string;
  organization_id?: string;
  visual_style: string;
  color_scheme: string;
  primary_focus: string;
  composition_style: string;
  text_zones: {
    leaveTopClear: boolean;
    reserveBottomRightCTA: boolean;
    centerProductInfo: boolean;
    bottomStripContact: boolean;
  };
  brand_guidelines?: string;
}

// =====================================================
// AI SERVICE PROVIDERS
// =====================================================

export const aiService = {
  // Get all available AI service providers
  async getServiceProviders(): Promise<AIServiceProvider[]> {
    const { data, error } = await supabase
      .from('ai_service_providers')
      .select('*')
      .eq('is_active', true)
      .order('service_type', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // =====================================================
  // PROVIDER CONFIGURATIONS
  // =====================================================

  // Get user's AI provider configurations
  async getUserProviderConfigs(userId: string): Promise<AIProviderConfig[]> {
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .select(`
        *,
        ai_service_providers (
          provider_name,
          display_name,
          service_type
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;
    
    return (data || []).map(config => ({
      ...config,
      provider_name: config.ai_service_providers?.provider_name,
      display_name: config.ai_service_providers?.display_name,
      service_type: config.ai_service_providers?.service_type,
    }));
  },

  // Get organization's AI provider configurations
  async getOrgProviderConfigs(orgId: string): Promise<AIProviderConfig[]> {
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .select(`
        *,
        ai_service_providers (
          provider_name,
          display_name,
          service_type
        )
      `)
      .eq('organization_id', orgId);

    if (error) throw error;
    
    return (data || []).map(config => ({
      ...config,
      provider_name: config.ai_service_providers?.provider_name,
      display_name: config.ai_service_providers?.display_name,
      service_type: config.ai_service_providers?.service_type,
    }));
  },

  // Create or update provider configuration
  async upsertProviderConfig(config: Partial<AIProviderConfig>): Promise<AIProviderConfig> {
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .upsert({
        ...config,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete provider configuration
  async deleteProviderConfig(configId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_provider_configs')
      .delete()
      .eq('id', configId);

    if (error) throw error;
  },

  // =====================================================
  // USAGE STATISTICS
  // =====================================================

  // Get provider usage statistics
  async getProviderStats(userId?: string, orgId?: string): Promise<AIProviderStats[]> {
    let query = supabase
      .from('ai_provider_usage_summary')
      .select('*');

    if (userId) {
      // Get user's configs by joining with ai_provider_configs
      const { data: userConfigs } = await supabase
        .from('ai_provider_configs')
        .select('id')
        .eq('user_id', userId);
      
      const configIds = userConfigs?.map(c => c.id) || [];
      if (configIds.length > 0) {
        query = query.in('config_id', configIds);
      } else {
        return []; // No configs found
      }
    }

    if (orgId) {
      // Get org's configs by joining with ai_provider_configs
      const { data: orgConfigs } = await supabase
        .from('ai_provider_configs')
        .select('id')
        .eq('organization_id', orgId);
      
      const configIds = orgConfigs?.map(c => c.id) || [];
      if (configIds.length > 0) {
        query = query.in('config_id', configIds);
      } else {
        return []; // No configs found
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get overall usage summary
  async getOverallStats(userId?: string, orgId?: string): Promise<{
    totalRequests: number;
    totalCost: number;
    dailyLimit: number;
    monthlyUsage: number;
  }> {
    const stats = await this.getProviderStats(userId, orgId);
    
    return {
      totalRequests: stats.reduce((sum, s) => sum + s.total_requests_all_time, 0),
      totalCost: stats.reduce((sum, s) => sum + s.total_cost_all_time, 0),
      dailyLimit: stats.reduce((sum, s) => sum + s.daily_request_limit, 0),
      monthlyUsage: stats.reduce((sum, s) => sum + s.cost_this_month, 0),
    };
  },

  // =====================================================
  // USAGE LOGGING
  // =====================================================

  // Log AI usage
  async logUsage(usage: Omit<AIUsageLog, 'id' | 'created_at'>): Promise<AIUsageLog> {
    const { data, error } = await supabase
      .from('ai_usage_logs')
      .insert(usage)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Check if usage would exceed limits
  async checkUsageLimits(configId: string): Promise<{
    canUse: boolean;
    dailyLimitReached: boolean;
    monthlyLimitReached: boolean;
    dailyUsage: number;
    monthlyUsage: number;
    dailyLimit: number;
    monthlyLimit: number;
  }> {
    // Get config limits
    const { data: config, error: configError } = await supabase
      .from('ai_provider_configs')
      .select('daily_request_limit, monthly_cost_limit')
      .eq('id', configId)
      .single();

    if (configError) throw configError;

    // Get current usage from the view
    const { data: stats, error: statsError } = await supabase
      .from('ai_provider_usage_summary')
      .select('requests_today, cost_this_month')
      .eq('config_id', configId)
      .single();

    if (statsError) throw statsError;

    const dailyUsage = stats?.requests_today || 0;
    const monthlyUsage = stats?.cost_this_month || 0;
    const dailyLimit = config.daily_request_limit;
    const monthlyLimit = config.monthly_cost_limit;

    const dailyLimitReached = dailyUsage >= dailyLimit;
    const monthlyLimitReached = monthlyUsage >= monthlyLimit;

    return {
      canUse: !dailyLimitReached && !monthlyLimitReached,
      dailyLimitReached,
      monthlyLimitReached,
      dailyUsage,
      monthlyUsage,
      dailyLimit,
      monthlyLimit,
    };
  },

  // =====================================================
  // CONTENT DIRECTIONS
  // =====================================================

  // Get user's content directions
  async getUserContentDirections(userId: string): Promise<ContentDirections | null> {
    const { data, error } = await supabase
      .from('ai_content_directions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  },

  // Get organization's content directions
  async getOrgContentDirections(orgId: string): Promise<ContentDirections | null> {
    const { data, error } = await supabase
      .from('ai_content_directions')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Save content directions
  async saveContentDirections(directions: ContentDirections): Promise<ContentDirections> {
    const { data, error } = await supabase
      .from('ai_content_directions')
      .upsert({
        ...directions,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // =====================================================
  // IMAGE GUIDELINES
  // =====================================================

  // Get user's image guidelines
  async getUserImageGuidelines(userId: string): Promise<ImageGuidelines | null> {
    const { data, error } = await supabase
      .from('ai_image_guidelines')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Get organization's image guidelines
  async getOrgImageGuidelines(orgId: string): Promise<ImageGuidelines | null> {
    const { data, error } = await supabase
      .from('ai_image_guidelines')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Save image guidelines
  async saveImageGuidelines(guidelines: ImageGuidelines): Promise<ImageGuidelines> {
    const { data, error } = await supabase
      .from('ai_image_guidelines')
      .upsert({
        ...guidelines,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // =====================================================
  // GENERATED CONTENT
  // =====================================================

  // Get generated images
  async getGeneratedImages(userId?: string, orgId?: string): Promise<any[]> {
    let query = supabase
      .from('ai_generated_images')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (userId) {
      // Get user's images through their configs
      const { data: userConfigs } = await supabase
        .from('ai_provider_configs')
        .select('id')
        .eq('user_id', userId);
      
      const configIds = userConfigs?.map(c => c.id) || [];
      if (configIds.length > 0) {
        // Get usage log IDs for user's configs
        const { data: usageLogs } = await supabase
          .from('ai_usage_logs')
          .select('id')
          .in('config_id', configIds);
        
        const usageLogIds = usageLogs?.map(log => log.id) || [];
        if (usageLogIds.length > 0) {
          query = query.in('usage_log_id', usageLogIds);
        }
      }
    }

    if (orgId) {
      query = query.eq('advertiser_id', orgId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  // Encrypt API key (basic implementation - should use proper encryption in production)
  encryptApiKey(apiKey: string): string {
    // In production, use proper encryption like AES
    return btoa(apiKey); // Basic base64 encoding for demo
  },

  // Decrypt API key
  decryptApiKey(encryptedKey: string): string {
    try {
      return atob(encryptedKey);
    } catch {
      return '';
    }
  },

  // Test API connection (placeholder - implement actual API testing)
  async testConnection(provider: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
    // This would implement actual API testing logic
    // For now, just validate the API key format
    
    if (!apiKey || apiKey.length < 10) {
      return { success: false, error: 'Invalid API key format' };
    }

    // Simulate API test delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Basic format validation
    const formatValidation = {
      'openai-dalle': apiKey.startsWith('sk-'),
      'openai-gpt': apiKey.startsWith('sk-'),
      'anthropic-claude': apiKey.startsWith('sk-ant-'),
      'google-gemini': apiKey.length > 20,
      'stability-ai': apiKey.startsWith('sk-'),
      'midjourney': true, // Midjourney doesn't have a standard format
      'adobe-firefly': true,
    };

    const isValidFormat = formatValidation[provider as keyof typeof formatValidation] ?? false;

    return {
      success: isValidFormat,
      error: isValidFormat ? undefined : 'Invalid API key format for this provider'
    };
  }
};

export default aiService; 