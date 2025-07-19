import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { loadGoogleMapsApi, hasValidApiKey, GOOGLE_MAPS_API_KEY, getMapStyles } from '../lib/googleMaps';
import { MapPin, AlertCircle, Loader, Key, Map, TouchpadOff } from 'lucide-react';

// Define the structure of map event data
interface MapEvent {
  id: string;
  title: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  start_date: string;
  venue_name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  pin_color: string;
  organization_name?: string;
  organization_logo?: string;
  participant_count: number;
  max_participants?: number;
}

// Extend the Window interface to include Google Maps related properties
declare global {
  interface Window {
    google: any;
    initMap?: () => void;
    navigateToEvent?: (eventId: string) => void;
    [key: `infoWindow${number}`]: any;
    [key: `hoverWindow${number}`]: any;
    [key: `marker${number}`]: any;
  }
}

export default function GoogleMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const mapHeight = window.innerWidth <= 768 ? '400px' : '500px'; // Shorter on mobile

  // Check if Google Maps API key is configured
  const GOOGLE_MAPS_CONFIGURED = hasValidApiKey();

  // Initialize map when Google Maps script is loaded
  useEffect(() => {
    if (isScriptLoaded && mapRef.current && !map) {
      initializeMap();
    }
  }, [isScriptLoaded, map]);

  // Set up event handlers and load script
  useEffect(() => {
    // Comprehensive cleanup function
    const cleanup = () => {
      console.log('🧹 Cleaning up GoogleMap resources...');
      
      // Clear all event listeners
      if (window.google && window.google.maps && window.google.maps.event) {
        listenersRef.current.forEach(listener => {
          if (listener) {
            google.maps.event.removeListener(listener);
          }
        });
      }
      listenersRef.current = [];
      
      // Close and clear all info windows
      infoWindowsRef.current.forEach(infoWindow => {
        if (infoWindow) {
          infoWindow.close();
        }
      });
      infoWindowsRef.current = [];
      
      // Clear all markers
      markersRef.current.forEach(marker => {
        if (marker) {
          marker.setMap(null);
        }
      });
      markersRef.current = [];
      
      // Clear map
      if (map && window.google && window.google.maps && window.google.maps.event) {
        // Remove all listeners from map
        google.maps.event.clearInstanceListeners(map);
        setMap(null);
      }
      
      // Cleanup global function
      if (window.navigateToEvent) {
        delete window.navigateToEvent;
      }
      
      setIsLoaded(false);
      setIsScriptLoaded(false);
      setLoading(false);
      setEvents([]);
      setError(null);
    };

    // Global function for navigation from info window
    window.navigateToEvent = (eventId: string) => {
      navigate(`/events/${eventId}`);
    };

    // If Google Maps is not configured, show fallback immediately
    if (!GOOGLE_MAPS_CONFIGURED) {
      setLoading(false);
      setEvents([]);
      setError('Google Maps API key not configured');
      return cleanup;
    }

    // Load Google Maps API
    const loadMap = async () => {
      try {
        await loadGoogleMapsApi();
        setIsScriptLoaded(true);
      } catch (error) {
        console.error('Failed to load Google Maps:', error);
        setError(`Google Maps failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(false);
        setEvents([]);
      }
    };

    loadMap();

    // Return cleanup function
    return cleanup;
  }, [navigate, GOOGLE_MAPS_CONFIGURED]);

  // Load map events function
  const loadMapEvents = useCallback(async (mapInstance: google.maps.Map) => {
    try {
      setLoading(true);
      
      // Load events from remote database
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_date,
          venue_name,
          city,
          state,
          latitude,
          longitude,
          current_participants,
          max_participants,
          event_categories!inner(name, color, icon),
          organizations(name, marker_color)
        `)
        .eq('status', 'published')
        .eq('approval_status', 'approved')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .gte('start_date', new Date().toISOString());

      if (error) {
        console.error('Error loading events:', error);
        setError('Unable to load events at this time');
        setEvents([]);
        return;
      }

      if (!data || data.length === 0) {
        console.log('No events found with location data');
        setEvents([]);
        return;
      }

      // Format events for map display
      const mapEvents: MapEvent[] = data.map(event => {
        const category = event.event_categories as any;
        const organization = event.organizations as any;
        
        // Use organization marker color if available, otherwise fall back to category color
        const markerColor = organization?.marker_color || category?.color || '#3b82f6';
        
        return {
          id: event.id,
          title: event.title,
          category_name: category?.name || 'Event',
          category_color: category?.color || '#3b82f6',
          category_icon: category?.icon || 'calendar',
          start_date: event.start_date,
          venue_name: event.venue_name || '',
          city: event.city,
          state: event.state,
          latitude: event.latitude,
          longitude: event.longitude,
          pin_color: markerColor,
          organization_name: organization?.name,
          participant_count: event.current_participants || 0,
          max_participants: event.max_participants
        };
      });

      setEvents(mapEvents);
      addMarkersToMap(mapInstance, mapEvents);

    } catch (error) {
      console.error('Error in loadMapEvents:', error);
      setError('Failed to load event data');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to initialize the map
  const initializeMap = useCallback(() => {
    console.log('Initializing Google Map...');
    
    if (!window.google || !window.google.maps || !mapRef.current) {
      console.error('Cannot initialize map - missing dependencies:', {
        hasWindow: typeof window !== 'undefined',
        hasGoogle: !!(window as any).google,
        hasMaps: !!((window as any).google?.maps),
        hasMapRef: !!mapRef.current
      });
      return;
    }

    try {
      console.log('Creating map with options...');
      
      // Create map with modern styling
      const mapOptions: google.maps.MapOptions = {
        zoom: 3,
        center: { lat: 39.8283, lng: -98.5795 }, // Centered on US
        styles: getMapStyles(),
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: true,
        streetViewControl: true,
        rotateControl: true,
        fullscreenControl: true,
        gestureHandling: 'greedy',
        clickableIcons: true,
        keyboardShortcuts: true
      };

      console.log('Map options configured:', mapOptions);

      const mapInstance = new window.google.maps.Map(mapRef.current, mapOptions);
      
      console.log('Map instance created:', mapInstance);
      
      // Add event listeners to track map loading and store for cleanup
      const idleListener = mapInstance.addListener('idle', () => {
        console.log('Map is idle (finished loading)');
      });
      
      const tilesLoadedListener = mapInstance.addListener('tilesloaded', () => {
        console.log('Map tiles have finished loading');
      });
      
      // Store listeners for cleanup
      listenersRef.current.push(idleListener, tilesLoadedListener);
      
      setMap(mapInstance);
      setIsLoaded(true);
      
      console.log('Map state updated, loading events...');

      // Load events from database
      loadMapEvents(mapInstance);
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setLoading(false);
      setEvents([]);
    }
  }, [loadMapEvents]);

  const addMarkersToMap = (mapInstance: google.maps.Map, events: MapEvent[]) => {
    if (!window.google || !mapInstance) return;
    
    console.log('Adding markers to map:', events.length);
    
    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (marker) {
        marker.setMap(null);
      }
    });
    
    // Clear existing info windows
    infoWindowsRef.current.forEach(infoWindow => {
      if (infoWindow) {
        infoWindow.close();
      }
    });
    
    // Clear existing hover windows from global scope
    for (let i = 0; i < 1000; i++) {
      if (window[`hoverWindow${i}`]) {
        window[`hoverWindow${i}`].close();
        delete window[`hoverWindow${i}`];
      }
    }
    
    // Reset references
    markersRef.current = [];
    infoWindowsRef.current = [];
    
    // Create marker cluster manager for better performance with many markers
    const markers: google.maps.Marker[] = [];
    
    events.forEach((event, index) => {
      // Verify coordinates are valid numbers
      if (typeof event.latitude !== 'number' || typeof event.longitude !== 'number' ||
          isNaN(event.latitude) || isNaN(event.longitude) ||
          event.latitude === 0 || event.longitude === 0) {
        console.warn(`Skipping marker for event ${event.id} due to invalid coordinates:`, 
                     event.latitude, event.longitude);
        return;
      }
      
      console.log(`Creating marker for ${event.title} at ${event.latitude},${event.longitude}`);
      
      let isHovering = false;
      
      // Create custom marker with event-specific styling
      const marker = new window.google.maps.Marker({
        position: { lat: event.latitude, lng: event.longitude },
        map: mapInstance,
        title: event.title,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: event.pin_color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        animation: window.google.maps.Animation.DROP,
        clickable: true,
        cursor: 'pointer',
        optimized: true // Better performance
      });

      // No blinking animation - just static marker

      // Create enhanced info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: createInfoWindowContent(event),
        maxWidth: 320,
        pixelOffset: new window.google.maps.Size(0, -10)
      });
      
      infoWindowsRef.current.push(infoWindow);

      // Add click listener and track for cleanup
      const clickListener = marker.addListener('click', (e: any) => {
        e.stop();
        
        // Close any open info windows
        infoWindowsRef.current.forEach(window => {
          if (window) {
            window.close();
          }
        });
        
        infoWindow.open(mapInstance, marker);
      });
      
      // Track listener for cleanup
      listenersRef.current.push(clickListener);

      // Add hover effects (only on desktop)
      const isMobile = window.innerWidth <= 768;
      
      if (!isMobile) {
        const mouseoverListener = marker.addListener('mouseover', () => {
          isHovering = true;
          
          // Close any existing hover windows
          for (let i = 0; i < events.length; i++) {
            if (window[`hoverWindow${i}`]) {
              window[`hoverWindow${i}`].close();
            }
          }

          marker.setIcon({
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 18,
            fillColor: '#22d3ee',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 4,
          });
          
          // Show preview on hover
          const hoverWindow = new window.google.maps.InfoWindow({
            content: createHoverContent(event),
            maxWidth: 250,
            pixelOffset: new window.google.maps.Size(0, -15)
          });
          
          hoverWindow.open(mapInstance, marker);
          window[`hoverWindow${index}`] = hoverWindow;
        });

        const mouseoutListener = marker.addListener('mouseout', () => {
          isHovering = false;
          
          marker.setIcon({
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: event.pin_color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          });
          
          setTimeout(() => {
            if (window[`hoverWindow${index}`]) {
              window[`hoverWindow${index}`].close();
              delete window[`hoverWindow${index}`];
            }
          }, 200);
        });
        
        // Track hover listeners for cleanup
        listenersRef.current.push(mouseoverListener, mouseoutListener);
      }

      
      // Store marker for clustering
      markers.push(marker);
      markersRef.current.push(marker);
    });

    // Log marker creation summary
    console.log(`Created ${markers.length} markers on map`);
    
    // Fit map to show all markers if we have any
    if (markers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      markers.forEach(marker => {
        const position = marker.getPosition();
        if (position) {
          bounds.extend(position);
        }
      });
      
      // Only fit bounds if we have multiple markers
      if (markers.length > 1) {
        mapInstance.fitBounds(bounds, 50);
        
        // Ensure minimum zoom level
        const listener = mapInstance.addListener('idle', () => {
          if (mapInstance.getZoom() > 15) {
            mapInstance.setZoom(15);
          }
          google.maps.event.removeListener(listener);
        });
      }
    }
  };

  const createInfoWindowContent = (event: MapEvent) => {
    const organizationLogo = event.organization_logo 
      ? `<img src="${event.organization_logo}" alt="${event.organization_name}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover; margin-right: 12px;">`
      : '';

    const organizationInfo = event.organization_name
      ? `<div style="display: flex; align-items: center; margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 8px;">
           ${organizationLogo}
           <div>
             <div style="font-weight: 600; color: #1f2937; font-size: 12px;">Hosted by</div>
             <div style="color: #374151; font-size: 14px;">${event.organization_name}</div>
           </div>
         </div>`
      : '';

    return `
      <div style="padding: 16px; min-width: 280px; font-family: 'Inter', sans-serif; line-height: 1.5; background: white; border-radius: 12px; position: relative;">
        <button 
          onclick="this.parentElement.parentElement.parentElement.style.display='none'" 
          style="position: absolute; top: 8px; right: 8px; background: none; border: none; cursor: pointer; font-size: 14px; color: #9ca3af; font-weight: normal; transition: color 0.2s; line-height: 1; padding: 0; margin: 0;"
          onmouseover="this.style.color='#374151';"
          onmouseout="this.style.color='#9ca3af';"
        >
          ×
        </button>
        <div style="font-weight: 800; font-size: 18px; color: #1f2937; margin-bottom: 12px; border-bottom: 3px solid ${event.pin_color}; padding-bottom: 8px;">
          ${event.title}
        </div>
        ${organizationInfo}
        <div style="display: flex; align-items: center; color: #374151; font-size: 14px; margin-bottom: 8px; font-weight: 500;">
          <span style="margin-right: 8px; font-size: 16px;">📍</span>
          <span>${event.venue_name}, ${event.city}, ${event.state}</span>
        </div>
        <div style="display: flex; align-items: center; color: #374151; font-size: 14px; margin-bottom: 8px; font-weight: 500;">
          <span style="margin-right: 8px; font-size: 16px;">📅</span>
          <span>${new Date(event.start_date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}</span>
        </div>
        <div style="display: flex; align-items: center; color: #374151; font-size: 14px; margin-bottom: 16px; font-weight: 500;">
          <span style="margin-right: 8px; font-size: 16px;">👥</span>
          <span>${event.participant_count}${event.max_participants ? `/${event.max_participants}` : ''} participants</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="background: linear-gradient(135deg, ${event.pin_color}, ${event.category_color}); color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            ${event.category_name}
          </span>
          <button 
            onclick="window.navigateToEvent('${event.id}')" 
            style="background: linear-gradient(135deg, ${event.pin_color}, ${event.category_color}); color: white; border: none; padding: 10px 20px; border-radius: 10px; font-size: 14px; cursor: pointer; font-weight: 700; transition: all 0.3s; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4); text-transform: uppercase; letter-spacing: 0.5px;"
            onmouseover="this.style.transform='translateY(-2px) scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(14, 165, 233, 0.6)';"
            onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 4px 12px rgba(14, 165, 233, 0.4)';"
          >
            View Details →
          </button>
        </div>
      </div>
    `;
  };

  const createHoverContent = (event: MapEvent) => {
    return `
      <div style="padding: 12px; font-family: 'Inter', sans-serif; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
        <div style="font-weight: 700; color: #1f2937; font-size: 16px; margin-bottom: 4px;">${event.title}</div>
        <div style="color: #6b7280; font-size: 13px; font-weight: 500;">${event.city}, ${event.state} • ${new Date(event.start_date).toLocaleDateString()}</div>
        <div style="color: ${event.pin_color}; font-size: 11px; font-weight: 600; margin-top: 4px; text-transform: uppercase;">Click for details</div>
      </div>
    `;
  };

  // If Google Maps is not configured, show configuration message
  if (!GOOGLE_MAPS_CONFIGURED) {
    return (
      <div className="w-full h-full relative bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center" style={{ minHeight: '500px' }}>
        <div className="text-center p-8 max-w-md">
          <Key className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-white mb-4">Google Maps Setup Required</h3>
          <p className="text-gray-300 mb-6 leading-relaxed">
            To display the interactive map, you need to configure a Google Maps API key.
          </p>
          <div className="bg-gray-800 rounded-lg p-4 text-left text-sm text-gray-300 mb-6">
            <p className="font-semibold text-white mb-2">Setup Steps:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to <span className="text-blue-400">console.cloud.google.com</span></li>
              <li>Create a project and enable billing</li>
              <li>Enable "Maps JavaScript API" and "Places API"</li>
              <li>Create an API key in "Credentials"</li>
              <li>Add the key to your .env file as VITE_GOOGLE_MAPS_API_KEY</li>
            </ol>
          </div>
          <p className="text-yellow-400 text-sm">
            Map will display real events once configured
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" style={{ minHeight: mapHeight }}>
      {/* Map container is always rendered, with a fallback background color */}
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: '100%', backgroundColor: '#e5e7eb' }} />

      {/* Unified loading overlay */}
      {(!isLoaded || loading) && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center z-10">
          <div className="text-center p-8">
            <Loader className="h-12 w-12 text-electric-500 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {!isScriptLoaded
                ? 'Loading Map Library'
                : !isLoaded
                ? 'Initializing Map'
                : 'Loading Events'}
            </h3>
            <p className="text-gray-400">
              {!isScriptLoaded
                ? 'Preparing interactive experience...'
                : !isLoaded
                ? 'Setting up your interactive event map...'
                : 'Fetching latest event data...'}
            </p>
          </div>
        </div>
      )}

      {/* Error notification - only shows when map is loaded but an error occurred later (e.g., event loading) */}
      {error && isLoaded && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow-lg z-20">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Map legend */}
      {isLoaded && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-2xl border border-gray-200 z-10 text-xs sm:text-sm">
          <div className="flex items-center space-x-3 text-gray-800 text-sm mb-2">
            <div className="w-5 h-5 bg-electric-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
            <span className="font-bold">Car Audio Events</span>
          </div>
          <div className="text-gray-600 text-xs">
            Click pins for details • Hover for preview
          </div>
          {loading && (
            <div className="text-gray-500 text-xs mt-1">
              Loading...
            </div>
          )}
        </div>
      )}

      {/* Stats overlay */}
      {isLoaded && (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-3 border border-gray-200 shadow-2xl z-10">
          <div className="text-gray-800 font-bold text-xs sm:text-sm mb-1">
            Active Events
          </div>
          <div className="text-electric-500 text-2xl sm:text-3xl font-black">{events.length}</div>
          <div className="text-gray-600 text-xs">Worldwide</div>
        </div>
      )}
      
      {/* Touch hint for mobile */}
      {isLoaded && window.innerWidth <= 768 && (
        <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white rounded-full p-2 z-10 animate-pulse">
          <TouchpadOff className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}