// Google Maps Service
// Handles loading and management of Google Maps API

interface DebugInfo {
  VITE_GOOGLE_MAPS_API_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  NODE_ENV?: string;
  MODE?: string;
}

console.log('Environment debug:', {
  VITE_GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? `${import.meta.env.VITE_GOOGLE_MAPS_API_KEY.substring(0, 8)}...` : 'NOT SET',
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET',
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
  NODE_ENV: import.meta.env.NODE_ENV || 'not set',
  MODE: import.meta.env.MODE || 'not set'
} as DebugInfo);

declare global {
  interface Window {
    google: any;
    initMap?: () => void;
  }
}

export interface MapConfig {
  zoom?: number;
  center?: { lat: number; lng: number };
  mapTypeId?: string;
  styles?: any[];
  disableDefaultUI?: boolean;
  zoomControl?: boolean;
  mapTypeControl?: boolean;
  scaleControl?: boolean;
  streetViewControl?: boolean;
  rotateControl?: boolean;
  fullscreenControl?: boolean;
}

export interface MarkerConfig {
  position: { lat: number; lng: number };
  title?: string;
  icon?: string;
  infoWindow?: string;
}

class GoogleMapsService {
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      this.isLoaded = true;
    }
  }

  async initialize(): Promise<void> {
    if (this.isLoaded) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.loadGoogleMapsScript();
    return this.loadPromise;
  }

  private loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded');
        this.isLoaded = true;
        resolve();
        return;
      }

      // Check if already loading
      if (this.isLoading) {
        console.log('Google Maps already loading...');
        // Return the existing promise
        if (this.loadPromise) {
          this.loadPromise.then(resolve).catch(reject);
        }
        return;
      }

      this.isLoading = true;
      console.log('Starting to load Google Maps API...');

      const script = document.createElement('script');
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        const error = new Error('Google Maps API key not found in environment variables');
        console.error('❌ Google Maps Error:', error.message);
        this.isLoading = false;
        reject(error);
        return;
      }

      // Hide the API key in logs for security
      console.log('Loading Google Maps from:', `https://maps.googleapis.com/maps/api/js?key=API_KEY_HIDDEN&libraries=places,geometry&loading=async`);

      // Use async loading for better performance
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('Google Maps script loaded successfully');
        this.isLoaded = true;
        this.isLoading = false;
        resolve();
      };

      script.onerror = (error) => {
        console.error('❌ Failed to load Google Maps script:', error);
        this.isLoading = false;
        reject(new Error('Failed to load Google Maps script'));
      };

      console.log('Google Maps script tag added to document head');
      document.head.appendChild(script);
    });
  }

  isReady(): boolean {
    return this.isLoaded && window.google && window.google.maps;
  }

  createMap(container: HTMLElement, config: MapConfig = {}): any {
    if (!this.isReady()) {
      throw new Error('Google Maps not loaded. Call initialize() first.');
    }

    const defaultConfig: MapConfig = {
      zoom: 4,
      center: { lat: 39.8283, lng: -98.5795 }, // Center of USA
      mapTypeId: 'roadmap',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: true,
      rotateControl: true,
      fullscreenControl: true
    };

    const mapConfig = { ...defaultConfig, ...config };
    return new window.google.maps.Map(container, mapConfig);
  }

  createMarker(map: any, config: MarkerConfig): any {
    if (!this.isReady()) {
      throw new Error('Google Maps not loaded. Call initialize() first.');
    }

    const marker = new window.google.maps.Marker({
      position: config.position,
      map: map,
      title: config.title,
      icon: config.icon
    });

    if (config.infoWindow) {
      const infoWindow = new window.google.maps.InfoWindow({
        content: config.infoWindow
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    }

    return marker;
  }

  createInfoWindow(content: string): any {
    if (!this.isReady()) {
      throw new Error('Google Maps not loaded. Call initialize() first.');
    }

    return new window.google.maps.InfoWindow({
      content: content
    });
  }

  geocodeAddress(address: string): Promise<any> {
    if (!this.isReady()) {
      throw new Error('Google Maps not loaded. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      const geocoder = new window.google.maps.Geocoder();
      
      geocoder.geocode({ address: address }, (results: any[], status: string) => {
        if (status === 'OK' && results && results.length > 0) {
          resolve(results[0]);
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }

  calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    if (!this.isReady()) {
      throw new Error('Google Maps not loaded. Call initialize() first.');
    }

    const latLng1 = new window.google.maps.LatLng(point1.lat, point1.lng);
    const latLng2 = new window.google.maps.LatLng(point2.lat, point2.lng);
    
    return window.google.maps.geometry.spherical.computeDistanceBetween(latLng1, latLng2);
  }

  createPlacesService(map: any): any {
    if (!this.isReady()) {
      throw new Error('Google Maps not loaded. Call initialize() first.');
    }

    return new window.google.maps.places.PlacesService(map);
  }

  createAutocomplete(input: HTMLInputElement, options: any = {}): any {
    if (!this.isReady()) {
      throw new Error('Google Maps not loaded. Call initialize() first.');
    }

    return new window.google.maps.places.Autocomplete(input, options);
  }
}

// Export a singleton instance
export const googleMapsService = new GoogleMapsService(); 