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
  organization_id?: number; // Changed to INTEGER to match existing organizations table
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

export interface AIConnectionStatus {
  status: 'connected' | 'error' | 'network_issue' | 'unauthorized' | 'testing';
  message: string;
  last_checked: string;
}

export interface AIUsageLimits {
  daily_requests_used: number;
  daily_requests_limit: number;
  monthly_cost_used: number;
  monthly_cost_limit: number;
  is_near_limit: boolean;
  is_at_limit: boolean;
  warning_message?: string;
}

export interface MembershipAILimits {
  membership_type: string;
  daily_image_limit: number;
  daily_text_limit: number;
  monthly_cost_limit: number;
  enabled_providers: string[];
  can_purchase_credits: boolean;
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
  organization_id?: number;
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
    maxWordCount: number;
    minWordCount: number;
  };
}

export interface ImageGuidelines {
  id?: string;
  user_id?: string;
  organization_id?: number;
  visual_style: string;
  color_scheme: any;
  composition_style: string;
  preferred_layouts: string[];
  text_overlay_zones: any;
  logo_placement: string;
  brand_colors_required: boolean;
  watermark_required: boolean;
  preferred_dimensions: any;
  avoid_elements: string[];
  required_elements: string[];
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
  // CONNECTION STATUS TESTING
  // =====================================================

  // Test AI provider connection with live API validation
  async testConnection(providerId: string, apiKey: string): Promise<AIConnectionStatus> {
    try {
      // Get provider details
      const { data: provider, error } = await supabase
        .from('ai_service_providers')
        .select('*')
        .eq('id', providerId)
        .single();

      if (error) throw error;

      // Test connection based on provider type
      let testResult: AIConnectionStatus;
      
      switch (provider.provider_name) {
        case 'openai-dalle':
        case 'openai-gpt':
          testResult = await this.testOpenAIConnection(apiKey, provider.service_type);
          break;
        case 'stability-ai':
          testResult = await this.testStabilityAIConnection(apiKey);
          break;
        case 'anthropic-claude':
          testResult = await this.testAnthropicConnection(apiKey);
          break;
        case 'google-gemini':
          testResult = await this.testGoogleGeminiConnection(apiKey);
          break;
        case 'midjourney':
          testResult = await this.testMidjourneyConnection(apiKey);
          break;
        case 'adobe-firefly':
          testResult = await this.testAdobeFireflyConnection(apiKey);
          break;
        default:
          testResult = {
            status: 'error',
            message: 'Unsupported provider',
            last_checked: new Date().toISOString()
          };
      }

      return testResult;
    } catch (error: any) {
      return {
        status: 'network_issue',
        message: `Network error: ${error.message}`,
        last_checked: new Date().toISOString()
      };
    }
  },

