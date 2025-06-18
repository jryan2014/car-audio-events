import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Download, 
  Database, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { CacheManager, CacheStats } from '../utils/cacheManager';

interface ServiceWorkerManagerProps {
  showFullInterface?: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const ServiceWorkerManager: React.FC<ServiceWorkerManagerProps> = ({ 
  showFullInterface = false 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swStatus, setSwStatus] = useState({
    supported: false,
    registered: false,
    active: false,
    controller: false
  });
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [storageQuota, setStorageQuota] = useState({
    quota: 0,
    usage: 0,
    available: 0,
    percentage: 0
  });

  useEffect(() => {
    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Initial data load
    loadServiceWorkerStatus();
    if (showFullInterface) {
      loadCacheStats();
      loadStorageQuota();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [showFullInterface]);

  const loadServiceWorkerStatus = async () => {
    try {
      const status = await CacheManager.getServiceWorkerStatus();
      setSwStatus(status);
    } catch (error) {
      console.error('Failed to load service worker status:', error);
    }
  };

  const loadCacheStats = async () => {
    try {
      const stats = await CacheManager.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  const loadStorageQuota = async () => {
    try {
      const quota = await CacheManager.getStorageQuota();
      setStorageQuota(quota);
    } catch (error) {
      console.error('Failed to load storage quota:', error);
    }
  };

  const handleRefreshCaches = async () => {
    setIsUpdating(true);
    try {
      await CacheManager.warmUpCaches();
      await loadCacheStats();
      await loadStorageQuota();
    } catch (error) {
      console.error('Failed to refresh caches:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearAllCaches = async () => {
    if (!confirm('Are you sure you want to clear all caches? This will remove all cached data.')) {
      return;
    }

    try {
      const clearedCount = await CacheManager.clearAllCaches();
      alert(`Cleared ${clearedCount} caches`);
      await loadCacheStats();
      await loadStorageQuota();
    } catch (error) {
      console.error('Failed to clear caches:', error);
      alert('Failed to clear caches');
    }
  };

  const handleClearDataCaches = async () => {
    if (!confirm('Clear data caches? This will remove cached API responses and images.')) {
      return;
    }

    try {
      const clearedCount = await CacheManager.clearDataCaches();
      alert(`Cleared ${clearedCount} data caches`);
      await loadCacheStats();
      await loadStorageQuota();
    } catch (error) {
      console.error('Failed to clear data caches:', error);
      alert('Failed to clear data caches');
    }
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA installation accepted');
      } else {
        console.log('PWA installation dismissed');
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('Failed to install PWA:', error);
    }
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  // Basic status indicator for header
  if (!showFullInterface) {
    return (
      <div className="flex items-center space-x-2">
        {/* Online/Offline indicator */}
        <div className="flex items-center space-x-1">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-sm ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Service Worker status */}
        {swStatus.supported && (
          <div className="flex items-center space-x-1">
            {swStatus.active ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
            <span className="text-sm text-gray-600">
              {swStatus.active ? 'Cached' : 'Caching...'}
            </span>
          </div>
        )}

        {/* PWA Install prompt */}
        {showInstallPrompt && (
          <button
            onClick={handleInstallPWA}
            className="flex items-center space-x-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
          >
            <Download className="h-3 w-3" />
            <span>Install App</span>
          </button>
        )}
      </div>
    );
  }

  // Full interface for admin panels
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Service Worker & Cache Management</h3>
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <div className="flex items-center space-x-1 text-green-600">
              <Wifi className="h-4 w-4" />
              <span className="text-sm">Online</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-red-600">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Service Worker Status */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Service Worker Status</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${swStatus.supported ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">Supported</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${swStatus.registered ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">Registered</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${swStatus.active ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${swStatus.controller ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">Controller</span>
          </div>
        </div>
      </div>

      {/* Storage Quota */}
      {storageQuota.quota > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Storage Usage</h4>
          <div className="bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(storageQuota.percentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>{CacheManager.formatBytes(storageQuota.usage)} used</span>
            <span>{CacheManager.formatBytes(storageQuota.quota)} total</span>
          </div>
        </div>
      )}

      {/* Cache Statistics */}
      {cacheStats && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Cache Statistics</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Total Caches</div>
              <div className="text-lg font-semibold">{cacheStats.totalCaches}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Total Size</div>
              <div className="text-lg font-semibold">{CacheManager.formatBytes(cacheStats.totalSize)}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Total Entries</div>
              <div className="text-lg font-semibold">
                {cacheStats.caches.reduce((sum, cache) => sum + cache.entryCount, 0)}
              </div>
            </div>
          </div>

          {/* Individual Cache Details */}
          <div className="space-y-2">
            {cacheStats.caches.map((cache) => (
              <div key={cache.name} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium text-sm">{cache.name}</div>
                  <div className="text-xs text-gray-600">
                    {cache.entryCount} entries • Updated {cache.lastUpdated.toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-sm">{CacheManager.formatBytes(cache.size)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleRefreshCaches}
          disabled={isUpdating}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>Refresh Caches</span>
        </button>

        <button
          onClick={handleClearDataCaches}
          className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
        >
          <Database className="h-4 w-4" />
          <span>Clear Data Caches</span>
        </button>

        <button
          onClick={handleClearAllCaches}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          <span>Clear All Caches</span>
        </button>

        {showInstallPrompt && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleInstallPWA}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Install App</span>
            </button>
            <button
              onClick={handleDismissInstall}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Offline Notice */}
      {!isOnline && (
        <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
          <div className="flex items-center space-x-2">
            <WifiOff className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              You're currently offline. The app is running from cached content.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}; 