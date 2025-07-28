/**
 * Rate limiter utility for authentication endpoints
 * Helps prevent brute force attacks and abuse
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000, // 15 minutes
    blockDurationMs: number = 30 * 60 * 1000 // 30 minutes
  ) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.blockDurationMs = blockDurationMs;

    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if an identifier (email, IP, etc.) is rate limited
   */
  isLimited(identifier: string): boolean {
    const entry = this.limits.get(identifier);
    if (!entry) return false;

    const now = Date.now();

    // Check if blocked
    if (entry.blockedUntil && entry.blockedUntil > now) {
      return true;
    }

    // Check if window has expired
    if (now - entry.firstAttempt > this.windowMs) {
      this.limits.delete(identifier);
      return false;
    }

    return entry.attempts >= this.maxAttempts;
  }

  /**
   * Record an attempt for an identifier
   */
  recordAttempt(identifier: string): void {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry) {
      this.limits.set(identifier, {
        attempts: 1,
        firstAttempt: now
      });
      return;
    }

    // Reset if window expired
    if (now - entry.firstAttempt > this.windowMs) {
      this.limits.set(identifier, {
        attempts: 1,
        firstAttempt: now
      });
      return;
    }

    entry.attempts++;

    // Block if max attempts reached
    if (entry.attempts >= this.maxAttempts) {
      entry.blockedUntil = now + this.blockDurationMs;
    }
  }

  /**
   * Get remaining attempts for an identifier
   */
  getRemainingAttempts(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry) return this.maxAttempts;

    const now = Date.now();
    
    // If window expired, full attempts available
    if (now - entry.firstAttempt > this.windowMs) {
      return this.maxAttempts;
    }

    return Math.max(0, this.maxAttempts - entry.attempts);
  }

  /**
   * Get time until unblocked (in seconds)
   */
  getBlockedTime(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || !entry.blockedUntil) return 0;

    const now = Date.now();
    if (entry.blockedUntil <= now) return 0;

    return Math.ceil((entry.blockedUntil - now) / 1000);
  }

  /**
   * Clear rate limit for an identifier (e.g., after successful login)
   */
  clear(identifier: string): void {
    this.limits.delete(identifier);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [identifier, entry] of this.limits.entries()) {
      // Remove if window expired and not blocked
      if (now - entry.firstAttempt > this.windowMs && (!entry.blockedUntil || entry.blockedUntil <= now)) {
        this.limits.delete(identifier);
      }
    }
  }

  /**
   * Destroy the rate limiter and clean up
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.limits.clear();
  }
}

// Create instances for different endpoints
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000, 30 * 60 * 1000); // 5 attempts per 15 min
export const registerRateLimiter = new RateLimiter(3, 60 * 60 * 1000, 60 * 60 * 1000); // 3 attempts per hour
export const passwordResetRateLimiter = new RateLimiter(3, 60 * 60 * 1000, 60 * 60 * 1000); // 3 attempts per hour

// Helper function to get client identifier (email + IP-like identifier)
export function getClientIdentifier(email: string): string {
  // In a real app, you'd combine with actual IP address
  // For now, we'll use email + browser fingerprint
  const browserFingerprint = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.width,
    screen.height
  ].join('|');
  
  // Simple hash to create a pseudo-IP
  let hash = 0;
  for (let i = 0; i < browserFingerprint.length; i++) {
    const char = browserFingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `${email.toLowerCase()}_${Math.abs(hash)}`;
}