/**
 * Google Maps API utilities and configuration
 */

import { isDevelopment } from '../utils/version';

// Environment variable for Google Maps API key
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Debug logging in development only
if (isDevelopment()) {
  console.log('Environment debug:', {
    VITE_GOOGLE_MAPS_API_KEY: GOOGLE_MAPS_API_KEY ? GOOGLE_MAPS_API_KEY.substring(0, 10) + '...' : 'NOT SET',
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET',
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'not set',
    MODE: import.meta.env.MODE
  });
}

// Track loading state
let isLoading = false;
let loadPromise: Promise<void> | null = null;

// Check if Google Maps API is available
export const isGoogleMapsLoaded = (): boolean => {
  return typeof window !== 'undefined' && 
         window.google !== undefined && 
         window.google.maps !== undefined;
};

// Check if the API key is valid (not empty or the placeholder value)
export const hasValidApiKey = () => {
  return !!GOOGLE_MAPS_API_KEY && 
         GOOGLE_MAPS_API_KEY !== 'your_google_maps_api_key_here' &&
         GOOGLE_MAPS_API_KEY.length > 10;
};

// Fetch Google Maps API key from Supabase Edge Function
export const fetchGoogleMapsApiKey = async (): Promise<string> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      console.warn('Missing Supabase URL, using default Google Maps API key');
      return GOOGLE_MAPS_API_KEY;
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/get-google-maps-key`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Maps API key: ${response.status}`);
    }
    
    const data = await response.json();
    return data.apiKey || GOOGLE_MAPS_API_KEY;
  } catch (error) {
    console.error('Error fetching Google Maps API key:', error);
    return GOOGLE_MAPS_API_KEY;
  }
};

// Load Google Maps API
export const loadGoogleMapsApi = (): Promise<void> => {
  // If already loaded, return resolved promise
  if (isGoogleMapsLoaded()) {
    console.log('Google Maps already loaded successfully');
    return Promise.resolve();
  }

  // If already loading, return existing promise
  if (isLoading && loadPromise) {
    console.log('Google Maps already loading...');
    return loadPromise;
  }

  // Start loading
  isLoading = true;
  console.log('Starting to load Google Maps API...');
  
  loadPromise = new Promise((resolve, reject) => {
    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    
    if (existingScript) {
      console.log('Found existing Google Maps script, waiting for load...');
      // Script exists, wait for it to load
      const checkLoaded = () => {
        if (isGoogleMapsLoaded()) {
          console.log('Google Maps loaded from existing script');
          isLoading = false;
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
    } else {
      // Check if we have a valid API key
      if (!hasValidApiKey()) {
        const error = 'Google Maps API key not configured';
        console.error(error);
        isLoading = false;
        reject(new Error(error));
        return;
      }
      
      console.log('Creating new Google Maps script tag...');
      
      // Create a unique callback name
      const callbackName = `googleMapsCallback_${Date.now()}`;
      
      // Set up the callback function
      (window as any)[callbackName] = () => {
        console.log('Google Maps API fully loaded via callback');
        isLoading = false;
        // Clean up the callback
        delete (window as any)[callbackName];
        resolve();
      };
      
      // Dynamically load the script with callback
      const script = document.createElement('script');
      const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&loading=async&callback=${callbackName}`;
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;
      
      console.log('Loading Google Maps from:', scriptUrl.replace(GOOGLE_MAPS_API_KEY, 'API_KEY_HIDDEN'));
      
      script.onerror = (event) => {
        const error = 'Failed to load Google Maps API - check your API key, billing, and internet connection';
        console.error(error, event);
        isLoading = false;
        // Clean up the callback
        delete (window as any)[callbackName];
        reject(new Error(error));
      };
      
      // Add error event listener for the window to catch Google Maps errors
      const originalErrorHandler = window.onerror;
      window.onerror = function(message, source, lineno, colno, error) {
        if (typeof message === 'string' && message.includes('Google')) {
          console.error('Google Maps API Error:', message);
        }
        if (originalErrorHandler) {
          return originalErrorHandler.call(this, message, source, lineno, colno, error);
        }
        return false;
      };
      
      document.head.appendChild(script);
      console.log('Google Maps script tag added to document head');
    }
  });

  return loadPromise;
};

// Get map styles for modern look
export const getMapStyles = (): google.maps.MapTypeStyle[] => {
  return [
    {
      "featureType": "administrative",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#444444"}]
    },
    {
      "featureType": "landscape",
      "elementType": "all",
      "stylers": [{"color": "#f2f2f2"}]
    },
    {
      "featureType": "poi",
      "elementType": "all",
      "stylers": [{"visibility": "off"}]
    },
    {
      "featureType": "road",
      "elementType": "all",
      "stylers": [{"saturation": -100}, {"lightness": 45}]
    },
    {
      "featureType": "road.highway",
      "elementType": "all",
      "stylers": [{"visibility": "simplified"}]
    },
    {
      "featureType": "road.arterial",
      "elementType": "labels.icon",
      "stylers": [{"visibility": "off"}]
    },
    {
      "featureType": "transit",
      "elementType": "all",
      "stylers": [{"visibility": "off"}]
    },
    {
      "featureType": "water",
      "elementType": "all",
      "stylers": [{"color": "#0ea5e9"}, {"visibility": "on"}]
    }
  ];
};

// Create a custom marker with animation
export const createAnimatedMarker = (
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  color: string,
  title: string
): google.maps.Marker => {
  return new google.maps.Marker({
    position,
    map,
    title,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
    },
    animation: google.maps.Animation.DROP,
    optimized: true
  });
};