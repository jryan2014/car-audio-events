/**
 * Secure timer utilities to prevent code injection via setTimeout/setInterval
 */

/**
 * Safe setTimeout that only accepts function references, not strings
 */
export function safeSetTimeout(
  callback: () => void,
  delay: number
): NodeJS.Timeout {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function, not a string');
  }
  if (typeof delay !== 'number' || delay < 0) {
    throw new Error('Delay must be a positive number');
  }
  return setTimeout(callback, delay);
}

/**
 * Safe setInterval that only accepts function references, not strings
 */
export function safeSetInterval(
  callback: () => void,
  interval: number
): NodeJS.Timeout {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function, not a string');
  }
  if (typeof interval !== 'number' || interval < 0) {
    throw new Error('Interval must be a positive number');
  }
  return setInterval(callback, interval);
}

/**
 * Debounced function execution
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      func.apply(context, args);
      timeout = null;
    }, wait);
  };
}

/**
 * Throttled function execution
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
