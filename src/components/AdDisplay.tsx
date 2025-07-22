import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

console.log('[AdDisplay] File loaded');

interface Advertisement {
  id: string;
  title: string;
  description: string;
  image_url: string;
  click_url: string;
  advertiser_name: string;
  placement_type: string;
  size: string;
  target_pages: string[];
  priority: number;
  status: string;
  clicks: number;
  impressions: number;
  rotation_mode?: 'timer' | 'priority';
  frequency_cap?: number;
}

interface AdDisplayProps {
  placement: 'header' | 'sidebar' | 'event_page' | 'mobile_banner' | 'footer' | 'directory_listing' | 'search_results';
  pageType?: string;
  className?: string;
  maxAds?: number;
}

// Size mappings for exact dimensions
const AD_SIZES = {
  small: { width: 300, height: 150 },
  medium: { width: 300, height: 250 },
  large: { width: 728, height: 90 },
  banner: { width: 970, height: 250 },
  square: { width: 250, height: 250 },
  leaderboard: { width: 728, height: 90 },
  skyscraper: { width: 160, height: 600 }
};

// Bot detection patterns
const BOT_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i, /facebook/i, /twitter/i,
  /linkedin/i, /whatsapp/i, /telegram/i, /googlebot/i, /bingbot/i
];

// Frequency cap tracking interface
interface FrequencyCapData {
  [adId: string]: {
    impressions: number;
    lastReset: string;
  };
}

