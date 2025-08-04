/**
 * Console Manager - Controls console output in production
 * Keeps errors for debugging but disables info/warn messages in production
 */

const isDevelopment = import.meta.env.MODE === 'development';

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

export function initializeConsoleManager() {
  if (!isDevelopment) {
    // In production, disable info and warn messages
    console.info = () => {};
    console.warn = () => {};
    console.debug = () => {};
    
    // Optionally disable regular logs too (uncomment if needed)
    // console.log = () => {};
    
    // Keep error messages for debugging
    // console.error remains unchanged
  }
}

// Utility to restore original console methods if needed
export function restoreConsole() {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
}

// Utility to temporarily enable all console methods
export function enableConsoleTemporarily(callback: () => void) {
  restoreConsole();
  callback();
  initializeConsoleManager();
}

// Enable debugging via URL parameter or localStorage
export function enableDebugMode() {
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const debugParam = urlParams.get('debug');
  
  // Check localStorage
  const debugStorage = localStorage.getItem('debugMode');
  
  if (debugParam === 'true' || debugStorage === 'true') {
    restoreConsole();
    console.warn('🔧 Debug mode enabled - all console messages visible');
  }
}

// Expose console manager to window for production debugging
if (!isDevelopment) {
  (window as any).consoleManager = {
    enable: () => {
      restoreConsole();
      localStorage.setItem('debugMode', 'true');
      console.warn('🔧 Console enabled - refresh to disable');
    },
    disable: () => {
      localStorage.removeItem('debugMode');
      initializeConsoleManager();
      console.warn('🔧 Console disabled - refresh to apply');
    },
    temporary: (duration: number = 5000) => {
      restoreConsole();
      console.warn(`🔧 Console enabled for ${duration/1000} seconds`);
      setTimeout(() => {
        initializeConsoleManager();
        console.warn('🔧 Console disabled');
      }, duration);
    }
  };
}