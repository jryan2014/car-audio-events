import React, { useState, useEffect } from 'react';
import { Settings, Eye, EyeOff, Save, AlertCircle, CheckCircle, DollarSign, Image, Zap, BarChart3, Download, Trash2, Archive, Search, Filter, Grid, List, X } from 'lucide-react';

interface AIServiceConfig {
  provider: 'openai-dalle' | 'stability-ai' | 'midjourney' | 'adobe-firefly';
  apiKey: string;
  model: string;
  enabled: boolean;
  costPerImage: number;
  maxImagesPerDay: number;
  quality: 'standard' | 'hd';
  style: 'vivid' | 'natural';
}

interface UsageStats {
  imagesGenerated: number;
  totalCost: number;
  dailyLimit: number;
  monthlyUsage: number;
}

interface AIGeneratedImage {
  id: string;
  url: string;
  prompt: string;
  provider: string;
  cost: number;
  size: {
    name: string;
    width: number;
    height: number;
  };
  createdAt: string;
  advertiserId: string;
  advertiserName: string;
  adId?: string;
  adTitle?: string;
  isActive: boolean;
  isArchived: boolean;
}

interface ImageStats {
  totalImages: number;
  totalCost: number;
  activeImages: number;
  inactiveImages: number;
  archivedImages: number;
  byProvider: Record<string, number>;
  byAdvertiser: Record<string, number>;
  oldestImage: string;
  newestImage: string;
}

