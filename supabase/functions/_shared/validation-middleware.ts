/**
 * Validation Middleware for Edge Functions
 * Provides server-side validation with rate limiting and secure error handling
 */

import { z } from 'zod';
import { RateLimiter, RateLimitConfigs, createRateLimitHeaders } from './rate-limiter.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ============================================================================
// VALIDATION SCHEMAS - Server-side validation schemas
// ============================================================================

// Basic validation schemas for edge functions
export const EdgeValidationSchemas = {
  email: z.string().email().min(5).max(254),
  phone: z.string().regex(/^[\d+\-\s()]{10,15}$/, 'Invalid phone format'),
  name: z.string().trim().min(2).max(50).regex(/^[a-zA-Z\s\-']+$/, 'Invalid name format'),
  uuid: z.string().uuid(),
  positiveInt: z.number().int().positive(),
  currency: z.enum(['usd', 'eur', 'gbp', 'cad', 'aud']),
  
  // Payment validation
  paymentAmount: z.number().int().min(50).max(99999999), // Amount in cents
  paymentMethodId: z.string().regex(/^pm_[a-zA-Z0-9_]+$/, 'Invalid payment method ID'),
  
  // Common metadata
  metadata: z.record(z.string()).optional(),
  
  // Request context
  userAgent: z.string().max(500).optional(),
  origin: z.string().url().optional(),
};

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export interface ValidationContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  origin?: string;
  endpoint?: string;
}

export interface ValidationOptions {
  requireAuth?: boolean;
  rateLimitKey?: keyof typeof RateLimitConfigs;
  allowedOrigins?: string[];
  maxRequestSize?: number;
  customRateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    httpStatus: number;
    details?: Record<string, any>;
  };
  rateLimitHeaders?: Record<string, string>;
}

// ============================================================================
// SECURE ERROR MAPPINGS - Safe error responses for edge functions
// ============================================================================

const EDGE_ERROR_RESPONSES = {
  VALIDATION_FAILED: {
    code: 'EDGE_VAL_001',
    message: 'Invalid request data',
    httpStatus: 400,
  },
  RATE_LIMIT_EXCEEDED: {
    code: 'EDGE_RATE_001',
    message: 'Too many requests',
    httpStatus: 429,
  },
  UNAUTHORIZED: {
    code: 'EDGE_AUTH_001',
    message: 'Authentication required',
    httpStatus: 401,
  },
  FORBIDDEN: {
    code: 'EDGE_AUTH_002',
    message: 'Access denied',
    httpStatus: 403,
  },
  INVALID_ORIGIN: {
    code: 'EDGE_CORS_001',
    message: 'Invalid origin',
    httpStatus: 403,
  },
  REQUEST_TOO_LARGE: {
    code: 'EDGE_SIZE_001',
    message: 'Request too large',
    httpStatus: 413,
  },
  INTERNAL_ERROR: {
    code: 'EDGE_SYS_001',
    message: 'Internal server error',
    httpStatus: 500,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract client IP from request headers
 */
function getClientIp(request: Request): string {
  // Try various headers that might contain the real client IP
  const headers = request.headers;
  const possibleHeaders = [
    'cf-connecting-ip', // Cloudflare
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
  ];
  
  for (const header of possibleHeaders) {
    const value = headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (ip && ip !== 'unknown') {
        return ip;
      }
    }
  }
  
  return 'unknown';
}

/**
 * Get request context from headers and request
 */
function getRequestContext(request: Request): ValidationContext {
  return {
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent') || undefined,
    origin: request.headers.get('origin') || undefined,
    endpoint: new URL(request.url).pathname,
  };
}

/**
 * Validate request origin against allowed origins
 */
function validateOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin || allowedOrigins.length === 0) return true;
  
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
 * Extract user ID from authorization header
 */
async function extractUserId(request: Request): Promise<string | undefined> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined;
  }
  
  try {
    const token = authHeader.substring(7);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    return user?.id;
  } catch {
    return undefined;
  }
}

/**
 * Sanitize error for client response
 */
function createSafeErrorResponse(
  errorType: keyof typeof EDGE_ERROR_RESPONSES,
  details?: Record<string, any>
) {
  const errorInfo = EDGE_ERROR_RESPONSES[errorType];
  return {
    success: false,
    error: {
      code: errorInfo.code,
      message: errorInfo.message,
      httpStatus: errorInfo.httpStatus,
      details: details ? sanitizeErrorDetails(details) : undefined,
    },
  };
}

/**
 * Sanitize error details to prevent information disclosure
 */
function sanitizeErrorDetails(details: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === 'string') {
      // Remove sensitive patterns
      let sanitizedValue = value;
      sanitizedValue = sanitizedValue.replace(/[a-z0-9]{20,}/gi, '[REDACTED]'); // Potential tokens
      sanitizedValue = sanitizedValue.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_REDACTED]'); // IP addresses
      sanitizedValue = sanitizedValue.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]'); // Emails
      
      sanitized[key] = sanitizedValue.slice(0, 200); // Limit length
    } else if (typeof value === 'number' && key !== 'timestamp' && key !== 'httpStatus') {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else {
      sanitized[key] = '[OBJECT_REDACTED]';
    }
  }
  
  return sanitized;
}

