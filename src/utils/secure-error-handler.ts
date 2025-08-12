/**
 * Secure Error Handler - Sanitizes errors and prevents information disclosure
 * Maps internal errors to user-friendly messages while maintaining audit trails
 */

import { sanitizeObject } from './secureLogging';

// ============================================================================
// ERROR TYPES AND INTERFACES
// ============================================================================

export interface SecureError {
  code: string;
  message: string;
  userMessage: string;
  httpStatus: number;
  isRetryable: boolean;
  details?: Record<string, any>;
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  endpoint?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp?: Date;
}

export interface ErrorLogEntry {
  errorId: string;
  code: string;
  message: string;
  context: ErrorContext;
  sanitizedDetails: Record<string, any>;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// ERROR CODE MAPPINGS - Internal codes to user-friendly messages
// ============================================================================

const ERROR_MAPPINGS: Record<string, Omit<SecureError, 'details'>> = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: {
    code: 'AUTH_001',
    message: 'Invalid email or password',
    userMessage: 'Invalid email or password. Please check your credentials and try again.',
    httpStatus: 401,
    isRetryable: true,
  },
  AUTH_USER_NOT_FOUND: {
    code: 'AUTH_002', 
    message: 'User not found',
    userMessage: 'Invalid email or password. Please check your credentials and try again.',
    httpStatus: 401,
    isRetryable: true,
  },
  AUTH_ACCOUNT_LOCKED: {
    code: 'AUTH_003',
    message: 'Account temporarily locked',
    userMessage: 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later.',
    httpStatus: 423,
    isRetryable: true,
  },
  AUTH_TOKEN_EXPIRED: {
    code: 'AUTH_004',
    message: 'Authentication token expired',
    userMessage: 'Your session has expired. Please sign in again.',
    httpStatus: 401,
    isRetryable: true,
  },
  AUTH_INSUFFICIENT_PERMISSIONS: {
    code: 'AUTH_005',
    message: 'Insufficient permissions',
    userMessage: 'You do not have permission to perform this action.',
    httpStatus: 403,
    isRetryable: false,
  },

  // Validation errors
  VALIDATION_FAILED: {
    code: 'VAL_001',
    message: 'Input validation failed',
    userMessage: 'The information provided is invalid. Please check your input and try again.',
    httpStatus: 400,
    isRetryable: true,
  },
  VALIDATION_MISSING_REQUIRED: {
    code: 'VAL_002',
    message: 'Required field missing',
    userMessage: 'Please fill in all required fields.',
    httpStatus: 400,
    isRetryable: true,
  },
  VALIDATION_INVALID_FORMAT: {
    code: 'VAL_003',
    message: 'Invalid format',
    userMessage: 'The format of the provided data is incorrect.',
    httpStatus: 400,
    isRetryable: true,
  },
  VALIDATION_DUPLICATE_ENTRY: {
    code: 'VAL_004',
    message: 'Duplicate entry',
    userMessage: 'This entry already exists. Please provide unique information.',
    httpStatus: 409,
    isRetryable: false,
  },

  // Payment errors
  PAYMENT_FAILED: {
    code: 'PAY_001',
    message: 'Payment processing failed',
    userMessage: 'Your payment could not be processed. Please check your payment method and try again.',
    httpStatus: 402,
    isRetryable: true,
  },
  PAYMENT_CARD_DECLINED: {
    code: 'PAY_002',
    message: 'Card declined',
    userMessage: 'Your card was declined. Please check your card details or use a different payment method.',
    httpStatus: 402,
    isRetryable: true,
  },
  PAYMENT_INSUFFICIENT_FUNDS: {
    code: 'PAY_003',
    message: 'Insufficient funds',
    userMessage: 'Your card has insufficient funds for this transaction.',
    httpStatus: 402,
    isRetryable: false,
  },
  PAYMENT_INVALID_AMOUNT: {
    code: 'PAY_004',
    message: 'Invalid payment amount',
    userMessage: 'The payment amount is invalid. Please check the amount and try again.',
    httpStatus: 400,
    isRetryable: true,
  },
  PAYMENT_METHOD_NOT_ALLOWED: {
    code: 'PAY_005',
    message: 'Payment method not allowed',
    userMessage: 'This payment method is not accepted for this transaction.',
    httpStatus: 400,
    isRetryable: false,
  },