export default function AIConfiguration() {
  const [configs, setConfigs] = useState<Record<string, AIServiceConfig>>({
    'openai-dalle': {
      provider: 'openai-dalle',
      apiKey: '',
      model: 'dall-e-3',
      enabled: true,
      costPerImage: 0.04,
      maxImagesPerDay: 100,
      quality: 'standard',
      style: 'vivid'
    },
    'stability-ai': {
      provider: 'stability-ai',
      apiKey: '',
      model: 'stable-diffusion-xl-1024-v1-0',
      enabled: false,
      costPerImage: 0.02,
      maxImagesPerDay: 200,
      quality: 'standard',
      style: 'natural'
    }
  });

  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingConnection, setTestingConnection] = useState<Record<string, boolean>>({});
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'success' | 'error' | null>>({});
  const [usageStats, setUsageStats] = useState<UsageStats>({
    imagesGenerated: 0,
    totalCost: 0,
    dailyLimit: 100,
    monthlyUsage: 0
  });

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Image Management State
  const [activeTab, setActiveTab] = useState<'config' | 'images'>('config');
  const [images, setImages] = useState<AIGeneratedImage[]>([]);
  const [imageStats, setImageStats] = useState<ImageStats | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [imageFilter, setImageFilter] = useState<'all' | 'active' | 'inactive' | 'archived'>('all');
  const [imageSearch, setImageSearch] = useState('');
  const [imageViewMode, setImageViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [selectedImageForPreview, setSelectedImageForPreview] = useState<AIGeneratedImage | null>(null);

  useEffect(() => {
    // Load saved configurations
    const savedConfigs = localStorage.getItem('ai-service-configs');
    if (savedConfigs) {
      setConfigs(JSON.parse(savedConfigs));
    }

    // Load usage stats
    const savedStats = localStorage.getItem('ai-usage-stats');
    if (savedStats) {
      setUsageStats(JSON.parse(savedStats));
    }
    
    // Load additional usage stats
    loadUsageStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'images') {
      loadImages();
    }
  }, [activeTab]);

  const updateConfig = (provider: string, updates: Partial<AIServiceConfig>) => {
    setConfigs(prev => ({
      ...prev,
      [provider]: { ...prev[provider], ...updates }
    }));
  };

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const saveConfigurations = async () => {
    setSaving(true);
    try {
      localStorage.setItem('ai-service-configs', JSON.stringify(configs));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving configurations:', error);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (provider: string) => {
    const config = configs[provider];
    if (!config.apiKey) {
      setConnectionStatus(prev => ({ ...prev, [provider]: 'error' }));
      alert('Please enter an API key first');
      return;
    }

    setTestingConnection(prev => ({ ...prev, [provider]: true }));
    setConnectionStatus(prev => ({ ...prev, [provider]: null }));

    try {
      let success = false;
      
      if (provider === 'openai-dalle') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
        });
        
        success = response.ok;
        if (!success) {
          const error = await response.json();
          throw new Error(error.error?.message || 'OpenAI API connection failed');
        }
      } else if (provider === 'stability-ai') {
        // Test Stability AI connection with a simple account balance check
        const response = await fetch('https://api.stability.ai/v1/user/account', {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
        });
        
        success = response.ok;
        if (!success) {
          const errorText = await response.text();
          throw new Error(`Stability AI API connection failed: ${errorText || response.statusText}`);
        }
      }

      if (success) {
        setConnectionStatus(prev => ({ ...prev, [provider]: 'success' }));
        // Auto-clear success status after 5 seconds
        setTimeout(() => {
          setConnectionStatus(prev => ({ ...prev, [provider]: null }));
        }, 5000);
      }
    } catch (error) {
      console.error(`${provider} connection test failed:`, error);
      setConnectionStatus(prev => ({ ...prev, [provider]: 'error' }));
      // Auto-clear error status after 5 seconds
      setTimeout(() => {
        setConnectionStatus(prev => ({ ...prev, [provider]: null }));
      }, 5000);
    } finally {
      setTestingConnection(prev => ({ ...prev, [provider]: false }));
    }
  };

  const loadUsageStats = async () => {
    try {
      // This would typically load from your database
      // For now, we'll use mock data
      setUsageStats({
        imagesGenerated: 234,
        totalCost: 45.67,
        dailyLimit: 100,
        monthlyUsage: 12.34
      });
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    }
  };

  // Image Management Functions
  const loadImages = async () => {
    setIsLoadingImages(true);
    try {
      // This would typically load from your database
      // For now, we'll use mock data
      const mockImages: AIGeneratedImage[] = [
        {
          id: 'img-1',
          url: '/api/placeholder/400/200',
          prompt: 'Modern car audio system with vibrant colors',
          provider: 'DALL-E 3',
          cost: 0.04,
          size: { name: 'Banner', width: 728, height: 90 },
          createdAt: '2024-01-15T10:30:00Z',
          advertiserId: 'adv-1',
          advertiserName: 'AutoSound Pro',
          adId: 'ad-1',
          adTitle: 'Premium Car Audio Sale',
          isActive: true,
          isArchived: false
        },
        {
          id: 'img-2',
          url: '/api/placeholder/400/400',
          prompt: 'Luxury car interior with premium sound system',
          provider: 'Stability AI',
          cost: 0.02,
          size: { name: 'Square', width: 400, height: 400 },
          createdAt: '2024-01-14T15:45:00Z',
          advertiserId: 'adv-2',
          advertiserName: 'Elite Audio',
          adId: 'ad-2',
          adTitle: 'Elite Sound Experience',
          isActive: false,
          isArchived: false
        }
      ];
      
      setImages(mockImages);
      
      // Calculate stats
      const stats: ImageStats = {
        totalImages: mockImages.length,
        totalCost: mockImages.reduce((sum, img) => sum + img.cost, 0),
        activeImages: mockImages.filter(img => img.isActive).length,
        inactiveImages: mockImages.filter(img => !img.isActive && !img.isArchived).length,
        archivedImages: mockImages.filter(img => img.isArchived).length,
        byProvider: mockImages.reduce((acc, img) => {
          acc[img.provider] = (acc[img.provider] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byAdvertiser: mockImages.reduce((acc, img) => {
          acc[img.advertiserName] = (acc[img.advertiserName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        oldestImage: mockImages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]?.createdAt || '',
        newestImage: mockImages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.createdAt || ''
      };
      
      setImageStats(stats);
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedImages.size === 0) return;
    
    try {
      // Create a zip file with selected images
      const selectedImageData = images.filter(img => selectedImages.has(img.id));
      
      // This would typically call your backend to create a zip file
      console.log('Downloading images:', selectedImageData);
      
      // For now, just show a success message
      alert(`Preparing download of ${selectedImages.size} images...`);
    } catch (error) {
      console.error('Failed to download images:', error);
      alert('Failed to download images. Please try again.');
    }
  };

  const handleBulkArchive = async () => {
    if (selectedImages.size === 0) return;
    
    try {
      // Archive selected images
      setImages(prev => prev.map(img => 
        selectedImages.has(img.id) ? { ...img, isArchived: true, isActive: false } : img
      ));
      
      setSelectedImages(new Set());
      await loadImages(); // Refresh stats
    } catch (error) {
      console.error('Failed to archive images:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImages.size === 0) return;
    
    const confirmed = window.confirm(`Are you sure you want to permanently delete ${selectedImages.size} images? This action cannot be undone.`);
    if (!confirmed) return;
    
    try {
      // Delete selected images
      setImages(prev => prev.filter(img => !selectedImages.has(img.id)));
      setSelectedImages(new Set());
      await loadImages(); // Refresh stats
    } catch (error) {
      console.error('Failed to delete images:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="h-8 w-8 text-electric-500" />
            <h1 className="text-3xl font-bold">AI Configuration</h1>
          </div>
          <p className="text-gray-400">
            Configure AI services for banner creation and content generation
          </p>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 mt-6 bg-gray-800 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('config')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === 'config'
                  ? 'bg-electric-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Configuration
            </button>
            <button
              onClick={() => setActiveTab('images')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === 'images'
                  ? 'bg-electric-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Image Management
            </button>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <Image className="h-8 w-8 text-electric-500" />
              <div>
                <p className="text-sm text-gray-400">Images Generated</p>
                <p className="text-2xl font-bold">{usageStats.imagesGenerated}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-400">Total Cost</p>
                <p className="text-2xl font-bold">${usageStats.totalCost.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <Zap className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-400">Daily Limit</p>
                <p className="text-2xl font-bold">{usageStats.dailyLimit}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-gray-400">Monthly Usage</p>
                <p className="text-2xl font-bold">{usageStats.monthlyUsage}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            {/* AI Service Configurations */}
            {Object.entries(configs).map(([provider, config]) => (
              <div key={provider} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${config.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <h3 className="text-xl font-semibold capitalize">
                      {provider.replace('-', ' ')}
                    </h3>
                    <span className="px-2 py-1 bg-electric-500/20 text-electric-400 rounded text-sm">
                      ${config.costPerImage}/image
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => testConnection(provider)}
                      disabled={testingConnection[provider]}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                        connectionStatus[provider] === 'success' 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : connectionStatus[provider] === 'error'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      } ${testingConnection[provider] ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {testingConnection[provider] ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Testing...</span>
                        </>
                      ) : connectionStatus[provider] === 'success' ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>Connected</span>
                        </>
                      ) : connectionStatus[provider] === 'error' ? (
                        <>
                          <AlertCircle className="h-4 w-4" />
                          <span>Failed</span>
                        </>
                      ) : (
                        <span>Test Connection</span>
                      )}
                    </button>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => updateConfig(provider, { enabled: e.target.checked })}
                        className="rounded"
                      />
                      <span>Enabled</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium mb-2">API Key</label>
                    <div className="relative">
                      <input
                        type={showApiKeys[provider] ? 'text' : 'password'}
                        value={config.apiKey}
                        onChange={(e) => updateConfig(provider, { apiKey: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pr-12"
                        placeholder="Enter your API key"
                      />
                      <button
                        onClick={() => toggleApiKeyVisibility(provider)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showApiKeys[provider] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Model</label>
                    <select
                      value={config.model}
                      onChange={(e) => updateConfig(provider, { model: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    >
                      {provider === 'openai-dalle' && (
                        <>
                          <option value="dall-e-3">DALL-E 3</option>
                          <option value="dall-e-2">DALL-E 2</option>
                        </>
                      )}
                      {provider === 'stability-ai' && (
                        <>
                          <option value="stable-diffusion-xl-1024-v1-0">Stable Diffusion XL</option>
                          <option value="stable-diffusion-v1-6">Stable Diffusion v1.6</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Quality */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Quality</label>
                    <select
                      value={config.quality}
                      onChange={(e) => updateConfig(provider, { quality: e.target.value as 'standard' | 'hd' })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    >
                      <option value="standard">Standard</option>
                      <option value="hd">HD</option>
                    </select>
                  </div>

                  {/* Style */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Style</label>
                    <select
                      value={config.style}
                      onChange={(e) => updateConfig(provider, { style: e.target.value as 'vivid' | 'natural' })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    >
                      <option value="vivid">Vivid</option>
                      <option value="natural">Natural</option>
                    </select>
                  </div>

                  {/* Max Images Per Day */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Images Per Day</label>
                    <input
                      type="number"
                      value={config.maxImagesPerDay}
                      onChange={(e) => updateConfig(provider, { maxImagesPerDay: parseInt(e.target.value) })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                      min="1"
                      max="1000"
                    />
                  </div>

                  {/* Cost Per Image */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Cost Per Image ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.costPerImage}
                      onChange={(e) => updateConfig(provider, { costPerImage: parseFloat(e.target.value) })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={saveConfigurations}
                disabled={saving}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                  saved
                    ? 'bg-green-600 text-white'
                    : 'bg-electric-500 hover:bg-electric-600 text-white'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Image Management Tab */}
        {activeTab === 'images' && (
          <div className="space-y-6">
            {/* Image Statistics */}
            {imageStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center space-x-3">
                    <Image className="h-8 w-8 text-electric-500" />
                    <div>
                      <p className="text-sm text-gray-400">Total Images</p>
                      <p className="text-2xl font-bold">{imageStats.totalImages}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-400">Total Value</p>
                      <p className="text-2xl font-bold">${imageStats.totalCost.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-400">Active</p>
                      <p className="text-2xl font-bold">{imageStats.activeImages}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center space-x-3">
                    <Archive className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="text-sm text-gray-400">Archived</p>
                      <p className="text-2xl font-bold">{imageStats.archivedImages}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search images..."
                      value={imageSearch}
                      onChange={(e) => setImageSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-500"
                    />
                  </div>

                  {/* Filter */}
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={imageFilter}
                      onChange={(e) => setImageFilter(e.target.value as any)}
                      className="pl-10 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-electric-500 appearance-none"
                    >
                      <option value="all">All Images</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive Only</option>
                      <option value="archived">Archived Only</option>
                    </select>
                  </div>

                  {/* View Mode */}
                  <div className="flex bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => setImageViewMode('grid')}
                      className={`p-2 rounded ${imageViewMode === 'grid' ? 'bg-electric-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setImageViewMode('list')}
                      className={`p-2 rounded ${imageViewMode === 'list' ? 'bg-electric-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Bulk Actions */}
                {selectedImages.size > 0 && (
                  <div className="flex space-x-2">
                    <span className="text-sm text-gray-400 self-center">
                      {selectedImages.size} selected
                    </span>
                    <button
                      onClick={handleBulkDownload}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={handleBulkArchive}
                      className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                    >
                      <Archive className="h-4 w-4" />
                      <span>Archive</span>
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Images Grid/List */}
            {isLoadingImages ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500"></div>
                <span className="ml-3 text-gray-400">Loading images...</span>
              </div>
            ) : (
              <div className={imageViewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
                {images
                  .filter(image => {
                    if (imageFilter === 'active') return image.isActive;
                    if (imageFilter === 'inactive') return !image.isActive && !image.isArchived;
                    if (imageFilter === 'archived') return image.isArchived;
                    return true;
                  })
                  .filter(image => 
                    imageSearch === '' || 
                    image.prompt.toLowerCase().includes(imageSearch.toLowerCase()) ||
                    image.advertiserName.toLowerCase().includes(imageSearch.toLowerCase()) ||
                    image.adTitle?.toLowerCase().includes(imageSearch.toLowerCase())
                  )
                  .map((image) => (
                    <div
                      key={image.id}
                      className={`bg-gray-800 border border-gray-700 rounded-xl overflow-hidden relative ${
                        imageViewMode === 'grid' ? '' : 'flex'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <div className="absolute top-2 left-2 z-10">
                        <input
                          type="checkbox"
                          checked={selectedImages.has(image.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedImages);
                            if (e.target.checked) {
                              newSelected.add(image.id);
                            } else {
                              newSelected.delete(image.id);
                            }
                            setSelectedImages(newSelected);
                          }}
                          className="rounded"
                        />
                      </div>

                      {/* Status Indicator */}
                      <div className="absolute top-2 right-2 z-10">
                        {image.isActive && (
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                            ACTIVE
                          </span>
                        )}
                        {image.isArchived && (
                          <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                            ARCHIVED
                          </span>
                        )}
                      </div>

                      {/* Image */}
                      <div className={`${imageViewMode === 'grid' ? 'aspect-video' : 'w-32 h-24'} bg-gray-900 flex items-center justify-center relative`}>
                        <img
                          src={image.url}
                          alt={image.prompt}
                          className="max-w-full max-h-full object-contain cursor-pointer"
                          onClick={() => setSelectedImageForPreview(image)}
                        />
                      </div>

                      {/* Content */}
                      <div className={`p-4 ${imageViewMode === 'list' ? 'flex-1' : ''}`}>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-white truncate">
                            {image.adTitle || 'Untitled Ad'}
                          </h4>
                          <span className="text-xs text-gray-400 ml-2">
                            ${image.cost.toFixed(2)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-400 mb-2">
                          {image.advertiserName}
                        </p>
                        
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                          {image.prompt}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{image.provider}</span>
                          <span>{image.size.name}</span>
                          <span>{new Date(image.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {images.length === 0 && !isLoadingImages && (
              <div className="text-center py-12">
                <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No AI-generated images found.</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Image Preview Modal */}
      {selectedImageForPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  {selectedImageForPreview.adTitle || 'Untitled Ad'}
                </h3>
                <button
                  onClick={() => setSelectedImageForPreview(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <img
                  src={selectedImageForPreview.url}
                  alt={selectedImageForPreview.prompt}
                  className="max-w-full max-h-96 object-contain mx-auto"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 mb-1">Advertiser</p>
                  <p className="text-white">{selectedImageForPreview.advertiserName}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Provider</p>
                  <p className="text-white">{selectedImageForPreview.provider}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Size</p>
                  <p className="text-white">
                    {selectedImageForPreview.size.name} ({selectedImageForPreview.size.width}x{selectedImageForPreview.size.height})
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Cost</p>
                  <p className="text-white">${selectedImageForPreview.cost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Created</p>
                  <p className="text-white">{new Date(selectedImageForPreview.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Status</p>
                  <p className="text-white">
                    {selectedImageForPreview.isActive ? 'Active' : selectedImageForPreview.isArchived ? 'Archived' : 'Inactive'}
                  </p>
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-gray-400 mb-1">Prompt</p>
                <p className="text-white text-sm">{selectedImageForPreview.prompt}</p>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedImageForPreview.url;
                    link.download = `${selectedImageForPreview.adTitle || 'image'}-${selectedImageForPreview.id}.png`;
                    link.click();
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setSelectedImageForPreview(null)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 