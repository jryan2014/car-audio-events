import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  RefreshCw, 
  Wand2, 
  Palette, 
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Copy,
  Eye,
  Plus,
  Trash2,
  Circle
} from 'lucide-react';
import { 
  BANNER_SIZES, 
  generateBannerVariations, 
  downloadImage,
  type BannerSize,
  type GeneratedImage,
  type ImageGenerationRequest
} from '../lib/imageGeneration';

interface BannerAICreatorProps {
  onImageSelect?: (image: GeneratedImage) => void;
  onClose?: () => void;
  initialPlacement?: string;
  initialSize?: string;
  externalOpen?: boolean;
}

export default function BannerAICreator({ 
  onImageSelect, 
  onClose, 
  initialPlacement = 'Homepage Header',
  initialSize = 'leaderboard',
  externalOpen = false
}: BannerAICreatorProps) {
  const [isOpen, setIsOpen] = useState(externalOpen);
  const [step, setStep] = useState<'setup' | 'generating' | 'results'>('setup');
  const [selectedSize, setSelectedSize] = useState<string>(initialSize);
  const [placement, setPlacement] = useState(initialPlacement);
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<'vivid' | 'natural'>('vivid');
  const [quality, setQuality] = useState<'standard' | 'hd'>('standard');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [provider, setProvider] = useState<'openai-dalle' | 'stability-ai'>('openai-dalle');

  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Store initial values when modal opens to prevent external changes from affecting the modal
  const [initialValues, setInitialValues] = useState({
    size: initialSize,
    placement: initialPlacement
  });

  // Quick prompt suggestions
  const promptSuggestions = [
    "High-performance car subwoofers with bass waves",
    "Premium car audio speakers with sound visualization", 
    "Car audio competition with trophy and sound meters",
    "Professional car audio installation service",
    "Car stereo system with modern dashboard",
    "Sound quality competition with judges scoring",
    "Car audio retailer with product showcase",
    "Mobile audio installation van with equipment"
  ];

  useEffect(() => {
    if (isOpen && promptRef.current) {
      promptRef.current.focus();
    }
  }, [isOpen]);

  // Debug prop changes (reduced logging to prevent memory issues)
  useEffect(() => {
    if (externalOpen) {
      console.log('BannerAICreator opened externally');
    }
  }, [externalOpen]);

  // Sync external open state
  useEffect(() => {
    if (externalOpen !== undefined) {
      setIsOpen(externalOpen);
    }
  }, [externalOpen]);

  // Prevent modal from closing due to prop changes
  useEffect(() => {
    // Don't update selectedSize if modal is open to prevent unwanted behavior
    if (!isOpen) {
      setSelectedSize(initialSize);
      setPlacement(initialPlacement);
      setInitialValues({
        size: initialSize,
        placement: initialPlacement
      });
    }
  }, [initialSize, initialPlacement, isOpen]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for your banner');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStep('generating');

    try {
      const request: ImageGenerationRequest = {
        prompt: prompt.trim(),
        size: BANNER_SIZES[selectedSize],
        placement,
        style,
        quality,
        provider
      };

      const images = await generateBannerVariations(request, 3);
      // Add the new images to existing ones (preserve all images)
      const newImages = images.map((result, index) => ({
        ...result,
        id: `${Date.now()}-${index}-${result.id}` // Ensure unique IDs
      }));
      
      setGeneratedImages(prev => [...prev, ...newImages]);
      
      // Save all new images to database
      for (const image of newImages) {
        await saveImageToDatabase(image);
      }
      
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate images');
      setStep('setup');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageSelect = (image: GeneratedImage) => {
    setSelectedImage(image);
    
    // Update database to mark this image as active and others as inactive
    updateImageActiveStatus(image.id);
  };

  const updateImageActiveStatus = async (selectedImageId: string) => {
    try {
      // This would typically update the database
      console.log('Updating image active status:', {
        selectedImageId,
        action: 'mark_as_active'
      });
      
      // In a real implementation, you would make API calls here:
      // 1. Mark all images for this ad as inactive
      // 2. Mark the selected image as active
      
      // Update local state to reflect the change
      setGeneratedImages(prev => prev.map(img => ({
        ...img,
        // This would normally be handled by the database, but for UI feedback:
        isActive: img.id === selectedImageId
      })));
      
    } catch (error) {
      console.error('Failed to update image active status:', error);
    }
  };

  const handleDownload = async (image: GeneratedImage) => {
    try {
      const filename = `banner-${image.size.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
      await downloadImage(image.url, filename);
    } catch (err) {
      setError('Failed to download image');
    }
  };

  const resetCreator = () => {
    setStep('setup');
    // DON'T clear generated images - preserve expensive AI generations
    // setGeneratedImages([]);
    setSelectedImage(null);
    setError(null);
    setPrompt('');
  };

  const handleClose = () => {
    setIsOpen(false);
    // DON'T reset creator when closing - preserve all generated images
    // resetCreator();
    if (onClose) {
      onClose();
    }
  };

  const clearAllImages = () => {
    setGeneratedImages([]);
    setSelectedImage(null);
    setStep('setup');
  };

  const saveImageToDatabase = async (image: GeneratedImage) => {
    try {
      // Save to the AI image management system
      const response = await fetch('/api/ai-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: image.url,
          prompt: image.prompt,
          provider: image.provider,
          cost: image.cost,
          size_name: image.size.name,
          size_width: image.size.width,
          size_height: image.size.height,
          advertiser_id: 'current-advertiser-id', // Would come from context
          advertiser_name: 'Current Advertiser', // Would come from context
          ad_id: null, // Not associated with an ad yet
          ad_title: null,
          is_active: false,
          is_archived: false,
          metadata: {
            variation_type: image.id.includes('-bold') ? 'bold' : 
                           image.id.includes('-clean') ? 'clean' : 
                           image.id.includes('-luxury') ? 'luxury' : 'standard'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save image: ${response.statusText}`);
      }

      console.log('Successfully saved image to database:', image.id);
      
    } catch (error) {
      console.error('Failed to save image to database:', error);
      // Don't throw error to prevent breaking the generation flow
      // Just log it and continue
    }
  };

  const handleOpenModal = () => {
    // Capture current prop values when opening
    setInitialValues({
      size: initialSize,
      placement: initialPlacement
    });
    setSelectedSize(initialSize);
    setPlacement(initialPlacement);
    setIsOpen(true);
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpenModal}
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-electric-500 text-white rounded-lg hover:from-purple-600 hover:to-electric-600 transition-all duration-200"
      >
        <Wand2 className="h-4 w-4" />
        <span>Create with AI</span>
      </button>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-purple-500 to-electric-500">
          <div className="flex items-center space-x-3">
            <Wand2 className="h-6 w-6 text-white" />
            <h2 className="text-xl font-bold text-white">AI Banner Creator</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Setup Step */}
          {step === 'setup' && (
            <div className="p-6 space-y-6">
              {/* Banner Size Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Banner Size
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(BANNER_SIZES).map(([key, size]) => (
                    <button
                      key={key}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Banner size selected:', key);
                        setSelectedSize(key);
                      }}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedSize === key
                          ? 'border-electric-500 bg-electric-500/10'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium text-white">{size.name}</div>
                      <div className="text-sm text-gray-400">{size.width} × {size.height}px</div>
                      <div className="text-xs text-gray-500 mt-1">{size.description}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-300">
                      <strong>Note:</strong> DALL-E generates images at standard sizes (1024×1024, 1792×1024, or 1024×1792). 
                      The AI will create designs optimized for your target banner size, which you can then crop or resize as needed.
                    </div>
                  </div>
                </div>
              </div>

              {/* Placement */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Placement Location
                </label>
                <input
                  type="text"
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  placeholder="e.g., Homepage Header, Event Page Sidebar"
                />
              </div>

              {/* Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Describe Your Banner
                </label>
                <textarea
                  ref={promptRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white h-24 resize-none"
                  placeholder="Describe what you want in your banner ad..."
                />
              </div>

              {/* Quick Suggestions */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quick Ideas
                </label>
                <div className="flex flex-wrap gap-2">
                  {promptSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setPrompt(suggestion)}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    AI Provider
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as 'openai-dalle' | 'stability-ai')}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="openai-dalle">DALL-E 3 (OpenAI)</option>
                    <option value="stability-ai">Stable Diffusion (Stability AI)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {provider === 'openai-dalle' ? 'Best for text integration and professional designs' : 'Best for artistic and creative designs'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Style
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as 'vivid' | 'natural')}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="vivid">Vivid (Bold & Dramatic)</option>
                    <option value="natural">Natural (Realistic & Subtle)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quality
                  </label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as 'standard' | 'hd')}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    disabled={provider === 'stability-ai'}
                  >
                    <option value="standard">Standard ({provider === 'openai-dalle' ? '$0.04' : '$0.02'}/image)</option>
                    <option value="hd">HD ({provider === 'openai-dalle' ? '$0.08' : '$0.04'}/image)</option>
                  </select>
                  {provider === 'stability-ai' && (
                    <p className="text-xs text-gray-500 mt-1">Quality setting not available for Stability AI</p>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <span className="text-red-400">{error}</span>
                </div>
              )}

              {/* Generate Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-electric-500 hover:from-purple-600 hover:to-electric-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                >
                  <Sparkles className="h-5 w-5" />
                  <span>Generate Banners</span>
                </button>
              </div>
            </div>
          )}

          {/* Generating Step */}
          {step === 'generating' && (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-12 w-12 text-electric-500 animate-spin" />
                <h3 className="text-xl font-semibold text-white">Creating Your Banners</h3>
                <p className="text-gray-400">
                  AI is generating 3 separate banner variations for you...
                </p>
                <div className="text-sm text-gray-500 max-w-md">
                  Each image will be a unique design approach: Bold & Energetic, Clean & Professional, and Premium Luxury
                </div>
                <div className="w-64 bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-500 to-electric-500 h-2 rounded-full animate-pulse w-3/4"></div>
                </div>
              </div>
            </div>
          )}

          {/* Results Step */}
          {step === 'results' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Generated Banners ({generatedImages.length})
                  </h3>
                  <p className="text-sm text-gray-400">
                    All images are preserved. Select the one you want to use for this ad.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setStep('setup')}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Generate More</span>
                  </button>
                  <button
                    onClick={clearAllImages}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedImages.map((image, index) => {
                  // Determine variation type from image ID
                  const getVariationType = (imageId: string) => {
                    if (imageId.includes('-bold')) return { name: 'Bold & Energetic', color: 'text-red-400' };
                    if (imageId.includes('-clean')) return { name: 'Clean & Professional', color: 'text-blue-400' };
                    if (imageId.includes('-luxury')) return { name: 'Premium Luxury', color: 'text-yellow-400' };
                    return { name: `Variation ${index + 1}`, color: 'text-gray-400' };
                  };
                  
                  const variation = getVariationType(image.id);
                  const isSelected = selectedImage?.id === image.id;
                  
                  return (
                    <div
                      key={image.id}
                      className={`bg-gray-700 rounded-lg overflow-hidden border-2 transition-all relative ${
                        isSelected
                          ? 'border-electric-500 ring-2 ring-electric-500/20 shadow-lg shadow-electric-500/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10 bg-electric-500 text-white rounded-full p-1">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                      )}
                      
                      <div className="aspect-video bg-gray-800 flex items-center justify-center p-4">
                        <img
                          src={image.url}
                          alt={`Generated banner - ${variation.name}`}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden flex-col items-center space-y-2 text-gray-400">
                          <ImageIcon className="h-8 w-8" />
                          <span className="text-sm">Image failed to load</span>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${variation.color}`}>
                            {variation.name}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              ${image.cost.toFixed(2)}
                            </span>
                            {isSelected && (
                              <span className="text-xs bg-electric-500 text-white px-2 py-1 rounded-full">
                                ACTIVE
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-gray-400">
                            {image.size.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {image.provider}
                          </span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleImageSelect(image)}
                            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded transition-colors ${
                              isSelected 
                                ? 'bg-electric-600 text-white' 
                                : 'bg-electric-500 hover:bg-electric-600 text-white'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                <span>Selected</span>
                              </>
                            ) : (
                              <>
                                <Circle className="h-4 w-4" />
                                <span>Select</span>
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDownload(image);
                            }}
                            className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(image.url, '_blank', 'noopener,noreferrer');
                            }}
                            className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                            title="View Full Size"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {generatedImages.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No images were generated. Please try again.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'results' && selectedImage && (
          <div className="p-4 border-t border-gray-700 bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div>
                  <span className="text-white font-medium">Banner selected: {selectedImage.size.name}</span>
                  <p className="text-sm text-gray-400">Image has been added to your advertisement form</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-electric-500 hover:bg-electric-600 text-white rounded-lg transition-colors font-medium"
              >
                Continue with This Banner
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 