import React, { useState, useEffect, useCallback, useMemo, memo, startTransition } from 'react';
import { createPortal } from 'react-dom';
import { 
  Image as ImageIcon, 
  Play, 
  Pause, 
  Trash2, 
  BarChart3, 
  TestTube2, 
  CheckCircle, 
  Circle, 
  Eye, 
  MousePointer, 
  TrendingUp,
  AlertCircle,
  Copy,
  Download,
  Settings,
  Plus
} from 'lucide-react';
import { advertisementImageService } from '../services/advertisementImageService';
import BannerAICreator from './BannerAICreator';
import type { 
  AdvertisementImage, 
  AdvertisementABTest, 
  ImageAnalyticsData,
  ABTestAnalyticsData 
} from '../types/advertisement';
import type { GeneratedImage } from '../lib/imageGeneration';

interface AdvertisementImageManagerProps {
  advertisementId: string;
  onImageSelect?: (image: AdvertisementImage) => void;
  placement?: string;
  size?: string;
}

export default function AdvertisementImageManager({ 
  advertisementId, 
  onImageSelect,
  placement = 'sidebar',
  size = 'medium'
}: AdvertisementImageManagerProps) {
  // State management
  const [images, setImages] = useState<AdvertisementImage[]>([]);
  const [activeImage, setActiveImage] = useState<AdvertisementImage | null>(null);
  const [abTests, setABTests] = useState<AdvertisementABTest[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showAICreator, setShowAICreator] = useState(false);
  const [showABTestModal, setShowABTestModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedImageForAnalytics, setSelectedImageForAnalytics] = useState<string | null>(null);
  
  // A/B Test form
  const [abTestName, setAbTestName] = useState('');
  const [abTestDescription, setAbTestDescription] = useState('');
  const [abTestDuration, setAbTestDuration] = useState(7); // days
  const [abTestTrafficSplit, setAbTestTrafficSplit] = useState(50); // percentage for variant A
  const [abTestRotationInterval, setAbTestRotationInterval] = useState(60); // minutes
  const [abTestAutoOptimize, setAbTestAutoOptimize] = useState(false);
  
  // Analytics data
  const [analyticsData, setAnalyticsData] = useState<ImageAnalyticsData | null>(null);
  const [abTestData, setAbTestData] = useState<ABTestAnalyticsData | null>(null);

  // Load data on component mount and when advertisementId changes
  useEffect(() => {
    if (advertisementId) {
      loadImageData();
    }
  }, [advertisementId]);

  // Clear analytics data when modal closes
  useEffect(() => {
    if (!showAnalyticsModal) {
      setAnalyticsData(null);
      setSelectedImageForAnalytics(null);
    }
  }, [showAnalyticsModal]);

  // Track AI Creator modal state changes
  useEffect(() => {
    // Modal state tracking for debugging if needed
  }, [showAICreator]);

  const loadImageData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [imagesData, abTestsData] = await Promise.all([
        advertisementImageService.getAdvertisementImages(advertisementId),
        advertisementImageService.getABTests(advertisementId)
      ]);
      
      setImages(imagesData);
      setABTests(abTestsData);
      
      // Set active image
      const active = imagesData.find(img => img.status === 'active');
      setActiveImage(active || null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image data');
      console.error('Error loading image data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [advertisementId]);

  const handleActivateImage = async (imageId: string) => {
    try {
      const response = await advertisementImageService.activateImage(imageId);
      if (response.success) {
        await loadImageData(); // Refresh data
        
        // Notify parent component
        const newActiveImage = images.find(img => img.id === imageId);
        if (newActiveImage && onImageSelect) {
          onImageSelect(newActiveImage);
        }
      } else {
        setError(response.error || 'Failed to activate image');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate image');
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      const response = await advertisementImageService.deleteImage(imageId);
      if (response.success) {
        await loadImageData();
      } else {
        setError(response.error || 'Failed to delete image');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    }
  };

  const handleAIImageSelect = async (generatedImage: GeneratedImage) => {
    try {
      // Create advertisement image record
      await advertisementImageService.createAdvertisementImage({
        advertisement_id: advertisementId,
        image_url: generatedImage.url,
        image_title: generateAdName(placement, size) + ' - ' + generatedImage.prompt.substring(0, 50),
        ai_prompt: generatedImage.prompt,
        ai_provider: generatedImage.provider,
        generation_cost: generatedImage.cost,
        width: generatedImage.size.width,
        height: generatedImage.size.height
      });

      // Reload image data to show the new image
      await loadImageData();
      
      if (onImageSelect) {
        onImageSelect({
          id: 'temp-' + Date.now(),
          advertisement_id: advertisementId,
          image_url: generatedImage.url,
          image_title: generatedImage.prompt.substring(0, 100),
          status: 'inactive',
          variant_type: 'single',
          impressions: 0,
          clicks: 0,
          click_through_rate: 0,
          cost: generatedImage.cost,
          ab_test_impressions: 0,
          ab_test_clicks: 0,
          ab_test_conversions: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save generated image');
    }
  };

  const handleSetupABTest = async () => {
    if (selectedImages.length !== 2) {
      setError('Please select exactly 2 images for A/B testing');
      return;
    }

    if (!abTestName.trim()) {
      setError('Please enter a test name');
      return;
    }

    try {
      await advertisementImageService.setupABTest({
        advertisement_id: advertisementId,
        test_name: abTestName,
        test_description: abTestDescription,
        image_a_id: selectedImages[0],
        image_b_id: selectedImages[1],
        traffic_split: abTestTrafficSplit,
        confidence_level: 95,
        minimum_sample_size: 1000
      });

      await loadImageData();
      setShowABTestModal(false);
      setSelectedImages([]);
      setAbTestName('');
      setAbTestDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup A/B test');
    }
  };

  const handleViewAnalytics = useCallback(async (imageId: string) => {
    // Prevent multiple rapid calls
    if (showAnalyticsModal && selectedImageForAnalytics === imageId) {
      return;
    }
    
    try {
      // Set modal state immediately
      setSelectedImageForAnalytics(imageId);
      setShowAnalyticsModal(true);
      setAnalyticsData(null); // Clear previous data
      
      // Load analytics data
      const data = await advertisementImageService.getImageAnalytics(imageId);
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      
      // Create fallback data with error message
      const fallbackData: ImageAnalyticsData & { error?: string } = {
        image_id: imageId,
        image_url: images.find(img => img.id === imageId)?.image_url || '',
        total_impressions: 0,
        total_clicks: 0,
        avg_ctr: 0,
        total_cost: 0,
        performance_by_date: [],
        performance_by_placement: [],
        error: 'Analytics data is currently unavailable. Please ensure the database setup is completed.'
      };
      
      setAnalyticsData(fallbackData);
    }
  }, [showAnalyticsModal, selectedImageForAnalytics, images]);

  const formatCTR = (ctr: number) => `${(ctr * 100).toFixed(2)}%`;
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  // Generate automatic naming convention for ads
  const generateAdName = (placement: string, size: string, variant?: string) => {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const placementCode = placement.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const sizeCode = size.toUpperCase().slice(0, 3);
    const variantCode = variant ? `_${variant.toUpperCase()}` : '';
    return `AD_${placementCode}_${sizeCode}_${timestamp}${variantCode}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500"></div>
        <span className="ml-3 text-gray-400">Loading images...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Image Management</h3>
          <p className="text-sm text-gray-400">
            {images.length} images • {activeImage ? '1 active' : 'No active image'}
            {abTests.filter(test => test.status === 'active').length > 0 && ' • A/B test running'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowAICreator(true)}
            className="bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 transition-colors text-sm flex items-center space-x-1"
          >
            <Plus className="h-4 w-4" />
            <span>Generate with AI</span>
          </button>
          
          {selectedImages.length === 2 && (
            <button
              type="button"
              onClick={() => setShowABTestModal(true)}
              className="bg-orange-600 text-white px-3 py-1.5 rounded-md hover:bg-orange-700 transition-colors text-sm flex items-center space-x-1"
            >
              <TestTube2 className="h-4 w-4" />
                          <span>Start A/B Test</span>
          </button>
          )}

        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      )}

      {/* Active A/B Tests */}
      {abTests.filter(test => test.status === 'active').map(test => (
        <div key={test.id} className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-orange-400 font-medium flex items-center space-x-2">
              <TestTube2 className="h-4 w-4" />
              <span>A/B Test: {test.test_name}</span>
            </h4>
            <span className="text-xs text-orange-400 bg-orange-500/20 px-2 py-1 rounded">
              {test.status.toUpperCase()}
            </span>
          </div>
          {test.test_description && (
            <p className="text-gray-400 text-sm mb-3">{test.test_description}</p>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            {/* Variant A */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-2">Variant A</div>
              {(() => {
                const imageA = images.find(img => img.id === test.image_a_id);
                return imageA ? (
                  <div className="space-y-2">
                    <img 
                      src={imageA.image_url} 
                      alt="Variant A" 
                      className="w-full h-20 object-cover rounded"
                    />
                    <div className="text-xs text-gray-400">
                      <div>👁 {imageA.impressions} impressions</div>
                      <div>🖱 {imageA.clicks} clicks</div>
                      <div>📈 {formatCTR(imageA.click_through_rate)} CTR</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">Image not found</div>
                );
              })()}
            </div>
            
            {/* Variant B */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-2">Variant B</div>
              {(() => {
                const imageB = images.find(img => img.id === test.image_b_id);
                return imageB ? (
                  <div className="space-y-2">
                    <img 
                      src={imageB.image_url} 
                      alt="Variant B" 
                      className="w-full h-20 object-cover rounded"
                    />
                    <div className="text-xs text-gray-400">
                      <div>👁 {imageB.impressions} impressions</div>
                      <div>🖱 {imageB.clicks} clicks</div>
                      <div>📈 {formatCTR(imageB.click_through_rate)} CTR</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">Image not found</div>
                );
              })()}
            </div>
          </div>
        </div>
      ))}

      {/* Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map(image => (
          <div 
            key={image.id} 
            className={`
              relative bg-gray-800/50 border rounded-lg overflow-hidden group
              ${image.status === 'active' ? 'border-green-500/50 ring-1 ring-green-500/20' : 'border-gray-700/50'}
              ${selectedImages.includes(image.id) ? 'ring-2 ring-electric-500/50' : ''}
            `}
          >
            {/* Selection Checkbox */}
            <div className="absolute top-2 left-2 z-10">
                          <button
              type="button"
              onClick={() => {
                if (selectedImages.includes(image.id)) {
                  setSelectedImages(prev => prev.filter(id => id !== image.id));
                } else {
                  setSelectedImages(prev => [...prev, image.id]);
                }
              }}
              className={`
                p-1 rounded-full transition-colors
                ${selectedImages.includes(image.id) 
                  ? 'bg-electric-500 text-white' 
                  : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700/80'
                }
              `}
            >
                {selectedImages.includes(image.id) ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Status Badge */}
            <div className="absolute top-2 right-2 z-10">
              <span className={`
                px-2 py-1 rounded-full text-xs font-medium
                ${image.status === 'active' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : image.variant_type === 'a'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : image.variant_type === 'b'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }
              `}>
                {image.status === 'active' && 'ACTIVE'}
                {image.variant_type === 'a' && 'VARIANT A'}
                {image.variant_type === 'b' && 'VARIANT B'}
                {image.status === 'inactive' && image.variant_type === 'single' && 'INACTIVE'}
              </span>
            </div>

            {/* Image */}
            <div className="aspect-video">
              <img 
                src={image.image_url} 
                alt={image.image_title || 'Advertisement image'}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Image Info */}
            <div className="p-3 space-y-2">
              <div className="text-sm text-white font-medium truncate">
                {image.image_title || 'Untitled Image'}
              </div>
              
              {/* Performance Metrics */}
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                <div className="flex items-center space-x-1">
                  <Eye className="h-3 w-3" />
                  <span>{image.impressions}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MousePointer className="h-3 w-3" />
                  <span>{image.clicks}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>{formatCTR(image.click_through_rate)}</span>
                </div>
              </div>

              {/* AI Generation Info */}
              {image.ai_prompt && (
                <div className="text-xs text-purple-400 bg-purple-500/10 rounded px-2 py-1 truncate">
                  AI: {image.ai_prompt.substring(0, 50)}...
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                <div className="flex items-center space-x-2">
                  {image.status !== 'active' && (
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => handleActivateImage(image.id)}
                        className="text-green-400 hover:text-green-300 p-1 rounded hover:bg-green-500/10 transition-colors"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        <div className="flex items-center space-x-1">
                          <Play className="h-3 w-3" />
                          <span>Activate this image</span>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => handleViewAnalytics(image.id)}
                      className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-500/10 transition-colors"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      <div className="flex items-center space-x-1">
                        <BarChart3 className="h-3 w-3" />
                        <span>View detailed analytics</span>
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>

                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(image.id)}
                    className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    <div className="flex items-center space-x-1">
                      <Trash2 className="h-3 w-3" />
                      <span>Delete this image</span>
                    </div>
                    <div className="absolute top-full right-3 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Image Card */}
        <div 
          onClick={() => setShowAICreator(true)}
          className="bg-gray-800/30 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center p-6 cursor-pointer hover:border-electric-500/50 hover:bg-gray-800/50 transition-all group"
        >
          <ImageIcon className="h-8 w-8 text-gray-500 group-hover:text-electric-500 mb-2" />
          <span className="text-gray-500 group-hover:text-electric-500 text-sm font-medium">
            Generate New Image
          </span>
          <span className="text-xs text-gray-600 mt-1">
            Use AI to create banners
          </span>
        </div>
      </div>

      {/* Empty State */}
      {images.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Images Yet</h3>
          <p className="text-gray-400 mb-4">
            Create your first advertisement image using our AI generator
          </p>
          <button
            onClick={() => setShowAICreator(true)}
            className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors"
          >
            Generate First Image
          </button>
        </div>
      )}

      {/* AI Creator Modal - Rendered via Portal to avoid parent container clipping */}
      {showAICreator && createPortal(
        <BannerAICreator
          onImageSelect={handleAIImageSelect}
          onClose={() => {
            setShowAICreator(false);
          }}
          initialPlacement={placement}
          initialSize={size}
          externalOpen={true}
        />,
        document.body
      )}

      {/* A/B Test Setup Modal - Rendered via Portal to avoid parent container clipping */}
      {showABTestModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
             style={{ zIndex: 9999 }}>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Setup A/B Test</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Test Name *</label>
                <input
                  type="text"
                  value={abTestName}
                  onChange={(e) => setAbTestName(e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="e.g., Header Banner CTR Test"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-2">Description</label>
                <textarea
                  value={abTestDescription}
                  onChange={(e) => setAbTestDescription(e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 h-20 resize-none"
                  placeholder="Describe what you're testing..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Test Duration (days)</label>
                  <input
                    type="number"
                    value={abTestDuration}
                    onChange={(e) => setAbTestDuration(parseInt(e.target.value) || 7)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    min="1"
                    max="90"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Traffic Split (% for A)</label>
                  <input
                    type="number"
                    value={abTestTrafficSplit}
                    onChange={(e) => setAbTestTrafficSplit(parseInt(e.target.value) || 50)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    min="10"
                    max="90"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Rotation Interval (minutes)</label>
                <select
                  value={abTestRotationInterval}
                  onChange={(e) => setAbTestRotationInterval(parseInt(e.target.value))}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={240}>4 hours</option>
                  <option value={480}>8 hours</option>
                  <option value={1440}>24 hours</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoOptimize"
                  checked={abTestAutoOptimize}
                  onChange={(e) => setAbTestAutoOptimize(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="autoOptimize" className="text-gray-400 text-sm">
                  Auto-optimize to winning variant when statistically significant
                </label>
              </div>

              <div className="text-sm text-gray-400 bg-gray-700/30 rounded p-3">
                <div className="font-medium mb-1">Test Configuration:</div>
                <div>• Selected Images: {selectedImages.length}/2</div>
                <div>• Variant A: {abTestTrafficSplit}% traffic</div>
                <div>• Variant B: {100 - abTestTrafficSplit}% traffic</div>
                <div>• Rotation: Every {abTestRotationInterval < 60 ? `${abTestRotationInterval}min` : `${abTestRotationInterval/60}h`}</div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={() => setShowABTestModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSetupABTest}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Start A/B Test
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Analytics Modal - Rendered via Portal to avoid parent container clipping */}
      {showAnalyticsModal && selectedImageForAnalytics && createPortal(
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAnalyticsModal(false);
              setAnalyticsData(null);
              setSelectedImageForAnalytics(null);
            }
          }}
        >
          <div 
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                <span>Image Analytics</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAnalyticsModal(false);
                  setAnalyticsData(null);
                  setSelectedImageForAnalytics(null);
                }}
                className="text-gray-400 hover:text-white text-xl leading-none hover:bg-gray-700 rounded p-1 transition-colors"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {/* Loading State */}
            {!analyticsData && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                <span className="ml-3 text-gray-400">Loading analytics...</span>
              </div>
            )}

            {/* Error State */}
            {analyticsData && 'error' in analyticsData && (analyticsData as any).error && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  <div className="text-yellow-400 text-sm">{(analyticsData as any).error}</div>
                </div>
                <div className="text-gray-400 text-xs mt-2">
                  This feature will be available once the database setup is completed.
                </div>
              </div>
            )}

            {/* Analytics Content */}
            {analyticsData && (
              <>
                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-gray-400 text-xs">Total Impressions</div>
                    <div className="text-white text-lg font-semibold">{analyticsData.total_impressions}</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-gray-400 text-xs">Total Clicks</div>
                    <div className="text-white text-lg font-semibold">{analyticsData.total_clicks}</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-gray-400 text-xs">Average CTR</div>
                    <div className="text-white text-lg font-semibold">{formatCTR(analyticsData.avg_ctr)}</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-gray-400 text-xs">Total Cost</div>
                    <div className="text-white text-lg font-semibold">{formatCurrency(analyticsData.total_cost)}</div>
                  </div>
                </div>

                {/* Performance by Placement */}
                {analyticsData.performance_by_placement.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-white font-medium mb-3">Performance by Placement</h4>
                    <div className="space-y-2">
                      {analyticsData.performance_by_placement.map((placement, index) => (
                        <div key={index} className="bg-gray-700/30 rounded-lg p-3 flex items-center justify-between">
                          <span className="text-gray-300 capitalize">{placement.placement_type}</span>
                          <div className="text-right">
                            <div className="text-white text-sm">{formatCTR(placement.ctr)}</div>
                            <div className="text-gray-400 text-xs">{placement.impressions} imp • {placement.clicks} clicks</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image Preview */}
                {analyticsData.image_url && (
                  <div className="mb-4">
                    <h4 className="text-white font-medium mb-3">Image Preview</h4>
                    <img 
                      src={analyticsData.image_url} 
                      alt="Analytics for this image"
                      className="w-full max-w-md mx-auto rounded-lg border border-gray-600"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
} 