  // Database errors
  DATABASE_CONNECTION_FAILED: {
    code: 'DB_001',
    message: 'Database connection failed',
    userMessage: 'We are experiencing technical difficulties. Please try again shortly.',
    httpStatus: 503,
    isRetryable: true,
  },
  DATABASE_TIMEOUT: {
    code: 'DB_002',
    message: 'Database operation timed out',
    userMessage: 'The request is taking longer than expected. Please try again.',
    httpStatus: 504,
    isRetryable: true,
  },
  DATABASE_CONSTRAINT_VIOLATION: {
    code: 'DB_003',
    message: 'Database constraint violation',
    userMessage: 'The operation cannot be completed due to data constraints.',
    httpStatus: 409,
    isRetryable: false,
  },

  // File upload errors
  FILE_TOO_LARGE: {
    code: 'FILE_001',
    message: 'File exceeds size limit',
    userMessage: 'The file you are trying to upload is too large. Please choose a smaller file.',
    httpStatus: 413,
    isRetryable: true,
  },
  FILE_INVALID_TYPE: {
    code: 'FILE_002',
    message: 'Invalid file type',
    userMessage: 'The file type is not supported. Please upload a valid file.',
    httpStatus: 400,
    isRetryable: true,
  },
  FILE_UPLOAD_FAILED: {
    code: 'FILE_003',
    message: 'File upload failed',
    userMessage: 'Failed to upload the file. Please try again.',
    httpStatus: 500,
    isRetryable: true,
  },

  // Rate limiting errors  
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_001',
    message: 'Rate limit exceeded',
    userMessage: 'Too many requests. Please wait before trying again.',
    httpStatus: 429,
    isRetryable: true,
  },

  // Email errors
  EMAIL_SEND_FAILED: {
    code: 'EMAIL_001',
    message: 'Email send failed',
    userMessage: 'We could not send the email at this time. Please try again later.',
    httpStatus: 500,
    isRetryable: true,
  },
  EMAIL_INVALID_RECIPIENT: {
    code: 'EMAIL_002',
    message: 'Invalid email recipient',
    userMessage: 'The email address provided is invalid.',
    httpStatus: 400,
    isRetryable: true,
  },

  // External service errors
  EXTERNAL_SERVICE_UNAVAILABLE: {
    code: 'EXT_001',
    message: 'External service unavailable',
    userMessage: 'A required service is currently unavailable. Please try again later.',
    httpStatus: 503,
    isRetryable: true,
  },
  EXTERNAL_SERVICE_TIMEOUT: {
    code: 'EXT_002',
    message: 'External service timeout',
    userMessage: 'The request is taking longer than expected. Please try again.',
    httpStatus: 504,
    isRetryable: true,
  },

  // Generic errors
  INTERNAL_SERVER_ERROR: {
    code: 'SYS_001',
    message: 'Internal server error',
    userMessage: 'We are experiencing technical difficulties. Please try again shortly.',
    httpStatus: 500,
    isRetryable: true,
  },
  SERVICE_UNAVAILABLE: {
    code: 'SYS_002',
    message: 'Service temporarily unavailable',
    userMessage: 'The service is temporarily unavailable. Please try again later.',
    httpStatus: 503,
    isRetryable: true,
  },
  NOT_FOUND: {
    code: 'SYS_003',
    message: 'Resource not found',
    userMessage: 'The requested resource was not found.',
    httpStatus: 404,
    isRetryable: false,
  },
  BAD_REQUEST: {
    code: 'SYS_004',
    message: 'Bad request',
    userMessage: 'The request is invalid. Please check your input and try again.',
    httpStatus: 400,
    isRetryable: true,
  },
};

// ============================================================================
// DANGEROUS PATTERNS - Patterns to remove from error messages
// ============================================================================

const DANGEROUS_PATTERNS = [
  // Database information
  /database|db|sql|postgres|mysql|sqlite/gi,
  /table|column|constraint|foreign key|primary key/gi,
  /select|insert|update|delete|drop|create|alter/gi,
  
  // File paths
  /[a-z]:\\\\[^\\s]+/gi, // Windows paths
  /\/[a-z0-9\-_]+\/[a-z0-9\-_\/]+/gi, // Unix paths
  
  // IP addresses and ports
  /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/gi,
  /localhost:\d+/gi,
  
  // API keys and tokens
  /[a-z0-9]{20,}/gi, // Long alphanumeric strings (potential tokens)
  /sk_[a-z0-9_]+/gi, // Stripe secret keys
  /pk_[a-z0-9_]+/gi, // Stripe public keys
  
  // Email addresses (in error messages)
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
  
  // Function names and stack traces
  /at [a-zA-Z0-9_$]+\./gi,
  /Error: /gi,
  /TypeError: /gi,
  /ReferenceError: /gi,
  /SyntaxError: /gi,
  
  // Environment information
  /node_modules/gi,
  /\.js:\d+:\d+/gi,
  /\.ts:\d+:\d+/gi,
];

