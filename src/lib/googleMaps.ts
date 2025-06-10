/**
 * Google Maps API utilities and configuration
 */

// Get Google Maps API key from environment with the provided key
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBYMbq6u4tmOJKRnLww28MGe-7QOGmhjyM';

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
  return GOOGLE_MAPS_API_KEY && 
         GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE' &&
         GOOGLE_MAPS_API_KEY.trim().length > 0;
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
    // Check if script is already in DOM (from index.html)
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
      // Dynamically load the script
      // First try to get the API key from the edge function
      fetchGoogleMapsApiKey().then(apiKey => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          isLoading = false;
          resolve();
        };
        
        script.onerror = () => {
          isLoading = false;
          reject(new Error('Failed to load Google Maps API'));
        };
        
        document.head.appendChild(script);
      }).catch(error => {
        isLoading = false;
        reject(error);
      });
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