  // Private connection testing methods
  async testOpenAIConnection(apiKey: string, serviceType: 'image' | 'text'): Promise<AIConnectionStatus> {
    try {
      const endpoint = serviceType === 'image' 
        ? 'https://api.openai.com/v1/models' // Use models endpoint for testing
        : 'https://api.openai.com/v1/models';
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        return {
          status: 'unauthorized',
          message: 'Invalid API key',
          last_checked: new Date().toISOString()
        };
      }

      if (response.ok) {
        return {
          status: 'connected',
          message: 'Connection successful',
          last_checked: new Date().toISOString()
        };
      }

      return {
        status: 'error',
        message: `HTTP ${response.status}: ${response.statusText}`,
        last_checked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'network_issue',
        message: `Network error: ${error.message}`,
        last_checked: new Date().toISOString()
      };
    }
  },

  async testStabilityAIConnection(apiKey: string): Promise<AIConnectionStatus> {
    try {
      const response = await fetch('https://api.stability.ai/v1/user/account', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.status === 401) {
        return {
          status: 'unauthorized',
          message: 'Invalid API key',
          last_checked: new Date().toISOString()
        };
      }

      if (response.ok) {
        return {
          status: 'connected',
          message: 'Connection successful',
          last_checked: new Date().toISOString()
        };
      }

      return {
        status: 'error',
        message: `HTTP ${response.status}: ${response.statusText}`,
        last_checked: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        status: 'network_issue',
        message: `Network error: ${error.message}`,
        last_checked: new Date().toISOString()
      };
    }
  },

  async testAnthropicConnection(apiKey: string): Promise<AIConnectionStatus> {
    try {
      // Test with a minimal request to validate API key
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        })
      });

      if (response.status === 401) {
        return {
          status: 'unauthorized',
          message: 'Invalid API key',
          last_checked: new Date().toISOString()
        };
      }

      if (response.ok || response.status === 400) { // 400 is acceptable for test
        return {
          status: 'connected',
          message: 'Connection successful',
          last_checked: new Date().toISOString()
        };
      }

      return {
        status: 'error',
        message: `HTTP ${response.status}: ${response.statusText}`,
        last_checked: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        status: 'network_issue',
        message: `Network error: ${error.message}`,
        last_checked: new Date().toISOString()
      };
    }
  },

  async testGoogleGeminiConnection(apiKey: string): Promise<AIConnectionStatus> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'test' }] }]
        })
      });

      if (response.status === 401 || response.status === 403) {
        return {
          status: 'unauthorized',
          message: 'Invalid API key',
          last_checked: new Date().toISOString()
        };
      }

      if (response.ok || response.status === 400) {
        return {
          status: 'connected',
          message: 'Connection successful',
          last_checked: new Date().toISOString()
        };
      }

      return {
        status: 'error',
        message: `HTTP ${response.status}: ${response.statusText}`,
        last_checked: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        status: 'network_issue',
        message: `Network error: ${error.message}`,
        last_checked: new Date().toISOString()
      };
    }
  },

  async testMidjourneyConnection(apiKey: string): Promise<AIConnectionStatus> {
    // Midjourney doesn't have a public API yet, so return a placeholder
    return {
      status: 'error',
      message: 'Midjourney API not yet available',
      last_checked: new Date().toISOString()
    };
  },

  async testAdobeFireflyConnection(apiKey: string): Promise<AIConnectionStatus> {
    // Adobe Firefly API testing would go here
    return {
      status: 'error',
      message: 'Adobe Firefly API testing not implemented',
      last_checked: new Date().toISOString()
    };
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
  async getOrgProviderConfigs(orgId: number): Promise<AIProviderConfig[]> {
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

  // ADMIN: Get all AI configurations
  async getAllAIConfigs(): Promise<AIProviderConfig[]> {
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .select(`
        *,
        ai_service_providers (
          provider_name,
          display_name,
          service_type
        ),
        users (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Save or update AI configuration
  async upsertProviderConfig(config: Partial<AIProviderConfig>): Promise<AIProviderConfig> {
    // Encrypt API key before saving
    if (config.api_key_encrypted) {
      config.api_key_encrypted = this.encryptApiKey(config.api_key_encrypted);
    }

    if (config.id) {
      // Update existing config
      const { data, error } = await supabase
        .from('ai_provider_configs')
        .update({
          ...config,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new config
      const { data, error } = await supabase
        .from('ai_provider_configs')
        .insert({
          ...config,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  // Delete AI configuration
  async deleteProviderConfig(configId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_provider_configs')
      .delete()
      .eq('id', configId);

    if (error) throw error;
  },

  // =====================================================
  // USAGE LIMITS AND WARNINGS
  // =====================================================

  // Check usage limits for a user
  async checkUsageLimits(userId: string, providerId: string): Promise<AIUsageLimits> {
    const { data: config, error: configError } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('provider_id', providerId)
      .single();

    if (configError) throw configError;

    // Get today's usage
    const { data: todayUsage } = await supabase
      .from('ai_usage_analytics')
      .select('*')
      .eq('config_id', config.id)
      .eq('period_type', 'daily')
      .eq('date_period', new Date().toISOString().split('T')[0])
      .single();

    // Get monthly usage
    const { data: monthlyUsage } = await supabase
      .from('ai_usage_analytics')
      .select('total_cost')
      .eq('config_id', config.id)
      .eq('period_type', 'daily')
      .gte('date_period', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
      .lte('date_period', new Date().toISOString().split('T')[0]);

    const dailyUsed = todayUsage?.total_requests || 0;
    const monthlySpent = monthlyUsage?.reduce((sum, day) => sum + (day.total_cost || 0), 0) || 0;

    const isNearDailyLimit = dailyUsed >= (config.daily_request_limit * 0.8);
    const isAtDailyLimit = dailyUsed >= config.daily_request_limit;
    const isNearMonthlyLimit = monthlySpent >= (config.monthly_cost_limit * 0.8);
    const isAtMonthlyLimit = monthlySpent >= config.monthly_cost_limit;

    let warningMessage = '';
    if (isAtDailyLimit) {
      warningMessage = 'Daily request limit reached. Cannot make more requests today.';
    } else if (isAtMonthlyLimit) {
      warningMessage = 'Monthly cost limit reached. Cannot make more requests this month.';
    } else if (isNearDailyLimit) {
      warningMessage = `Approaching daily limit: ${dailyUsed}/${config.daily_request_limit} requests used.`;
    } else if (isNearMonthlyLimit) {
      warningMessage = `Approaching monthly limit: $${monthlySpent.toFixed(2)}/$${config.monthly_cost_limit} spent.`;
    }

    return {
      daily_requests_used: dailyUsed,
      daily_requests_limit: config.daily_request_limit,
      monthly_cost_used: monthlySpent,
      monthly_cost_limit: config.monthly_cost_limit,
      is_near_limit: isNearDailyLimit || isNearMonthlyLimit,
      is_at_limit: isAtDailyLimit || isAtMonthlyLimit,
      warning_message: warningMessage
    };
  },

  // Get membership AI limits
  async getMembershipAILimits(membershipType: string): Promise<MembershipAILimits> {
    const limits: Record<string, MembershipAILimits> = {
      'free': {
        membership_type: 'free',
        daily_image_limit: 5,
        daily_text_limit: 10,
        monthly_cost_limit: 10.00,
        enabled_providers: ['openai-dalle', 'openai-gpt'],
        can_purchase_credits: true
      },
      'pro': {
        membership_type: 'pro',
        daily_image_limit: 50,
        daily_text_limit: 100,
        monthly_cost_limit: 100.00,
        enabled_providers: ['openai-dalle', 'stability-ai', 'openai-gpt', 'anthropic-claude'],
        can_purchase_credits: true
      },
      'business': {
        membership_type: 'business',
        daily_image_limit: 200,
        daily_text_limit: 500,
        monthly_cost_limit: 500.00,
        enabled_providers: ['openai-dalle', 'stability-ai', 'midjourney', 'adobe-firefly', 'openai-gpt', 'anthropic-claude', 'google-gemini'],
        can_purchase_credits: true
      },
      'enterprise': {
        membership_type: 'enterprise',
        daily_image_limit: 1000,
        daily_text_limit: 2000,
        monthly_cost_limit: 2000.00,
        enabled_providers: ['openai-dalle', 'stability-ai', 'midjourney', 'adobe-firefly', 'openai-gpt', 'anthropic-claude', 'google-gemini'],
        can_purchase_credits: true
      }
    };

    return limits[membershipType] || limits['free'];
  },

  // ADMIN: Set usage limits for user
  async setUserUsageLimits(userId: string, providerId: string, dailyLimit: number, monthlyLimit: number): Promise<void> {
    const { error } = await supabase
      .from('ai_provider_configs')
      .update({
        daily_request_limit: dailyLimit,
        monthly_cost_limit: monthlyLimit,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('provider_id', providerId);

    if (error) throw error;
  },

  // ADMIN: Enable/disable AI for specific user
  async setUserAIAccess(userId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('ai_provider_configs')
      .update({ enabled: enabled })
      .eq('user_id', userId);

    if (error) throw error;
  },

  // =====================================================
  // USAGE STATISTICS AND ANALYTICS
  // =====================================================

  // Get provider statistics
  async getProviderStats(userId?: string, orgId?: number): Promise<AIProviderStats[]> {
    try {
      // First get the user's or organization's provider configs
      let configQuery = supabase
        .from('ai_provider_configs')
        .select(`
          id,
          provider_id,
          enabled,
          daily_request_limit,
          monthly_cost_limit,
          ai_service_providers (
            provider_name,
            display_name,
            service_type
          )
        `);

      if (userId) {
        configQuery = configQuery.eq('user_id', userId);
      } else if (orgId) {
        configQuery = configQuery.eq('organization_id', orgId);
      }

      const { data: configs, error: configError } = await configQuery;
      if (configError) throw configError;

      if (!configs || configs.length === 0) {
        return [];
      }

      // Get usage analytics for these configs
      const configIds = configs.map(c => c.id);
      const { data: analytics, error: analyticsError } = await supabase
        .from('ai_usage_analytics')
        .select('*')
        .in('config_id', configIds)
        .eq('period_type', 'daily')
        .eq('date_period', new Date().toISOString().split('T')[0]);

      if (analyticsError) throw analyticsError;

      // Combine config and analytics data
      const stats: AIProviderStats[] = configs.map(config => {
        const todayAnalytics = analytics?.find(a => a.config_id === config.id) || {};
        const provider = config.ai_service_providers as any;
        
        return {
          config_id: config.id,
          provider_name: provider?.provider_name || 'unknown',
          display_name: provider?.display_name || 'Unknown Provider',
          service_type: provider?.service_type || 'image',
          enabled: config.enabled,
          daily_request_limit: config.daily_request_limit,
          monthly_cost_limit: config.monthly_cost_limit,
          requests_today: Number(todayAnalytics.total_requests) || 0,
          cost_today: Number(todayAnalytics.total_cost) || 0,
          requests_this_month: 0, // Would need monthly analytics query
          cost_this_month: 0, // Would need monthly analytics query
          total_requests_all_time: Number(todayAnalytics.total_requests) || 0,
          total_cost_all_time: Number(todayAnalytics.total_cost) || 0,
          last_used: undefined // Would need to get from usage logs
        };
      });

      return stats;
    } catch (error) {
      console.error('Error getting provider stats:', error);
      return [];
    }
  },

  // Get overall usage statistics
  async getOverallStats(userId?: string, orgId?: number): Promise<{
    totalRequests: number;
    totalCost: number;
    dailyLimit: number;
    monthlyUsage: number;
  }> {
    const stats = await this.getProviderStats(userId, orgId);
    
    return {
      totalRequests: stats.reduce((sum, stat) => sum + stat.total_requests_all_time, 0),
      totalCost: stats.reduce((sum, stat) => sum + stat.total_cost_all_time, 0),
      dailyLimit: stats.reduce((sum, stat) => sum + stat.daily_request_limit, 0),
      monthlyUsage: stats.reduce((sum, stat) => sum + stat.cost_this_month, 0)
    };
  },

  // Log AI usage
  async logUsage(usage: Omit<AIUsageLog, 'id' | 'created_at'>): Promise<AIUsageLog> {
    const { data, error } = await supabase
      .from('ai_usage_logs')
      .insert({
        ...usage,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // =====================================================
  // CONTENT DIRECTIONS AND IMAGE GUIDELINES
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
  async getOrgContentDirections(orgId: number): Promise<ContentDirections | null> {
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
    if (directions.id) {
      const { data, error } = await supabase
        .from('ai_content_directions')
        .update({
          ...directions,
          updated_at: new Date().toISOString()
        })
        .eq('id', directions.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('ai_content_directions')
        .insert({
          ...directions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

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
  async getOrgImageGuidelines(orgId: number): Promise<ImageGuidelines | null> {
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
    if (guidelines.id) {
      const { data, error } = await supabase
        .from('ai_image_guidelines')
        .update({
          ...guidelines,
          updated_at: new Date().toISOString()
        })
        .eq('id', guidelines.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('ai_image_guidelines')
        .insert({
          ...guidelines,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  // =====================================================
  // GENERATED CONTENT MANAGEMENT
  // =====================================================

  // Get generated images
  async getGeneratedImages(userId?: string, orgId?: number): Promise<any[]> {
    let query = supabase
      .from('ai_generated_images')
      .select(`
        *,
        ai_usage_logs (
          prompt,
          model_used,
          cost_incurred,
          created_at
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('ai_usage_logs.config_id', userId);
    } else if (orgId) {
      query = query.eq('advertiser_id', orgId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  // Encrypt API key (simple base64 for now - use proper encryption in production)
  encryptApiKey(apiKey: string): string {
    return btoa(apiKey);
  },

  // Decrypt API key
  decryptApiKey(encryptedKey: string): string {
    return atob(encryptedKey);
  },

  // Legacy test connection method (for backward compatibility)
  async testConnectionLegacy(provider: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Find provider by name
      const { data: providers } = await supabase
        .from('ai_service_providers')
        .select('*')
        .eq('provider_name', provider)
        .single();

      if (!providers) {
        return { success: false, error: 'Provider not found' };
      }

      const result = await this.testConnection(providers.id, apiKey);
      return {
        success: result.status === 'connected',
        error: result.status !== 'connected' ? result.message : undefined
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};

export default aiService; 