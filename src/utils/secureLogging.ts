/**
 * Secure logging utility that sanitizes sensitive payment information
 */

// List of sensitive keys to redact
const SENSITIVE_KEYS = [
  'card_number',
  'cardNumber',
  'card_cvc',
  'cardCvc',
  'cvc',
  'cvv',
  'card_exp',
  'cardExp',
  'exp_month',
  'exp_year',
  'account_number',
  'routing_number',
  'secret_key',
  'secretKey',
  'api_key',
  'apiKey',
  'password',
  'token',
  'client_secret',
  'clientSecret',
  'webhook_secret',
  'webhookSecret',
  'stripe_secret',
  'paypal_secret',
  'payment_method_id',
  'paymentMethodId',
  'card',
  'billing_details',
  'billingDetails'
];

// List of keys that should show partial values
const PARTIAL_KEYS = [
  'email',
  'phone',
  'customer_id',
  'customerId',
  'payment_intent_id',
  'paymentIntentId',
  'subscription_id',
  'subscriptionId'
];

/**
 * Sanitizes an object by redacting sensitive fields
 */
export function sanitizeObject(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) return '[MAX_DEPTH_EXCEEDED]';
  
  if (obj === null || obj === undefined) return obj;
  
  // Handle primitives
  if (typeof obj !== 'object') return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  // Handle objects
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Completely redact sensitive keys
    if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    // Show partial values for semi-sensitive keys
    if (PARTIAL_KEYS.some(partial => lowerKey.includes(partial))) {
      if (typeof value === 'string' && value.length > 4) {
        // Show first 3 and last 2 characters
        sanitized[key] = `${value.substring(0, 3)}...${value.substring(value.length - 2)}`;
      } else {
        sanitized[key] = '[REDACTED]';
      }
      continue;
    }
    
    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Secure console.log that sanitizes payment data
 */
export const secureLog = {
  log: (...args: any[]) => {
    const sanitizedArgs = args.map(arg => 
      typeof arg === 'object' ? sanitizeObject(arg) : arg
    );
    console.log(...sanitizedArgs);
  },
  
  error: (...args: any[]) => {
    const sanitizedArgs = args.map(arg => 
      typeof arg === 'object' ? sanitizeObject(arg) : arg
    );
    console.error(...sanitizedArgs);
  },
  
  warn: (...args: any[]) => {
    const sanitizedArgs = args.map(arg => 
      typeof arg === 'object' ? sanitizeObject(arg) : arg
    );
    console.warn(...sanitizedArgs);
  },
  
  info: (...args: any[]) => {
    const sanitizedArgs = args.map(arg => 
      typeof arg === 'object' ? sanitizeObject(arg) : arg
    );
    console.info(...sanitizedArgs);
  }
};

/**
 * Formats payment amount for logging (hides exact amounts)
 */
export function formatAmountForLogging(amount: number, currency: string = 'usd'): string {
  if (amount < 100) return '<$1';
  if (amount < 1000) return '<$10';
  if (amount < 10000) return '<$100';
  if (amount < 100000) return '<$1,000';
  return '>$1,000';
}

/**
 * Creates a safe payment log entry
 */
export function createPaymentLogEntry(
  action: string,
  paymentData: any,
  includeAmount = false
): Record<string, any> {
  const logEntry: Record<string, any> = {
    timestamp: new Date().toISOString(),
    action,
    provider: paymentData.provider || 'unknown'
  };
  
  if (paymentData.payment_intent_id || paymentData.paymentIntentId) {
    const id = paymentData.payment_intent_id || paymentData.paymentIntentId;
    logEntry.paymentId = `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
  }
  
  if (includeAmount && paymentData.amount) {
    logEntry.amountRange = formatAmountForLogging(paymentData.amount, paymentData.currency);
  }
  
  if (paymentData.status) {
    logEntry.status = paymentData.status;
  }
  
  if (paymentData.error) {
    logEntry.error = paymentData.error.message || 'Unknown error';
  }
  
  return logEntry;
}