// ============================================================================
// CORE ERROR HANDLING FUNCTIONS
// ============================================================================

/**
 * Generate a unique error ID for tracking
 */
function generateErrorId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `ERR_${timestamp}_${random}`;
}

/**
 * Determine error severity based on code and context
 */
function determineSeverity(errorCode: string, httpStatus: number): ErrorLogEntry['severity'] {
  if (errorCode.startsWith('AUTH') && httpStatus === 401) return 'medium';
  if (errorCode.startsWith('PAY')) return 'high';
  if (httpStatus >= 500) return 'critical';
  if (httpStatus >= 400) return 'medium';
  return 'low';
}

/**
 * Sanitize error message by removing dangerous patterns
 */
function sanitizeErrorMessage(message: string): string {
  let sanitized = message;
  
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  
  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Limit message length
  if (sanitized.length > 1000) {
    sanitized = sanitized.substring(0, 997) + '...';
  }
  
  return sanitized;
}

/**
 * Map an internal error to a secure user-facing error
 */
function mapErrorToSecure(
  error: Error | string, 
  errorCode?: string,
  context?: ErrorContext
): SecureError {
  const message = typeof error === 'string' ? error : error.message;
  
  // Try to find mapping by error code first
  if (errorCode && ERROR_MAPPINGS[errorCode]) {
    const mapping = ERROR_MAPPINGS[errorCode];
    return {
      ...mapping,
      details: context ? sanitizeObject(context) : undefined,
    };
  }
  
  // Try to infer error type from message
  const lowerMessage = message.toLowerCase();
  
  // Authentication patterns
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication')) {
    const mapping = ERROR_MAPPINGS.AUTH_INVALID_CREDENTIALS;
    return { ...mapping, details: context ? sanitizeObject(context) : undefined };
  }
  
  if (lowerMessage.includes('forbidden') || lowerMessage.includes('permission')) {
    const mapping = ERROR_MAPPINGS.AUTH_INSUFFICIENT_PERMISSIONS;
    return { ...mapping, details: context ? sanitizeObject(context) : undefined };
  }
  
  // Payment patterns
  if (lowerMessage.includes('payment') || lowerMessage.includes('stripe') || lowerMessage.includes('paypal')) {
    const mapping = ERROR_MAPPINGS.PAYMENT_FAILED;
    return { ...mapping, details: context ? sanitizeObject(context) : undefined };
  }
  
  if (lowerMessage.includes('card') && (lowerMessage.includes('declined') || lowerMessage.includes('invalid'))) {
    const mapping = ERROR_MAPPINGS.PAYMENT_CARD_DECLINED;
    return { ...mapping, details: context ? sanitizeObject(context) : undefined };
  }
  
  // Database patterns
  if (lowerMessage.includes('database') || lowerMessage.includes('connection') || lowerMessage.includes('timeout')) {
    const mapping = ERROR_MAPPINGS.DATABASE_CONNECTION_FAILED;
    return { ...mapping, details: context ? sanitizeObject(context) : undefined };
  }
  
  // Validation patterns
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerMessage.includes('required')) {
    const mapping = ERROR_MAPPINGS.VALIDATION_FAILED;
    return { ...mapping, details: context ? sanitizeObject(context) : undefined };
  }
  
  // File upload patterns
  if (lowerMessage.includes('file') && (lowerMessage.includes('size') || lowerMessage.includes('large'))) {
    const mapping = ERROR_MAPPINGS.FILE_TOO_LARGE;
    return { ...mapping, details: context ? sanitizeObject(context) : undefined };
  }
  
  if (lowerMessage.includes('file') && lowerMessage.includes('type')) {
    const mapping = ERROR_MAPPINGS.FILE_INVALID_TYPE;
    return { ...mapping, details: context ? sanitizeObject(context) : undefined };
  }
  
  // Rate limiting patterns
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
    const mapping = ERROR_MAPPINGS.RATE_LIMIT_EXCEEDED;
    return { ...mapping, details: context ? sanitizeObject(context) : undefined };
  }
  
  // Default to generic internal server error
  const mapping = ERROR_MAPPINGS.INTERNAL_SERVER_ERROR;
  return { ...mapping, details: context ? sanitizeObject(context) : undefined };
}

