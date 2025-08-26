/**
 * Comprehensive Input Validation Framework
 * Provides Zod schemas, validation middleware, and sanitization for all input types
 */

import { z } from 'zod';
import DOMPurify from 'dompurify';
import { loginRateLimiter, registerRateLimiter, getClientIdentifier } from './rateLimiter';
import { validateName, validatePhone, validateAddress, validateCity } from './registrationValidator';
import { validatePaymentAmount, validatePaymentEmail, validatePaymentMetadata } from './paymentValidation';
import { sanitizeObject } from './secureLogging';

// ============================================================================
// ZOD SCHEMAS - Comprehensive validation schemas for all input types
// ============================================================================

// Basic string validation with sanitization
const createStringSchema = (minLength: number, maxLength: number, required = true) => {
  const base = z
    .string()
    .trim()
    .min(minLength, `Must be at least ${minLength} characters`)
    .max(maxLength, `Must not exceed ${maxLength} characters`)
    .transform((val) => val.replace(/\s+/g, ' ')); // Normalize whitespace
  
  return required ? base : base.optional();
};

// Email validation schema
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email format')
  .min(5, 'Email too short')
  .max(254, 'Email too long') // RFC 5321
  .refine(
    (email) => !email.includes('..'), 
    'Email cannot contain consecutive dots'
  )
  .refine(
    (email) => !email.startsWith('.') && !email.endsWith('.'),
    'Email cannot start or end with a dot'
  );

// Phone number validation schema
export const phoneSchema = z
  .string()
  .trim()
  .transform((val) => val.replace(/[^\d+\-\s()]/g, '')) // Keep only valid phone chars
  .refine(
    (phone) => {
      const digits = phone.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    },
    'Phone number must be 10-15 digits'
  )
  .refine(
    (phone) => {
      const result = validatePhone(phone);
      return result.isValid;
    },
    'Please enter a valid phone number'
  );

// Name validation schemas
export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name cannot exceed 50 characters')
  .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .transform((val) => val.replace(/\s+/g, ' '));

// Address validation schema
export const addressSchema = z
  .string()
  .trim()
  .min(5, 'Address must be at least 5 characters')
  .max(200, 'Address cannot exceed 200 characters')
  .refine(
    (address) => {
      const result = validateAddress(address);
      return result.isValid;
    },
    'Please enter a valid street address'
  );

// City validation schema
export const citySchema = z
  .string()
  .trim()
  .min(2, 'City name must be at least 2 characters')
  .max(100, 'City name cannot exceed 100 characters')
  .refine(
    (city) => {
      const result = validateCity(city);
      return result.isValid;
    },
    'Please enter a valid city name'
  );

// Postal code validation schema (flexible for international)
export const postalCodeSchema = z
  .string()
  .trim()
  .min(3, 'Postal code too short')
  .max(20, 'Postal code too long')
  .regex(/^[a-zA-Z0-9\s\-]+$/, 'Invalid postal code format');

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
  .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
  .regex(/^(?=.*\d)/, 'Password must contain at least one number')
  .regex(/^(?=.*[!@#$%^&*(),.?":{}|<>])/, 'Password must contain at least one special character');

// URL validation schema
export const urlSchema = z
  .string()
  .trim()
  .url('Invalid URL format')
  .max(500, 'URL too long')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    'Only HTTP and HTTPS URLs are allowed'
  );

// Sanitized HTML content schema
export const htmlContentSchema = z
  .string()
  .max(50000, 'Content too long')
  .transform((val) => {
    // Use DOMPurify for proper HTML sanitization
    return DOMPurify.sanitize(val, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'a', 'img'],
      ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'width', 'height'],
      ALLOW_DATA_ATTR: false,
      FORBID_CONTENTS: ['script', 'style'],
      FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror']
    });
  });

// ID validation schemas
export const uuidSchema = z
  .string()
  .uuid('Invalid ID format');

export const positiveIntSchema = z
  .number()
  .int('Must be a whole number')
  .positive('Must be greater than zero');

export const nonNegativeIntSchema = z
  .number()
  .int('Must be a whole number')
  .min(0, 'Cannot be negative');

// ============================================================================
// COMPOUND SCHEMAS - Complex validation for forms and API endpoints
// ============================================================================

// User registration schema
export const userRegistrationSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
  acceptTerms: z.boolean().refine(val => val === true, 'Must accept terms and conditions')
});

