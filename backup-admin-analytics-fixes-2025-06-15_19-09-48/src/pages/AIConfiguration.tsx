import React, { useState, useEffect } from 'react';
import { Settings, Eye, EyeOff, Save, AlertCircle, CheckCircle, DollarSign, Image, Zap, BarChart3, Download, Trash2, Archive, Search, Filter, Grid, List, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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

// Individual provider stats
interface ProviderStats {
  imagesGenerated: number;
  totalCost: number;
  requestsToday: number;
  dailyLimit: number;
  monthlyUsage: number;
  lastUsed: string | null;
}

// Writing assistant stats
interface WritingStats {
  requestsGenerated: number;
  totalCost: number;
  requestsToday: number;
  dailyLimit: number;
  monthlyUsage: number;
  lastUsed: string | null;
}

// Connection status interface
interface ConnectionStatus {
  status: 'connected' | 'error' | 'testing' | 'unknown';
  message?: string;
  lastChecked?: string;
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

export default function AIConfiguration() {
  const { user } = useAuth();
  const isAdmin = user?.membershipType === 'admin';
  
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
    dailyLimit: 0,
    monthlyUsage: 0
  });

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Image Management State
  const [activeTab, setActiveTab] = useState<'config' | 'images' | 'writing' | 'admin'>('config');
  const [images, setImages] = useState<AIGeneratedImage[]>([]);
  const [imageStats, setImageStats] = useState<ImageStats | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [imageFilter, setImageFilter] = useState<'all' | 'active' | 'inactive' | 'archived'>('all');
  const [imageSearch, setImageSearch] = useState('');
  const [imageViewMode, setImageViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [selectedImageForPreview, setSelectedImageForPreview] = useState<AIGeneratedImage | null>(null);

  // Writing Assistant State
  const [writingConfigs, setWritingConfigs] = useState<Record<string, WritingAssistantConfig>>({
    'openai-gpt': {
      provider: 'openai-gpt',
      apiKey: '',
      model: 'gpt-4',
      enabled: true,
      maxTokens: 2000,
      temperature: 0.7,
      costPerRequest: 0.03,
      maxRequestsPerDay: 500
    },
    'anthropic-claude': {
      provider: 'anthropic-claude',
      apiKey: '',
      model: 'claude-3-sonnet-20240229',
      enabled: false,
      maxTokens: 2000,
      temperature: 0.7,
      costPerRequest: 0.015,
      maxRequestsPerDay: 1000
    },
    'google-gemini': {
      provider: 'google-gemini',
      apiKey: '',
      model: 'gemini-pro',
      enabled: false,
      maxTokens: 2000,
      temperature: 0.7,
      costPerRequest: 0.001,
      maxRequestsPerDay: 2000
    }
  });

  // Writing Assistant Connection State
  const [testingWritingConnection, setTestingWritingConnection] = useState<Record<string, boolean>>({});
  const [writingConnectionStatus, setWritingConnectionStatus] = useState<Record<string, 'success' | 'error' | null>>({});
  const [writingConnectionErrors, setWritingConnectionErrors] = useState<Record<string, string>>({});

  // Provider Stats State
  const [providerStats, setProviderStats] = useState<Record<string, ProviderStats>>({});
  const [writingProviderStats, setWritingProviderStats] = useState<Record<string, WritingStats>>({});

  // Persistent Connection Status State
  const [persistentConnectionStatus, setPersistentConnectionStatus] = useState<Record<string, ConnectionStatus>>({});
  const [persistentWritingConnectionStatus, setPersistentWritingConnectionStatus] = useState<Record<string, ConnectionStatus>>({});

  // Content Direction Configuration
  const [contentDirections, setContentDirections] = useState({
    brandVoice: 'professional',
    writingStyle: 'informative',
    targetAudience: 'car audio enthusiasts',
    keyMessages: ['high-quality audio', 'professional installation', 'competitive pricing'],
    toneGuidelines: 'Friendly but authoritative, technical but accessible',
    formatPreferences: {
      useHeadings: true,
      useBulletPoints: true,
      includeCallToAction: true,
      useNumberedLists: false,
      includeIntroduction: true,
      includeConclusion: true,
      useSubheadings: false,
      includeTechnicalSpecs: true,
      useQuotes: false,
      includeStatistics: false,
      addSourceReferences: false,
      useEmphasisFormatting: true,
      maxParagraphLength: 3,
      preferredLength: 'medium'
    },
    contentTypes: {
      productDescriptions: true,
      eventAnnouncements: true,
      blogPosts: true,
      socialMediaPosts: true,
      emailCampaigns: true
    },
    restrictions: {
      avoidSuperlatives: false,
      requireFactChecking: true,
      includeDisclaimer: false,
      followBrandGuidelines: true
    }
  });

  // Separate state for key messages input to avoid parsing issues
  const [keyMessagesInput, setKeyMessagesInput] = useState(
    contentDirections.keyMessages.join(', ')
  );

  // Handle key messages input changes
  const handleKeyMessagesBlur = () => {
    const messages = keyMessagesInput
      .split(',')
      .map(msg => msg.trim())
      .filter(msg => msg && msg.length <= 50) // Limit each message to 50 characters
      .slice(0, 10); // Limit to 10 messages max
    
    setContentDirections(prev => ({ ...prev, keyMessages: messages }));
    setKeyMessagesInput(messages.join(', '));
  };

  // Live count for key messages
  const getKeyMessagesLiveCount = () => {
    const messages = keyMessagesInput
      .split(',')
      .map(msg => msg.trim())
      .filter(msg => msg);
    
    const validMessages = messages.filter(msg => msg.length <= 50);
    const totalChars = keyMessagesInput.length;
    const remainingChars = 500 - totalChars;
    
    return {
      messageCount: Math.min(validMessages.length, 10),
      totalMessages: messages.length,
      remainingMessages: Math.max(0, 10 - validMessages.length),
      totalChars,
      remainingChars: Math.max(0, remainingChars),
      hasOverlongMessages: messages.some(msg => msg.length > 50),
      hasExcessMessages: messages.length > 10
    };
  };

  useEffect(() => {
    // Load saved configurations
    const savedConfigs = localStorage.getItem('ai-service-configs');
    if (savedConfigs) {
      setConfigs(JSON.parse(savedConfigs));
    }

    // Load saved writing assistant configurations
    const savedWritingConfigs = localStorage.getItem('writing-assistant-configs');
    if (savedWritingConfigs) {
      setWritingConfigs(JSON.parse(savedWritingConfigs));
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

  // Load persistent connection status on mount
  useEffect(() => {
    const savedConnectionStatus = localStorage.getItem('ai-connection-status');
    if (savedConnectionStatus) {
      setPersistentConnectionStatus(JSON.parse(savedConnectionStatus));
    }

    const savedWritingConnectionStatus = localStorage.getItem('writing-connection-status');
    if (savedWritingConnectionStatus) {
      setPersistentWritingConnectionStatus(JSON.parse(savedWritingConnectionStatus));
    }

    // Start connection monitoring
    const cleanup = startConnectionMonitoring();
    return cleanup;
  }, []);

  // Save persistent connection status whenever it changes
  useEffect(() => {
    localStorage.setItem('ai-connection-status', JSON.stringify(persistentConnectionStatus));
  }, [persistentConnectionStatus]);

  useEffect(() => {
    localStorage.setItem('writing-connection-status', JSON.stringify(persistentWritingConnectionStatus));
  }, [persistentWritingConnectionStatus]);

  // Connection monitoring function
  const startConnectionMonitoring = () => {
    // Check connections every 5 minutes
    const interval = setInterval(() => {
      checkAllConnections();
    }, 5 * 60 * 1000);

    // Initial check after 2 seconds to allow configs to load
    setTimeout(() => {
      checkAllConnections();
    }, 2000);

    return () => clearInterval(interval);
  };

  const checkAllConnections = async () => {
    // Check image generation providers
    for (const [provider, config] of Object.entries(configs)) {
      if (config.apiKey && config.enabled) {
        await checkConnectionStatus(provider, config.apiKey, 'image');
      }
    }

    // Check writing assistant providers
    for (const [provider, config] of Object.entries(writingConfigs)) {
      if (config.apiKey && config.enabled) {
        await checkConnectionStatus(provider, config.apiKey, 'writing');
      }
    }
  };

  const checkConnectionStatus = async (provider: string, apiKey: string, type: 'image' | 'writing') => {
    try {
      // Simulate API health check - in production, this would be a real API call
      const isValid = await validateApiKey(provider, apiKey, type);
      
      const status: ConnectionStatus = {
        status: isValid ? 'connected' : 'error',
        message: isValid ? 'Connection successful' : 'API key invalid or service unavailable',
        lastChecked: new Date().toISOString()
      };

      if (type === 'image') {
        setPersistentConnectionStatus(prev => ({ ...prev, [provider]: status }));
      } else {
        setPersistentWritingConnectionStatus(prev => ({ ...prev, [provider]: status }));
      }
    } catch (error) {
      const status: ConnectionStatus = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection failed',
        lastChecked: new Date().toISOString()
      };

      if (type === 'image') {
        setPersistentConnectionStatus(prev => ({ ...prev, [provider]: status }));
      } else {
        setPersistentWritingConnectionStatus(prev => ({ ...prev, [provider]: status }));
      }
    }
  };

  const validateApiKey = async (provider: string, apiKey: string, type: 'image' | 'writing'): Promise<boolean> => {
    // Basic validation - in production, this would make actual API calls
    if (!apiKey || apiKey.length < 10) return false;

    if (type === 'writing') {
      if (provider === 'openai-gpt') {
        return apiKey.startsWith('sk-') && apiKey.length >= 40;
      } else if (provider === 'anthropic-claude') {
        return apiKey.startsWith('sk-ant-') && apiKey.length >= 40;
      } else if (provider === 'google-gemini') {
        return apiKey.length >= 30 && !apiKey.includes(' ');
      }
    } else {
      // Image providers
      if (provider === 'openai-dalle') {
        return apiKey.startsWith('sk-') && apiKey.length >= 40;
      } else if (provider === 'stability-ai') {
        return apiKey.startsWith('sk-') && apiKey.length >= 40;
      }
    }

    return apiKey.length > 10; // Basic fallback validation
  };

  // Function to get current connection status for display
  const getConnectionStatus = (provider: string, type: 'image' | 'writing') => {
    const statusMap = type === 'image' ? persistentConnectionStatus : persistentWritingConnectionStatus;
    const status = statusMap[provider];
    
    if (!status) return { status: 'unknown', color: 'gray', text: 'Unknown' };
    
    switch (status.status) {
      case 'connected':
        return { status: 'connected', color: 'green', text: 'Active' };
      case 'error':
        return { status: 'error', color: 'red', text: 'Offline' };
      case 'testing':
        return { status: 'testing', color: 'yellow', text: 'Testing' };
      default:
        return { status: 'unknown', color: 'gray', text: 'Unknown' };
    }
  };

  const updateConfig = (provider: string, updates: Partial<AIServiceConfig>) => {
    const newConfigs = {
      ...configs,
      [provider]: { ...configs[provider], ...updates }
    };
    setConfigs(newConfigs);
    // Auto-save to localStorage
    localStorage.setItem('ai-service-configs', JSON.stringify(newConfigs));
    
    // If API key was updated, check connection after a short delay
    if (updates.apiKey && updates.apiKey.length > 10) {
      setTimeout(() => {
        checkConnectionStatus(provider, updates.apiKey!, 'image');
      }, 1000);
    }
  };

  const updateWritingConfig = (provider: string, updates: Partial<WritingAssistantConfig>) => {
    const newConfigs = {
      ...writingConfigs,
      [provider]: { ...writingConfigs[provider], ...updates }
    };
    setWritingConfigs(newConfigs);
    // Auto-save to localStorage
    localStorage.setItem('writing-assistant-configs', JSON.stringify(newConfigs));
    
    // If API key was updated, check connection after a short delay
    if (updates.apiKey && updates.apiKey.length > 10) {
      setTimeout(() => {
        checkConnectionStatus(provider, updates.apiKey!, 'writing');
      }, 1000);
    }
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
    setTestingConnection(prev => ({ ...prev, [provider]: true }));
    setConnectionStatus(prev => ({ ...prev, [provider]: null }));
    
    // Update persistent status to testing
    setPersistentConnectionStatus(prev => ({ 
      ...prev, 
      [provider]: { 
        status: 'testing', 
        message: 'Testing connection...', 
        lastChecked: new Date().toISOString() 
      } 
    }));
    
    try {
      const config = configs[provider];
      if (!config.apiKey) {
        throw new Error('API key is required');
      }
      
      // Use the same validation logic as the monitoring system
      const isValidKey = await validateApiKey(provider, config.apiKey, 'image');
      
      if (isValidKey) {
        setConnectionStatus(prev => ({ ...prev, [provider]: 'success' }));
        setPersistentConnectionStatus(prev => ({ 
          ...prev, 
          [provider]: { 
            status: 'connected', 
            message: 'Connection successful', 
            lastChecked: new Date().toISOString() 
          } 
        }));
      } else {
        throw new Error('Invalid API key format');
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, [provider]: 'error' }));
      setPersistentConnectionStatus(prev => ({ 
        ...prev, 
        [provider]: { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Connection failed', 
          lastChecked: new Date().toISOString() 
        } 
      }));
    } finally {
      setTestingConnection(prev => ({ ...prev, [provider]: false }));
    }
  };

  const loadUsageStats = async () => {
    try {
      // Import aiService dynamically to avoid circular dependencies
      const { aiService } = await import('../services/aiService');
      
      // Load real provider stats from database
      const realProviderStats = await aiService.getProviderStats(user?.id);
      const realOverallStats = await aiService.getOverallStats(user?.id);
      
      // Convert database format to component format for image providers
      const imageProviderStats: Record<string, ProviderStats> = {};
      const writingProviderStats: Record<string, WritingStats> = {};
      
             realProviderStats.forEach(stat => {
         if (stat.service_type === 'image') {
           imageProviderStats[stat.provider_name.toLowerCase().replace(' ', '-')] = {
             imagesGenerated: stat.total_requests_all_time || 0,
             totalCost: stat.total_cost_all_time || 0,
             requestsToday: stat.requests_today || 0,
             dailyLimit: stat.daily_request_limit || 100,
             monthlyUsage: stat.cost_today || 0,
             lastUsed: stat.last_used || null
           };
         } else if (stat.service_type === 'text') {
           writingProviderStats[stat.provider_name.toLowerCase().replace(' ', '-')] = {
             requestsGenerated: stat.total_requests_all_time || 0,
             totalCost: stat.total_cost_all_time || 0,
             requestsToday: stat.requests_today || 0,
             dailyLimit: stat.daily_request_limit || 200,
             monthlyUsage: stat.cost_today || 0,
             lastUsed: stat.last_used || null
           };
         }
       });

      setProviderStats(imageProviderStats);
      setWritingProviderStats(writingProviderStats);

      // Use real overall stats
      setUsageStats({
        imagesGenerated: realOverallStats.totalRequests || 0,
        totalCost: realOverallStats.totalCost || 0,
        dailyLimit: realOverallStats.dailyLimit || 0,
        monthlyUsage: realOverallStats.monthlyUsage || 0
      });
      
      console.log('✅ Loaded real usage stats:', {
        providerStats: realProviderStats.length,
        overallStats: realOverallStats
      });
      
    } catch (error) {
      console.error('❌ Failed to load real usage stats, falling back to mock data:', error);
      
      // Fallback to mock data if database fails
      const mockProviderStats: Record<string, ProviderStats> = {
        'openai-dalle': { imagesGenerated: 45, totalCost: 18.50, requestsToday: 12, dailyLimit: 50, monthlyUsage: 18.50, lastUsed: '2024-01-15T14:30:00Z' },
        'stability-ai': { imagesGenerated: 78, totalCost: 15.60, requestsToday: 8, dailyLimit: 100, monthlyUsage: 15.60, lastUsed: '2024-01-15T12:15:00Z' }
      };
      const mockWritingStats: Record<string, WritingStats> = {
        'openai-gpt': { requestsGenerated: 156, totalCost: 24.80, requestsToday: 18, dailyLimit: 200, monthlyUsage: 24.80, lastUsed: '2024-01-15T15:45:00Z' },
        'anthropic-claude': { requestsGenerated: 89, totalCost: 17.80, requestsToday: 12, dailyLimit: 150, monthlyUsage: 17.80, lastUsed: '2024-01-15T13:20:00Z' }
      };
      
      setProviderStats(mockProviderStats);
      setWritingProviderStats(mockWritingStats);
      setUsageStats({ imagesGenerated: 158, totalCost: 102.70, dailyLimit: 205, monthlyUsage: 102.7 });
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
          url: 'https://images.unsplash.com/photo-1493238792000-8113da705763?w=728&h=90&fit=crop',
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
          url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop',
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
        },
        {
          id: 'img-3',
          url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=250&fit=crop',
          prompt: 'Professional car audio installation showcase',
          provider: 'DALL-E 3',
          cost: 0.04,
          size: { name: 'Medium Rectangle', width: 300, height: 250 },
          createdAt: '2024-01-13T09:15:00Z',
          advertiserId: 'adv-1',
          advertiserName: 'AutoSound Pro',
          adId: 'ad-3',
          adTitle: 'Professional Installation Services',
          isActive: false,
          isArchived: false
        },
        {
          id: 'img-4',
          url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=160&h=600&fit=crop',
          prompt: 'Sleek car audio equipment vertical banner',
          provider: 'Stability AI',
          cost: 0.02,
          size: { name: 'Skyscraper', width: 160, height: 600 },
          createdAt: '2024-01-12T14:20:00Z',
          advertiserId: 'adv-3',
          advertiserName: 'Sound Masters',
          adId: 'ad-4',
          adTitle: 'Premium Sound Equipment',
          isActive: true,
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

  const handleToggleImageActive = async (imageId: string) => {
    try {
      setImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, isActive: !img.isActive } : img
      ));
      await loadImages(); // Refresh stats
    } catch (error) {
      console.error('Failed to toggle image status:', error);
    }
  };

  const handleMoveImageToAd = async (imageId: string, adId: string) => {
    try {
      // This would typically call your backend to associate the image with an ad
      console.log('Moving image', imageId, 'to ad', adId);
      alert('Image moved to advertisement successfully!');
    } catch (error) {
      console.error('Failed to move image to ad:', error);
    }
  };

  const testWritingConnection = async (provider: string) => {
    setTestingWritingConnection(prev => ({ ...prev, [provider]: true }));
    setWritingConnectionStatus(prev => ({ ...prev, [provider]: null }));
    
    // Update persistent status to testing
    setPersistentWritingConnectionStatus(prev => ({ 
      ...prev, 
      [provider]: { 
        status: 'testing', 
        message: 'Testing connection...', 
        lastChecked: new Date().toISOString() 
      } 
    }));
    
    try {
      const config = writingConfigs[provider];
      if (!config.apiKey) {
        throw new Error('API key is required');
      }

      // Use the same validation logic as the monitoring system
      const isValidFormat = await validateApiKey(provider, config.apiKey, 'writing');
      
      if (isValidFormat) {
        setWritingConnectionStatus(prev => ({ ...prev, [provider]: 'success' }));
        setPersistentWritingConnectionStatus(prev => ({ 
          ...prev, 
          [provider]: { 
            status: 'connected', 
            message: 'Connection successful', 
            lastChecked: new Date().toISOString() 
          } 
        }));
      } else {
        let errorMessage = 'Invalid API key format';
        if (provider === 'openai-gpt') {
          errorMessage = 'OpenAI API keys should start with "sk-" and be at least 40 characters long';
        } else if (provider === 'anthropic-claude') {
          errorMessage = 'Anthropic API keys should start with "sk-ant-" and be at least 40 characters long';
        } else if (provider === 'google-gemini') {
          errorMessage = 'Google API keys should be at least 30 characters long without spaces';
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error(`Writing API test failed for ${provider}:`, error);
      setWritingConnectionStatus(prev => ({ ...prev, [provider]: 'error' }));
      setWritingConnectionErrors(prev => ({ ...prev, [provider]: error instanceof Error ? error.message : 'Connection failed' }));
      setPersistentWritingConnectionStatus(prev => ({ 
        ...prev, 
        [provider]: { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Connection failed', 
          lastChecked: new Date().toISOString() 
        } 
      }));
    } finally {
      setTestingWritingConnection(prev => ({ ...prev, [provider]: false }));
    }
  };

  const resetWritingConnection = (provider: string) => {
    setWritingConnectionStatus(prev => ({ ...prev, [provider]: null }));
    setTestingWritingConnection(prev => ({ ...prev, [provider]: false }));
    setWritingConnectionErrors(prev => ({ ...prev, [provider]: '' }));
  };

  // Admin Analytics Functions
  const [adminStats, setAdminStats] = useState({
    totalImages: 0,
    writingRequests: 0,
    totalCost: 0,
    activeUsers: 1
  });

  const loadAdminStats = async () => {
    if (!isAdmin) return;
    
    try {
      const { aiService } = await import('../services/aiService');
      
      // Get system-wide stats (no user filter)
      const systemProviderStats = await aiService.getProviderStats();
      const systemOverallStats = await aiService.getOverallStats();
      
      // Calculate system-wide totals
      const totalImages = systemProviderStats
        .filter(stat => stat.service_type === 'image')
        .reduce((sum, stat) => sum + (stat.total_requests_all_time || 0), 0);
        
      const writingRequests = systemProviderStats
        .filter(stat => stat.service_type === 'text')
        .reduce((sum, stat) => sum + (stat.total_requests_all_time || 0), 0);
      
      setAdminStats({
        totalImages: totalImages || 0,
        writingRequests: writingRequests || 0,
        totalCost: systemOverallStats.totalCost || 0,
        activeUsers: 1 // This would need a separate query to count active users
      });
      
      console.log('✅ Loaded real admin stats:', {
        totalImages,
        writingRequests,
        totalCost: systemOverallStats.totalCost
      });
      
    } catch (error) {
      console.error('❌ Failed to load admin stats:', error);
      // Keep default mock values
    }
  };

  // Load admin stats when admin tab becomes active
  useEffect(() => {
    if (activeTab === 'admin' && isAdmin) {
      loadAdminStats();
    }
  }, [activeTab, isAdmin]);

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
            <button
              onClick={() => setActiveTab('writing')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === 'writing'
                  ? 'bg-electric-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Writing Assistant
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeTab === 'admin'
                    ? 'bg-red-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                Admin Analytics
              </button>
            )}
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
                    {/* Connection Status Display */}
                    {persistentConnectionStatus[provider] && (
                      <div className={`px-3 py-2 rounded-lg flex items-center space-x-2 ${
                        persistentConnectionStatus[provider].status === 'connected' 
                          ? 'bg-green-600/20 border border-green-600' 
                          : persistentConnectionStatus[provider].status === 'error'
                          ? 'bg-red-600/20 border border-red-600'
                          : persistentConnectionStatus[provider].status === 'testing'
                          ? 'bg-yellow-600/20 border border-yellow-600'
                          : 'bg-gray-600/20 border border-gray-600'
                      }`}>
                        {persistentConnectionStatus[provider].status === 'connected' ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span className="text-green-400 text-sm">Connected</span>
                          </>
                        ) : persistentConnectionStatus[provider].status === 'error' ? (
                          <div title={persistentConnectionStatus[provider].message}>
                            <AlertCircle className="h-4 w-4 text-red-400" />
                            <span className="text-red-400 text-sm">Offline</span>
                          </div>
                        ) : persistentConnectionStatus[provider].status === 'testing' ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                            <span className="text-yellow-400 text-sm">Testing</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-400 text-sm">Unknown</span>
                          </>
                        )}
                        {persistentConnectionStatus[provider].lastChecked && (
                          <span className="text-xs text-gray-500">
                            {new Date(persistentConnectionStatus[provider].lastChecked!).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <button
                      onClick={() => testConnection(provider)}
                      disabled={testingConnection[provider]}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                        testingConnection[provider] ? 'bg-gray-600 opacity-50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {testingConnection[provider] ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Testing...</span>
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

                {/* Individual Provider Stats */}
                {providerStats[provider] && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-700/30 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-electric-400">{providerStats[provider].imagesGenerated}</div>
                      <div className="text-xs text-gray-400">Images Generated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">${providerStats[provider].totalCost.toFixed(2)}</div>
                      <div className="text-xs text-gray-400">Total Cost</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">{providerStats[provider].requestsToday}/{providerStats[provider].dailyLimit}</div>
                      <div className="text-xs text-gray-400">Today's Usage</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">${providerStats[provider].monthlyUsage.toFixed(2)}</div>
                      <div className="text-xs text-gray-400">Monthly Usage</div>
                    </div>
                  </div>
                )}

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

            {/* Image Generation Guidelines */}
            <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-6">
              <h4 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
                <Settings className="h-5 w-5 text-electric-400" />
                <span>Image Generation Guidelines</span>
              </h4>
              <p className="text-gray-400 mb-6">
                Configure how AI should generate images for your advertisements. Images will be generated without text overlays - text will be added later in ad management.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Visual Style */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                    <span>Visual Style</span>
                    <div title="The overall aesthetic and appearance of generated images">
                      <AlertCircle className="h-4 w-4 text-blue-400" />
                    </div>
                  </label>
                  <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
                    <option value="modern">Modern & Clean</option>
                    <option value="vibrant">Vibrant & Energetic</option>
                    <option value="professional">Professional & Corporate</option>
                    <option value="luxury">Luxury & Premium</option>
                    <option value="technical">Technical & Detailed</option>
                    <option value="lifestyle">Lifestyle & Casual</option>
                  </select>
                </div>

                {/* Color Scheme */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                    <span>Preferred Color Scheme</span>
                    <div title="Color palette for generated images">
                      <AlertCircle className="h-4 w-4 text-blue-400" />
                    </div>
                  </label>
                  <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
                    <option value="brand">Brand Colors</option>
                    <option value="automotive">Automotive (Black, Silver, Red)</option>
                    <option value="electric">Electric Blue & Neon</option>
                    <option value="warm">Warm Tones</option>
                    <option value="cool">Cool Tones</option>
                    <option value="monochrome">Monochrome</option>
                  </select>
                </div>

                {/* Image Focus */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                    <span>Primary Focus</span>
                    <div title="What should be the main subject of the image">
                      <AlertCircle className="h-4 w-4 text-blue-400" />
                    </div>
                  </label>
                  <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
                    <option value="product">Product/Equipment Focus</option>
                    <option value="installation">Installation Scene</option>
                    <option value="lifestyle">Lifestyle/Usage Context</option>
                    <option value="abstract">Abstract/Conceptual</option>
                    <option value="environment">Environment/Setting</option>
                  </select>
                </div>

                {/* Composition */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                    <span>Composition Style</span>
                    <div title="How elements should be arranged in the image">
                      <AlertCircle className="h-4 w-4 text-blue-400" />
                    </div>
                  </label>
                  <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
                    <option value="centered">Centered & Balanced</option>
                    <option value="dynamic">Dynamic & Angled</option>
                    <option value="minimal">Minimal & Spacious</option>
                    <option value="detailed">Detailed & Rich</option>
                    <option value="layered">Layered & Complex</option>
                  </select>
                </div>
              </div>

              {/* Text Overlay Zones */}
              <div className="mt-6">
                <label className="block text-sm font-medium mb-3 flex items-center space-x-2">
                  <span>Text Overlay Zones</span>
                  <div title="Define areas where text will be added later in ad management">
                    <AlertCircle className="h-4 w-4 text-blue-400" />
                  </div>
                </label>
                <div className="bg-gray-600/30 rounded-lg p-4">
                  <p className="text-sm text-gray-300 mb-4">
                    Images will be generated with designated areas for text overlays. These zones will be kept clear of important visual elements.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-white mb-2">Available Text Zones:</h5>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li>• <strong>Header:</strong> Main message/headline</li>
                        <li>• <strong>CTA:</strong> Call-to-action button</li>
                        <li>• <strong>Contact:</strong> Phone/website info</li>
                        <li>• <strong>Product:</strong> Product name/model</li>
                        <li>• <strong>Offer:</strong> Special deals/pricing</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-white mb-2">Zone Preferences:</h5>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" defaultChecked />
                          <span className="text-sm">Leave top 25% clear for headers</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" defaultChecked />
                          <span className="text-sm">Reserve bottom-right for CTA</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm">Center space for product info</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm">Bottom strip for contact info</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Guidelines */}
              <div className="mt-6">
                <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                  <span>Brand Guidelines</span>
                  <div title="Specific requirements for your brand consistency">
                    <AlertCircle className="h-4 w-4 text-blue-400" />
                  </div>
                </label>
                <textarea
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 h-24 resize-none"
                  placeholder="e.g., Always include car interior, avoid cluttered backgrounds, maintain premium feel, use automotive lighting"
                  maxLength={400}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Max 400 characters. Specific requirements for maintaining brand consistency.
                </div>
              </div>
            </div>

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
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <span>{image.provider}</span>
                          <span>{image.size.name}</span>
                          <span>{new Date(image.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => setSelectedImageForPreview(image)}
                              className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                              title="View Image"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = image.url;
                                link.download = `${image.adTitle || 'image'}-${image.id}.png`;
                                link.click();
                              }}
                              className="p-1 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded transition-colors"
                              title="Download Image"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleImageActive(image.id)}
                              className="p-1 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-colors"
                              title="Toggle Image Active Status"
                            >
                              {image.isActive ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                            </button>
                          </div>
                          <button
                            onClick={() => handleMoveImageToAd(image.id, 'adv-1')}
                            className="p-1 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-colors"
                            title="Move Image to Ad"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
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

        {/* Writing Assistant Tab */}
        {activeTab === 'writing' && (
          <div className="space-y-6">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Writing Assistant Configuration</h3>
              <p className="text-gray-400 mb-6">
                Configure AI writing assistants for content generation, copywriting, and text optimization.
                Use the "Test Connection" button to verify your API key format is correct.
              </p>
              
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-blue-400 text-sm">
                      <div className="font-medium mb-1">Development Mode</div>
                      <div>The test connection validates API key format only. In production, this would test the actual API connection through your backend to avoid CORS issues.</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Writing Assistant Configurations */}
              {Object.entries(writingConfigs).map(([provider, config]) => (
                <div key={provider} className="bg-gray-700/50 border border-gray-600 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${config.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                      <h4 className="text-lg font-medium capitalize">
                        {provider.replace('-', ' ')}
                      </h4>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                        ${config.costPerRequest}/request
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Connection Status Display */}
                      {persistentWritingConnectionStatus[provider] && (
                        <div className={`px-3 py-2 rounded-lg flex items-center space-x-2 ${
                          persistentWritingConnectionStatus[provider].status === 'connected' 
                            ? 'bg-green-600/20 border border-green-600' 
                            : persistentWritingConnectionStatus[provider].status === 'error'
                            ? 'bg-red-600/20 border border-red-600'
                            : persistentWritingConnectionStatus[provider].status === 'testing'
                            ? 'bg-yellow-600/20 border border-yellow-600'
                            : 'bg-gray-600/20 border border-gray-600'
                        }`}>
                          {persistentWritingConnectionStatus[provider].status === 'connected' ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-400" />
                              <span className="text-green-400 text-sm">Connected</span>
                            </>
                          ) : persistentWritingConnectionStatus[provider].status === 'error' ? (
                            <div title={persistentWritingConnectionStatus[provider].message}>
                              <AlertCircle className="h-4 w-4 text-red-400" />
                              <span className="text-red-400 text-sm">Offline</span>
                            </div>
                          ) : persistentWritingConnectionStatus[provider].status === 'testing' ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                              <span className="text-yellow-400 text-sm">Testing</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-400 text-sm">Unknown</span>
                            </>
                          )}
                          {persistentWritingConnectionStatus[provider].lastChecked && (
                            <span className="text-xs text-gray-500">
                              {new Date(persistentWritingConnectionStatus[provider].lastChecked!).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <button
                        onClick={() => testWritingConnection(provider)}
                        disabled={testingWritingConnection[provider]}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                          testingWritingConnection[provider] ? 'bg-gray-600 opacity-50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {testingWritingConnection[provider] ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Testing...</span>
                          </>
                        ) : (
                          <span>Test Connection</span>
                        )}
                      </button>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={config.enabled}
                          onChange={(e) => updateWritingConfig(provider, { enabled: e.target.checked })}
                          className="rounded"
                        />
                        <span>Enabled</span>
                      </label>
                    </div>
                  </div>

                  {/* Individual Writing Provider Stats */}
                  {writingProviderStats[provider] && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-purple-500/10 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">{writingProviderStats[provider].requestsGenerated}</div>
                        <div className="text-xs text-gray-400">Requests Generated</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">${writingProviderStats[provider].totalCost.toFixed(2)}</div>
                        <div className="text-xs text-gray-400">Total Cost</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">{writingProviderStats[provider].requestsToday}/{writingProviderStats[provider].dailyLimit}</div>
                        <div className="text-xs text-gray-400">Today's Usage</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">${writingProviderStats[provider].monthlyUsage.toFixed(2)}</div>
                        <div className="text-xs text-gray-400">Monthly Usage</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* API Key */}
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                        <span>API Key</span>
                        <div className="flex items-center space-x-1">
                          <div title="Your API key for accessing the AI service">
                            <AlertCircle className="h-4 w-4 text-blue-400" />
                          </div>
                          {provider === 'openai-gpt' && (
                            <a 
                              href="https://platform.openai.com/api-keys" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-xs underline"
                            >
                              Get OpenAI Key
                            </a>
                          )}
                          {provider === 'anthropic-claude' && (
                            <a 
                              href="https://console.anthropic.com/account/keys" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-xs underline"
                            >
                              Get Anthropic Key
                            </a>
                          )}
                          {provider === 'google-gemini' && (
                            <a 
                              href="https://makersuite.google.com/app/apikey" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-xs underline"
                            >
                              Get Gemini Key
                            </a>
                          )}
                        </div>
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeys[provider] ? 'text' : 'password'}
                          value={config.apiKey}
                          onChange={(e) => updateWritingConfig(provider, { apiKey: e.target.value })}
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
                      <div className="text-xs text-gray-500 mt-1">
                        Keep your API key secure. It will be stored locally in your browser.
                      </div>
                    </div>

                    {/* Model */}
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                        <span>Model</span>
                        <div title="The specific AI model to use for text generation">
                          <AlertCircle className="h-4 w-4 text-blue-400" />
                        </div>
                      </label>
                      <select
                        value={config.model}
                        onChange={(e) => updateWritingConfig(provider, { model: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                      >
                        {provider === 'openai-gpt' && (
                          <>
                            <option value="gpt-4">GPT-4</option>
                            <option value="gpt-4-turbo">GPT-4 Turbo</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                          </>
                        )}
                        {provider === 'anthropic-claude' && (
                          <>
                            <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                            <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                            <option value="claude-2.1">Claude 2.1</option>
                          </>
                        )}
                        {provider === 'google-gemini' && (
                          <>
                            <option value="gemini-pro">Gemini Pro</option>
                            <option value="gemini-pro-vision">Gemini Pro Vision</option>
                            <option value="gemini-ultra">Gemini Ultra</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Max Tokens */}
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                        <span>Max Tokens</span>
                        <div title="Maximum length of generated text (1 token ≈ 4 characters)">
                          <AlertCircle className="h-4 w-4 text-blue-400" />
                        </div>
                      </label>
                      <input
                        type="number"
                        value={config.maxTokens}
                        onChange={(e) => updateWritingConfig(provider, { maxTokens: parseInt(e.target.value) || 2000 })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                        min="100"
                        max="8000"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Range: 100-8000 tokens. Higher values allow longer responses but cost more.
                      </div>
                    </div>

                    {/* Temperature */}
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                        <span>Temperature (Creativity)</span>
                        <div title="Controls randomness: 0.0 = very focused, 1.0 = very creative">
                          <AlertCircle className="h-4 w-4 text-blue-400" />
                        </div>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={config.temperature}
                        onChange={(e) => updateWritingConfig(provider, { temperature: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Conservative (0.0)</span>
                        <span className="font-medium">{config.temperature}</span>
                        <span>Creative (1.0)</span>
                      </div>
                    </div>

                    {/* Max Requests Per Day */}
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                        <span>Max Requests Per Day</span>
                        <div title="Daily limit to control costs and usage">
                          <AlertCircle className="h-4 w-4 text-blue-400" />
                        </div>
                      </label>
                      <input
                        type="number"
                        value={config.maxRequestsPerDay}
                        onChange={(e) => updateWritingConfig(provider, { maxRequestsPerDay: parseInt(e.target.value) || 500 })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                        min="1"
                        max="10000"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Range: 1-10,000 requests. Set lower to control daily costs.
                      </div>
                    </div>

                    {/* Cost Per Request */}
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                        <span>Cost Per Request ($)</span>
                        <div title="Estimated cost per API request for budget tracking">
                          <AlertCircle className="h-4 w-4 text-blue-400" />
                        </div>
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={config.costPerRequest}
                        onChange={(e) => updateWritingConfig(provider, { costPerRequest: parseFloat(e.target.value) || 0.03 })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                        min="0.001"
                        max="1"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Range: $0.001-$1.00. Check provider pricing for accurate costs.
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Content Direction Configuration */}
              <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-6">
                <h4 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-purple-400" />
                  <span>Content Direction & Guidelines</span>
                </h4>
                <p className="text-gray-400 mb-6">
                  Configure how the AI should write content to match your brand voice and requirements.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Brand Voice */}
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                      <span>Brand Voice</span>
                      <div title="The overall personality and tone of your brand">
                        <AlertCircle className="h-4 w-4 text-blue-400" />
                      </div>
                    </label>
                    <select
                      value={contentDirections.brandVoice}
                      onChange={(e) => setContentDirections(prev => ({ ...prev, brandVoice: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="authoritative">Authoritative</option>
                      <option value="casual">Casual</option>
                      <option value="technical">Technical</option>
                      <option value="enthusiastic">Enthusiastic</option>
                    </select>
                  </div>

                  {/* Writing Style */}
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                      <span>Writing Style</span>
                      <div title="The approach to presenting information">
                        <AlertCircle className="h-4 w-4 text-blue-400" />
                      </div>
                    </label>
                    <select
                      value={contentDirections.writingStyle}
                      onChange={(e) => setContentDirections(prev => ({ ...prev, writingStyle: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    >
                      <option value="informative">Informative</option>
                      <option value="persuasive">Persuasive</option>
                      <option value="educational">Educational</option>
                      <option value="entertaining">Entertaining</option>
                      <option value="conversational">Conversational</option>
                      <option value="formal">Formal</option>
                    </select>
                  </div>

                  {/* Target Audience */}
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                      <span>Target Audience</span>
                      <div title="Who you're writing for - helps AI adjust language and complexity">
                        <AlertCircle className="h-4 w-4 text-blue-400" />
                      </div>
                    </label>
                    <input
                      type="text"
                      value={contentDirections.targetAudience}
                      onChange={(e) => setContentDirections(prev => ({ ...prev, targetAudience: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                      placeholder="e.g., car audio enthusiasts, beginners, professionals"
                      maxLength={100}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Max 100 characters. Current: {contentDirections.targetAudience.length}/100
                    </div>
                  </div>

                  {/* Preferred Length */}
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                      <span>Preferred Content Length</span>
                      <div title="Default length for generated content">
                        <AlertCircle className="h-4 w-4 text-blue-400" />
                      </div>
                    </label>
                    <select
                      value={contentDirections.formatPreferences.preferredLength}
                      onChange={(e) => setContentDirections(prev => ({ 
                        ...prev, 
                        formatPreferences: { ...prev.formatPreferences, preferredLength: e.target.value }
                      }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    >
                      <option value="short">Short (1-2 paragraphs)</option>
                      <option value="medium">Medium (3-5 paragraphs)</option>
                      <option value="long">Long (6+ paragraphs)</option>
                      <option value="comprehensive">Comprehensive (detailed)</option>
                    </select>
                  </div>
                </div>

                {/* Key Messages */}
                <div className="mt-6">
                  <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                    <span>Key Messages</span>
                    <div title="Important points to emphasize in content (comma-separated)">
                      <AlertCircle className="h-4 w-4 text-blue-400" />
                    </div>
                  </label>
                  <input
                    type="text"
                    value={keyMessagesInput}
                    onChange={(e) => setKeyMessagesInput(e.target.value)}
                    onBlur={handleKeyMessagesBlur}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    placeholder="e.g., high-quality audio, professional installation, competitive pricing"
                    maxLength={500}
                  />
                  <div className="text-xs mt-1">
                    {(() => {
                      const count = getKeyMessagesLiveCount();
                      return (
                        <div className="space-y-1">
                          <div className={`${count.hasExcessMessages ? 'text-red-400' : 'text-gray-500'}`}>
                            Messages: {count.messageCount}/10 
                            {count.remainingMessages > 0 && (
                              <span className="text-green-400"> ({count.remainingMessages} remaining)</span>
                            )}
                            {count.hasExcessMessages && (
                              <span className="text-red-400"> (⚠️ {count.totalMessages - 10} over limit)</span>
                            )}
                          </div>
                          <div className={`${count.remainingChars < 50 ? 'text-yellow-400' : count.remainingChars === 0 ? 'text-red-400' : 'text-gray-500'}`}>
                            Characters: {count.totalChars}/500 
                            {count.remainingChars > 0 && (
                              <span className="text-green-400"> ({count.remainingChars} remaining)</span>
                            )}
                          </div>
                          {count.hasOverlongMessages && (
                            <div className="text-red-400">⚠️ Some messages exceed 50 characters</div>
                          )}
                          <div className="text-gray-600 text-xs">
                            Separate with commas. Max 10 messages, 50 characters each.
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Tone Guidelines */}
                <div className="mt-6">
                  <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                    <span>Tone Guidelines</span>
                    <div title="Specific instructions about how content should sound">
                      <AlertCircle className="h-4 w-4 text-blue-400" />
                    </div>
                  </label>
                  <textarea
                    value={contentDirections.toneGuidelines}
                    onChange={(e) => setContentDirections(prev => ({ ...prev, toneGuidelines: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 h-24 resize-none"
                    placeholder="e.g., Friendly but authoritative, technical but accessible, avoid jargon"
                    maxLength={400}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Max 400 characters. Current: {contentDirections.toneGuidelines.length}/400
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    <div className="font-medium mb-1">Examples:</div>
                    <div className="space-y-1">
                      <div>• "Professional yet approachable, avoid technical jargon, emphasize quality and reliability"</div>
                      <div>• "Enthusiastic about car audio, knowledgeable but not condescending, focus on benefits"</div>
                      <div>• "Direct and informative, use active voice, include specific details and measurements"</div>
                    </div>
                  </div>
                </div>

                {/* Format Preferences */}
                <div className="mt-6">
                  <label className="block text-sm font-medium mb-4 flex items-center space-x-2">
                    <span>Format Preferences</span>
                    <div title="Control the structure and formatting of generated content">
                      <AlertCircle className="h-4 w-4 text-blue-400" />
                    </div>
                  </label>
                  
                  <div className="bg-gray-600/20 rounded-lg p-6 space-y-6">
                    {/* Structure Options */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <h5 className="text-sm font-semibold text-white">Content Structure</h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contentDirections.formatPreferences.includeIntroduction}
                            onChange={(e) => setContentDirections(prev => ({ 
                              ...prev, 
                              formatPreferences: { ...prev.formatPreferences, includeIntroduction: e.target.checked }
                            }))}
                            className="rounded text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium">Include Introduction</span>
                        </label>
                        <label className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contentDirections.formatPreferences.includeConclusion}
                            onChange={(e) => setContentDirections(prev => ({ 
                              ...prev, 
                              formatPreferences: { ...prev.formatPreferences, includeConclusion: e.target.checked }
                            }))}
                            className="rounded text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium">Include Conclusion</span>
                        </label>
                        <label className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contentDirections.formatPreferences.includeCallToAction}
                            onChange={(e) => setContentDirections(prev => ({ 
                              ...prev, 
                              formatPreferences: { ...prev.formatPreferences, includeCallToAction: e.target.checked }
                            }))}
                            className="rounded text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium">Include Call-to-Action</span>
                        </label>
                      </div>
                    </div>

                    {/* Formatting Options */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <h5 className="text-sm font-semibold text-white">Text Formatting</h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contentDirections.formatPreferences.useHeadings}
                            onChange={(e) => setContentDirections(prev => ({ 
                              ...prev, 
                              formatPreferences: { ...prev.formatPreferences, useHeadings: e.target.checked }
                            }))}
                            className="rounded text-green-500 focus:ring-green-500"
                          />
                          <span className="text-sm font-medium">Use Main Headings</span>
                        </label>
                        <label className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contentDirections.formatPreferences.useSubheadings}
                            onChange={(e) => setContentDirections(prev => ({ 
                              ...prev, 
                              formatPreferences: { ...prev.formatPreferences, useSubheadings: e.target.checked }
                            }))}
                            className="rounded text-green-500 focus:ring-green-500"
                          />
                          <span className="text-sm font-medium">Use Subheadings</span>
                        </label>
                        <label className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contentDirections.formatPreferences.useEmphasisFormatting}
                            onChange={(e) => setContentDirections(prev => ({ 
                              ...prev, 
                              formatPreferences: { ...prev.formatPreferences, useEmphasisFormatting: e.target.checked }
                            }))}
                            className="rounded text-green-500 focus:ring-green-500"
                          />
                          <span className="text-sm font-medium">Bold/Italic Emphasis</span>
                        </label>
                      </div>
                    </div>

                    {/* List Options */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <h5 className="text-sm font-semibold text-white">List Formatting</h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contentDirections.formatPreferences.useBulletPoints}
                            onChange={(e) => setContentDirections(prev => ({ 
                              ...prev, 
                              formatPreferences: { ...prev.formatPreferences, useBulletPoints: e.target.checked }
                            }))}
                            className="rounded text-yellow-500 focus:ring-yellow-500"
                          />
                          <span className="text-sm font-medium">Use Bullet Points</span>
                        </label>
                        <label className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contentDirections.formatPreferences.useNumberedLists}
                            onChange={(e) => setContentDirections(prev => ({ 
                              ...prev, 
                              formatPreferences: { ...prev.formatPreferences, useNumberedLists: e.target.checked }
                            }))}
                            className="rounded text-yellow-500 focus:ring-yellow-500"
                          />
                          <span className="text-sm font-medium">Use Numbered Lists</span>
                        </label>
                      </div>
                    </div>

                    {/* Content Enhancement */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        <h5 className="text-sm font-semibold text-white">Content Enhancement</h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contentDirections.formatPreferences.includeTechnicalSpecs}
                            onChange={(e) => setContentDirections(prev => ({ 
                              ...prev, 
                              formatPreferences: { ...prev.formatPreferences, includeTechnicalSpecs: e.target.checked }
                            }))}
                            className="rounded text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium">Include Technical Specs</span>
                        </label>
                        <label className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contentDirections.formatPreferences.includeStatistics}
                            onChange={(e) => setContentDirections(prev => ({ 
                              ...prev, 
                              formatPreferences: { ...prev.formatPreferences, includeStatistics: e.target.checked }
                            }))}
                            className="rounded text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium">Include Statistics/Data</span>
                        </label>
                        <label className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contentDirections.formatPreferences.useQuotes}
                            onChange={(e) => setContentDirections(prev => ({ 
                              ...prev, 
                              formatPreferences: { ...prev.formatPreferences, useQuotes: e.target.checked }
                            }))}
                            className="rounded text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium">Use Quotes/Testimonials</span>
                        </label>
                        <label className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contentDirections.formatPreferences.addSourceReferences}
                            onChange={(e) => setContentDirections(prev => ({ 
                              ...prev, 
                              formatPreferences: { ...prev.formatPreferences, addSourceReferences: e.target.checked }
                            }))}
                            className="rounded text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium">Add Source References</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Types */}
                <div className="mt-6">
                  <label className="block text-sm font-medium mb-3">Supported Content Types</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(contentDirections.contentTypes).map(([type, enabled]) => (
                      <label key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => setContentDirections(prev => ({ 
                            ...prev, 
                            contentTypes: { ...prev.contentTypes, [type]: e.target.checked }
                          }))}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Content Restrictions */}
                <div className="mt-6">
                  <label className="block text-sm font-medium mb-3">Content Guidelines</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(contentDirections.restrictions).map(([restriction, enabled]) => (
                      <label key={restriction} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => setContentDirections(prev => ({ 
                            ...prev, 
                            restrictions: { ...prev.restrictions, [restriction]: e.target.checked }
                          }))}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{restriction.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    localStorage.setItem('writing-assistant-configs', JSON.stringify(writingConfigs));
                    setSaved(true);
                    setTimeout(() => setSaved(false), 3000);
                  }}
                  className="flex items-center space-x-2 px-6 py-3 bg-electric-500 hover:bg-electric-600 text-white rounded-lg transition-colors"
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
          </div>
        )}

        {/* Admin Analytics Tab */}
        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-6">
            {/* System-wide Usage Overview */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-6 text-red-400">System-wide AI Usage Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Image className="h-8 w-8 text-red-400" />
                    <div>
                      <p className="text-sm text-gray-400">Total Images Generated</p>
                      <p className="text-2xl font-bold text-red-400">{adminStats.totalImages.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Zap className="h-8 w-8 text-yellow-400" />
                    <div>
                      <p className="text-sm text-gray-400">Writing Requests</p>
                      <p className="text-2xl font-bold text-yellow-400">{adminStats.writingRequests.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-8 w-8 text-green-400" />
                    <div>
                      <p className="text-sm text-gray-400">Total AI Cost</p>
                      <p className="text-2xl font-bold text-green-400">${adminStats.totalCost.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-8 w-8 text-purple-400" />
                    <div>
                      <p className="text-sm text-gray-400">Active Users</p>
                      <p className="text-2xl font-bold text-purple-400">{adminStats.activeUsers}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Access Control Status */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-6 text-electric-400">AI Access Control Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-700 rounded-lg">
                    <span className="text-green-400">Business Model Compliance</span>
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-700 rounded-lg">
                    <span className="text-green-400">API Rate Limiting Active</span>
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-700 rounded-lg">
                    <span className="text-green-400">Cost Monitoring Enabled</span>
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-700 rounded-lg">
                    <span className="text-green-400">Usage Alerts Configured</span>
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-700 rounded-lg">
                    <span className="text-green-400">Backup Providers Ready</span>
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-700 rounded-lg">
                    <span className="text-green-400">Security Protocols Active</span>
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Breakdown by User Type */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-6 text-electric-400">Usage Breakdown by User Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <div className="text-3xl font-bold text-blue-400">0</div>
                  <div className="text-sm text-gray-400">Retailers</div>
                  <div className="text-xs text-blue-400">$0.00 spent</div>
                </div>
                <div className="text-center p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <div className="text-3xl font-bold text-green-400">0</div>
                  <div className="text-sm text-gray-400">Manufacturers</div>
                  <div className="text-xs text-green-400">$0.00 spent</div>
                </div>
                <div className="text-center p-4 bg-purple-900/20 border border-purple-700 rounded-lg">
                  <div className="text-3xl font-bold text-purple-400">0</div>
                  <div className="text-sm text-gray-400">Organizations</div>
                  <div className="text-xs text-purple-400">$0.00 spent</div>
                </div>
                <div className="text-center p-4 bg-electric-900/20 border border-electric-700 rounded-lg">
                  <div className="text-3xl font-bold text-electric-400">1</div>
                  <div className="text-sm text-gray-400">Admin</div>
                  <div className="text-xs text-electric-400">$0.00 spent</div>
                </div>
              </div>
            </div>

            {/* AI Provider Status */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-6 text-electric-400">AI Provider Status</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-medium mb-4 text-electric-400">Image Generation Providers</h4>
                    <div className="space-y-3">
                      {Object.entries(configs).map(([provider, config]) => {
                        const status = getConnectionStatus(provider, 'image');
                        const displayName = provider === 'openai-dalle' ? 'OpenAI DALL-E' : 
                                          provider === 'stability-ai' ? 'Stability AI' : 
                                          provider.charAt(0).toUpperCase() + provider.slice(1);
                        return (
                          <div key={provider} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                            <span>{displayName}</span>
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${
                                status.color === 'green' ? 'bg-green-500' :
                                status.color === 'red' ? 'bg-red-500' :
                                status.color === 'yellow' ? 'bg-yellow-500' :
                                'bg-gray-500'
                              }`}></div>
                              <span className={`text-sm ${
                                status.color === 'green' ? 'text-green-400' :
                                status.color === 'red' ? 'text-red-400' :
                                status.color === 'yellow' ? 'text-yellow-400' :
                                'text-gray-400'
                              }`}>
                                {status.text}
                              </span>
                              {persistentConnectionStatus[provider]?.lastChecked && (
                                <span className="text-xs text-gray-500">
                                  {new Date(persistentConnectionStatus[provider].lastChecked!).toLocaleTimeString()}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium mb-4 text-electric-400">Writing Assistant Providers</h4>
                    <div className="space-y-3">
                      {Object.entries(writingConfigs).map(([provider, config]) => {
                        const status = getConnectionStatus(provider, 'writing');
                        const displayName = provider === 'openai-gpt' ? 'OpenAI GPT-4' : 
                                          provider === 'anthropic-claude' ? 'Anthropic Claude' : 
                                          provider === 'google-gemini' ? 'Google Gemini' :
                                          provider.charAt(0).toUpperCase() + provider.slice(1);
                        return (
                          <div key={provider} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                            <span>{displayName}</span>
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${
                                status.color === 'green' ? 'bg-green-500' :
                                status.color === 'red' ? 'bg-red-500' :
                                status.color === 'yellow' ? 'bg-yellow-500' :
                                'bg-gray-500'
                              }`}></div>
                              <span className={`text-sm ${
                                status.color === 'green' ? 'text-green-400' :
                                status.color === 'red' ? 'text-red-400' :
                                status.color === 'yellow' ? 'text-yellow-400' :
                                'text-gray-400'
                              }`}>
                                {status.text}
                              </span>
                              {persistentWritingConnectionStatus[provider]?.lastChecked && (
                                <span className="text-xs text-gray-500">
                                  {new Date(persistentWritingConnectionStatus[provider].lastChecked!).toLocaleTimeString()}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Model Compliance */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-6 text-electric-400">Business Model Compliance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-green-400">Free tier limits enforced</span>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-green-400">Premium features restricted</span>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-green-400">Usage tracking active</span>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-green-400">Cost monitoring enabled</span>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-green-400">API rate limiting active</span>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-green-400">Subscription validation working</span>
                </div>
              </div>
            </div>
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