// AI Image Generation utility for banner creation
// Supports DALL-E 3 and other image generation services

import { aiConfigService } from '../services/aiConfigService';

export interface BannerSize {
  width: number;
  height: number;
  name: string;
  description: string;
  promptModifier: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  size: BannerSize;
  placement: string;
  style?: 'vivid' | 'natural';
  quality?: 'standard' | 'hd';
  provider?: 'openai-dalle' | 'stability-ai';
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  size: BannerSize;
  provider: string;
  model?: string;
  cost: number;
  timestamp: Date;
}

// Standard banner sizes for car audio advertisements
export const BANNER_SIZES: Record<string, BannerSize> = {
  small: {
    width: 300,
    height: 150,
    name: 'Small Banner',
    description: 'Compact banner for sidebars',
    promptModifier: 'small rectangular banner format, compact design'
  },
  medium: {
    width: 300,
    height: 250,
    name: 'Medium Rectangle',
    description: 'Sidebar placement - most versatile',
    promptModifier: 'rectangular banner format, balanced proportions'
  },
  large: {
    width: 728,
    height: 90,
    name: 'Large Banner',
    description: 'Wide banner for headers',
    promptModifier: 'horizontal banner format, wide aspect ratio'
  },
  banner: {
    width: 970,
    height: 250,
    name: 'Premium Banner',
    description: 'Premium placement - maximum impact',
    promptModifier: 'large horizontal banner format, premium placement'
  },
  square: {
    width: 250,
    height: 250,
    name: 'Square',
    description: 'Social media and compact spaces',
    promptModifier: 'square banner format, equal dimensions'
  },
  leaderboard: {
    width: 728,
    height: 90,
    name: 'Leaderboard',
    description: 'Top of page banner - great for headers',
    promptModifier: 'horizontal banner format, wide aspect ratio'
  },
  skyscraper: {
    width: 160,
    height: 600,
    name: 'Wide Skyscraper',
    description: 'Sidebar placement - tall format',
    promptModifier: 'vertical banner format, tall aspect ratio'
  }
};

// Load AI service configurations
async function getAIServiceConfig(provider: string = 'openai-dalle') {
  console.log('Getting AI service config for provider:', provider);
  
  try {
    // First, try to get from database
    const dbConfig = await aiConfigService.getConfig(provider);
    
    if (dbConfig) {
      console.log('Found config in database for provider:', provider, {
        hasApiKey: !!dbConfig.apiKey,
        enabled: dbConfig.enabled
      });
      
      return {
        provider: dbConfig.provider,
        apiKey: dbConfig.apiKey,
        model: dbConfig.model,
        enabled: dbConfig.enabled,
        costPerImage: dbConfig.costPerImage,
        maxImagesPerDay: dbConfig.maxImagesPerDay,
        quality: dbConfig.quality,
        style: dbConfig.style
      };
    }
  } catch (error) {
    console.error('Error fetching config from database:', error);
  }
  
  // Fallback to localStorage (for backward compatibility during migration)
  const savedConfigs = localStorage.getItem('ai-service-configs');
  console.log('Checking localStorage fallback, found saved configs:', !!savedConfigs);
  
  if (savedConfigs) {
    try {
      const configs = JSON.parse(savedConfigs);
      console.log('Parsed configs from localStorage:', Object.keys(configs));
      
      const providerConfig = configs[provider];
      if (providerConfig) {
        console.log('Found config in localStorage for provider:', provider, {
          hasApiKey: !!providerConfig.apiKey,
          enabled: providerConfig.enabled
        });
        
        // Trigger migration in background
        console.log('Triggering migration of localStorage configs to database...');
        aiConfigService.migrateFromLocalStorage().catch(err => 
          console.error('Migration error:', err)
        );
        
        return providerConfig;
      } else {
        console.log('No config found for provider in localStorage:', provider);
      }
    } catch (e) {
      console.error('Error parsing saved configs from localStorage:', e);
    }
  }
  
  // Default configuration
  console.log('Using default configuration (no API key)');
  return {
    provider: provider,
    apiKey: '',
    model: provider === 'openai-dalle' ? 'dall-e-3' : 'stable-diffusion-xl-1024-v1-0',
    enabled: false,
    costPerImage: provider === 'openai-dalle' ? 0.04 : 0.02,
    maxImagesPerDay: 100,
    quality: 'standard',
    style: 'vivid'
  };
}

