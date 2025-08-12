/**
 * Security Headers for Edge Functions
 * 
 * Provides comprehensive security headers for all Supabase edge functions.
 * Integrates with CORS headers and provides environment-specific configurations.
 */

/**
 * Core security headers for edge functions
 */
export const EDGE_SECURITY_HEADERS = {
  // Prevent content-type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // XSS protection (legacy support)
  'X-XSS-Protection': '1; mode=block',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Force HTTPS (for production)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Control browser features
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'fullscreen=()',
    'accelerometer=()',
    'autoplay=()',
    'encrypted-media=()',
    'gyroscope=()',
    'picture-in-picture=()',
    'usb=()',
    'web-share=()'
  ].join(', '),
  
  // Prevent DNS prefetching
  'X-DNS-Prefetch-Control': 'off',
  
  // Control download behavior
  'X-Download-Options': 'noopen',
  
  // Prevent MIME confusion
  'X-Permitted-Cross-Domain-Policies': 'none'
} as const;

/**
 * Content Security Policy for edge functions
 */
export const EDGE_CSP_POLICY = [
  "default-src 'none'",
  "script-src 'none'",
  "style-src 'none'",
  "img-src 'none'",
  "connect-src 'self'",
  "font-src 'none'",
  "object-src 'none'",
  "media-src 'none'",
  "frame-src 'none'",
  "sandbox",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ');

/**
 * Get environment-specific security headers
 */
export function getEdgeSecurityHeaders(options: {
  environment?: 'development' | 'production' | 'test';
  includeCSP?: boolean;
  customCSP?: string;
  sensitiveOperation?: boolean;
} = {}): Record<string, string> {
  const {
    environment = getEnvironment(),
    includeCSP = true,
    customCSP,
    sensitiveOperation = false
  } = options;

  const headers: Record<string, string> = {
    ...EDGE_SECURITY_HEADERS
  };

  // Add CSP if requested
  if (includeCSP) {
    headers['Content-Security-Policy'] = customCSP || EDGE_CSP_POLICY;
  }

  // Remove HSTS in development
  if (environment === 'development') {
    delete headers['Strict-Transport-Security'];
    headers['X-Dev-Environment'] = 'true';
  }

  // Add extra security for sensitive operations
  if (sensitiveOperation) {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, private';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';
    headers['X-Robots-Tag'] = 'noindex, nofollow';
  }

  return headers;
}

/**
 * Create response headers combining security and CORS headers
 */
export function createSecureResponseHeaders(
  corsHeaders: Record<string, string>,
  securityOptions?: {
    environment?: 'development' | 'production' | 'test';
    includeCSP?: boolean;
    customCSP?: string;
    sensitiveOperation?: boolean;
  }
): Record<string, string> {
  const securityHeaders = getEdgeSecurityHeaders(securityOptions);
  
  // Security headers take precedence over CORS headers
  return {
    ...corsHeaders,
    ...securityHeaders,
    // Ensure content-type is preserved from CORS
    'Content-Type': corsHeaders['Content-Type'] || 'application/json'
  };
}

/**
 * Create error response with security headers
 */
export function createSecureErrorResponse(
  error: string,
  status: number,
  corsHeaders: Record<string, string> = {},
  securityOptions?: {
    environment?: 'development' | 'production' | 'test';
    sensitiveOperation?: boolean;
  }
): Response {
  const headers = createSecureResponseHeaders(corsHeaders, {
    ...securityOptions,
    includeCSP: true,
    sensitiveOperation: true // All errors are considered sensitive
  });

  return new Response(
    JSON.stringify({ error }),
    {
      status,
      headers
    }
  );
}

/**
 * Create success response with security headers
 */
export function createSecureSuccessResponse(
  data: any,
  corsHeaders: Record<string, string> = {},
  securityOptions?: {
    environment?: 'development' | 'production' | 'test';
    sensitiveOperation?: boolean;
    customHeaders?: Record<string, string>;
  }
): Response {
  const headers = createSecureResponseHeaders(corsHeaders, securityOptions);
  
  // Add any custom headers
  if (securityOptions?.customHeaders) {
    Object.assign(headers, securityOptions.customHeaders);
  }

  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers
    }
  );
}

/**
 * Specialized headers for different types of edge function operations
 */
export class EdgeFunctionHeaders {
  
