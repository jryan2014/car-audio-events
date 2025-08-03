import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Rate limiting implementation for Edge Functions
 * Uses Supabase to track request counts
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

/**
 * Get or create rate limit tracking table
 */
async function ensureRateLimitTable(supabase: any): Promise<void> {
  // Create table if it doesn't exist
  await supabase.rpc('exec_sql', {
    sql_command: `
      CREATE TABLE IF NOT EXISTS rate_limits (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        window_end TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Create index for faster lookups
      CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window 
        ON rate_limits(key, window_end);
      
      -- Enable RLS
      ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
      
      -- Only service role can access
      CREATE POLICY IF NOT EXISTS "Service role only" ON rate_limits
        FOR ALL USING (true);
    `
  }).catch(() => {
    // Table might already exist, ignore error
  });
}

/**
 * Rate limiter for Edge Functions
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private supabase: any;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'rate_limit',
      ...config
    };
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Check if request is allowed based on rate limit
   */
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    // Ensure table exists
    await ensureRateLimitTable(this.supabase);
    
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = new Date();
    const windowStart = new Date(now.getTime());
    const windowEnd = new Date(now.getTime() + this.config.windowMs);

    try {
      // Clean up old entries first
      await this.cleanupOldEntries();

      // Get current window data
      const { data: existingLimits } = await this.supabase
        .from('rate_limits')
        .select('*')
        .eq('key', key)
        .gte('window_end', now.toISOString())
        .order('window_end', { ascending: false })
        .limit(1);

      let currentCount = 0;
      let currentWindowEnd = windowEnd;

      if (existingLimits && existingLimits.length > 0) {
        const limit = existingLimits[0];
        currentCount = limit.count;
        currentWindowEnd = new Date(limit.window_end);
        
        // If we're within the same window, increment count
        if (currentCount < this.config.maxRequests) {
          await this.supabase
            .from('rate_limits')
            .update({ 
              count: currentCount + 1,
              updated_at: now.toISOString()
            })
            .eq('id', limit.id);
          
          currentCount++;
        }
      } else {
        // Create new window
        const newId = `${key}_${now.getTime()}`;
        await this.supabase
          .from('rate_limits')
          .insert({
            id: newId,
            key,
            count: 1,
            window_start: windowStart.toISOString(),
            window_end: windowEnd.toISOString()
          });
        
        currentCount = 1;
      }

      const allowed = currentCount <= this.config.maxRequests;
      const remaining = Math.max(0, this.config.maxRequests - currentCount);
      
      const result: RateLimitResult = {
        allowed,
        limit: this.config.maxRequests,
        remaining,
        resetAt: currentWindowEnd
      };

      if (!allowed) {
        result.retryAfter = Math.ceil((currentWindowEnd.getTime() - now.getTime()) / 1000);
      }

      return result;

    } catch (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request but log it
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetAt: windowEnd
      };
    }
  }

  /**
   * Clean up old rate limit entries
   */
  private async cleanupOldEntries(): Promise<void> {
    const cleanupTime = new Date(Date.now() - this.config.windowMs * 2);
    
    try {
      await this.supabase
        .from('rate_limits')
        .delete()
        .lt('window_end', cleanupTime.toISOString());
    } catch (error) {
      // Ignore cleanup errors
      console.error('Rate limit cleanup error:', error);
    }
  }
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString()
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Standard rate limit configurations
 */
export const RateLimitConfigs = {
  // Webhook endpoints - higher limits for payment providers
  webhook: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 requests per minute
    keyPrefix: 'webhook'
  },
  
  // Payment creation - prevent abuse
  payment: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 requests per minute
    keyPrefix: 'payment'
  },
  
  // General API endpoints
  api: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 30 requests per minute
    keyPrefix: 'api'
  },
  
  // Strict rate limit for sensitive operations
  strict: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 requests per minute
    keyPrefix: 'strict'
  }
};