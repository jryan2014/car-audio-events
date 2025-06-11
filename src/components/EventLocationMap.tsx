import React from 'react';
import { MapPin } from 'lucide-react';

interface EventLocationMapProps {
  latitude: number;
  longitude: number;
  eventName: string;
  address: string;
  city: string;
  state: string;
  country: string;
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
  className = "w-full h-64"
}: EventLocationMapProps) {
  const fullAddress = `${address}, ${city}, ${state}, ${country}`;
  
  // For now, using a placeholder map. In production, you'd integrate with:
  // - Google Maps
  // - OpenStreetMap/Leaflet
  // - Mapbox
  // - Apple Maps
  
  const handleOpenInMaps = () => {
    // Try to open in native maps app or Google Maps
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
      <div className="relative h-48 bg-gray-700">
        {/* Placeholder for actual map */}
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
          </div>
        </div>
        
        {/* Overlay for better visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent"></div>
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