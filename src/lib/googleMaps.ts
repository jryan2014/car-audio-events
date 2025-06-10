/**
 * Google Maps API utilities and configuration
 */

// Get Google Maps API key from environment
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Add debugging for environment variables
console.log('Environment debug:', {
  VITE_GOOGLE_MAPS_API_KEY: GOOGLE_MAPS_API_KEY ? `${GOOGLE_MAPS_API_KEY.substring(0, 8)}...` : 'NOT SET',
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET',
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
  NODE_ENV: import.meta.env.NODE_ENV || 'not set',
  MODE: import.meta.env.MODE || 'not set'
});

// Track loading state
let isLoading = false;
let loadPromise: Promise<void> | null = null;

// Check if Google Maps API is available
export const isGoogleMapsLoaded = (): boolean => {
  return typeof window !== 'undefined' && 
         window.google !== undefined && 
         window.google.maps !== undefined;
};

// Check if we have a valid API key
export const hasValidApiKey = (): boolean => {
  const isValid = GOOGLE_MAPS_API_KEY && 
         GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE' &&
         GOOGLE_MAPS_API_KEY.trim().length > 0;
  
  console.log('hasValidApiKey check:', {
    hasKey: !!GOOGLE_MAPS_API_KEY,
    keyLength: GOOGLE_MAPS_API_KEY?.length || 0,
    isValid
  });
  
  return isValid;
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
    return Promise.resolve();
  }

  // If already loading, return existing promise
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  // Start loading
  isLoading = true;
  loadPromise = new Promise((resolve, reject) => {
    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    
    if (existingScript) {
      // Script exists, wait for it to load
      const checkLoaded = () => {
        if (isGoogleMapsLoaded()) {
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
        isLoading = false;
        reject(new Error('Google Maps API key not configured'));
        return;
      }
      
      // Dynamically load the script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        isLoading = false;
        resolve();
      };
      
      script.onerror = () => {
        isLoading = false;
        reject(new Error('Failed to load Google Maps API - check your API key and internet connection'));
      };
      
      document.head.appendChild(script);
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