export interface CacheInfo {
  name: string;
  size: number;
  lastUpdated: Date;
  entryCount: number;
}

export interface CacheStats {
  totalSize: number;
  totalCaches: number;
  caches: CacheInfo[];
}

/**
 * Cache Manager for runtime cache control
 * Provides methods to manage, monitor, and clear application caches
 */
export class CacheManager {
  private static readonly CACHE_NAMES = {
    GOOGLE_FONTS: 'google-fonts-cache',
    GSTATIC_FONTS: 'gstatic-fonts-cache',
    IMAGES: 'images-cache',
    SUPABASE_STORAGE: 'supabase-storage-cache',
    SUPABASE_API: 'supabase-api-cache',
    RUNTIME: 'workbox-runtime',
    PRECACHE: 'workbox-precache'
  };

  /**
   * Get comprehensive cache statistics
   */
  static async getCacheStats(): Promise<CacheStats> {
    if (!('caches' in window)) {
      throw new Error('Cache API not supported');
    }

    const cacheNames = await caches.keys();
    const cacheInfos: CacheInfo[] = [];
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      let cacheSize = 0;
      let lastUpdated = new Date(0);

      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const responseClone = response.clone();
          const buffer = await responseClone.arrayBuffer();
          cacheSize += buffer.byteLength;

          // Try to get last modified date from headers
          const lastModified = response.headers.get('last-modified');
          if (lastModified) {
            const date = new Date(lastModified);
            if (date > lastUpdated) {
              lastUpdated = date;
            }
          }
        }
      }

      cacheInfos.push({
        name: cacheName,
        size: cacheSize,
        lastUpdated: lastUpdated.getTime() === 0 ? new Date() : lastUpdated,
        entryCount: keys.length
      });

      totalSize += cacheSize;
    }

    return {
      totalSize,
      totalCaches: cacheInfos.length,
      caches: cacheInfos.sort((a, b) => b.size - a.size)
    };
  }

  /**
   * Clear specific cache by name
   */
  static async clearCache(cacheName: string): Promise<boolean> {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const deleted = await caches.delete(cacheName);
      console.log(`Cache "${cacheName}" cleared:`, deleted);
      return deleted;
    } catch (error) {
      console.error(`Failed to clear cache "${cacheName}":`, error);
      return false;
    }
  }

  /**
   * Clear all application caches
   */
  static async clearAllCaches(): Promise<number> {
    if (!('caches' in window)) {
      return 0;
    }

    const cacheNames = await caches.keys();
    let clearedCount = 0;

    for (const cacheName of cacheNames) {
      try {
        const deleted = await caches.delete(cacheName);
        if (deleted) {
          clearedCount++;
        }
      } catch (error) {
        console.error(`Failed to clear cache "${cacheName}":`, error);
      }
    }

    console.log(`Cleared ${clearedCount} out of ${cacheNames.length} caches`);
    return clearedCount;
  }

  /**
   * Clear only data caches (preserve precache)
   */
  static async clearDataCaches(): Promise<number> {
    if (!('caches' in window)) {
      return 0;
    }

    const dataCaches = [
      this.CACHE_NAMES.SUPABASE_API,
      this.CACHE_NAMES.SUPABASE_STORAGE,
      this.CACHE_NAMES.IMAGES
    ];

    let clearedCount = 0;
    for (const cacheName of dataCaches) {
      const deleted = await this.clearCache(cacheName);
      if (deleted) {
        clearedCount++;
      }
    }

    return clearedCount;
  }

  /**
   * Warm up critical caches by pre-loading important resources
   */
  static async warmUpCaches(): Promise<void> {
    if (!('caches' in window)) {
      return;
    }

    try {
      // Pre-cache critical fonts
      const fontsToCache = [
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
      ];

      const fontCache = await caches.open(this.CACHE_NAMES.GOOGLE_FONTS);
      for (const fontUrl of fontsToCache) {
        try {
          await fontCache.add(fontUrl);
        } catch (error) {
          console.warn(`Failed to cache font: ${fontUrl}`, error);
        }
      }

      console.log('Cache warm-up completed');
    } catch (error) {
      console.error('Cache warm-up failed:', error);
    }
  }

  /**
   * Check if cache storage quota is available
   */
  static async getStorageQuota(): Promise<{
    quota: number;
    usage: number;
    available: number;
    percentage: number;
  }> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return {
        quota: 0,
        usage: 0,
        available: 0,
        percentage: 0
      };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      const available = quota - usage;
      const percentage = quota > 0 ? (usage / quota) * 100 : 0;

      return {
        quota,
        usage,
        available,
        percentage
      };
    } catch (error) {
      console.error('Failed to get storage quota:', error);
      return {
        quota: 0,
        usage: 0,
        available: 0,
        percentage: 0
      };
    }
  }

  /**
   * Format bytes to human readable string
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if service worker is supported and active
   */
  static isServiceWorkerSupported(): boolean {
    return 'serviceWorker' in navigator && 'caches' in window;
  }

  /**
   * Get service worker registration status
   */
  static async getServiceWorkerStatus(): Promise<{
    supported: boolean;
    registered: boolean;
    active: boolean;
    controller: boolean;
  }> {
    const supported = this.isServiceWorkerSupported();
    
    if (!supported) {
      return {
        supported: false,
        registered: false,
        active: false,
        controller: false
      };
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      return {
        supported: true,
        registered: !!registration,
        active: !!(registration?.active),
        controller: !!navigator.serviceWorker.controller
      };
    } catch (error) {
      console.error('Failed to get service worker status:', error);
      return {
        supported: true,
        registered: false,
        active: false,
        controller: false
      };
    }
  }
}

// Export cache names for external use
export const CACHE_NAMES = CacheManager['CACHE_NAMES']; 