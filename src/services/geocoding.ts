// Geocoding service to convert addresses to coordinates
// Supports multiple providers with fallbacks

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formatted_address?: string;
  confidence?: number;
}

interface GeocodeError {
  error: string;
  provider?: string;
}

class GeocodingService {
  private readonly providers = [
    'google',    // Google Maps (requires API key) - First priority, already in CSP
    'nominatim'  // Free OpenStreetMap service - Fallback option
    // 'mapbox' removed - not configured with API key or CSP
  ];

  /**
   * Geocode an address using multiple providers with fallbacks
   */
  async geocodeAddress(
    city: string, 
    state: string, 
    country: string = 'United States',
    streetAddress?: string,
    zipCode?: string
  ): Promise<GeocodeResult | GeocodeError> {
    // Use full address if available for more accurate results
    let address = `${city}, ${state}, ${country}`;
    if (streetAddress && zipCode) {
      address = `${streetAddress}, ${city}, ${state} ${zipCode}, ${country}`;
    } else if (streetAddress) {
      address = `${streetAddress}, ${city}, ${state}, ${country}`;
    }
    
    console.log('🌍 Starting geocoding for:', address);
    
    // Try each provider in order
    for (const provider of this.providers) {
      try {
        console.log(`📍 Trying ${provider} provider...`);
        const result = await this.geocodeWithProvider(address, provider);
        if (result) {
          console.log(`✅ Successfully geocoded with ${provider}:`, result);
          return result;
        }
      } catch (error) {
        console.warn(`⚠️ ${provider} geocoding failed:`, error);
        continue;
      }
    }

    console.error('❌ All geocoding providers failed for:', address);
    return {
      error: `Failed to geocode "${address}" with all providers`,
      provider: 'all'
    };
  }

  /**
   * Geocode using a specific provider
   */
  private async geocodeWithProvider(
    address: string, 
    provider: string
  ): Promise<GeocodeResult | null> {
    switch (provider) {
      case 'nominatim':
        return this.geocodeWithNominatim(address);
      case 'google':
        return this.geocodeWithGoogle(address);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Geocode using OpenStreetMap Nominatim (Free)
   */
  private async geocodeWithNominatim(address: string): Promise<GeocodeResult | null> {
    // Remove country restriction to support worldwide geocoding
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    
    try {
      // Note: User-Agent header cannot be set in browser environments
      // Nominatim still works without it, but may have stricter rate limits
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          formatted_address: result.display_name,
          confidence: parseFloat(result.importance || '0.5')
        };
      }
    } catch (error) {
      console.error('Nominatim geocoding error:', error);
      throw error;
    }

    return null;
  }

  /**
   * Geocode using Google Maps Geocoding API via Edge Function
   * Uses Edge Function to avoid referrer restriction issues
   */
  private async geocodeWithGoogle(address: string): Promise<GeocodeResult | null> {
    // Check if we have Supabase URL configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    // Call our Edge Function instead of Google Maps API directly
    const url = `${supabaseUrl}/functions/v1/geocode-address`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ address })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Geocoding Edge Function error:', errorData);
        throw new Error(`Geocoding failed: ${errorData.error || response.status}`);
      }

      const data = await response.json();
      console.log('Geocoding Edge Function response:', data);
      
      if (data.latitude && data.longitude) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          formatted_address: data.formatted_address,
          confidence: 0.9
        };
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }

    return null;
  }

  /**
   * Geocode using Mapbox Geocoding API (Requires API key)
   */
  private async geocodeWithMapbox(address: string): Promise<GeocodeResult | null> {
    const apiKey = import.meta.env.VITE_MAPBOX_API_KEY;
    
    if (!apiKey) {
      throw new Error('Mapbox API key not configured');
    }

    // Remove country restriction to support worldwide geocoding
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${apiKey}&limit=1`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Mapbox Geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [lng, lat] = feature.center;
      
      return {
        latitude: lat,
        longitude: lng,
        formatted_address: feature.place_name,
        confidence: feature.relevance || 0.8
      };
    }

    return null;
  }

  /**
   * Batch geocode multiple addresses
   */
  async batchGeocode(
    addresses: Array<{ id: string; city: string; state: string; country?: string; streetAddress?: string; zipCode?: string }>
  ): Promise<Array<{ id: string; result: GeocodeResult | GeocodeError }>> {
    const results = [];
    
    for (const addr of addresses) {
      const result = await this.geocodeAddress(addr.city, addr.state, addr.country, addr.streetAddress, addr.zipCode);
      results.push({ id: addr.id, result });
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  /**
   * Validate coordinates
   */
  isValidCoordinates(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' && 
      typeof lng === 'number' &&
      !isNaN(lat) && 
      !isNaN(lng) &&
      lat >= -90 && 
      lat <= 90 &&
      lng >= -180 && 
      lng <= 180
    );
  }
}

// Export singleton instance
export const geocodingService = new GeocodingService();

// Export types
export type { GeocodeResult, GeocodeError }; 