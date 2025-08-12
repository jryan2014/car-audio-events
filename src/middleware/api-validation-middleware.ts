/**
 * API Validation Middleware - Comprehensive validation for API routes
 * Integrates input validation, rate limiting, and secure error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  ValidationSchemas, 
  Validators, 
  validateInput,
  ValidationOptions,
  ValidationResult 
} from '../utils/input-validation';
import { 
  handleError, 
  handleValidationError, 
  createErrorResponse,
  SecureError 
} from '../utils/secure-error-handler';
import { loginRateLimiter, registerRateLimiter, getClientIdentifier } from '../utils/rateLimiter';

// ============================================================================
// MIDDLEWARE TYPES AND INTERFACES
// ============================================================================

export interface ApiValidationOptions extends ValidationOptions {
  // API-specific options
  requireAuth?: boolean;
  allowedMethods?: string[];
  maxBodySize?: number;
  allowedOrigins?: string[];
  customSchema?: z.ZodSchema<any>;
  
  // Rate limiting options
  rateLimitType?: 'login' | 'register' | 'api' | 'strict';
  customRateLimit?: {
    maxAttempts: number;
    windowMs: number;
    blockDurationMs: number;
  };
  
  // Security options
  requireCSRF?: boolean;
  allowAnonymous?: boolean;
  logSecurityEvents?: boolean;
}

export interface ApiContext {
  userId?: string;
  sessionId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  origin?: string;
  method: string;
  endpoint: string;
  timestamp: Date;
}

export interface ApiValidationResult<T = any> {
  success: boolean;
  data?: T;
  context?: ApiContext;
  secureError?: SecureError;
  rateLimited?: boolean;
  retryAfter?: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Check various headers that might contain the real client IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  
  return 'unknown';
}

/**
 * Create API context from request
 */
function createApiContext(request: NextRequest): ApiContext {
  const url = new URL(request.url);
  
  return {
    ipAddress: getClientIP(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    origin: request.headers.get('origin') || 'unknown',
    method: request.method,
    endpoint: url.pathname,
    timestamp: new Date(),
  };
}

/**
 * Validate request origin against allowed origins
 */
function validateOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.length === 0) return true;
  
  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    if (allowed.endsWith('*')) {
      const base = allowed.slice(0, -1);
      return origin.startsWith(base);
    }
    return origin === allowed;
  });
}

/**
 * Extract and validate authentication token
 */
async function validateAuth(request: NextRequest): Promise<{
  valid: boolean;
  userId?: string;
  userEmail?: string;
  error?: string;
}> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid authorization header' };
  }
  
  try {
    const token = authHeader.substring(7);
    
    // In a real implementation, you would validate the JWT token
    // For now, we'll simulate token validation
    // This would typically involve:
    // 1. Verifying JWT signature
    // 2. Checking token expiration
    // 3. Validating token against database
    // 4. Extracting user information
    
    // Placeholder implementation
    if (token.length < 10) {
      return { valid: false, error: 'Invalid token format' };
    }
    
    // Mock user data - in real app, decode from JWT
    return {
      valid: true,
      userId: 'mock-user-id',
      userEmail: 'admin@caraudioevents.com',
    };
    
  } catch (error) {
    return { valid: false, error: 'Token validation failed' };
  }
}

// ============================================================================
// MAIN VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Comprehensive API validation middleware
 */