// ============================================================================
// MAIN VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Comprehensive validation middleware for edge functions
 */
export async function validateEdgeRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>,
  options: ValidationOptions = {}
): Promise<ValidationResult<T>> {
  const context = getRequestContext(request);
  
  try {
    // 1. Validate request size
    if (options.maxRequestSize) {
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > options.maxRequestSize) {
        return createSafeErrorResponse('REQUEST_TOO_LARGE');
      }
    }
    
    // 2. Validate origin if specified
    if (options.allowedOrigins && options.allowedOrigins.length > 0) {
      if (!validateOrigin(context.origin, options.allowedOrigins)) {
        return createSafeErrorResponse('INVALID_ORIGIN', { origin: context.origin });
      }
    }
    
    // 3. Rate limiting check
    let rateLimitHeaders: Record<string, string> | undefined;
    if (options.rateLimitKey || options.customRateLimit) {
      const rateLimiterConfig = options.customRateLimit || RateLimitConfigs[options.rateLimitKey!];
      const rateLimiter = new RateLimiter(rateLimiterConfig);
      
      const identifier = `${context.ipAddress}_${context.endpoint}`;
      const rateLimitResult = await rateLimiter.checkLimit(identifier);
      
      rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
      
      if (!rateLimitResult.allowed) {
        return {
          ...createSafeErrorResponse('RATE_LIMIT_EXCEEDED', { 
            retryAfter: rateLimitResult.retryAfter 
          }),
          rateLimitHeaders,
        };
      }
    }
    
    // 4. Authentication check
    if (options.requireAuth) {
      const userId = await extractUserId(request);
      if (!userId) {
        return createSafeErrorResponse('UNAUTHORIZED');
      }
      context.userId = userId;
    }
    
    // 5. Parse and validate request body
    let requestData;
    try {
      const contentType = request.headers.get('content-type');
      
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
      return createSafeErrorResponse('VALIDATION_FAILED', { 
        reason: 'Invalid request format' 
      });
    }
    
    // 6. Schema validation
    const validationResult = schema.safeParse(requestData);
    
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.issues.map(issue => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      });
      
      return {
        ...createSafeErrorResponse('VALIDATION_FAILED', { 
          validationErrors: fieldErrors 
        }),
        rateLimitHeaders,
      };
    }
    
    // 7. Success - return validated data
    return {
      success: true,
      data: validationResult.data,
      rateLimitHeaders,
    };
    
  } catch (error) {
    console.error('Edge validation middleware error:', error);
    return createSafeErrorResponse('INTERNAL_ERROR');
  }
}

// ============================================================================
// SPECIALIZED VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate payment request with enhanced security
 */
export async function validatePaymentRequest(request: Request): Promise<ValidationResult<{
  amount: number;
  currency: string;
  paymentMethodId: string;
  email: string;
  metadata?: Record<string, string>;
}>> {
  const paymentSchema = z.object({
    amount: EdgeValidationSchemas.paymentAmount,
    currency: EdgeValidationSchemas.currency,
    paymentMethodId: EdgeValidationSchemas.paymentMethodId,
    email: EdgeValidationSchemas.email,
    metadata: EdgeValidationSchemas.metadata,
  });
  
  return validateEdgeRequest(request, paymentSchema, {
    requireAuth: true,
    rateLimitKey: 'payment',
    maxRequestSize: 10000, // 10KB max for payment requests
    allowedOrigins: [
      'https://caraudioevents.com',
      'https://*.caraudioevents.com',
      // Add development origins if needed
      ...(Deno.env.get('NODE_ENV') === 'development' ? ['http://localhost:5173'] : [])
    ],
  });
}

/**
 * Validate webhook request with special handling
 */
export async function validateWebhookRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  return validateEdgeRequest(request, schema, {
    requireAuth: false,
    rateLimitKey: 'webhook',
    maxRequestSize: 100000, // 100KB max for webhook payloads
    // Webhooks should not have origin restrictions
  });
}

/**
 * Validate API request with standard security
 */
export async function validateApiRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>,
  requireAuth = true
): Promise<ValidationResult<T>> {
  return validateEdgeRequest(request, schema, {
    requireAuth,
    rateLimitKey: 'api',
    maxRequestSize: 50000, // 50KB max for API requests
    allowedOrigins: [
      'https://caraudioevents.com',
      'https://*.caraudioevents.com',
      ...(Deno.env.get('NODE_ENV') === 'development' ? ['http://localhost:5173'] : [])
    ],
  });
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create standardized error response
 */
export function createErrorResponse(
  validationResult: ValidationResult,
  additionalHeaders?: Record<string, string>
): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...validationResult.rateLimitHeaders,
    ...additionalHeaders,
  });
  
  return new Response(
    JSON.stringify(validationResult),
    {
      status: validationResult.error?.httpStatus || 500,
      headers,
    }
  );
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  additionalHeaders?: Record<string, string>
): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...additionalHeaders,
  });
  
  return new Response(
    JSON.stringify({
      success: true,
      data,
    }),
    {
      status: 200,
      headers,
    }
  );
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export {
  getClientIp,
  getRequestContext,
  extractUserId,
  createSafeErrorResponse,
};