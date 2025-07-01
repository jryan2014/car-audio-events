import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Map, Save, CheckCircle, AlertCircle, Globe, Navigation } from 'lucide-react';

interface GoogleMapsSettingsState {
  google_maps_api_key: string;
  google_geocoding_api_key: string;
  google_maps_zoom_level: string;
  google_maps_center_lat: string;
  google_maps_center_lng: string;
}

export const GoogleMapsSettings: React.FC = () => {
  const [settings, setSettings] = useState<GoogleMapsSettingsState>({
    google_maps_api_key: '',
    google_geocoding_api_key: '',
    google_maps_zoom_level: '12',
    google_maps_center_lat: '40.7128',
    google_maps_center_lng: '-74.0060',
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGoogleMapsSettings();
  }, []);

  const loadGoogleMapsSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', [
          'google_maps_api_key',
          'google_geocoding_api_key',
          'google_maps_zoom_level',
          'google_maps_center_lat',
          'google_maps_center_lng',
        ]);
      if (error) throw error;
      if (data) {
        const keyMap: { [key: string]: string } = {};
        data.forEach((item: any) => {
          keyMap[item.key] = item.value || '';
        });
        setSettings({
          google_maps_api_key: keyMap.google_maps_api_key || '',
          google_geocoding_api_key: keyMap.google_geocoding_api_key || '',
          google_maps_zoom_level: keyMap.google_maps_zoom_level || '12',
          google_maps_center_lat: keyMap.google_maps_center_lat || '40.7128',
          google_maps_center_lng: keyMap.google_maps_center_lng || '-74.0060',
        });
      }
    } catch (err: any) {
      setError('Database Error: Failed to load Google Maps settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: keyof GoogleMapsSettingsState, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveStatus('saving');
    setError(null);
    try {
      const settingsToUpdate = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        is_sensitive: key.includes('api_key'),
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('admin_settings')
        .upsert(settingsToUpdate, { onConflict: 'key' });
      if (error) throw error;
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setError('Database Error: Failed to save Google Maps settings. Please try again.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center space-x-2 mb-6">
        <Map className="h-6 w-6 text-electric-500" />
        <h2 className="text-2xl font-bold text-white">Google Maps Configuration</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Maps API Key</label>
          <input
            type="password"
            value={settings.google_maps_api_key}
            onChange={e => handleInputChange('google_maps_api_key', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
            placeholder="Enter your Google Maps API key"
          />
          <p className="text-xs text-gray-400">Your Google Maps JavaScript API key for map display functionality.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Geocoding API Key</label>
          <input
            type="password"
            value={settings.google_geocoding_api_key}
            onChange={e => handleInputChange('google_geocoding_api_key', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
            placeholder="Enter your Google Geocoding API key"
          />
          <p className="text-xs text-gray-400">Your Google Geocoding API key for address-to-coordinates conversion.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Default Zoom Level</label>
            <input
              type="number"
              min="1"
              max="20"
              value={settings.google_maps_zoom_level}
              onChange={e => handleInputChange('google_maps_zoom_level', e.target.value)}
              className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
              placeholder="12"
            />
            <p className="text-xs text-gray-400">1-20 (1=world, 20=street)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Default Latitude</label>
            <input
              type="number"
              step="any"
              value={settings.google_maps_center_lat}
              onChange={e => handleInputChange('google_maps_center_lat', e.target.value)}
              className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
              placeholder="40.7128"
            />
            <p className="text-xs text-gray-400">Default map center latitude</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Default Longitude</label>
            <input
              type="number"
              step="any"
              value={settings.google_maps_center_lng}
              onChange={e => handleInputChange('google_maps_center_lng', e.target.value)}
              className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
              placeholder="-74.0060"
            />
            <p className="text-xs text-gray-400">Default map center longitude</p>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2 mt-6">
        <button
          onClick={handleSave}
          disabled={loading}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold transition-all duration-200 ${
            saveStatus === 'success'
              ? 'bg-green-600 text-white'
              : saveStatus === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-electric-500 text-white hover:bg-electric-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : saveStatus === 'success' ? (
            <>
              <CheckCircle className="h-5 w-5" />
              <span>Saved Successfully</span>
            </>
          ) : saveStatus === 'error' ? (
            <>
              <AlertCircle className="h-5 w-5" />
              <span>Save Failed</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Save Configuration</span>
            </>
          )}
        </button>
      </div>
      {error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-8">
        <h3 className="text-blue-400 font-medium mb-2">Google Maps Setup Instructions</h3>
        <ol className="text-blue-300 text-sm space-y-1 list-decimal list-inside">
          <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
          <li>Create a new project or select an existing one</li>
          <li>Enable the Maps JavaScript API and Geocoding API</li>
          <li>Create API keys with appropriate restrictions</li>
          <li>Set up billing for your Google Cloud project</li>
        </ol>
      </div>
    </div>
  );
}; 