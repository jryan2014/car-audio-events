import React, { useState, useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

export default function AdDisplay({ placement, pageType = 'general', className = '', maxAds = 1 }: AdDisplayProps) {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAds();
  }, [placement, pageType]);

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
    try {
      setLoading(true);
      setError(null);

      // Don't load ads for bots
      if (isBot()) {
        setAds([]);
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('placement_type', placement)
        .in('status', ['active', 'approved'])
        .lte('start_date', today)
        .gte('end_date', today)
        .order('priority', { ascending: false })
        .limit(maxAds);

      if (error) {
        console.error('Error loading ads:', error);
        setError('Failed to load advertisements');
        return;
      }

      setAds(data || []);
    } catch (err) {
      console.error('Error loading ads:', err);
      setError('Failed to load advertisements');
    } finally {
      setLoading(false);
    }
  };

  const trackImpression = async (adId: string) => {
    if (isBot()) return; // Don't track bot impressions

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

  // Track impressions when ads are loaded
  useEffect(() => {
    if (ads.length > 0 && !isBot()) {
      ads.forEach(ad => {
        trackImpression(ad.id);
      });
    }
  }, [ads]);

  if (loading) {
    return null; // Don't show loading state for ads
  }

  if (error || ads.length === 0) {
    return null; // Don't show error state for ads
  }

  return (
    <div className={`ad-display ${className}`}>
      {ads.map((ad) => {
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