// Generate optimized prompt for car audio banners
export function generateBannerPrompt(userInput: string, size: BannerSize, placement: string): string {
  const basePrompt = `Create a professional car audio advertisement banner for ${placement} placement. 
${size.promptModifier}. 
Target size: ${size.width}x${size.height}px.

Content request: ${userInput}

CRITICAL TEXT REQUIREMENTS:
- Use ONLY correct English spelling and grammar
- NO nonsense text, gibberish, or made-up words
- If including text, use real words like: "AUDIO", "SOUND", "BASS", "SPEAKERS", "CAR AUDIO", "PREMIUM", "QUALITY"
- Keep text minimal and readable
- Use standard automotive/audio industry terminology
- Double-check all text for accuracy

Design requirements:
- Modern, high-impact automotive design
- High contrast colors (electric blue, red, black, silver, white)
- Professional typography that's readable at banner size
- Include space for logo placement in corner
- Clear call-to-action area
- Automotive/car audio theme with sound waves, speakers, or car elements
- Professional gradient backgrounds
- Ensure text is large enough to read at actual banner size
- Use automotive industry aesthetics
- Make it eye-catching and clickable
- Single cohesive banner design (NOT multiple versions in one image)
- Focus on ONE main message or product
- Prefer visual elements over text when possible

Style: Professional automotive advertisement, modern design, high contrast, premium look`;

  return basePrompt;
}

// Generate multiple banner variations with distinct styles
export async function generateBannerVariations(
  request: ImageGenerationRequest,
  count: number = 3
): Promise<GeneratedImage[]> {
  console.log('Starting generateBannerVariations with request:', {
    provider: request.provider,
    prompt: request.prompt,
    size: request.size,
    placement: request.placement
  });
  
  const config = await getAIServiceConfig(request.provider);
  console.log('Retrieved AI config:', {
    provider: config.provider,
    hasApiKey: !!config.apiKey,
    apiKeyLength: config.apiKey?.length || 0,
    enabled: config.enabled,
    model: config.model
  });
  
  if (!config.apiKey) {
    console.error('No API key found in configuration');
    throw new Error('API key not configured. Please set up your AI service in the configuration page.');
  }

  if (!config.enabled) {
    console.error('AI service is disabled');
    throw new Error('AI service is disabled. Please enable it in the configuration page.');
  }

  // Check daily limits
  const usage = getDailyUsage();
  console.log('Daily usage:', usage);
  
  if (usage.imagesGenerated >= config.maxImagesPerDay) {
    throw new Error(`Daily limit of ${config.maxImagesPerDay} images reached. Please try again tomorrow.`);
  }

  const results: GeneratedImage[] = [];
  const basePrompt = generateBannerPrompt(request.prompt, request.size, request.placement);
  console.log('Generated base prompt:', basePrompt);

  // Create 3 distinct variations with different design approaches
  const variations = [
    {
      suffix: "\n\nDesign Style: Bold and energetic with dynamic sound waves, bright electric blue accents, modern typography, and high-energy automotive elements. Focus on power and performance.",
      id: "bold"
    },
    {
      suffix: "\n\nDesign Style: Clean and professional with minimal design, sophisticated typography, premium silver/black color scheme, and elegant automotive styling. Focus on quality and precision.",
      id: "clean"
    },
    {
      suffix: "\n\nDesign Style: Premium luxury design with gold/red accents, sophisticated gradients, high-end automotive elements, and premium branding feel. Focus on exclusivity and prestige.",
      id: "luxury"
    }
  ];

  // Generate images sequentially to avoid rate limits
  for (let i = 0; i < Math.min(count, variations.length); i++) {
    try {
      const variation = variations[i];
      const fullPrompt = basePrompt + variation.suffix;
      
      console.log(`Generating variation ${i + 1}/${count}: ${variation.id}`);
      
      const image = await generateSingleImage({
        ...request,
        prompt: fullPrompt
      }, config);
      
      // Add variation identifier to the image
      image.id = `${image.id}-${variation.id}`;
      
      results.push(image);
      console.log(`Successfully generated variation ${i + 1}:`, image.id);
      
      // Update usage tracking
      updateUsageStats(config.costPerImage);
      
      // Add delay between requests to avoid rate limiting
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`Error generating image variation ${i + 1}:`, error);
      console.error('Full error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error
      });
      // Continue with other variations even if one fails
    }
  }

  if (results.length === 0) {
    throw new Error('Failed to generate any images. Please check your configuration and try again.');
  }

  console.log(`Successfully generated ${results.length} banner variations`);
  return results;
}