// ============================================================================
// PUBLIC API - Main error handling interface
// ============================================================================

export class SecureErrorHandler {
  private static instance: SecureErrorHandler | null = null;
  private errorLogs: ErrorLogEntry[] = [];
  private maxLogEntries: number = 1000;
  
  private constructor() {}
  
  /**
   * Get singleton instance of the error handler
   */
  static getInstance(): SecureErrorHandler {
    if (!SecureErrorHandler.instance) {
      SecureErrorHandler.instance = new SecureErrorHandler();
    }
    return SecureErrorHandler.instance;
  }
  
  /**
   * Handle an error and return a secure version for the client
   */
  handleError(
    error: Error | string,
    context?: ErrorContext,
    errorCode?: string
  ): SecureError {
    const errorId = generateErrorId();
    const secureError = mapErrorToSecure(error, errorCode, context);
    
    // Log the full error internally
    this.logError(errorId, error, secureError, context);
    
    // Return sanitized error for client
    return {
      ...secureError,
      details: {
        errorId, // Include error ID for support purposes
        timestamp: new Date().toISOString(),
        ...(secureError.details || {}),
      },
    };
  }
  
  /**
   * Handle validation errors with detailed field information
   */
  handleValidationError(
    validationErrors: string[],
    context?: ErrorContext
  ): SecureError {
    const errorId = generateErrorId();
    const secureError: SecureError = {
      code: 'VAL_001',
      message: 'Input validation failed',
      userMessage: 'Please correct the following errors and try again:',
      httpStatus: 400,
      isRetryable: true,
      details: {
        errorId,
        timestamp: new Date().toISOString(),
        validationErrors: validationErrors.map(sanitizeErrorMessage),
      },
    };
    
    // Log validation errors
    this.logError(errorId, validationErrors.join(', '), secureError, context);
    
    return secureError;
  }
  
  /**
   * Handle payment errors with special care for sensitive data
   */
  handlePaymentError(
    error: Error | string,
    paymentContext?: {
      paymentIntentId?: string;
      amount?: number;
      currency?: string;
      provider?: 'stripe' | 'paypal';
    },
    context?: ErrorContext
  ): SecureError {
    const errorId = generateErrorId();
    const message = typeof error === 'string' ? error : error.message;
    
    // Determine specific payment error type
    let errorCode = 'PAY_001'; // Default to generic payment error
    
    if (message.toLowerCase().includes('declined')) {
      errorCode = 'PAY_002';
    } else if (message.toLowerCase().includes('insufficient')) {
      errorCode = 'PAY_003';
    } else if (message.toLowerCase().includes('amount')) {
      errorCode = 'PAY_004';
    }
    
    const secureError = mapErrorToSecure(error, errorCode, context);
    
    // Add sanitized payment context
    if (paymentContext) {
      secureError.details = {
        ...secureError.details,
        provider: paymentContext.provider,
        // Only include partial payment intent ID for tracking
        paymentId: paymentContext.paymentIntentId 
          ? `${paymentContext.paymentIntentId.substring(0, 8)}...${paymentContext.paymentIntentId.substring(paymentContext.paymentIntentId.length - 4)}`
          : undefined,
        // Include amount range for debugging without exact amounts
        amountRange: paymentContext.amount ? this.getAmountRange(paymentContext.amount) : undefined,
      };
    }
    
    this.logError(errorId, error, secureError, context);
    
    return secureError;
  }
  
  /**
   * Create standardized API response from secure error
   */
  createErrorResponse(secureError: SecureError): {
    success: false;
    error: {
      code: string;
      message: string;
      details?: Record<string, any>;
      retryable: boolean;
    };
    statusCode: number;
  } {
    return {
      success: false,
      error: {
        code: secureError.code,
        message: secureError.userMessage,
        details: secureError.details,
        retryable: secureError.isRetryable,
      },
      statusCode: secureError.httpStatus,
    };
  }
  
