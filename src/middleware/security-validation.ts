/**
 * Security Validation and Input Sanitization for Car Audio Events Platform
 * 
 * Implements comprehensive input validation, XSS protection, SQL injection prevention,
 * and data sanitization using Zod schemas with security-first principles.
 */

import { z } from 'zod';
import DOMPurify from 'dompurify';
import { auditLogger } from './audit-security';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
  securityFlags?: string[];
}

export interface SecurityContext {
  userId?: string;
  ipAddress: string;
  userAgent: string;
  operation: string;
}

/**
 * 🛡️ Base Security Validation Patterns
 */
const SecurityPatterns = {
  // XSS Detection Patterns
  XSS_PATTERNS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<link\b[^>]*>/gi,
    /<meta\b[^>]*>/gi
  ],

  // SQL Injection Detection
  SQL_INJECTION_PATTERNS: [
    /('|(\\')|(;|(\s*;\s*)))/i,
    /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i,
    /(-{2}|\/\*|\*\/)/i,
    /(0x[0-9a-f]+)/i,
    /(waitfor\s+delay)/i,
    /(benchmark\s*\()/i
  ],

  // Path Traversal Detection
  PATH_TRAVERSAL_PATTERNS: [
    /\.\.\//g,
    /\.\.\\/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /\.\.%2f/gi,
    /\.\.%5c/gi
  ],

  // Command Injection Detection
  COMMAND_INJECTION_PATTERNS: [
    /[;&|`$\(\)]/g,
    /(nc|netcat|wget|curl|bash|sh|cmd|powershell)/i,
    /\|\s*(rm|del|format|fdisk)/i
  ]
};

/**
 * 🔐 Zod Schemas for Competition Results Validation
 */
const CompetitionResultSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid({
    message: "Invalid user ID format"
  }),
  event_id: z.number({
    message: "Invalid event ID format" 
  }).optional(),
  category: z.string()
    .min(1, "Category is required")
    .max(100, "Category too long")
    .regex(/^[a-zA-Z0-9\s\-_]+$/, "Category contains invalid characters"),
  score: z.number()
    .min(0, "Score cannot be negative")
    .max(1000000, "Score too high")
    .finite("Score must be a valid number"),
  rank: z.number()
    .int("Rank must be an integer")
    .min(1, "Rank must be positive")
    .max(10000, "Rank too high"),
  notes: z.string()
    .max(2000, "Notes too long")
    .optional()
    .transform(val => val ? SecurityValidator.sanitizeText(val) : val),
  is_verified: z.boolean().default(false),
  is_public: z.boolean().default(true),
  organization_id: z.number().int().positive().optional()
});

const UserInputSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .regex(/^[a-zA-Z0-9\s\-'\.]+$/, "Name contains invalid characters")
    .transform(val => SecurityValidator.sanitizeText(val)),
  email: z.string()
    .email("Invalid email format")
    .max(255, "Email too long")
    .toLowerCase()
    .transform(val => SecurityValidator.sanitizeEmail(val)),
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone format")
    .max(20, "Phone number too long")
    .optional()
    .transform(val => val ? SecurityValidator.sanitizePhone(val) : val),
  website: z.string()
    .url("Invalid website URL")
    .max(255, "Website URL too long")
    .optional()
    .transform(val => val ? SecurityValidator.sanitizeURL(val) : val),
  bio: z.string()
    .max(1000, "Bio too long")
    .optional()
    .transform(val => val ? SecurityValidator.sanitizeText(val) : val),
  location: z.string()
    .max(100, "Location too long")
    .optional()
    .transform(val => val ? SecurityValidator.sanitizeText(val) : val)
});

const EventInputSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title too long")
    .transform(val => SecurityValidator.sanitizeText(val)),
  description: z.string()
    .max(5000, "Description too long")
    .optional()
    .transform(val => val ? SecurityValidator.sanitizeHTML(val) : val),
  location: z.string()
    .max(200, "Location too long")
    .transform(val => SecurityValidator.sanitizeText(val)),
  start_date: z.string()
    .datetime("Invalid start date format"),
  end_date: z.string()
    .datetime("Invalid end date format"),
  registration_fee: z.number()
    .min(0, "Registration fee cannot be negative")
    .max(10000, "Registration fee too high")
    .finite("Registration fee must be valid"),
  max_participants: z.number()
    .int("Max participants must be integer")
    .min(1, "Must allow at least 1 participant")
    .max(10000, "Too many participants")
    .optional(),
  contact_email: z.string()
    .email("Invalid contact email")
    .max(255, "Contact email too long")
    .transform(val => SecurityValidator.sanitizeEmail(val)),
  rules: z.string()
    .max(10000, "Rules too long")
    .optional()
    .transform(val => val ? SecurityValidator.sanitizeHTML(val) : val)
});

/**
 * 🛡️ Security Validation Engine
 */
export class SecurityValidator {
  
  /**
   * Main validation method for competition results
   */
  static async validateCompetitionResultInput(
    data: any,
    context?: SecurityContext
  ): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      // 🔍 Pre-validation security scanning
      const securityScan = await this.scanForSecurityThreats(data, context);
      if (securityScan.threats.length > 0) {
        await this.logSecurityThreat(securityScan, context);
        return {
          isValid: false,
          errors: ['Input contains potential security threats'],
          securityFlags: securityScan.threats
        };
      }

      // 📋 Schema validation with Zod
      const validationResult = CompetitionResultSchema.safeParse(data);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );

        await this.logValidationFailure('competition_result', errors, context);
        
        return {
          isValid: false,
          errors
        };
      }

      // ✅ Validation successful
      const duration = Date.now() - startTime;
      
      if (context) {
        await auditLogger.logSecurityEvent({
          eventType: 'input_validation_success',
          severity: 'info',
          userId: context.userId,
          ipAddress: context.ipAddress,
          details: {
            operation: context.operation,
            dataType: 'competition_result',
            duration: `${duration}ms`,
            fieldsValidated: Object.keys(data).length
          }
        });
      }

      return {
        isValid: true,
        errors: [],
        sanitizedData: validationResult.data,
        securityFlags: securityScan.flags
      };

    } catch (error) {
      await this.logValidationError(error, 'competition_result', context);
      return {
        isValid: false,
        errors: ['Validation system error']
      };
    }
  }

  /**
   * User input validation with enhanced security
   */
  static async validateUserInput(
    data: any,
    context?: SecurityContext
  ): Promise<ValidationResult> {
    try {
      const securityScan = await this.scanForSecurityThreats(data, context);
      if (securityScan.threats.length > 0) {
        await this.logSecurityThreat(securityScan, context);
        return {
          isValid: false,
          errors: ['Input contains potential security threats'],
          securityFlags: securityScan.threats
        };
      }

      const validationResult = UserInputSchema.safeParse(data);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );

        await this.logValidationFailure('user_input', errors, context);
        return {
          isValid: false,
          errors
        };
      }

      return {
        isValid: true,
        errors: [],
        sanitizedData: validationResult.data,
        securityFlags: securityScan.flags
      };

    } catch (error) {
      await this.logValidationError(error, 'user_input', context);
      return {
        isValid: false,
        errors: ['Validation system error']
      };
    }
  }

  /**
   * Event input validation
   */
  static async validateEventInput(
    data: any,
    context?: SecurityContext
  ): Promise<ValidationResult> {
    try {
      const securityScan = await this.scanForSecurityThreats(data, context);
      if (securityScan.threats.length > 0) {
        await this.logSecurityThreat(securityScan, context);
        return {
          isValid: false,
          errors: ['Input contains potential security threats'],
          securityFlags: securityScan.threats
        };
      }

      const validationResult = EventInputSchema.safeParse(data);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );

        await this.logValidationFailure('event_input', errors, context);
        return {
          isValid: false,
          errors
        };
      }

      // Additional business logic validation
      const businessValidation = this.validateEventBusinessRules(validationResult.data);
      if (!businessValidation.isValid) {
        return businessValidation;
      }

      return {
        isValid: true,
        errors: [],
        sanitizedData: validationResult.data,
        securityFlags: securityScan.flags
      };

    } catch (error) {
      await this.logValidationError(error, 'event_input', context);
      return {
        isValid: false,
        errors: ['Validation system error']
      };
    }
  }

  // 🧼 SANITIZATION METHODS

  /**
   * XSS-safe text sanitization
   */
  static sanitizeText(input: string): string {
    if (!input) return '';
    
    // Use DOMPurify to strip all HTML and return plain text
    const sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No tags allowed
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true // Keep text content only
    });

    return sanitized.trim();
  }

  /**
   * HTML sanitization with DOMPurify
   */
  static sanitizeHTML(input: string): string {
    if (!input) return '';

    // Configure DOMPurify for strict sanitization
    const cleanHTML = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: [],
      ALLOW_DATA_ATTR: false,
      FORBID_CONTENTS: ['script', 'style'],
      FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror']
    });

    return cleanHTML;
  }

  /**
   * Email sanitization
   */
  static sanitizeEmail(email: string): string {
    if (!email) return '';
    
    return email
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9@.\-_+]/g, ''); // Only allow valid email characters
  }

  /**
   * Phone number sanitization
   */
  static sanitizePhone(phone: string): string {
    if (!phone) return '';
    
    return phone
      .replace(/[^\d\s\-\(\)\+]/g, '') // Only allow digits, spaces, dashes, parens, plus
      .trim();
  }

  /**
   * URL sanitization
   */
  static sanitizeURL(url: string): string {
    if (!url) return '';
    
    try {
      const urlObj = new URL(url);
      
      // Only allow safe protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid protocol');
      }
      
      return urlObj.toString();
    } catch {
      return ''; // Invalid URL
    }
  }

  // 🔍 SECURITY THREAT DETECTION

  /**
   * Comprehensive security threat scanning
   */
  private static async scanForSecurityThreats(
    data: any,
    context?: SecurityContext
  ): Promise<{ threats: string[]; flags: string[] }> {
    const threats: string[] = [];
    const flags: string[] = [];
    
    const dataString = JSON.stringify(data).toLowerCase();

    // XSS Detection
    for (const pattern of SecurityPatterns.XSS_PATTERNS) {
      if (pattern.test(dataString)) {
        threats.push('potential_xss');
        break;
      }
    }

    // SQL Injection Detection
    for (const pattern of SecurityPatterns.SQL_INJECTION_PATTERNS) {
      if (pattern.test(dataString)) {
        threats.push('potential_sql_injection');
        break;
      }
    }

    // Path Traversal Detection
    for (const pattern of SecurityPatterns.PATH_TRAVERSAL_PATTERNS) {
      if (pattern.test(dataString)) {
        threats.push('potential_path_traversal');
        break;
      }
    }

    // Command Injection Detection
    for (const pattern of SecurityPatterns.COMMAND_INJECTION_PATTERNS) {
      if (pattern.test(dataString)) {
        threats.push('potential_command_injection');
        break;
      }
    }

    // Size-based attacks
    if (dataString.length > 100000) { // 100KB limit
      flags.push('large_payload');
    }

    // Suspicious patterns
    if (dataString.includes('eval(') || dataString.includes('function(')) {
      threats.push('suspicious_javascript');
    }

    return { threats, flags };
  }

  /**
   * Business rules validation for events
   */
  private static validateEventBusinessRules(data: any): ValidationResult {
    const errors: string[] = [];

    // Date validation
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    const now = new Date();

    if (startDate <= now) {
      errors.push('Event start date must be in the future');
    }

    if (endDate <= startDate) {
      errors.push('Event end date must be after start date');
    }

    // Duration validation (max 30 days)
    const durationMs = endDate.getTime() - startDate.getTime();
    const maxDurationMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    if (durationMs > maxDurationMs) {
      errors.push('Event duration cannot exceed 30 days');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 📊 LOGGING METHODS

  private static async logSecurityThreat(
    scan: { threats: string[]; flags: string[] },
    context?: SecurityContext
  ): Promise<void> {
    if (!context) return;

    await auditLogger.logSecurityEvent({
      eventType: 'security_threat_detected',
      severity: 'high',
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: {
        operation: context.operation,
        threats: scan.threats,
        flags: scan.flags,
        blocked: true
      }
    });
  }

  private static async logValidationFailure(
    inputType: string,
    errors: string[],
    context?: SecurityContext
  ): Promise<void> {
    if (!context) return;

    await auditLogger.logSecurityEvent({
      eventType: 'input_validation_failure',
      severity: 'medium',
      userId: context.userId,
      ipAddress: context.ipAddress,
      details: {
        operation: context.operation,
        inputType,
        errors,
        errorCount: errors.length
      }
    });
  }

  private static async logValidationError(
    error: any,
    inputType: string,
    context?: SecurityContext
  ): Promise<void> {
    await auditLogger.logSecurityEvent({
      eventType: 'validation_system_error',
      severity: 'high',
      userId: context?.userId,
      ipAddress: context?.ipAddress || 'unknown',
      details: {
        operation: context?.operation || 'unknown',
        inputType,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    });
  }
}

/**
 * 🔐 SQL Injection Prevention Helper
 */
export class SQLSafeValidator {
  
  /**
   * Validates and sanitizes database identifiers (table names, column names)
   */
  static validateIdentifier(identifier: string): { isValid: boolean; sanitized?: string } {
    if (!identifier || typeof identifier !== 'string') {
      return { isValid: false };
    }

    // Only allow alphanumeric characters, underscores, and hyphens
    const sanitized = identifier.replace(/[^a-zA-Z0-9_-]/g, '');
    
    // Must start with letter or underscore
    if (!/^[a-zA-Z_]/.test(sanitized)) {
      return { isValid: false };
    }

    // Length limits
    if (sanitized.length < 1 || sanitized.length > 64) {
      return { isValid: false };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Validates sort order parameters
   */
  static validateSortOrder(order: string): { isValid: boolean; sanitized?: 'ASC' | 'DESC' } {
    if (!order || typeof order !== 'string') {
      return { isValid: false };
    }

    const upperOrder = order.toUpperCase().trim();
    if (upperOrder === 'ASC' || upperOrder === 'DESC') {
      return { isValid: true, sanitized: upperOrder };
    }

    return { isValid: false };
  }

  /**
   * Validates LIMIT and OFFSET values
   */
  static validatePagination(
    limit?: number, 
    offset?: number
  ): { isValid: boolean; sanitized?: { limit: number; offset: number } } {
    
    const sanitizedLimit = Math.max(1, Math.min(limit || 50, 1000)); // 1-1000 range
    const sanitizedOffset = Math.max(0, offset || 0);

    return {
      isValid: true,
      sanitized: {
        limit: sanitizedLimit,
        offset: sanitizedOffset
      }
    };
  }
}

/**
 * 🛡️ Rate Limiting Validation for Security Operations
 */
export class SecurityRateLimiter {
  private static attempts = new Map<string, { count: number; resetTime: number }>();

  /**
   * Check if operation is within security rate limits
   */
  static checkSecurityRateLimit(
    identifier: string,
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000 // 15 minutes
  ): { allowed: boolean; retryAfter?: number } {
    
    const now = Date.now();
    const key = `security_${identifier}`;
    const attempt = this.attempts.get(key);

    if (!attempt || now > attempt.resetTime) {
      // First attempt or window expired
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true };
    }

    if (attempt.count >= maxAttempts) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((attempt.resetTime - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Increment counter
    attempt.count++;
    this.attempts.set(key, attempt);
    return { allowed: true };
  }

  /**
   * Clear rate limit for identifier (e.g., after successful operation)
   */
  static clearRateLimit(identifier: string): void {
    const key = `security_${identifier}`;
    this.attempts.delete(key);
  }
}

// Export the main validator instance
export const securityValidator = SecurityValidator;

// Export validation schemas for reuse
export const ValidationSchemas = {
  CompetitionResult: CompetitionResultSchema,
  UserInput: UserInputSchema,
  EventInput: EventInputSchema
};

// Export type definitions
export type CompetitionResultInput = z.infer<typeof CompetitionResultSchema>;
export type UserInputData = z.infer<typeof UserInputSchema>;
export type EventInputData = z.infer<typeof EventInputSchema>;