/**
 * Security Headers Middleware
 * 
 * Comprehensive security headers implementation for the Car Audio Events platform.
 * Provides protection against XSS, CSRF, clickjacking, and other common web vulnerabilities.
 */

// Security headers configuration
export const SecurityHeaders = {
  // Prevents XSS attacks by controlling resource loading
  CONTENT_SECURITY_POLICY: `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' 
      https://js.stripe.com 
      https://maps.googleapis.com 
      https://www.google.com
      https://maps.gstatic.com
      https://cdn.tiny.cloud
      https://*.tinymce.com
      https://js.hcaptcha.com
      https://*.hcaptcha.com
      https://www.paypal.com
      https://*.paypal.com
      https://www.paypalobjects.com
      https://*.paypalobjects.com;
    style-src 'self' 'unsafe-inline' 
      https://fonts.googleapis.com
      https://cdn.tiny.cloud
      https://*.tinymce.com
      https://www.paypal.com
      https://*.paypal.com;
    font-src 'self' 
      https://fonts.gstatic.com 
      https://fonts.googleapis.com;
    img-src 'self' data: blob: https: http:;
    connect-src 'self' 
      https://nqvisvranvjaghvrdaaz.supabase.co 
      wss://nqvisvranvjaghvrdaaz.supabase.co
      https://api.stripe.com
      https://maps.googleapis.com
      https://maps.gstatic.com
      https://fonts.googleapis.com
      https://fonts.gstatic.com
      https://api.openai.com
      https://api.stability.ai
      https://cdn.tiny.cloud
      https://*.tinymce.com
      https://hcaptcha.com
      https://*.hcaptcha.com
      https://api.ipify.org
      https://ipapi.co
      https://api.my-ip.io
      https://api.paypal.com
      https://api-m.paypal.com
      https://api.sandbox.paypal.com
      https://api-m.sandbox.paypal.com
      https://*.paypal.com
      https://nominatim.openstreetmap.org;
    frame-src 'self' 
      https://www.google.com 
      https://maps.google.com
      https://js.stripe.com
      https://hcaptcha.com
      https://*.hcaptcha.com
      https://www.paypal.com
      https://*.paypal.com
      https://www.openstreetmap.org
      https://*.openstreetmap.org;
    object-src 'none';
    base-uri 'self';
    form-action 'self' 
      https://api.stripe.com
      https://www.paypal.com
      https://*.paypal.com;
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s+/g, ' ').trim(),

  // Prevent content-type sniffing
  X_CONTENT_TYPE_OPTIONS: 'nosniff',

  // Prevent clickjacking attacks
  X_FRAME_OPTIONS: 'DENY',

  // Enable XSS protection (legacy support)
  X_XSS_PROTECTION: '1; mode=block',

  // Control referrer information
  REFERRER_POLICY: 'strict-origin-when-cross-origin',

  // Force HTTPS connections
  STRICT_TRANSPORT_SECURITY: 'max-age=31536000; includeSubDomains; preload',

  // Control browser features
  PERMISSIONS_POLICY: [
    'camera=()',
    'microphone=()',
    'geolocation=(self)',
    'payment=*',
    'fullscreen=*',
    'accelerometer=()',
    'autoplay=()',
    'encrypted-media=()',
    'gyroscope=()',
    'picture-in-picture=()',
    'usb=()',
    'web-share=()'
  ].join(', '),

  // Prevent DNS prefetching (privacy)
  X_DNS_PREFETCH_CONTROL: 'off',

  // Control download behavior
  X_DOWNLOAD_OPTIONS: 'noopen',

  // Prevent MIME confusion attacks
  X_PERMITTED_CROSS_DOMAIN_POLICIES: 'none'
} as const;

/**
 * Environment-specific CSP configuration
 */
export class CSPConfig {
  
  /**
   * Get CSP policy based on environment
   */
  static getPolicy(environment: 'development' | 'production' | 'test' = 'production'): string {
    const basePolicy = SecurityHeaders.CONTENT_SECURITY_POLICY;
    
    switch (environment) {
      case 'development':
        // More permissive for development
        return basePolicy.replace(
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' http://localhost:* ws://localhost:*"
        ).replace(
          "connect-src 'self'",
          "connect-src 'self' http://localhost:* ws://localhost:*"
        );
      
      case 'test':
        // Minimal policy for testing
        return basePolicy.replace(
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'"
        );
      
      case 'production':
      default:
        // Strict policy for production
        return basePolicy;
    }
  }

  /**
   * Get CSP nonce for inline scripts (if needed)
   */
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * Security headers middleware factory
 */
export class SecurityHeadersMiddleware {
  
  /**
   * Create security headers for different environments
   */
  static getHeaders(options: {
    environment?: 'development' | 'production' | 'test';
    includeDevHeaders?: boolean;
    customCSP?: string;
    nonce?: string;
  } = {}): Record<string, string> {
    const {
      environment = 'production',
      includeDevHeaders = false,
      customCSP,
      nonce
    } = options;

    let cspPolicy = customCSP || CSPConfig.getPolicy(environment);
    
    // Add nonce to CSP if provided
    if (nonce) {
      cspPolicy = cspPolicy.replace(
        "'unsafe-inline'",
        `'unsafe-inline' 'nonce-${nonce}'`
      );
    }

    const headers: Record<string, string> = {
      'Content-Security-Policy': cspPolicy,
      'X-Content-Type-Options': SecurityHeaders.X_CONTENT_TYPE_OPTIONS,
      'X-Frame-Options': SecurityHeaders.X_FRAME_OPTIONS,
      'X-XSS-Protection': SecurityHeaders.X_XSS_PROTECTION,
      'Referrer-Policy': SecurityHeaders.REFERRER_POLICY,
      'Strict-Transport-Security': SecurityHeaders.STRICT_TRANSPORT_SECURITY,
      'Permissions-Policy': SecurityHeaders.PERMISSIONS_POLICY,
      'X-DNS-Prefetch-Control': SecurityHeaders.X_DNS_PREFETCH_CONTROL,
      'X-Download-Options': SecurityHeaders.X_DOWNLOAD_OPTIONS,
      'X-Permitted-Cross-Domain-Policies': SecurityHeaders.X_PERMITTED_CROSS_DOMAIN_POLICIES
    };

    // Add development-specific headers
    if (includeDevHeaders || environment === 'development') {
      headers['X-Dev-Environment'] = 'true';
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    }

    return headers;
  }

  /**
   * Create Express/Node.js middleware function
   */
  static createMiddleware(options: {
    environment?: 'development' | 'production' | 'test';
    includeDevHeaders?: boolean;
    customCSP?: string;
  } = {}) {
    const headers = this.getHeaders(options);

    return (req: any, res: any, next: any) => {
      // Set all security headers
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Continue to next middleware
      next();
    };
  }

  /**
   * Create edge function response headers
   */
  static createResponseHeaders(options: {
    environment?: 'development' | 'production' | 'test';
    includeDevHeaders?: boolean;
    customCSP?: string;
    corsHeaders?: Record<string, string>;
  } = {}): Record<string, string> {
    const securityHeaders = this.getHeaders(options);
    const { corsHeaders = {} } = options;

    return {
      ...securityHeaders,
      ...corsHeaders
    };
  }

  /**
   * Validate CSP policy syntax (basic validation)
   */
  static validateCSP(policy: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for basic CSP structure
    if (!policy.includes('default-src')) {
      errors.push('CSP policy should include default-src directive');
    }

    if (!policy.includes("'self'")) {
      errors.push('CSP policy should include self source');
    }

    // Check for potentially dangerous directives
    if (policy.includes("'unsafe-eval'") && !policy.includes('script-src')) {
      errors.push('unsafe-eval should only be used with explicit script-src directive');
    }

    if (policy.includes('*') && !policy.includes('img-src')) {
      errors.push('Wildcard (*) should be avoided except for specific directives like img-src');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Specialized headers for different types of responses
 */
export class SpecializedHeaders {
  
  /**
   * Headers for API endpoints
   */
  static api(environment?: 'development' | 'production' | 'test'): Record<string, string> {
    const base = SecurityHeadersMiddleware.getHeaders({ environment });
    
    return {
      ...base,
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };
  }

  /**
   * Headers for static assets
   */
  static assets(): Record<string, string> {
    return {
      'X-Content-Type-Options': SecurityHeaders.X_CONTENT_TYPE_OPTIONS,
      'X-Frame-Options': SecurityHeaders.X_FRAME_OPTIONS,
      'Referrer-Policy': SecurityHeaders.REFERRER_POLICY,
      'Cache-Control': 'public, max-age=31536000, immutable'
    };
  }

  /**
   * Headers for sensitive operations (payments, auth, etc.)
   */
  static sensitive(environment?: 'development' | 'production' | 'test'): Record<string, string> {
    const base = SecurityHeadersMiddleware.getHeaders({ environment });
    
    return {
      ...base,
      'Cache-Control': 'no-cache, no-store, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Robots-Tag': 'noindex, nofollow'
    };
  }

  /**
   * Headers for file downloads
   */
  static download(filename?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Content-Type-Options': SecurityHeaders.X_CONTENT_TYPE_OPTIONS,
      'X-Frame-Options': SecurityHeaders.X_FRAME_OPTIONS,
      'X-Download-Options': SecurityHeaders.X_DOWNLOAD_OPTIONS,
      'Content-Security-Policy': "default-src 'none'; sandbox;",
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };

    if (filename) {
      headers['Content-Disposition'] = `attachment; filename="${filename.replace(/[^\w.-]/g, '_')}"`;
    }

    return headers;
  }
}

/**
 * Security header utilities
 */
export class SecurityHeadersUtils {
  
  /**
   * Check if current environment is development
   */
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || 
           process.env.VITE_DEV_MODE === 'true' ||
           typeof window !== 'undefined' && window.location.hostname === 'localhost';
  }

  /**
   * Get current environment
   */
  static getEnvironment(): 'development' | 'production' | 'test' {
    if (process.env.NODE_ENV === 'test') return 'test';
    if (this.isDevelopment()) return 'development';
    return 'production';
  }

  /**
   * Merge custom headers with security headers
   */
  static mergeHeaders(
    securityHeaders: Record<string, string>,
    customHeaders: Record<string, string>
  ): Record<string, string> {
    // Security headers take precedence
    return {
      ...customHeaders,
      ...securityHeaders
    };
  }

  /**
   * Validate header value for security
   */
  static validateHeaderValue(value: string): { valid: boolean; sanitized: string; issues: string[] } {
    const issues: string[] = [];
    let sanitized = value;

    // Check for potential header injection
    if (value.includes('\n') || value.includes('\r')) {
      issues.push('Header value contains line breaks (potential CRLF injection)');
      sanitized = value.replace(/[\r\n]/g, '');
    }

    // Check for null bytes
    if (value.includes('\0')) {
      issues.push('Header value contains null bytes');
      sanitized = sanitized.replace(/\0/g, '');
    }

    // Basic length check
    if (value.length > 8192) {
      issues.push('Header value exceeds reasonable length (8KB)');
      sanitized = sanitized.substring(0, 8192);
    }

    return {
      valid: issues.length === 0,
      sanitized,
      issues
    };
  }
}

// Export default configuration for easy importing
export const defaultSecurityHeaders = SecurityHeadersMiddleware.getHeaders();