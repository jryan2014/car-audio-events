import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { HardDrive, Save, CheckCircle, AlertCircle, RefreshCw, Trash2, Settings, Database } from 'lucide-react';

interface CacheSettingsState {
  enable_service_worker: boolean;
  cache_duration_hours: string;
  enable_offline_mode: boolean;
  auto_clear_cache_days: string;
  enable_cache_compression: boolean;
  max_cache_size_mb: string;
}

export const CacheSettings: React.FC = () => {
  const [settings, setSettings] = useState<CacheSettingsState>({
    enable_service_worker: true,
    cache_duration_hours: '24',
    enable_offline_mode: true,
    auto_clear_cache_days: '7',
    enable_cache_compression: true,
    max_cache_size_mb: '100',
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<{
    totalSize: string;
    itemCount: number;
    lastCleared: string;
  } | null>(null);

  useEffect(() => {
    loadCacheSettings();
    getCacheInfo();
  }, []);

  const loadCacheSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', [
          'enable_service_worker',
          'cache_duration_hours',
          'enable_offline_mode',
          'auto_clear_cache_days',
          'enable_cache_compression',
          'max_cache_size_mb',
        ]);
      if (error) throw error;
      if (data) {
        const keyMap: { [key: string]: string } = {};
        data.forEach((item: any) => {
          keyMap[item.key] = item.value || '';
        });
        setSettings({
          enable_service_worker: keyMap.enable_service_worker === 'true',
          cache_duration_hours: keyMap.cache_duration_hours || '24',
          enable_offline_mode: keyMap.enable_offline_mode === 'true',
          auto_clear_cache_days: keyMap.auto_clear_cache_days || '7',
          enable_cache_compression: keyMap.enable_cache_compression === 'true',
          max_cache_size_mb: keyMap.max_cache_size_mb || '100',
        });
      }
    } catch (err: any) {
      setError('Database Error: Failed to load cache settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCacheInfo = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        let totalSize = 0;
        let itemCount = 0;
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          itemCount += requests.length;
          
          for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              totalSize += blob.size;
            }
          }
        }
        
        setCacheInfo({
          totalSize: (totalSize / (1024 * 1024)).toFixed(2) + ' MB',
          itemCount,
          lastCleared: new Date().toLocaleDateString(),
        });
      }
    } catch (err) {
      console.error('Failed to get cache info:', err);
    }
  };

  const handleInputChange = (key: keyof CacheSettingsState, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveStatus('saving');
    setError(null);
    try {
      const settingsToUpdate = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value),
        is_sensitive: false,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('admin_settings')
        .upsert(settingsToUpdate, { onConflict: 'key' });
      if (error) throw error;
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setError('Database Error: Failed to save cache settings. Please try again.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const clearAllCaches = async () => {
    if (!confirm('Are you sure you want to clear all caches? This will remove all cached data.')) return;
    
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        
        // Clear localStorage and sessionStorage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear IndexedDB
        if ('indexedDB' in window) {
          const databases = await window.indexedDB.databases();
          databases.forEach(db => {
            if (db.name) window.indexedDB.deleteDatabase(db.name);
          });
        }
        
        await getCacheInfo();
        alert('All caches have been cleared successfully.');
      }
    } catch (err: any) {
      setError('Failed to clear caches. Please try again.');
    }
  };

  const clearServiceWorker = async () => {
    if (!confirm('Are you sure you want to unregister the service worker? This will disable offline functionality.')) return;
    
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
        alert('Service worker has been unregistered successfully.');
      }
    } catch (err: any) {
      setError('Failed to unregister service worker. Please try again.');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center space-x-2 mb-6">
        <HardDrive className="h-6 w-6 text-electric-500" />
        <h2 className="text-2xl font-bold text-white">Cache & Performance Settings</h2>
      </div>

      {cacheInfo && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
            <Database className="h-5 w-5 text-electric-500" />
            <span>Cache Information</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-electric-400">{cacheInfo.totalSize}</div>
              <div className="text-sm text-gray-400">Total Cache Size</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-electric-400">{cacheInfo.itemCount}</div>
              <div className="text-sm text-gray-400">Cached Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-electric-400">{cacheInfo.lastCleared}</div>
              <div className="text-sm text-gray-400">Last Cleared</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
            <Settings className="h-5 w-5 text-electric-500" />
            <span>Service Worker Settings</span>
          </h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enable_service_worker"
                checked={settings.enable_service_worker}
                onChange={e => handleInputChange('enable_service_worker', e.target.checked)}
                className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
              />
              <label htmlFor="enable_service_worker" className="text-sm font-medium text-gray-300">
                Enable Service Worker
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enable_offline_mode"
                checked={settings.enable_offline_mode}
                onChange={e => handleInputChange('enable_offline_mode', e.target.checked)}
                className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
              />
              <label htmlFor="enable_offline_mode" className="text-sm font-medium text-gray-300">
                Enable Offline Mode
              </label>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4">Cache Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Cache Duration (hours)</label>
              <input
                type="number"
                min="1"
                max="168"
                value={settings.cache_duration_hours}
                onChange={e => handleInputChange('cache_duration_hours', e.target.value)}
                className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                placeholder="24"
              />
              <p className="text-xs text-gray-400">How long to keep cached data (1-168 hours)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Auto Clear Cache (days)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.auto_clear_cache_days}
                onChange={e => handleInputChange('auto_clear_cache_days', e.target.value)}
                className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                placeholder="7"
              />
              <p className="text-xs text-gray-400">Automatically clear cache after specified days</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Max Cache Size (MB)</label>
              <input
                type="number"
                min="10"
                max="1000"
                value={settings.max_cache_size_mb}
                onChange={e => handleInputChange('max_cache_size_mb', e.target.value)}
                className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                placeholder="100"
              />
              <p className="text-xs text-gray-400">Maximum cache size in megabytes (10-1000 MB)</p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enable_cache_compression"
                checked={settings.enable_cache_compression}
                onChange={e => handleInputChange('enable_cache_compression', e.target.checked)}
                className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
              />
              <label htmlFor="enable_cache_compression" className="text-sm font-medium text-gray-300">
                Enable Cache Compression
              </label>
            </div>
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

      <div className="flex flex-wrap gap-2 mt-6">
        <button
          onClick={getCacheInfo}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh Cache Info</span>
        </button>
        <button
          onClick={clearAllCaches}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          <span>Clear All Caches</span>
        </button>
        <button
          onClick={clearServiceWorker}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          <span>Unregister Service Worker</span>
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-8">
        <h3 className="text-yellow-400 font-medium mb-2">Cache Management Tips</h3>
        <ul className="text-yellow-300 text-sm space-y-1 list-disc list-inside">
          <li>Clear caches regularly to free up storage space</li>
          <li>Service workers enable offline functionality and faster loading</li>
          <li>Cache compression reduces storage usage but may impact performance</li>
          <li>Monitor cache size to prevent storage issues on mobile devices</li>
        </ul>
      </div>
    </div>
  );
}; 