// User profile update schema
export const userProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema.optional(),
  address: addressSchema.optional(),
  city: citySchema.optional(),
  state: createStringSchema(2, 100, false),
  postalCode: postalCodeSchema.optional(),
  country: createStringSchema(2, 100, false),
  bio: createStringSchema(0, 500, false),
  website: urlSchema.optional(),
});

// Event creation schema
export const eventCreationSchema = z.object({
  title: createStringSchema(3, 200),
  description: htmlContentSchema,
  startDate: z.string().datetime('Invalid date format'),
  endDate: z.string().datetime('Invalid date format'),
  location: createStringSchema(5, 300),
  city: citySchema,
  state: createStringSchema(2, 100),
  country: createStringSchema(2, 100),
  maxParticipants: positiveIntSchema.optional(),
  registrationFee: nonNegativeIntSchema.optional(),
  categories: z.array(createStringSchema(2, 50)).max(10, 'Too many categories'),
  isPublic: z.boolean(),
  requiresApproval: z.boolean().optional(),
});

// Payment validation schema
export const paymentSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
  currency: z.enum(['usd', 'eur', 'gbp', 'cad', 'aud'], {
    errorMap: () => ({ message: 'Unsupported currency' })
  }),
  paymentMethodId: z.string().regex(/^pm_[a-zA-Z0-9_]+$/, 'Invalid payment method ID'),
  email: emailSchema,
  metadata: z.record(z.string()).optional(),
});

// Contact form schema
export const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  subject: createStringSchema(5, 200),
  message: createStringSchema(10, 2000),
  category: z.enum(['general', 'technical', 'billing', 'feedback'], {
    errorMap: () => ({ message: 'Invalid category' })
  }),
});

// Search query schema
export const searchQuerySchema = z.object({
  query: createStringSchema(1, 200),
  category: createStringSchema(2, 50, false),
  location: createStringSchema(2, 100, false),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// VALIDATION MIDDLEWARE - Rate limiting and validation coordination
// ============================================================================

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors: string[];
  rateLimited?: boolean;
  retryAfter?: number;
}

export interface ValidationOptions {
  enableRateLimit?: boolean;
  rateLimiter?: 'login' | 'register' | 'general';
  sanitizeOutput?: boolean;
  requireAuth?: boolean;
}

/**
 * Comprehensive validation middleware that combines schema validation,
 * rate limiting, and sanitization
 */
export async function validateInput<T>(
  input: unknown,
  schema: z.ZodSchema<T>,
  options: ValidationOptions = {}
): Promise<ValidationResult<T>> {
  const errors: string[] = [];
  
  try {
    // Rate limiting check
    if (options.enableRateLimit) {
      const identifier = typeof input === 'object' && input && 'email' in input
        ? getClientIdentifier(String((input as any).email))
        : 'anonymous';
      
      let rateLimiter;
      switch (options.rateLimiter) {
        case 'login':
          rateLimiter = loginRateLimiter;
          break;
        case 'register':
          rateLimiter = registerRateLimiter;
          break;
        default:
          rateLimiter = loginRateLimiter; // Default fallback
      }
      
      if (rateLimiter.isLimited(identifier)) {
        const blockedTime = rateLimiter.getBlockedTime(identifier);
        return {
          success: false,
          errors: ['Too many requests. Please try again later.'],
          rateLimited: true,
          retryAfter: blockedTime,
        };
      }
      
      // Record attempt
      rateLimiter.recordAttempt(identifier);
    }
    
    // Schema validation
    const result = schema.safeParse(input);
    
    if (!result.success) {
      // Extract meaningful error messages
      const fieldErrors = result.error.issues.map(issue => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      });
      
      errors.push(...fieldErrors);
      
      return {
        success: false,
        errors,
      };
    }
    
    // Sanitize output if requested
    let validatedData = result.data;
    if (options.sanitizeOutput) {
      validatedData = sanitizeObject(validatedData) as T;
    }
    
    return {
      success: true,
      data: validatedData,
      errors: [],
    };
    
  } catch (error) {
    console.error('Validation middleware error:', error);
    return {
      success: false,
      errors: ['Validation failed due to an internal error'],
    };
  }
}

// ============================================================================
// SANITIZATION UTILITIES - Clean and normalize input data
// ============================================================================

