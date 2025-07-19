import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { loadGoogleMapsApi } from '../lib/googleMaps';

interface EventLocationMapProps {
  latitude: number;
  longitude: number;
  eventName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  organizationColor?: string;
  className?: string;
}

export default function EventLocationMap({
  latitude,
  longitude,
  eventName,
  address,
  city,
  state,
  country,
  organizationColor = '#0ea5e9',
  className = "w-full h-80"
}: EventLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cleanup
  const markerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  
  const fullAddress = `${address}, ${city}, ${state}, ${country}`;
  
  // Check if Google Maps API key is configured
  const hasValidApiKey = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    return apiKey && apiKey !== 'your-google-maps-api-key-here' && apiKey.length > 10;
  };
  
  const GOOGLE_MAPS_CONFIGURED = hasValidApiKey();

  useEffect(() => {
    // Cleanup function to prevent memory leaks
    const cleanup = () => {
      console.log('🧹 Cleaning up EventLocationMap resources...');
      
      // Clear all event listeners
      listenersRef.current.forEach(listener => {
        if (listener) {
          google.maps.event.removeListener(listener);
        }
      });
      listenersRef.current = [];
      
      // Close and clear info window
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      
      // Clear marker
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      
      // Clear map
      if (map) {
        // Remove all listeners from map
        google.maps.event.clearInstanceListeners(map);
        setMap(null);
      }
      
      setIsLoaded(false);
      setError(null);
    };

    // TEMPORARY DEBUG INFO
    console.log('🗺️ EventLocationMap received coordinates:', {
      latitude,
      longitude,
      eventName,
      timestamp: new Date().toISOString()
    });

    if (!GOOGLE_MAPS_CONFIGURED) {
      setError('Google Maps API key not configured');
      return cleanup;
    }

    // Validate coordinates
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      setError(`Invalid coordinates: lat=${latitude}, lng=${longitude}`);
      return cleanup;
    }

    const initializeMap = async () => {
      try {
        console.log('🗺️ Creating map with center coordinates:', { lat: latitude, lng: longitude });
        await loadGoogleMapsApi();
        
        if (!mapRef.current || !window.google) {
          throw new Error('Google Maps failed to load');
        }

        // Create map centered on the event location
        const centerCoords = { lat: latitude, lng: longitude };
        console.log('🎯 Setting map center to:', centerCoords);
        
        const mapOptions: google.maps.MapOptions = {
          zoom: 15,
          center: centerCoords,
          styles: getMapStyles(),
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: true,
          rotateControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy',
          // Force refresh with timestamp to prevent caching
          mapId: `event-map-${Date.now()}`
        };

        const mapInstance = new window.google.maps.Map(mapRef.current, mapOptions);
        
        // Force the map to recenter after a brief delay
        setTimeout(() => {
          console.log('🔄 Force recentering map to:', centerCoords);
          mapInstance.setCenter(centerCoords);
          mapInstance.setZoom(15);
        }, 100);

        // Add marker for the event location
        const markerPosition = { lat: latitude, lng: longitude };
        console.log('📍 Creating marker at position:', markerPosition);
        const marker = new window.google.maps.Marker({
          position: markerPosition,
          map: mapInstance,
          title: eventName,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: organizationColor,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          animation: null // Explicitly no animation
        });
        
        // Store marker reference for cleanup
        markerRef.current = marker;
        
        // Force marker position update after delay
        setTimeout(() => {
          console.log('📍 Force updating marker position to:', markerPosition);
          marker.setPosition(markerPosition);
        }, 200);

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="color: #333; font-family: sans-serif; max-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${eventName}</h3>
              <p style="margin: 0; font-size: 14px; color: #666;">${fullAddress}</p>
            </div>
          `
        });

        // Store info window reference for cleanup
        infoWindowRef.current = infoWindow;

        // Add click listener and store for cleanup
        const clickListener = marker.addListener('click', () => {
          infoWindow.open(mapInstance, marker);
        });
        listenersRef.current.push(clickListener);

        setMap(mapInstance);
        setIsLoaded(true);
        
      } catch (err) {
        console.error('Error initializing Google Maps:', err);
        setError('Failed to load Google Maps');
      }
    };

    initializeMap();

    // Return cleanup function
    return cleanup;
  }, [latitude, longitude, eventName, fullAddress, organizationColor, GOOGLE_MAPS_CONFIGURED]);

  // Get map styles
  const getMapStyles = () => {
    return [
      {
        "featureType": "all",
        "elementType": "geometry",
        "stylers": [{"color": "#2c3e50"}]
      },
      {
        "featureType": "all",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#ecf0f1"}]
      },
      {
        "featureType": "all",
        "elementType": "labels.text.stroke",
        "stylers": [{"color": "#34495e"}]
      },
      {
        "featureType": "administrative",
        "elementType": "geometry.stroke",
        "stylers": [{"color": "#34495e"}]
      },
      {
        "featureType": "landscape",
        "elementType": "geometry",
        "stylers": [{"color": "#34495e"}]
      },
      {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [{"color": "#34495e"}]
      },
      {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{"color": "#34495e"}]
      },
      {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [{"color": "#2c3e50"}]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{"color": "#4a5568"}]
      },
      {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [{"color": "#2c3e50"}]
      },
      {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{"color": "#1a365d"}]
      }
    ];
  };
  
  const handleOpenInMaps = () => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden ${className}`}>
      {/* Map Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-electric-500" />
            <h3 className="text-lg font-semibold text-white">Event Location</h3>
          </div>
          <button
            onClick={handleOpenInMaps}
            className="text-electric-400 hover:text-electric-300 text-sm font-medium"
          >
            Open in Maps
          </button>
        </div>
      </div>

      {/* Map Area */}
      <div className="relative h-80 bg-gray-700">
        {GOOGLE_MAPS_CONFIGURED && !error ? (
          <div ref={mapRef} className="w-full h-full" />
        ) : (
          /* Fallback placeholder */
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-electric-500 mx-auto mb-2" />
              <p className="text-white font-medium">{eventName}</p>
              <p className="text-gray-400 text-sm">{fullAddress}</p>
              {latitude && longitude && (
                <p className="text-xs text-gray-500 mt-1">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              )}
              {error && (
                <p className="text-red-400 text-xs mt-2">{error}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Loading overlay */}
        {GOOGLE_MAPS_CONFIGURED && !isLoaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-700/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500"></div>
          </div>
        )}
      </div>

      {/* Address Details */}
      <div className="p-4">
        <div className="space-y-2">
          <div className="flex items-start space-x-2">
            <MapPin className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-white font-medium">{eventName}</p>
              <p className="text-gray-400">{address}</p>
              <p className="text-gray-400">{city}, {state} {country !== 'US' ? country : ''}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <button
            onClick={handleOpenInMaps}
            className="w-full bg-electric-500 text-white py-2 px-4 rounded-lg hover:bg-electric-600 transition-colors text-sm font-medium"
          >
            Get Directions
          </button>
        </div>
      </div>
    </div>
  );
} 