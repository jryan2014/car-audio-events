import { PostgrestError } from '@supabase/supabase-js';

/**
 * Utility functions for handling Supabase operations with retry logic
 * Primarily used to handle schema cache issues without resorting to exec_sql
 */

/**
 * Check if an error is a schema cache issue
 */
function isSchemaCache
(error: PostgrestError | null): boolean {
  if (!error) return false;
  
  // PGRST204 = Schema cache mismatch
  // 42P01 = Table not found (can happen with schema cache)
  return error.code === 'PGRST204' || 
         error.message?.includes('schema cache') ||
         error.code === '42P01';
}

/**
 * Retry configuration options
 */
interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: PostgrestError) => void;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  onRetry: (attempt, error) => {
    console.warn(`Retry attempt ${attempt} due to error:`, error.message);
  }
};

/**
 * Calculate delay for exponential backoff
 */
function calculateDelay(
  attempt: number, 
  initialDelay: number, 
  maxDelay: number, 
  multiplier: number
): number {
  const delay = initialDelay * Math.pow(multiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Generic retry wrapper for Supabase operations
 * 
 * @param operation - The Supabase operation to retry
 * @param options - Retry configuration options
 * @returns The result of the operation
 * 
 * @example
 * const result = await retrySupabaseOperation(
 *   () => supabase.from('table').insert(data),
 *   { maxRetries: 5, onRetry: (attempt) => console.log(`Retry ${attempt}`) }
 * );
 */
export async function retrySupabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: PostgrestError | null }> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    const result = await operation();
    
    // Success - return immediately
    if (!result.error) {
      return result;
    }
    
    // Not a schema cache issue - fail immediately
    if (!isSchemaCache
(result.error)) {
      return result;
    }
    
    // Last attempt - return the error
    if (attempt === config.maxRetries) {
      return result;
    }
    
    // Retry with backoff
    config.onRetry(attempt, result.error);
    const delay = calculateDelay(
      attempt, 
      config.initialDelay, 
      config.maxDelay, 
      config.backoffMultiplier
    );
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // Should never reach here, but TypeScript requires a return
  return { data: null, error: { message: 'Max retries exceeded', code: 'RETRY_EXHAUSTED', details: '', hint: '' } };
}

/**
 * Specialized retry wrapper for INSERT operations
 * 
 * @example
 * const { data, error } = await retryInsert(
 *   'newsletter_campaigns',
 *   { name: 'Campaign', subject: 'Subject' },
 *   supabase
 * );
 */
export async function retryInsert<T extends Record<string, any>>(
  table: string,
  data: T | T[],
  supabaseClient: any,
  options: RetryOptions = {}
): Promise<{ data: any | null; error: PostgrestError | null }> {
  return retrySupabaseOperation(
    () => supabaseClient.from(table).insert(data).select(),
    options
  );
}

/**
 * Specialized retry wrapper for UPDATE operations
 * 
 * @example
 * const { data, error } = await retryUpdate(
 *   'users',
 *   { name: 'New Name' },
 *   { id: userId },
 *   supabase
 * );
 */
export async function retryUpdate<T extends Record<string, any>>(
  table: string,
  updates: Partial<T>,
  match: Record<string, any>,
  supabaseClient: any,
  options: RetryOptions = {}
): Promise<{ data: any | null; error: PostgrestError | null }> {
  return retrySupabaseOperation(
    () => {
      let query = supabaseClient.from(table).update(updates);
      
      // Apply all match conditions
      Object.entries(match).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      return query.select();
    },
    options
  );
}

/**
 * Specialized retry wrapper for DELETE operations
 * 
 * @example
 * const { error } = await retryDelete(
 *   'newsletter_campaigns',
 *   { id: campaignId },
 *   supabase
 * );
 */
export async function retryDelete(
  table: string,
  match: Record<string, any>,
  supabaseClient: any,
  options: RetryOptions = {}
): Promise<{ data: any | null; error: PostgrestError | null }> {
  return retrySupabaseOperation(
    () => {
      let query = supabaseClient.from(table).delete();
      
      // Apply all match conditions
      Object.entries(match).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      return query;
    },
    options
  );
}

/**
 * Wait for schema cache to update
 * This is a more aggressive approach when retries aren't working
 * 
 * @param checkOperation - Operation to check if schema is ready
 * @param timeout - Maximum time to wait in milliseconds
 * @returns true if schema is ready, false if timeout
 */
export async function waitForSchemaCache(
  checkOperation: () => Promise<boolean>,
  timeout: number = 30000 // 30 seconds default
): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 1000; // Check every second
  
  while (Date.now() - startTime < timeout) {
    if (await checkOperation()) {
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  return false;
}

/**
 * Log schema cache issue for monitoring
 * In production, this could send to error tracking service
 */
export function logSchemaCacheIssue(
  operation: string,
  table: string,
  error: PostgrestError,
  resolved: boolean
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    operation,
    table,
    error: {
      code: error.code,
      message: error.message
    },
    resolved,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  if (resolved) {
    console.log('Schema cache issue resolved:', logData);
  } else {
    console.error('Schema cache issue persisted:', logData);
  }
  
  // In production, send to error tracking service
  // Example: Sentry.captureMessage('Schema cache issue', { extra: logData });
}