// Generate a single image using the specified provider
async function generateSingleImage(
  request: ImageGenerationRequest,
  config: any
): Promise<GeneratedImage> {
  if (config.provider === 'openai-dalle') {
    return await generateWithDALLE(request, config);
  } else if (config.provider === 'stability-ai') {
    return await generateWithStabilityAI(request, config);
  } else {
    throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

// DALL-E 3 image generation
async function generateWithDALLE(
  request: ImageGenerationRequest,
  config: any
): Promise<GeneratedImage> {
  const apiUrl = 'https://api.openai.com/v1/images/generations';
  const dalleSize = determineDallESize(request.size);
  
  const requestBody = {
    model: config.model,
    prompt: request.prompt,
    n: 1,
    size: dalleSize,
    quality: request.quality || config.quality || 'standard',
    style: request.style || config.style || 'vivid',
  };
  
  console.log('Making DALL-E API request:', {
    url: apiUrl,
    model: requestBody.model,
    size: requestBody.size,
    quality: requestBody.quality,
    style: requestBody.style,
    promptLength: request.prompt.length,
    apiKeyLength: config.apiKey?.length || 0
  });
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('DALL-E API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DALL-E API error response:', errorText);
      
      let error;
      try {
        error = JSON.parse(errorText);
      } catch (e) {
        throw new Error(`DALL-E API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      throw new Error(`DALL-E API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('DALL-E API response data:', {
      hasData: !!data.data,
      dataLength: data.data?.length || 0,
      firstImage: !!data.data?.[0]?.url
    });
    
    const imageUrl = data.data[0]?.url;

    if (!imageUrl) {
      console.error('No image URL in response:', data);
      throw new Error('No image URL returned from DALL-E API');
    }

    console.log('Successfully generated DALL-E image');
    
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      url: imageUrl,
      prompt: request.prompt,
      size: request.size,
      provider: 'openai-dalle',
      model: config.model || 'dall-e-3',
      cost: config.quality === 'hd' ? 0.08 : 0.04,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('DALL-E generation error:', error);
    throw error;
  }
}

// Stability AI image generation
async function generateWithStabilityAI(
  request: ImageGenerationRequest,
  config: any
): Promise<GeneratedImage> {
  // Stability AI requires dimensions to be multiples of 64
  const stabilityDimensions = getStabilityAIDimensions(request.size);
  
  const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      text_prompts: [
        {
          text: request.prompt,
          weight: 1
        }
      ],
      cfg_scale: 7,
      height: stabilityDimensions.height,
      width: stabilityDimensions.width,
      samples: 1,
      steps: 30,
      style_preset: request.style === 'vivid' ? 'enhance' : 'photographic'
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = JSON.stringify(errorJson);
    } catch (e) {
      // Keep original error text if not JSON
    }
    throw new Error(`Stability AI API error: ${errorMessage}`);
  }

  const data = await response.json();
  const imageData = data.artifacts?.[0]?.base64;

  if (!imageData) {
    throw new Error('No image data returned from Stability AI API');
  }

  // Convert base64 to blob URL
  const imageUrl = `data:image/png;base64,${imageData}`;

  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    url: imageUrl,
    prompt: request.prompt,
    size: request.size,
    provider: 'stability-ai',
    model: config.model || 'stable-diffusion-xl-1024-v1-0',
    cost: 0.02, // Stability AI pricing
    timestamp: new Date()
  };
}