  /**
   * Headers for authentication/authorization operations
   */
  static auth(corsHeaders: Record<string, string> = {}): Record<string, string> {
    return createSecureResponseHeaders(corsHeaders, {
      sensitiveOperation: true,
      includeCSP: true,
      customCSP: "default-src 'none'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';"
    });
  }

  /**
   * Headers for payment operations
   */
  static payment(corsHeaders: Record<string, string> = {}): Record<string, string> {
    return createSecureResponseHeaders(corsHeaders, {
      sensitiveOperation: true,
      includeCSP: true,
      customCSP: "default-src 'none'; connect-src 'self' https://api.stripe.com https://api.paypal.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none';"
    });
  }

  /**
   * Headers for data operations (CRUD)
   */
  static data(corsHeaders: Record<string, string> = {}): Record<string, string> {
    return createSecureResponseHeaders(corsHeaders, {
      sensitiveOperation: false,
      includeCSP: true
    });
  }

  /**
   * Headers for webhook operations
   */
  static webhook(corsHeaders: Record<string, string> = {}): Record<string, string> {
    return createSecureResponseHeaders(corsHeaders, {
      sensitiveOperation: true,
      includeCSP: true,
      customCSP: "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';"
    });
  }

  /**
   * Headers for email operations
   */
  static email(corsHeaders: Record<string, string> = {}): Record<string, string> {
    return createSecureResponseHeaders(corsHeaders, {
      sensitiveOperation: true,
      includeCSP: true
    });
  }

  /**
   * Headers for admin operations
   */
  static admin(corsHeaders: Record<string, string> = {}): Record<string, string> {
    return createSecureResponseHeaders(corsHeaders, {
      sensitiveOperation: true,
      includeCSP: true,
      customCSP: "default-src 'none'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';"
    });
  }
}

/**
 * Rate limiting headers integration
 */
export function addRateLimitHeaders(
  headers: Record<string, string>,
  rateLimitHeaders: Record<string, string>
): Record<string, string> {
  return {
    ...headers,
    ...rateLimitHeaders
  };
}

/**
 * Validate request headers for security
 */
export function validateRequestHeaders(request: Request): {
  valid: boolean;
  issues: string[];
  sanitized: Record<string, string>;
} {
  const issues: string[] = [];
  const sanitized: Record<string, string> = {};
  
  // Check for header injection attempts
  request.headers.forEach((value, key) => {
    // Check for CRLF injection
    if (value.includes('\r') || value.includes('\n')) {
      issues.push(`Header '${key}' contains line breaks (potential CRLF injection)`);
      return;
    }
    
    // Check for null bytes
    if (value.includes('\0')) {
      issues.push(`Header '${key}' contains null bytes`);
      return;
    }
    
    // Check header length
    if (key.length > 256 || value.length > 8192) {
      issues.push(`Header '${key}' exceeds reasonable length limits`);
      return;
    }
    
    sanitized[key.toLowerCase()] = value;
  });
  
  return {
    valid: issues.length === 0,
    issues,
    sanitized
  };
}

/**
 * Security middleware for edge functions
 */
export function createSecurityMiddleware() {
  return {
    /**
     * Validate request before processing
     */
    validateRequest(request: Request): { valid: boolean; response?: Response } {
      // Validate headers
      const headerValidation = validateRequestHeaders(request);
      if (!headerValidation.valid) {
        console.warn('Request header validation failed:', headerValidation.issues);
        return {
          valid: false,
          response: createSecureErrorResponse(
            'Invalid request headers',
            400,
            {},
            { sensitiveOperation: true }
          )
        };
      }
      
      // Check request method
      const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
      if (!allowedMethods.includes(request.method)) {
        return {
          valid: false,
          response: createSecureErrorResponse(
            'Method not allowed',
            405,
            {},
            { sensitiveOperation: true }
          )
        };
      }
      
      return { valid: true };
    },

    /**
     * Create secure response wrapper
     */
    createResponse: createSecureSuccessResponse,
    
    /**
     * Create secure error wrapper
     */
    createErrorResponse: createSecureErrorResponse
  };
}

/**
 * Get current environment
 */
function getEnvironment(): 'development' | 'production' | 'test' {
  const env = Deno.env.get('ENVIRONMENT') || 
               Deno.env.get('NODE_ENV') || 
               'production';
  
  if (env === 'test') return 'test';
  if (env === 'development' || env === 'dev') return 'development';
  return 'production';
}