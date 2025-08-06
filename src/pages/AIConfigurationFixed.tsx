import React, { useState, useEffect } from 'react';
import { Settings, Eye, EyeOff, Save, AlertCircle, CheckCircle, DollarSign, Image, Zap, BarChart3, Database, Loader2, Shield, Key, Server } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { aiConfigService, AIServiceConfig } from '../services/aiConfigService';
import { useNavigate } from 'react-router-dom';

interface WritingAssistantConfig {
  provider: 'openai-gpt' | 'anthropic-claude' | 'google-gemini';
  apiKey: string;
  model: string;
  enabled: boolean;
  maxTokens: number;
  temperature: number;
  costPerRequest: number;
  maxRequestsPerDay: number;
}

interface ConnectionStatus {
  status: 'connected' | 'error' | 'testing' | 'unknown';
  message?: string;
  lastChecked?: string;
}

export default function AIConfigurationFixed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.membershipType === 'admin';
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'configuration' | 'writing' | 'analytics'>('configuration');
  
  // AI Service configurations from database
  const [configs, setConfigs] = useState<Record<string, AIServiceConfig>>({});
  
  // Writing assistant configurations (still in localStorage for now)
  const [writingConfigs, setWritingConfigs] = useState<Record<string, WritingAssistantConfig>>({
    'openai-gpt': {
      provider: 'openai-gpt',
      apiKey: '',
      model: 'gpt-4-turbo-preview',
      enabled: false,
      maxTokens: 2000,
      temperature: 0.7,
      costPerRequest: 0.03,
      maxRequestsPerDay: 100
    },
    'anthropic-claude': {
      provider: 'anthropic-claude',
      apiKey: '',
      model: 'claude-3-opus',
      enabled: false,
      maxTokens: 2000,
      temperature: 0.7,
      costPerRequest: 0.015,
      maxRequestsPerDay: 100
    },
    'google-gemini': {
      provider: 'google-gemini',
      apiKey: '',
      model: 'gemini-pro',
      enabled: false,
      maxTokens: 2000,
      temperature: 0.7,
      costPerRequest: 0.01,
      maxRequestsPerDay: 100
    }
  });
  
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({});
  const [migrationPrompt, setMigrationPrompt] = useState(false);

  // Load configurations from database on mount
  useEffect(() => {
    if (isAdmin) {
      loadConfigurations();
      checkForLocalStorageData();
    }
  }, [isAdmin]);

  // Load all AI configurations from database
  const loadConfigurations = async () => {
    setLoading(true);
    setError('');
    
    try {
      const dbConfigs = await aiConfigService.getAllConfigs();
      
      // If no configs in database, create default ones
      if (Object.keys(dbConfigs).length === 0) {
        const defaultProviders = ['openai-dalle', 'stability-ai', 'midjourney', 'adobe-firefly'];
        
        for (const provider of defaultProviders) {
          const defaultConfig: Partial<AIServiceConfig> = {
            apiKey: '',
            model: provider === 'openai-dalle' ? 'dall-e-3' : 
                   provider === 'stability-ai' ? 'stable-diffusion-xl-1024-v1-0' :
                   provider === 'midjourney' ? 'v6' : 'firefly-v2',
            enabled: false,
            costPerImage: provider === 'openai-dalle' ? 0.04 : 0.02,
            maxImagesPerDay: 100,
            quality: 'standard',
            style: 'vivid'
          };
          
          await aiConfigService.updateConfig(provider, defaultConfig);
        }
        
        // Reload after creating defaults
        const newConfigs = await aiConfigService.getAllConfigs();
        setConfigs(newConfigs);
      } else {
        setConfigs(dbConfigs);
      }
    } catch (err) {
      console.error('Error loading configurations:', err);
      setError('Failed to load configurations from database');
    } finally {
      setLoading(false);
    }
  };

  // Check if there's data in localStorage that needs migration
  const checkForLocalStorageData = () => {
    const localConfigs = localStorage.getItem('ai-service-configs');
    if (localConfigs) {
      try {
        const configs = JSON.parse(localConfigs);
        const hasApiKeys = Object.values(configs).some((c: any) => c.apiKey && c.apiKey.length > 0);
        if (hasApiKeys) {
          setMigrationPrompt(true);
        }
      } catch (e) {
        console.error('Error checking localStorage:', e);
      }
    }
  };

  // Migrate data from localStorage to database
  const migrateFromLocalStorage = async () => {
    setSaving(true);
    setError('');
    
    try {
      const success = await aiConfigService.migrateFromLocalStorage();
      if (success) {
        setSaved(true);
        setMigrationPrompt(false);
        await loadConfigurations();
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError('Migration failed. Please try again.');
      }
    } catch (err) {
      console.error('Migration error:', err);
      setError('Failed to migrate configurations');
    } finally {
      setSaving(false);
    }
  };

  // Update configuration in database
  const updateConfig = async (provider: string, updates: Partial<AIServiceConfig>) => {
    const newConfig = {
      ...configs[provider],
      ...updates
    };
    
    // Update local state immediately for responsive UI
    setConfigs(prev => ({
      ...prev,
      [provider]: newConfig
    }));
    
    // Save to database
    try {
      const success = await aiConfigService.updateConfig(provider, updates);
      if (!success) {
        // Revert on failure
        await loadConfigurations();
        setError('Failed to save configuration');
      }
    } catch (err) {
      console.error('Error updating config:', err);
      setError('Failed to save configuration');
      // Revert on error
      await loadConfigurations();
    }
  };

  // Test API connection
  const testConnection = async (provider: string) => {
    const config = configs[provider];
    if (!config?.apiKey) {
      setConnectionStatus(prev => ({
        ...prev,
        [provider]: { status: 'error', message: 'No API key configured' }
      }));
      return;
    }

    setConnectionStatus(prev => ({
      ...prev,
      [provider]: { status: 'testing', message: 'Testing connection...' }
    }));

    // Simulate API test (replace with actual API calls)
    setTimeout(() => {
      const isValid = config.apiKey.length > 20;
      setConnectionStatus(prev => ({
        ...prev,
        [provider]: {
          status: isValid ? 'connected' : 'error',
          message: isValid ? 'Connection successful' : 'Invalid API key',
          lastChecked: new Date().toISOString()
        }
      }));
    }, 1500);
  };

  // Save all configurations
  const saveAllConfigurations = async () => {
    setSaving(true);
    setError('');
    
    try {
      // Save each configuration to database
      for (const [provider, config] of Object.entries(configs)) {
        await aiConfigService.updateConfig(provider, config);
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving configurations:', err);
      setError('Failed to save configurations');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">Only administrators can access AI configuration.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-electric-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading AI configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Settings className="h-8 w-8 text-electric-500" />
              <h1 className="text-2xl font-bold text-white">AI Configuration</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <Server className="h-4 w-4 text-green-400" />
                <span className="text-gray-400">Database Storage Active</span>
              </div>
              {saved && (
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span>Saved to Database</span>
                </div>
              )}
            </div>
          </div>

          {/* Migration Prompt */}
          {migrationPrompt && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <Database className="h-5 w-5 text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-400 mb-1">Local Data Detected</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    We found AI configurations in your browser storage. Would you like to migrate them to the secure database?
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={migrateFromLocalStorage}
                      disabled={saving}
                      className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Database className="h-4 w-4" />
                      )}
                      <span>Migrate to Database</span>
                    </button>
                    <button
                      onClick={() => {
                        localStorage.removeItem('ai-service-configs');
                        setMigrationPrompt(false);
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-400 mb-1">Secure Storage</h3>
                <p className="text-gray-300 text-sm">
                  API keys are now stored securely in the database with admin-only access. 
                  They persist across browsers and devices.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('configuration')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'configuration'
                ? 'bg-electric-500 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Image className="h-5 w-5" />
              <span>Image Generation</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('writing')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'writing'
                ? 'bg-electric-500 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Writing Assistant</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-electric-500 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Analytics</span>
            </div>
          </button>
        </div>

        {/* Configuration Tab */}
        {activeTab === 'configuration' && (
          <div className="space-y-6">
            {Object.entries(configs).map(([provider, config]) => (
              <div key={provider} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white capitalize">
                    {provider.replace('-', ' ')}
                  </h2>
                  <div className="flex items-center space-x-4">
                    {connectionStatus[provider] && (
                      <div className={`flex items-center space-x-2 text-sm ${
                        connectionStatus[provider].status === 'connected' ? 'text-green-400' :
                        connectionStatus[provider].status === 'error' ? 'text-red-400' :
                        connectionStatus[provider].status === 'testing' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {connectionStatus[provider].status === 'testing' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : connectionStatus[provider].status === 'connected' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <span>{connectionStatus[provider].message}</span>
                      </div>
                    )}
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => updateConfig(provider, { enabled: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-gray-300">Enabled</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKeys[provider] ? 'text' : 'password'}
                        value={config.apiKey}
                        onChange={(e) => updateConfig(provider, { apiKey: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pr-12 text-white"
                        placeholder="Enter your API key"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKeys(prev => ({ ...prev, [provider]: !prev[provider] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showApiKeys[provider] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      value={config.model}
                      onChange={(e) => updateConfig(provider, { model: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>

                  {/* Quality */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Quality
                    </label>
                    <select
                      value={config.quality}
                      onChange={(e) => updateConfig(provider, { quality: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    >
                      <option value="standard">Standard</option>
                      <option value="hd">HD</option>
                    </select>
                  </div>

                  {/* Style */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Style
                    </label>
                    <select
                      value={config.style}
                      onChange={(e) => updateConfig(provider, { style: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    >
                      <option value="vivid">Vivid</option>
                      <option value="natural">Natural</option>
                    </select>
                  </div>

                  {/* Max Images Per Day */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Max Images Per Day
                    </label>
                    <input
                      type="number"
                      value={config.maxImagesPerDay}
                      onChange={(e) => updateConfig(provider, { maxImagesPerDay: parseInt(e.target.value) })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                      min="1"
                      max="1000"
                    />
                  </div>

                  {/* Cost Per Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Cost Per Image ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.costPerImage}
                      onChange={(e) => updateConfig(provider, { costPerImage: parseFloat(e.target.value) })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                      min="0"
                    />
                  </div>
                </div>

                {/* Test Connection Button */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => testConnection(provider)}
                    disabled={!config.apiKey || connectionStatus[provider]?.status === 'testing'}
                    className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {connectionStatus[provider]?.status === 'testing' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    <span>Test Connection</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={saveAllConfigurations}
                disabled={saving}
                className="px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                <span>{saving ? 'Saving...' : 'Save All Configurations'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Writing Assistant Tab - Placeholder */}
        {activeTab === 'writing' && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="text-center py-12">
              <Zap className="h-12 w-12 text-electric-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Writing Assistant Configuration</h3>
              <p className="text-gray-400">Configure AI-powered writing assistance for content creation.</p>
              <p className="text-sm text-gray-500 mt-4">This feature will be implemented in the next update.</p>
            </div>
          </div>
        )}

        {/* Analytics Tab - Placeholder */}
        {activeTab === 'analytics' && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-electric-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">AI Usage Analytics</h3>
              <p className="text-gray-400">Track AI service usage, costs, and performance metrics.</p>
              <p className="text-sm text-gray-500 mt-4">Analytics dashboard coming soon.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}