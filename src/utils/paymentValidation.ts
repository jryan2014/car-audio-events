/**
 * Payment validation utilities for secure payment processing
 */

// Currency configuration with minimum amounts (in cents)
const CURRENCY_CONFIG = {
  usd: { min: 50, max: 99999999, symbol: '$', decimals: 2 }, // $0.50 - $999,999.99
  eur: { min: 50, max: 99999999, symbol: '€', decimals: 2 },
  gbp: { min: 30, max: 99999999, symbol: '£', decimals: 2 },
  cad: { min: 50, max: 99999999, symbol: 'C$', decimals: 2 },
  aud: { min: 50, max: 99999999, symbol: 'A$', decimals: 2 },
};

export type SupportedCurrency = keyof typeof CURRENCY_CONFIG;

export interface PaymentValidationResult {
  valid: boolean;
  sanitizedAmount: number;
  sanitizedCurrency: string;
  errors: string[];
}

/**
 * Validates and sanitizes payment amount
 */
export function validatePaymentAmount(
  amount: unknown,
  currency: unknown = 'usd'
): PaymentValidationResult {
  const errors: string[] = [];
  
  // Validate currency
  const sanitizedCurrency = String(currency).toLowerCase().trim();
  if (!CURRENCY_CONFIG[sanitizedCurrency as SupportedCurrency]) {
    errors.push(`Unsupported currency: ${currency}. Supported: ${Object.keys(CURRENCY_CONFIG).join(', ')}`);
    return {
      valid: false,
      sanitizedAmount: 0,
      sanitizedCurrency: 'usd',
      errors
    };
  }

  const currencyConfig = CURRENCY_CONFIG[sanitizedCurrency as SupportedCurrency];

  // Validate amount type
  if (amount === null || amount === undefined) {
    errors.push('Amount is required');
    return {
      valid: false,
      sanitizedAmount: 0,
      sanitizedCurrency,
      errors
    };
  }

  // Convert to number and validate
  let numAmount: number;
  
  if (typeof amount === 'string') {
    // Remove currency symbols and whitespace
    const cleanedAmount = amount.replace(/[$€£CAD\s,]/g, '');
    numAmount = parseFloat(cleanedAmount);
  } else if (typeof amount === 'number') {
    numAmount = amount;
  } else {
    errors.push('Amount must be a number or numeric string');
    return {
      valid: false,
      sanitizedAmount: 0,
      sanitizedCurrency,
      errors
    };
  }

  // Check if valid number
  if (isNaN(numAmount) || !isFinite(numAmount)) {
    errors.push('Amount must be a valid number');
    return {
      valid: false,
      sanitizedAmount: 0,
      sanitizedCurrency,
      errors
    };
  }

  // Convert to cents (integer)
  const amountInCents = Math.round(numAmount * 100);

  // Validate range
  if (amountInCents < currencyConfig.min) {
    const minFormatted = (currencyConfig.min / 100).toFixed(currencyConfig.decimals);
    errors.push(`Amount must be at least ${currencyConfig.symbol}${minFormatted}`);
  }

  if (amountInCents > currencyConfig.max) {
    const maxFormatted = (currencyConfig.max / 100).toFixed(currencyConfig.decimals);
    errors.push(`Amount cannot exceed ${currencyConfig.symbol}${maxFormatted}`);
  }

  // Check for negative amounts
  if (amountInCents < 0) {
    errors.push('Amount cannot be negative');
  }

  return {
    valid: errors.length === 0,
    sanitizedAmount: Math.max(0, Math.min(amountInCents, currencyConfig.max)),
    sanitizedCurrency,
    errors
  };
}

/**
 * Validates payment metadata
 */
export function validatePaymentMetadata(metadata: unknown): {
  valid: boolean;
  sanitized: Record<string, string>;
  errors: string[];
} {
  const errors: string[] = [];
  const sanitized: Record<string, string> = {};

  if (!metadata || typeof metadata !== 'object') {
    return { valid: true, sanitized, errors };
  }

  const metadataObj = metadata as Record<string, unknown>;
  const MAX_KEY_LENGTH = 40;
  const MAX_VALUE_LENGTH = 500;
  const MAX_KEYS = 50;

  const keys = Object.keys(metadataObj);
  
  if (keys.length > MAX_KEYS) {
    errors.push(`Metadata cannot have more than ${MAX_KEYS} keys`);
  }

  for (const key of keys.slice(0, MAX_KEYS)) {
    // Validate key
    const sanitizedKey = String(key).trim().slice(0, MAX_KEY_LENGTH);
    
    if (!sanitizedKey) {
      errors.push('Metadata keys cannot be empty');
      continue;
    }

    // Validate value
    const value = metadataObj[key];
    let sanitizedValue: string;

    if (value === null || value === undefined) {
      sanitizedValue = '';
    } else if (typeof value === 'object') {
      try {
        sanitizedValue = JSON.stringify(value).slice(0, MAX_VALUE_LENGTH);
      } catch {
        sanitizedValue = '[Object]';
      }
    } else {
      sanitizedValue = String(value).slice(0, MAX_VALUE_LENGTH);
    }

    // Remove potentially dangerous characters
    sanitizedValue = sanitizedValue
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/\0/g, ''); // Remove null bytes

    sanitized[sanitizedKey] = sanitizedValue;
  }

  return {
    valid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Formats amount for display
 */
export function formatPaymentAmount(amountInCents: number, currency: string = 'usd'): string {
  const currencyConfig = CURRENCY_CONFIG[currency.toLowerCase() as SupportedCurrency];
  if (!currencyConfig) {
    return `${(amountInCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }

  const amount = (amountInCents / 100).toFixed(currencyConfig.decimals);
  return `${currencyConfig.symbol}${amount}`;
}

/**
 * Validates Stripe payment method ID
 */
export function validatePaymentMethodId(paymentMethodId: unknown): {
  valid: boolean;
  sanitized: string;
  error?: string;
} {
  if (!paymentMethodId || typeof paymentMethodId !== 'string') {
    return {
      valid: false,
      sanitized: '',
      error: 'Payment method ID is required'
    };
  }

  const sanitized = paymentMethodId.trim();
  
  // Stripe payment method IDs start with 'pm_' and are alphanumeric
  if (!sanitized.match(/^pm_[a-zA-Z0-9_]+$/)) {
    return {
      valid: false,
      sanitized: '',
      error: 'Invalid payment method ID format'
    };
  }

  return {
    valid: true,
    sanitized
  };
}

/**
 * Validates and sanitizes email for payment receipts
 */
export function validatePaymentEmail(email: unknown): {
  valid: boolean;
  sanitized: string;
  error?: string;
} {
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      sanitized: '',
      error: 'Email is required for payment receipts'
    };
  }

  const sanitized = email.trim().toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return {
      valid: false,
      sanitized: '',
      error: 'Invalid email format'
    };
  }

  // Additional security checks
  if (sanitized.length > 254) { // RFC 5321
    return {
      valid: false,
      sanitized: '',
      error: 'Email address too long'
    };
  }

  return {
    valid: true,
    sanitized
  };
}