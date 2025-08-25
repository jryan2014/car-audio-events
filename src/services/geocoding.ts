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
   * Geocode using Google Maps Geocoding API (Requires API key)
   */
  private async geocodeWithGoogle(address: string): Promise<GeocodeResult | null> {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Maps API response error:', errorText);
        throw new Error(`Google Geocoding API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Google Maps API response:', data);
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        
        return {
          latitude: location.lat,
          longitude: location.lng,
          formatted_address: result.formatted_address,
          confidence: 0.9 // Google is usually very accurate
        };
      } else if (data.status !== 'OK') {
        console.error('Google Maps API status:', data.status, data.error_message);
        throw new Error(`Google Maps API returned status: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Google Maps geocoding error:', error);
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