// Helper function to get Stability AI compatible dimensions
function getStabilityAIDimensions(bannerSize: BannerSize): { width: number; height: number } {
  const { width, height } = bannerSize;
  const targetRatio = width / height;
  
  // Allowed SDXL dimensions (from Stability AI error message)
  const allowedDimensions = [
    { width: 1024, height: 1024, ratio: 1.0 },      // Square
    { width: 1152, height: 896, ratio: 1.286 },     // Slightly wide
    { width: 1216, height: 832, ratio: 1.462 },     // Medium wide
    { width: 1344, height: 768, ratio: 1.75 },      // Wide
    { width: 1536, height: 640, ratio: 2.4 },       // Very wide
    { width: 640, height: 1536, ratio: 0.417 },     // Very tall
    { width: 768, height: 1344, ratio: 0.571 },     // Tall
    { width: 832, height: 1216, ratio: 0.684 },     // Medium tall
    { width: 896, height: 1152, ratio: 0.778 }      // Slightly tall
  ];
  
  // Find the dimension set with the closest aspect ratio
  let bestMatch = allowedDimensions[0];
  let smallestDifference = Math.abs(targetRatio - bestMatch.ratio);
  
  for (const dimension of allowedDimensions) {
    const difference = Math.abs(targetRatio - dimension.ratio);
    if (difference < smallestDifference) {
      smallestDifference = difference;
      bestMatch = dimension;
    }
  }
  
  console.log(`Stability AI dimensions: ${width}x${height} (ratio: ${targetRatio.toFixed(3)}) -> ${bestMatch.width}x${bestMatch.height} (ratio: ${bestMatch.ratio.toFixed(3)})`);
  
  return { width: bestMatch.width, height: bestMatch.height };
}

// Convert custom banner size to DALL-E supported size
function determineDallESize(bannerSize: BannerSize): string {
  const { width, height } = bannerSize;
  const ratio = width / height;

  // DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792
  // We'll generate at DALL-E size then user can crop/resize as needed
  
  if (ratio > 1.6) {
    // Very wide banners (leaderboard, banner) -> use wide format
    return '1792x1024'; // 1.75:1 ratio
  } else if (ratio < 0.6) {
    // Very tall banners (skyscraper) -> use tall format  
    return '1024x1792'; // 0.57:1 ratio
  } else if (ratio > 1.2) {
    // Moderately wide banners -> use wide format
    return '1792x1024';
  } else if (ratio < 0.8) {
    // Moderately tall banners -> use tall format
    return '1024x1792';
  } else {
    // Square or near-square banners -> use square format
    return '1024x1024'; // 1:1 ratio
  }
}

// Usage tracking functions
function getDailyUsage() {
  const today = new Date().toDateString();
  const usage = localStorage.getItem(`ai-usage-${today}`);
  
  if (usage) {
    return JSON.parse(usage);
  }
  
  return {
    imagesGenerated: 0,
    totalCost: 0,
    date: today
  };
}

function updateUsageStats(cost: number) {
  const today = new Date().toDateString();
  const currentUsage = getDailyUsage();
  
  const newUsage = {
    imagesGenerated: currentUsage.imagesGenerated + 1,
    totalCost: currentUsage.totalCost + cost,
    date: today
  };
  
  localStorage.setItem(`ai-usage-${today}`, JSON.stringify(newUsage));
  
  // Update overall stats
  const overallStats = localStorage.getItem('ai-usage-stats');
  if (overallStats) {
    const stats = JSON.parse(overallStats);
    stats.imagesGenerated += 1;
    stats.totalCost += cost;
    stats.monthlyUsage = getMonthlyUsage();
    localStorage.setItem('ai-usage-stats', JSON.stringify(stats));
  }
}

function getMonthlyUsage(): number {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let monthlyTotal = 0;
  
  // Check each day of the current month
  for (let day = 1; day <= now.getDate(); day++) {
    const date = new Date(currentYear, currentMonth, day).toDateString();
    const usage = localStorage.getItem(`ai-usage-${date}`);
    if (usage) {
      const dayUsage = JSON.parse(usage);
      monthlyTotal += dayUsage.imagesGenerated;
    }
  }
  
  return monthlyTotal;
}

// Utility function to download generated image
export async function downloadImage(imageUrl: string, filename: string): Promise<void> {
  try {
    let blob: Blob;
    
    // Check if it's a data URL (base64)
    if (imageUrl.startsWith('data:')) {
      // Extract the base64 data
      const base64Data = imageUrl.split(',')[1];
      const mimeType = imageUrl.match(/data:([^;]+)/)?.[1] || 'image/png';
      
      // Convert base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      blob = new Blob([bytes], { type: mimeType });
    } else {
      // For regular URLs, fetch the image
      const response = await fetch(imageUrl);
      blob = await response.blob();
    }
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error('Failed to download image');
  }
} 