export default function AdDisplay({ placement, pageType = 'general', className = '', maxAds = 1 }: AdDisplayProps) {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [rotationInterval, setRotationInterval] = useState(10); // Default 10 seconds
  const [eligibleAds, setEligibleAds] = useState<Advertisement[]>([]);
  const [frequencyData, setFrequencyData] = useState<FrequencyCapData>({});
  const eligibleAdsRef = useRef<Advertisement[]>([]);
  const trackedImpressions = useRef<Set<string>>(new Set());

  console.log('[AdDisplay] Component rendered:', {
    placement,
    pageType,
    className,
    maxAds,
    adsCount: ads.length,
    eligibleAdsCount: eligibleAds.length,
    currentAdIndex,
    loading,
    error
  });

  useEffect(() => {
    console.log('[AdDisplay] Initial useEffect triggered. Loading ads and settings...');
    // Reset tracked impressions when component remounts or placement changes
    trackedImpressions.current.clear();
    
    // Load frequency data first, then ads
    loadFrequencyData();
    loadRotationSettings();
    // Small delay to ensure frequency data is loaded
    setTimeout(() => {
      loadAds();
    }, 100);
  }, [placement, pageType]);

  // Load frequency cap data from localStorage
  const loadFrequencyData = () => {
    console.log('[AdDisplay] Loading frequency cap data from localStorage...');
    try {
      const stored = localStorage.getItem('ad_frequency_caps');
      if (stored) {
        const data = JSON.parse(stored);
        // Reset data if it's a new day
        const today = new Date().toISOString().split('T')[0];
        const cleaned: FrequencyCapData = {};
        
        Object.entries(data).forEach(([adId, info]: [string, any]) => {
          if (info.lastReset === today) {
            cleaned[adId] = info;
          }
        });
        
        console.log('[AdDisplay] Frequency cap data loaded:', cleaned);
        setFrequencyData(cleaned);
        localStorage.setItem('ad_frequency_caps', JSON.stringify(cleaned));
      } else {
        console.log('[AdDisplay] No frequency cap data found in localStorage');
      }
    } catch (err) {
      console.log('[AdDisplay] Error loading frequency data:', err);
    }
  };

  // Check if an ad has reached its frequency cap
  const hasReachedFrequencyCap = (ad: Advertisement): boolean => {
    // TEMPORARY DEBUG: Check URL params for bypass
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'bypass-caps') {
      console.log('[AdDisplay] DEBUG MODE: Bypassing frequency caps');
      return false;
    }
    
    if (!ad.frequency_cap || ad.frequency_cap === 0) return false;
    
    const today = new Date().toISOString().split('T')[0];
    const adData = frequencyData[ad.id];
    
    if (!adData || adData.lastReset !== today) return false;
    
    return adData.impressions >= ad.frequency_cap;
  };

  // Update frequency cap data
  const updateFrequencyData = (adId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const newData = { ...frequencyData };
    
    if (!newData[adId] || newData[adId].lastReset !== today) {
      newData[adId] = {
        impressions: 1,
        lastReset: today
      };
    } else {
      newData[adId].impressions++;
    }
    
    setFrequencyData(newData);
    localStorage.setItem('ad_frequency_caps', JSON.stringify(newData));
  };

  // Load rotation interval from database
  const loadRotationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'ad_rotation_interval')
        .single();

      if (!error && data) {
        const interval = parseInt(data.value) || 10;
        setRotationInterval(interval);
        console.log('[AdDisplay] Loaded rotation interval:', interval, 'seconds');
      }
    } catch (err) {
      console.log('[AdDisplay] Using default rotation interval: 10 seconds');
    }
  };

  // Weighted random selection based on priority
  const selectAdByPriority = (adsToChooseFrom: Advertisement[]): number => {
    if (adsToChooseFrom.length === 0) return 0;
    if (adsToChooseFrom.length === 1) return 0;
    
    // Calculate total weight
    const totalWeight = adsToChooseFrom.reduce((sum, ad) => sum + (ad.priority || 1), 0);
    
    // Generate random number between 0 and totalWeight
    let random = Math.random() * totalWeight;
    
    // Select ad based on weighted probability
    for (let i = 0; i < adsToChooseFrom.length; i++) {
      random -= (adsToChooseFrom[i].priority || 1);
      if (random <= 0) {
        return i;
      }
    }
    
    return 0; // Fallback
  };

  // Filter ads based on frequency caps
  useEffect(() => {
    console.log('[AdDisplay] === FILTERING EFFECT START ===');
    console.log('[AdDisplay] Total ads:', ads.length);
    console.log('[AdDisplay] Frequency data keys:', Object.keys(frequencyData));
    console.log('[AdDisplay] Frequency data:', JSON.stringify(frequencyData));
    
    if (ads.length === 0) {
      console.log('[AdDisplay] No ads to filter');
      setEligibleAds([]);
      eligibleAdsRef.current = [];
      return;
    }
    
    // Log each ad's details
    ads.forEach((ad, index) => {
      console.log(`[AdDisplay] Ad ${index}:`, {
        id: ad.id,
        title: ad.title,
        frequency_cap: ad.frequency_cap,
        status: ad.status,
        placement_type: ad.placement_type
      });
    });
    
    const filtered = ads.filter(ad => {
      console.log(`[AdDisplay] Checking ad "${ad.title}" (${ad.id})`);
      console.log(`  - Frequency cap: ${ad.frequency_cap}`);
      console.log(`  - Frequency data for this ad:`, frequencyData[ad.id]);
      
      const capped = hasReachedFrequencyCap(ad);
      console.log(`  - Has reached cap: ${capped}`);
      
      if (capped) {
        console.log('[AdDisplay] Ad reached frequency cap:', ad.title, ad.id);
      }
      return !capped;
    });
    
    console.log('[AdDisplay] === FILTERING RESULT ===');
    console.log('[AdDisplay] Filtered ads:', {
      totalAds: ads.length,
      eligibleAds: filtered.length,
      filteredOut: ads.length - filtered.length,
      eligibleAdTitles: filtered.map(a => ({ id: a.id, title: a.title, priority: a.priority }))
    });
    
    setEligibleAds(filtered);
    eligibleAdsRef.current = filtered; // Update ref for rotation timer
    
    // Reset index if it's out of bounds
    if (filtered.length > 0 && currentAdIndex >= filtered.length) {
      console.log('[AdDisplay] Resetting currentAdIndex from', currentAdIndex, 'to 0');
      setCurrentAdIndex(0);
    }
  }, [ads, frequencyData]);

  // Rotation timer with mode support
  useEffect(() => {
    console.log('[AdDisplay] Rotation effect. Eligible ads:', eligibleAds.length, 'maxAds:', maxAds, 'interval:', rotationInterval);
    
    if (eligibleAds.length > 1 && maxAds === 1) {
      // Check if we should use timer or priority mode
      const rotationModes = eligibleAds.map(ad => ad.rotation_mode || 'timer');
      const usePriorityMode = rotationModes.some(mode => mode === 'priority');
      
      console.log('[AdDisplay] Rotation mode:', usePriorityMode ? 'priority' : 'timer');
      
      const interval = setInterval(() => {
        console.log('[AdDisplay] Rotation timer fired');
        const currentEligibleAds = eligibleAdsRef.current;
        console.log('[AdDisplay] Current eligible ads count:', currentEligibleAds.length);
        
        if (currentEligibleAds.length <= 1) {
          console.log('[AdDisplay] Not enough ads to rotate');
          return;
        }
        
        if (usePriorityMode) {
          // Priority-based selection
          const newIndex = selectAdByPriority(currentEligibleAds);
          console.log('[AdDisplay] Priority-based selection chose index:', newIndex);
          setCurrentAdIndex(newIndex);
        } else {
          // Simple sequential rotation
          setCurrentAdIndex(prev => {
            const next = (prev + 1) % currentEligibleAds.length;
            console.log('[AdDisplay] Timer-based rotating from', prev, 'to', next);
            return next;
          });
        }
      }, rotationInterval * 1000);

      return () => {
        console.log('[AdDisplay] Clearing rotation interval');
        clearInterval(interval);
      };
    }
  }, [eligibleAds.length, maxAds, rotationInterval]);

  // Bot detection
  const isBot = () => {
    if (typeof navigator === 'undefined') return true;
    const userAgent = navigator.userAgent;
    return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
  };

  // Get dynamic image URL with proper dimensions
  const getDynamicImageUrl = (originalUrl: string, size: string): string => {
    if (!originalUrl) return '';
    
    const dimensions = AD_SIZES[size as keyof typeof AD_SIZES];
    if (!dimensions) return originalUrl;

    // Handle Unsplash URLs
    if (originalUrl.includes('unsplash.com')) {
      const baseUrl = originalUrl.split('?')[0];
      return `${baseUrl}?w=${dimensions.width}&h=${dimensions.height}&fit=crop&crop=center`;
    }

    // Handle other image services or return original
    return originalUrl;
  };

  const loadAds = async () => {
    console.log('[AdDisplay] loadAds() function called');
    try {
      setLoading(true);
      setError(null);

      console.log(`[AdDisplay] Loading ads for placement: ${placement}, pageType: ${pageType}`);

      // Don't load ads for bots
      if (isBot()) {
        console.log('[AdDisplay] Bot detected, skipping ads');
        setAds([]);
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      console.log(`[AdDisplay] Today's date: ${today}`);
      
      console.log('[AdDisplay] Executing Supabase query...');
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('placement_type', placement)
        .in('status', ['active', 'approved'])
        .lte('start_date', today)
        .gte('end_date', today)
        .order('priority', { ascending: false });
        // Don't limit the query - we need all ads for rotation

      if (error) {
        console.error('[AdDisplay] Supabase error loading ads:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        setError('Failed to load advertisements');
        return;
      }

      // Set all ads (already ordered by priority DESC from query)
      console.log('[AdDisplay] Supabase query successful. Loaded ads:', {
        count: data?.length || 0,
        ads: data,
        placement,
        statuses: data?.map(ad => ad.status),
        dates: data?.map(ad => ({ id: ad.id, start: ad.start_date, end: ad.end_date }))
      });
      setAds(data || []);
    } catch (err) {
      console.error('[AdDisplay] Exception in loadAds:', err);
      setError('Failed to load advertisements');
    } finally {
      console.log('[AdDisplay] loadAds() finished, setting loading to false');
      setLoading(false);
    }
  };

  const trackImpression = async (adId: string) => {
    if (isBot()) return; // Don't track bot impressions

    // Update frequency cap data
    updateFrequencyData(adId);

    try {
      // Update impression count - this should work for anonymous users
      const { data: currentAd, error: selectError } = await supabase
        .from('advertisements')
        .select('impressions')
        .eq('id', adId)
        .single();

      if (selectError) {
        console.log('Could not fetch ad for impression tracking:', selectError.message);
        return;
      }

      if (currentAd) {
        const { error: updateError } = await supabase
          .from('advertisements')
          .update({ 
            impressions: (currentAd.impressions || 0) + 1
          })
          .eq('id', adId);

        if (updateError) {
          console.log('Could not update impression count:', updateError.message);
        }
      }

      // Track detailed impression (if table exists and user has access)
      try {
        const { error: insertError } = await supabase
          .from('advertisement_impressions')
          .insert({
            advertisement_id: adId,
            page_url: window.location.href,
            placement_type: placement,
            device_type: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
            user_agent: navigator.userAgent.substring(0, 500),
            ip_address: null // Will be handled server-side
          });

        if (insertError) {
          // Don't log expected errors (401, 404, table not found)
          if (insertError.code !== 'PGRST301' && 
              !insertError.message.includes('401') && 
              !insertError.message.includes('does not exist') &&
              !insertError.message.includes('404')) {
            console.log('Detailed impression tracking not available:', insertError.message);
          }
        }
      } catch (detailError) {
        // Silently ignore detailed tracking errors
      }
    } catch (error) {
      console.log('Error tracking impression:', error);
    }
  };

  const handleAdClick = async (ad: Advertisement) => {
    if (isBot()) return; // Don't track bot clicks

    try {
      // Update click count
      const { data: currentAd, error: selectError } = await supabase
        .from('advertisements')
        .select('clicks')
        .eq('id', ad.id)
        .single();

      if (selectError) {
        console.log('Could not fetch ad for click tracking:', selectError.message);
      } else if (currentAd) {
        const { error: updateError } = await supabase
          .from('advertisements')
          .update({ 
            clicks: (currentAd.clicks || 0) + 1
          })
          .eq('id', ad.id);

        if (updateError) {
          console.log('Could not update click count:', updateError.message);
        }
      }

      // Track detailed click (if table exists and user has access)
      try {
        const { error: insertError } = await supabase
          .from('advertisement_clicks')
          .insert({
            advertisement_id: ad.id,
            page_url: window.location.href,
            click_url: ad.click_url,
            placement_type: placement,
            device_type: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
            user_agent: navigator.userAgent.substring(0, 500),
            ip_address: null // Will be handled server-side
          });

        if (insertError) {
          // Don't log expected errors (401, 404, table not found)
          if (insertError.code !== 'PGRST301' && 
              !insertError.message.includes('401') && 
              !insertError.message.includes('does not exist') &&
              !insertError.message.includes('404')) {
            console.log('Detailed click tracking not available:', insertError.message);
          }
        }
      } catch (detailError) {
        // Silently ignore detailed tracking errors
      }

      // Open ad in new tab
      window.open(ad.click_url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.log('Error tracking click:', error);
      // Still open the ad even if tracking fails
      window.open(ad.click_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Track impressions when ads are displayed
  useEffect(() => {
    // Don't track if no eligible ads or bot
    if (eligibleAds.length === 0 || isBot()) {
      console.log('[AdDisplay] Not tracking impressions:', { 
        eligibleCount: eligibleAds.length, 
        isBot: isBot() 
      });
      return;
    }

    // Add a delay to ensure the ad is actually rendered and visible
    const impressionTimer = setTimeout(() => {
      console.log('[AdDisplay] Tracking impressions after delay');
      
      // For rotating ads, only track the current one
      if (maxAds === 1 && eligibleAds.length >= 1) {
        const safeIndex = currentAdIndex % eligibleAds.length;
        const currentAd = eligibleAds[safeIndex];
        if (currentAd && !trackedImpressions.current.has(currentAd.id)) {
          console.log('[AdDisplay] Tracking impression for:', currentAd.title);
          trackImpression(currentAd.id);
          trackedImpressions.current.add(currentAd.id);
        } else {
          console.log('[AdDisplay] Already tracked impression for:', currentAd?.title);
        }
      } else {
        // For non-rotating ads, track all (but only once)
        eligibleAds.forEach(ad => {
          if (!trackedImpressions.current.has(ad.id)) {
            console.log('[AdDisplay] Tracking impression for:', ad.title);
            trackImpression(ad.id);
            trackedImpressions.current.add(ad.id);
          }
        });
      }
    }, 1000); // 1 second delay to ensure ad is visible

    return () => {
      clearTimeout(impressionTimer);
    };
  }, [eligibleAds, currentAdIndex]);

  // Debug log at the start of render
  console.log('[AdDisplay] === RENDER START ===', {
    placement,
    pageType,
    loading,
    error,
    adsCount: ads.length,
    eligibleAdsCount: eligibleAds.length,
    currentAdIndex,
    maxAds
  });

  if (loading) {
    console.log('[AdDisplay] Still loading, returning null');
    return null;
  }

  if (error) {
    console.log('[AdDisplay] Error state:', error);
    return null;
  }
  
  if (eligibleAds.length === 0) {
    console.log('[AdDisplay] No eligible ads to display. Total ads:', ads.length, 'Eligible ads:', eligibleAds.length);
    return null;
  }

  // For single ad display (with or without rotation)
  if (maxAds === 1 && eligibleAds.length >= 1) {
    // Ensure currentAdIndex is within bounds
    const safeIndex = currentAdIndex % eligibleAds.length;
    const ad = eligibleAds[safeIndex];
    
    console.log('[AdDisplay] Preparing to render single ad:', {
      maxAds,
      eligibleAdsCount: eligibleAds.length,
      currentAdIndex,
      safeIndex,
      ad: ad ? { id: ad.id, title: ad.title, placement: ad.placement_type, size: ad.size } : null
    });
    
    if (!ad) {
      console.error('[AdDisplay] No ad at index:', safeIndex, 'eligible ads:', eligibleAds.length);
      return null;
    }
    
    const dimensions = AD_SIZES[ad.size as keyof typeof AD_SIZES];
    const imageUrl = getDynamicImageUrl(ad.image_url, ad.size);
    
    console.log('[AdDisplay] Ad dimensions and image:', {
      size: ad.size,
      dimensions,
      imageUrl: imageUrl ? imageUrl.substring(0, 100) + '...' : null
    });
    
    if (!dimensions) {
      console.error('[AdDisplay] No dimensions found for size:', ad.size);
      return null;
    }

    console.log('[AdDisplay] Rendering ad:', ad.title, 'at index:', safeIndex);

    return (
      <div className={`ad-display ${className}`} key={`ad-display-${currentAdIndex}`}>
        <div
          className="ad-container relative cursor-pointer group"
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            maxWidth: '100%'
          }}
          onClick={() => handleAdClick(ad)}
          title={`${ad.title} - ${ad.advertiser_name}`}
        >
          {/* Ad Label with rotation indicator */}
          <div className="absolute top-1 left-1 bg-gray-600/80 text-white text-xs px-1 py-0.5 rounded z-10 flex items-center space-x-1">
            <span>Ad</span>
            <span className="text-electric-400">{safeIndex + 1}/{eligibleAds.length}</span>
          </div>

          {/* Ad Image */}
          <img
            src={imageUrl}
            alt={ad.title}
            className="w-full h-full object-cover rounded border border-gray-600/50 group-hover:border-electric-500/50 transition-colors"
            style={{
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-full h-full bg-gray-800 border border-gray-600 rounded flex items-center justify-center text-gray-400 text-sm">
                    <div class="text-center">
                      <div class="font-medium">${ad.title}</div>
                      <div class="text-xs mt-1">${ad.advertiser_name}</div>
                    </div>
                  </div>
                `;
              }
            }}
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
            <ExternalLink className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    );
  }

  // For multiple ads or single ad without rotation
  return (
    <div className={`ad-display ${className}`}>
      {eligibleAds.map((ad) => {
        const dimensions = AD_SIZES[ad.size as keyof typeof AD_SIZES];
        const imageUrl = getDynamicImageUrl(ad.image_url, ad.size);
        
        if (!dimensions) return null;

        return (
          <div
            key={ad.id}
            className="ad-container relative cursor-pointer group"
            style={{
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
              maxWidth: '100%'
            }}
            onClick={() => handleAdClick(ad)}
            title={`${ad.title} - ${ad.advertiser_name}`}
          >
            {/* Ad Label */}
            <div className="absolute top-1 left-1 bg-gray-600/80 text-white text-xs px-1 py-0.5 rounded z-10">
              Ad
            </div>

            {/* Ad Image */}
            <img
              src={imageUrl}
              alt={ad.title}
              className="w-full h-full object-cover rounded border border-gray-600/50 group-hover:border-electric-500/50 transition-colors"
              style={{
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="w-full h-full bg-gray-800 border border-gray-600 rounded flex items-center justify-center text-gray-400 text-sm">
                      <div class="text-center">
                        <div class="font-medium">${ad.title}</div>
                        <div class="text-xs mt-1">${ad.advertiser_name}</div>
                      </div>
                    </div>
                  `;
                }
              }}
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
              <ExternalLink className="h-6 w-6 text-white" />
            </div>
          </div>
        );
      })}
    </div>
  );
} 