export async function validateApiRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  options: ApiValidationOptions = {}
): Promise<ApiValidationResult<T>> {
  
  const context = createApiContext(request);
  
  try {
    // 1. METHOD VALIDATION
    if (options.allowedMethods && !options.allowedMethods.includes(request.method)) {
      const secureError = handleError(
        `Method ${request.method} not allowed`,
        context,
        'METHOD_NOT_ALLOWED'
      );
      
      return { 
        success: false, 
        secureError, 
        context,
      };
    }

    // 2. ORIGIN VALIDATION
    if (options.allowedOrigins && options.allowedOrigins.length > 0) {
      if (!validateOrigin(context.origin!, options.allowedOrigins)) {
        const secureError = handleError(
          'Origin not allowed',
          context,
          'ORIGIN_NOT_ALLOWED'
        );
        
        return { 
          success: false, 
          secureError, 
          context,
        };
      }
    }

    // 3. AUTHENTICATION VALIDATION
    if (options.requireAuth) {
      const authResult = await validateAuth(request);
      
      if (!authResult.valid) {
        const secureError = handleError(
          authResult.error || 'Authentication failed',
          context,
          'AUTH_FAILED'
        );
        
        return { 
          success: false, 
          secureError, 
          context,
        };
      }
      
      // Update context with user information
      context.userId = authResult.userId;
      context.userEmail = authResult.userEmail;
    }

    // 4. RATE LIMITING
    if (options.rateLimitType || options.customRateLimit) {
      let rateLimiter;
      
      if (options.customRateLimit) {
        // Create custom rate limiter (would need to implement)
        rateLimiter = loginRateLimiter; // Fallback for now
      } else {
        switch (options.rateLimitType) {
          case 'login':
            rateLimiter = loginRateLimiter;
            break;
          case 'register':
            rateLimiter = registerRateLimiter;
            break;
          default:
            rateLimiter = loginRateLimiter; // Default fallback
        }
      }
      
      const identifier = context.userEmail 
        ? getClientIdentifier(context.userEmail)
        : `ip:${context.ipAddress}`;
      
      if (rateLimiter.isLimited(identifier)) {
        const blockedTime = rateLimiter.getBlockedTime(identifier);
        
        const secureError = handleError(
          'Rate limit exceeded',
          context,
          'RATE_LIMIT_EXCEEDED'
        );
        
        return {
          success: false,
          secureError,
          context,
          rateLimited: true,
          retryAfter: blockedTime,
        };
      }
      
      // Record attempt
      rateLimiter.recordAttempt(identifier);
    }

    // 5. REQUEST SIZE VALIDATION
    if (options.maxBodySize) {
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > options.maxBodySize) {
        const secureError = handleError(
          'Request body too large',
          context,
          'REQUEST_TOO_LARGE'
        );
        
        return { 
          success: false, 
          secureError, 
          context,
        };
      }
    }

    // 6. PARSE REQUEST BODY
    let requestData;
    const contentType = request.headers.get('content-type');
    
    try {
      if (contentType?.includes('application/json')) {
        requestData = await request.json();
      } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        requestData = Object.fromEntries(formData.entries());
      } else if (request.method === 'GET') {
        const url = new URL(request.url);
        requestData = Object.fromEntries(url.searchParams.entries());
      } else {
        requestData = {};
      }
    } catch (parseError) {
      const secureError = handleError(
        'Invalid request format',
        context,
        'INVALID_REQUEST_FORMAT'
      );
      
      return { 
        success: false, 
        secureError, 
        context,
      };
    }

    // 7. SCHEMA VALIDATION
    const validationResult = await validateInput(requestData, schema, options);
    
    if (!validationResult.success) {
      const secureError = handleValidationError(validationResult.errors, context);
      
      return {
        success: false,
        secureError,
        context,
      };
    }

    // 8. SUCCESS
    return {
      success: true,
      data: validationResult.data,
      context,
    };

  } catch (error) {
    console.error('API validation middleware error:', error);
    
    const secureError = handleError(
      error instanceof Error ? error.message : 'Unknown error',
      context,
      'MIDDLEWARE_ERROR'
    );
    
    return { 
      success: false, 
      secureError, 
      context,
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS - Pre-configured validation for common scenarios
// ============================================================================

/**
 * Validate user registration request
 */
export async function validateUserRegistration(request: NextRequest) {
  return validateApiRequest(request, ValidationSchemas.userRegistration, {
    allowedMethods: ['POST'],
    rateLimitType: 'register',
    maxBodySize: 10000, // 10KB
    allowedOrigins: [
      'https://caraudioevents.com',
      'https://*.caraudioevents.com',
      ...(process.env.NODE_ENV === 'development' ? ['http://localhost:5173'] : [])
    ],
    logSecurityEvents: true,
  });
}

/**
 * Validate user login request
 */
export async function validateUserLogin(request: NextRequest) {
  const loginSchema = z.object({
    email: ValidationSchemas.email,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
  });

  return validateApiRequest(request, loginSchema, {
    allowedMethods: ['POST'],
    rateLimitType: 'login',
    maxBodySize: 5000, // 5KB
    allowedOrigins: [
      'https://caraudioevents.com',
      'https://*.caraudioevents.com',
      ...(process.env.NODE_ENV === 'development' ? ['http://localhost:5173'] : [])
    ],
    logSecurityEvents: true,
  });
}

/**
 * Validate payment request
 */
export async function validatePaymentRequest(request: NextRequest) {
  return validateApiRequest(request, ValidationSchemas.payment, {
    allowedMethods: ['POST'],
    requireAuth: true,
    rateLimitType: 'strict',
    maxBodySize: 15000, // 15KB
    allowedOrigins: [
      'https://caraudioevents.com',
      'https://*.caraudioevents.com',
    ],
    logSecurityEvents: true,
    requireCSRF: true,
  });
}

/**
 * Validate contact form request
 */
export async function validateContactForm(request: NextRequest) {
  return validateApiRequest(request, ValidationSchemas.contactForm, {
    allowedMethods: ['POST'],
    requireAuth: false,
    rateLimitType: 'api',
    maxBodySize: 20000, // 20KB
    allowedOrigins: [
      'https://caraudioevents.com',
      'https://*.caraudioevents.com',
      ...(process.env.NODE_ENV === 'development' ? ['http://localhost:5173'] : [])
    ],
    logSecurityEvents: false, // Contact forms are generally less sensitive
  });
}

/**
 * Validate event creation request
 */
export async function validateEventCreation(request: NextRequest) {
  return validateApiRequest(request, ValidationSchemas.eventCreation, {
    allowedMethods: ['POST'],
    requireAuth: true,
    rateLimitType: 'api',
    maxBodySize: 50000, // 50KB (larger for event data)
    allowedOrigins: [
      'https://caraudioevents.com',
      'https://*.caraudioevents.com',
    ],
    logSecurityEvents: true,
  });
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create standardized API error response
 */
export function createApiErrorResponse(
  validationResult: ApiValidationResult,
  additionalHeaders?: Record<string, string>
): NextResponse {
  const response = createErrorResponse(validationResult.secureError!);
  
  // Add rate limiting headers if applicable
  if (validationResult.rateLimited && validationResult.retryAfter) {
    response.headers.set('Retry-After', validationResult.retryAfter.toString());
    response.headers.set('X-RateLimit-Limit', '5');
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', new Date(Date.now() + (validationResult.retryAfter * 1000)).toISOString());
  }
  
  // Add additional headers
  if (additionalHeaders) {
    Object.entries(additionalHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}

/**
 * Create standardized API success response
 */
export function createApiSuccessResponse<T>(
  data: T,
  statusCode: number = 200,
  additionalHeaders?: Record<string, string>
): NextResponse {
  const response = NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  }, { status: statusCode });
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Add additional headers
  if (additionalHeaders) {
    Object.entries(additionalHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}

// Export types for external usage
export type { ApiValidationOptions, ApiContext, ApiValidationResult };

/**
 * USAGE EXAMPLES:
 * 
 * 1. In an API route (app/api/contact/route.ts):
 * ```typescript
 * import { validateContactForm, createApiErrorResponse, createApiSuccessResponse } from '@/middleware/api-validation-middleware';
 * 
 * export async function POST(request: NextRequest) {
 *   const validation = await validateContactForm(request);
 *   
 *   if (!validation.success) {
 *     return createApiErrorResponse(validation);
 *   }
 *   
 *   const { name, email, subject, message, category } = validation.data!;
 *   
 *   // Process the contact form...
 *   
 *   return createApiSuccessResponse({ 
 *     messageId: 'msg_12345',
 *     status: 'sent'
 *   });
 * }
 * ```
 * 
 * 2. Custom validation:
 * ```typescript
 * const customSchema = z.object({
 *   customField: z.string().min(1)
 * });
 * 
 * const validation = await validateApiRequest(request, customSchema, {
 *   requireAuth: true,
 *   rateLimitType: 'api',
 *   maxBodySize: 10000
 * });
 * ```
 */