  /**
   * Get error statistics for monitoring
   */
  getErrorStats(): {
    total: number;
    bySeverity: Record<string, number>;
    byCode: Record<string, number>;
    recentErrors: Array<{ code: string; count: number; lastSeen: Date }>;
  } {
    const stats = {
      total: this.errorLogs.length,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byCode: {} as Record<string, number>,
      recentErrors: [] as Array<{ code: string; count: number; lastSeen: Date }>,
    };
    
    for (const log of this.errorLogs) {
      stats.bySeverity[log.severity]++;
      stats.byCode[log.code] = (stats.byCode[log.code] || 0) + 1;
    }
    
    // Get recent unique errors
    const recentMap = new Map<string, { count: number; lastSeen: Date }>();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const log of this.errorLogs) {
      if (log.timestamp > oneHourAgo) {
        const existing = recentMap.get(log.code) || { count: 0, lastSeen: log.timestamp };
        recentMap.set(log.code, {
          count: existing.count + 1,
          lastSeen: log.timestamp > existing.lastSeen ? log.timestamp : existing.lastSeen,
        });
      }
    }
    
    stats.recentErrors = Array.from(recentMap.entries()).map(([code, data]) => ({
      code,
      ...data,
    }));
    
    return stats;
  }
  
  /**
   * Clear old error logs to prevent memory issues
   */
  clearOldLogs(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.errorLogs = this.errorLogs.filter(log => log.timestamp > oneDayAgo);
    
    // Also limit by total count
    if (this.errorLogs.length > this.maxLogEntries) {
      this.errorLogs = this.errorLogs.slice(-this.maxLogEntries);
    }
  }
  
  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================
  
  private logError(
    errorId: string,
    originalError: Error | string | any,
    secureError: SecureError,
    context?: ErrorContext
  ): void {
    const logEntry: ErrorLogEntry = {
      errorId,
      code: secureError.code,
      message: sanitizeErrorMessage(typeof originalError === 'string' ? originalError : originalError.message || 'Unknown error'),
      context: context || {},
      sanitizedDetails: sanitizeObject({
        originalMessage: typeof originalError === 'string' ? originalError : originalError.message,
        stack: originalError instanceof Error ? originalError.stack : undefined,
        userMessage: secureError.userMessage,
        httpStatus: secureError.httpStatus,
      }),
      timestamp: new Date(),
      severity: determineSeverity(secureError.code, secureError.httpStatus),
    };
    
    this.errorLogs.push(logEntry);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${errorId}] ${secureError.code}:`, {
        message: logEntry.message,
        context: logEntry.context,
        severity: logEntry.severity,
      });
    }
    
    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production' && logEntry.severity === 'critical') {
      this.sendToExternalLogging(logEntry);
    }
    
    // Clean up old logs periodically
    if (Math.random() < 0.1) { // 10% chance on each error
      this.clearOldLogs();
    }
  }
  
  private getAmountRange(amount: number): string {
    if (amount < 100) return '<$1';
    if (amount < 1000) return '<$10';
    if (amount < 10000) return '<$100';
    if (amount < 100000) return '<$1,000';
    return '>$1,000';
  }
  
  private sendToExternalLogging(logEntry: ErrorLogEntry): void {
    // Placeholder for external logging service integration
    // In production, send to services like Sentry, LogRocket, etc.
    console.error('CRITICAL ERROR:', logEntry);
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS - Easy-to-use error handling functions
// ============================================================================

/**
 * Handle a generic error and return user-safe version
 */
export function handleError(
  error: Error | string,
  context?: ErrorContext,
  errorCode?: string
): SecureError {
  return SecureErrorHandler.getInstance().handleError(error, context, errorCode);
}

/**
 * Handle validation errors with field details
 */
export function handleValidationError(
  validationErrors: string[],
  context?: ErrorContext
): SecureError {
  return SecureErrorHandler.getInstance().handleValidationError(validationErrors, context);
}

/**
 * Handle payment errors with special care
 */
export function handlePaymentError(
  error: Error | string,
  paymentContext?: {
    paymentIntentId?: string;
    amount?: number;
    currency?: string;
    provider?: 'stripe' | 'paypal';
  },
  context?: ErrorContext
): SecureError {
  return SecureErrorHandler.getInstance().handlePaymentError(error, paymentContext, context);
}

/**
 * Create API response from error
 */
export function createErrorResponse(secureError: SecureError) {
  return SecureErrorHandler.getInstance().createErrorResponse(secureError);
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: SecureError | Error | string): boolean {
  if (typeof error === 'string') return true; // Assume retryable for string errors
  if (error instanceof Error) return true; // Assume retryable for generic errors
  return (error as SecureError).isRetryable ?? true;
}

/**
 * Get error statistics for monitoring dashboard
 */
export function getErrorStatistics() {
  return SecureErrorHandler.getInstance().getErrorStats();
}

// Export the error handler instance for advanced usage
export default SecureErrorHandler;