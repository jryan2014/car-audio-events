/**
 * Production-safe logger utility
 * Only logs in development mode unless explicitly forced
 */

const isDevelopment = import.meta.env.MODE === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors, even in production
    // In production, sanitize error messages to avoid exposing sensitive data
    if (isDevelopment) {
      console.error(...args);
    } else {
      // In production, only log error messages without full stack traces
      const sanitizedArgs = args.map(arg => {
        if (arg instanceof Error) {
          return `Error: ${arg.message}`;
        }
        if (typeof arg === 'object') {
          try {
            // Remove potentially sensitive fields
            const { password, token, apiKey, secret, ...safe } = arg;
            return safe;
          } catch {
            return '[Object]';
          }
        }
        return arg;
      });
      console.error(...sanitizedArgs);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  
  // Force logging even in production (use sparingly)
  // WARNING: Only use for non-sensitive data
  force: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[FORCE]', ...args);
    } else {
      // In production, still sanitize forced logs
      const sanitizedArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            const { password, token, apiKey, secret, email, ...safe } = arg;
            return safe;
          } catch {
            return '[Object]';
          }
        }
        return arg;
      });
      console.log('[FORCE]', ...sanitizedArgs);
    }
  }
};

export default logger;