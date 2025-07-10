// Memory Manager for Development Environment
// Prevents memory leaks by monitoring usage and forcing garbage collection

interface MemoryInfo {
  used: number;
  total: number;
  percentage: number;
  timestamp: number;
}

class MemoryManager {
  private static instance: MemoryManager;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private gcInterval: NodeJS.Timeout | null = null;
  private memoryHistory: MemoryInfo[] = [];
  private readonly MAX_MEMORY_PERCENTAGE = 80;
  private readonly MONITORING_INTERVAL = 10000; // 10 seconds
  private readonly GC_INTERVAL = 30000; // 30 seconds
  private readonly MAX_HISTORY_LENGTH = 100;

  private constructor() {}

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  public startMonitoring(): void {
    if (import.meta.env.DEV) {
      console.log('🧠 Starting aggressive memory monitoring...');
      
      // Clear existing intervals
      this.stopMonitoring();
      
      // Monitor memory usage every 10 seconds
      this.monitoringInterval = setInterval(() => {
        this.checkMemoryUsage();
      }, this.MONITORING_INTERVAL);
      
      // Force garbage collection every 30 seconds
      this.gcInterval = setInterval(() => {
        this.forceGarbageCollection();
      }, this.GC_INTERVAL);
      
      // Initial check
      this.checkMemoryUsage();
    }
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
    
    console.log('🧠 Memory monitoring stopped');
  }

  public forceGarbageCollection(): void {
    if (import.meta.env.DEV && (window as any).gc) {
      try {
        (window as any).gc();
        console.log('🗑️ Forced garbage collection');
      } catch (error) {
        console.warn('⚠️ Failed to force garbage collection:', error);
      }
    }
  }

  public getMemoryInfo(): MemoryInfo | null {
    if (!(performance as any).memory) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
      timestamp: Date.now()
    };
  }

  public getMemoryHistory(): MemoryInfo[] {
    return [...this.memoryHistory];
  }

  private checkMemoryUsage(): void {
    const memoryInfo = this.getMemoryInfo();
    if (!memoryInfo) return;

    // Add to history
    this.memoryHistory.push(memoryInfo);
    
    // Keep history length manageable
    if (this.memoryHistory.length > this.MAX_HISTORY_LENGTH) {
      this.memoryHistory.splice(0, this.memoryHistory.length - this.MAX_HISTORY_LENGTH);
    }

    // Log memory usage
    console.log(`🧠 Memory: ${(memoryInfo.used / 1024 / 1024).toFixed(2)}MB / ${(memoryInfo.total / 1024 / 1024).toFixed(2)}MB (${memoryInfo.percentage.toFixed(1)}%)`);

    // Check for memory pressure
    if (memoryInfo.percentage > this.MAX_MEMORY_PERCENTAGE) {
      console.warn(`⚠️ HIGH MEMORY USAGE: ${memoryInfo.percentage.toFixed(1)}%`);
      this.forceGarbageCollection();
      
      // Additional cleanup for high memory usage
      this.performAggressiveCleanup();
    }

    // Check for memory leaks (consistent growth)
    if (this.memoryHistory.length >= 5) {
      const recentHistory = this.memoryHistory.slice(-5);
      const isGrowing = recentHistory.every((info, index) => {
        if (index === 0) return true;
        return info.used > recentHistory[index - 1].used;
      });
      
      if (isGrowing) {
        console.warn('🔥 Potential memory leak detected - consistent growth');
        this.forceGarbageCollection();
      }
    }
  }

  private performAggressiveCleanup(): void {
    console.log('🧹 Performing aggressive memory cleanup...');
    
    // Clear any cached data that might be accumulating
    if (typeof window !== 'undefined') {
      // Clear any window-attached data
      Object.keys(window).forEach(key => {
        if (key.startsWith('hoverWindow') || key.startsWith('infoWindow') || key.startsWith('marker')) {
          try {
            delete (window as any)[key];
          } catch (e) {
            // Ignore errors
          }
        }
      });
    }
    
    // Force multiple garbage collections
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this.forceGarbageCollection(), i * 1000);
    }
  }

  public logMemoryStats(): void {
    const memoryInfo = this.getMemoryInfo();
    if (!memoryInfo) {
      console.log('Memory statistics not available');
      return;
    }

    console.group('📊 Memory Statistics');
    console.log(`Used: ${(memoryInfo.used / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total: ${(memoryInfo.total / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Percentage: ${memoryInfo.percentage.toFixed(1)}%`);
    console.log(`History Length: ${this.memoryHistory.length}`);
    
    if (this.memoryHistory.length > 1) {
      const first = this.memoryHistory[0];
      const last = this.memoryHistory[this.memoryHistory.length - 1];
      const growth = last.used - first.used;
      console.log(`Growth: ${(growth / 1024 / 1024).toFixed(2)} MB since monitoring started`);
    }
    
    console.groupEnd();
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();

// Auto-start monitoring in development
if (import.meta.env.DEV) {
  memoryManager.startMonitoring();
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    memoryManager.stopMonitoring();
  });
} 