/**
 * Sanitize string input by removing dangerous characters and normalizing
 */
export function sanitizeString(input: string, options: {
  allowHtml?: boolean;
  maxLength?: number;
  normalizeWhitespace?: boolean;
} = {}): string {
  let sanitized = input.trim();
  
  // Normalize whitespace if requested
  if (options.normalizeWhitespace !== false) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }
  
  // Remove HTML if not allowed
  if (!options.allowHtml) {
    // Use DOMPurify to strip all HTML tags
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: [], // No tags allowed - text only
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true // Keep text content
    });
  }
  
  // Remove null bytes and other dangerous characters
  sanitized = sanitized
    .replace(/\0/g, '') // Null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Control characters
  
  // Truncate if max length specified
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().replace(/\s+/g, '');
}

/**
 * Sanitize phone number to digits and common separators
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^0-9+\-\s()]/g, '').trim();
}

/**
 * Sanitize URL to ensure it's safe
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const sanitized = url.trim();
    const parsed = new URL(sanitized);
    
    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

// ============================================================================
// SPECIALIZED VALIDATORS - Domain-specific validation functions
// ============================================================================

/**
 * Validate payment input using existing payment validation utilities
 */
export async function validatePaymentInput(paymentData: any): Promise<ValidationResult> {
  const errors: string[] = [];
  
  // Validate amount
  const amountResult = validatePaymentAmount(paymentData.amount, paymentData.currency);
  if (!amountResult.valid) {
    errors.push(...amountResult.errors);
  }
  
  // Validate email
  const emailResult = validatePaymentEmail(paymentData.email);
  if (!emailResult.valid && emailResult.error) {
    errors.push(emailResult.error);
  }
  
  // Validate metadata
  if (paymentData.metadata) {
    const metadataResult = validatePaymentMetadata(paymentData.metadata);
    if (!metadataResult.valid) {
      errors.push(...metadataResult.errors);
    }
  }
  
  return {
    success: errors.length === 0,
    data: errors.length === 0 ? {
      amount: amountResult.sanitizedAmount,
      currency: amountResult.sanitizedCurrency,
      email: emailResult.sanitized,
      metadata: paymentData.metadata ? validatePaymentMetadata(paymentData.metadata).sanitized : undefined,
    } : undefined,
    errors,
  };
}

/**
 * Validate user registration using existing registration validators
 */
export async function validateRegistrationInput(registrationData: any): Promise<ValidationResult> {
  const errors: string[] = [];
  
  // Validate name
  const nameResult = validateName(registrationData.firstName, registrationData.lastName);
  if (!nameResult.isValid) {
    errors.push(...nameResult.errors);
  }
  
  // Validate phone if provided
  if (registrationData.phone) {
    const phoneResult = validatePhone(registrationData.phone);
    if (!phoneResult.isValid) {
      errors.push(...phoneResult.errors);
    }
  }
  
  // Use schema validation for other fields
  const schemaResult = await validateInput(registrationData, userRegistrationSchema);
  if (!schemaResult.success) {
    errors.push(...schemaResult.errors);
  }
  
  return {
    success: errors.length === 0,
    data: schemaResult.data,
    errors: Array.from(new Set(errors)), // Remove duplicates
  };
}

// ============================================================================
// EXPORT COLLECTIONS - Organized exports for easy importing
// ============================================================================

export const ValidationSchemas = {
  // Basic types
  email: emailSchema,
  phone: phoneSchema,
  name: nameSchema,
  address: addressSchema,
  city: citySchema,
  postalCode: postalCodeSchema,
  password: passwordSchema,
  url: urlSchema,
  htmlContent: htmlContentSchema,
  uuid: uuidSchema,
  positiveInt: positiveIntSchema,
  nonNegativeInt: nonNegativeIntSchema,
  
  // Complex forms
  userRegistration: userRegistrationSchema,
  userProfile: userProfileSchema,
  eventCreation: eventCreationSchema,
  payment: paymentSchema,
  contactForm: contactFormSchema,
  searchQuery: searchQuerySchema,
};

export const Sanitizers = {
  string: sanitizeString,
  email: sanitizeEmail,
  phone: sanitizePhone,
  url: sanitizeUrl,
  object: sanitizeObject,
};

export const Validators = {
  input: validateInput,
  payment: validatePaymentInput,
  registration: validateRegistrationInput,
};