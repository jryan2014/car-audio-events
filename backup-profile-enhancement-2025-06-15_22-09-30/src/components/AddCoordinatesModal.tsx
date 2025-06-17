import React, { useState } from 'react';
import { X, MapPin, Search, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AddCoordinatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  eventCity: string;
  eventState: string;
  onSuccess: () => void;
}

export default function AddCoordinatesModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  eventCity,
  eventState,
  onSuccess
}: AddCoordinatesModalProps) {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGeocode = async () => {
    if (!eventCity || !eventState) {
      setError('City and state are required for geocoding');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use a geocoding service (you can replace this with Google Maps Geocoding API)
      const address = `${eventCity}, ${eventState}`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        setLatitude(data[0].lat);
        setLongitude(data[0].lon);
      } else {
        setError('Location not found. Please enter coordinates manually.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Failed to geocode address. Please enter coordinates manually.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!latitude || !longitude) {
      setError('Both latitude and longitude are required');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setError('Please enter valid numeric coordinates');
      return;
    }

    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90');
      return;
    }

    if (lng < -180 || lng > 180) {
      setError('Longitude must be between -180 and 180');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('events')
        .update({
          latitude: lat,
          longitude: lng
        })
        .eq('id', eventId);

      if (updateError) {
        throw updateError;
      }

      onSuccess();
      onClose();
      
      // Reset form
      setLatitude('');
      setLongitude('');
    } catch (err: any) {
      console.error('Error updating coordinates:', err);
      setError(err.message || 'Failed to update coordinates');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <MapPin className="h-6 w-6 text-electric-500" />
            <h2 className="text-xl font-bold text-white">Add Coordinates</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Event Info */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">{eventTitle}</h3>
            <p className="text-gray-400 text-sm">{eventCity}, {eventState}</p>
          </div>

          {/* Auto-geocode */}
          <div>
            <button
              onClick={handleGeocode}
              disabled={isLoading || !eventCity || !eventState}
              className="w-full flex items-center justify-center space-x-2 bg-electric-600 hover:bg-electric-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Search className="h-4 w-4" />
              <span>{isLoading ? 'Geocoding...' : 'Auto-find Coordinates'}</span>
            </button>
            <p className="text-gray-400 text-xs mt-2">
              Automatically find coordinates based on city and state
            </p>
          </div>

          {/* Manual coordinates */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g., 41.3683"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g., -82.1076"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !latitude || !longitude}
              className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{isLoading ? 'Saving...' : 'Save Coordinates'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 