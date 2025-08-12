/**
 * IDOR Protection Utilities
 * 
 * Comprehensive utilities for preventing Insecure Direct Object Reference (IDOR) vulnerabilities
 * including UUID validation, input sanitization, and resource ID verification.
 */

import { ResourceType } from '../middleware/resource-authorization';

export interface ValidationResult {
  valid: boolean;
  sanitized?: string;
  errors: string[];
}

export interface IDORValidationOptions {
  allowNull?: boolean;
  maxLength?: number;
  customPattern?: RegExp;
  resourceType?: ResourceType;
}

/**
 * IDOR Protection Utilities Class
 * 
 * Provides comprehensive ID validation and sanitization to prevent
 * direct object reference attacks and injection attempts.
 */
export class IDORProtectionUtils {
  
  // UUID validation patterns
  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private static readonly UUID_LOOSE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // Integer validation patterns
  private static readonly INTEGER_REGEX = /^[1-9]\d*$/;
  private static readonly SAFE_INTEGER_MAX = 2147483647; // 32-bit signed integer max
  
  // Dangerous patterns to detect
  private static readonly DANGEROUS_PATTERNS = [
    /[<>]/,                    // HTML/XML injection
    /['";]/,                   // SQL injection quotes
    /[&|;`]/,                  // Command injection
    /\.\./,                    // Directory traversal
    /\0/,                      // Null bytes
    /javascript:/i,            // JavaScript protocol
    /data:/i,                  // Data URI scheme
    /vbscript:/i,              // VBScript protocol
    /file:/i,                  // File protocol
    /ftp:/i,                   // FTP protocol
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/, // Control characters
    /\${.*}/,                  // Template literal injection
    /__proto__|constructor|prototype/i,   // Prototype pollution
    /\b(union|select|insert|update|delete|drop|create|alter|exec|script)\b/i // SQL keywords
  ];
  
  // Resource type to ID type mapping
  private static readonly RESOURCE_ID_TYPES: Record<ResourceType, 'uuid' | 'integer' | 'string'> = {
    user: 'uuid',
    competition_result: 'uuid',
    payment: 'uuid',
    support_ticket: 'uuid',
    notification: 'uuid',
    registration: 'uuid',
    event: 'integer',
    advertisement: 'integer',
    organization: 'integer',
    email_template: 'integer',
    campaign: 'integer',
    backup: 'string'
  };
  
  /**
   * Comprehensive ID validation with type checking
   */
  static validateResourceId(
    id: unknown,
    resourceType: ResourceType,
    options: IDORValidationOptions = {}
  ): ValidationResult {
    const errors: string[] = [];
    
    // Handle null/undefined
    if (id === null || id === undefined) {
      if (options.allowNull) {
        return { valid: true, sanitized: '', errors: [] };
      }
      errors.push('Resource ID is required');
      return { valid: false, errors };
    }
    
    // Convert to string and validate type
    if (typeof id !== 'string' && typeof id !== 'number') {
      errors.push('Resource ID must be a string or number');
      return { valid: false, errors };
    }
    
    const stringId = String(id).trim();
    
    // Check for empty string
    if (!stringId) {
      errors.push('Resource ID cannot be empty');
      return { valid: false, errors };
    }
    
    // Check length limits
    const maxLength = options.maxLength || 100;
    if (stringId.length > maxLength) {
      errors.push(`Resource ID cannot exceed ${maxLength} characters`);
      return { valid: false, errors };
    }
    
    // Check for dangerous patterns
    const dangerousPattern = this.containsDangerousPatterns(stringId);
    if (dangerousPattern) {
      errors.push(`Resource ID contains potentially dangerous pattern: ${dangerousPattern}`);
      return { valid: false, errors };
    }
    
    // Validate based on resource type
    const expectedType = this.RESOURCE_ID_TYPES[resourceType];
    const typeValidation = this.validateIdByType(stringId, expectedType);
    
    if (!typeValidation.valid) {
      errors.push(...typeValidation.errors);
      return { valid: false, errors };
    }
    
    // Custom pattern validation
    if (options.customPattern && !options.customPattern.test(stringId)) {
      errors.push('Resource ID does not match required pattern');
      return { valid: false, errors };
    }
    
    return {
      valid: true,
      sanitized: typeValidation.sanitized || stringId,
      errors: []
    };
  }
  
  /**
   * Validate ID based on expected type
   */
  private static validateIdByType(
    id: string,
    type: 'uuid' | 'integer' | 'string'
  ): ValidationResult {
    const errors: string[] = [];
    
    switch (type) {
      case 'uuid':
        if (!this.isValidUUID(id)) {
          errors.push('Invalid UUID format - must be in format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
          return { valid: false, errors };
        }
        // Normalize UUID to lowercase
        return { valid: true, sanitized: id.toLowerCase(), errors: [] };
        
      case 'integer':
        const intValidation = this.validateInteger(id);
        if (!intValidation.valid) {
          errors.push(...intValidation.errors);
          return { valid: false, errors };
        }
        return { valid: true, sanitized: intValidation.sanitized, errors: [] };
        
      case 'string':
        // For string IDs, ensure they're alphanumeric with limited special chars
        if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
          errors.push('String ID can only contain letters, numbers, underscores, and hyphens');
          return { valid: false, errors };
        }
        return { valid: true, sanitized: id, errors: [] };
        
      default:
        errors.push(`Unknown ID type: ${type}`);
        return { valid: false, errors };
    }
  }
  
  /**
   * UUID validation with strict and loose options
   */
  static isValidUUID(uuid: string, strict: boolean = true): boolean {
    if (!uuid || typeof uuid !== 'string') {
      return false;
    }
    
    const regex = strict ? this.UUID_REGEX : this.UUID_LOOSE_REGEX;
    return regex.test(uuid.trim());
  }
  
  /**
   * Integer validation with safety checks
   */
  static validateInteger(value: unknown): ValidationResult {
    const errors: string[] = [];
    
    if (value === null || value === undefined) {
      errors.push('Integer value is required');
      return { valid: false, errors };
    }
    
    let stringValue: string;
    let numValue: number;
    
    if (typeof value === 'number') {
      if (!Number.isInteger(value)) {
        errors.push('Value must be an integer');
        return { valid: false, errors };
      }
      numValue = value;
      stringValue = value.toString();
    } else if (typeof value === 'string') {
      stringValue = value.trim();
      
      if (!this.INTEGER_REGEX.test(stringValue)) {
        errors.push('Invalid integer format - must be a positive integer');
        return { valid: false, errors };
      }
      
      numValue = parseInt(stringValue, 10);
    } else {
      errors.push('Integer must be a number or numeric string');
      return { valid: false, errors };
    }
    
    // Check for safe integer range
    if (numValue > this.SAFE_INTEGER_MAX || numValue < 1) {
      errors.push(`Integer must be between 1 and ${this.SAFE_INTEGER_MAX}`);
      return { valid: false, errors };
    }
    
    return {
      valid: true,
      sanitized: stringValue,
      errors: []
    };
  }
  
  /**
   * Check for dangerous patterns in input
   */
  static containsDangerousPatterns(input: string): string | null {
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(input)) {
        return pattern.source;
      }
    }
    return null;
  }
  
  /**
   * Sanitize and validate array of IDs
   */
  static validateIdArray(
    ids: unknown,
    resourceType: ResourceType,
    maxItems: number = 100
  ): ValidationResult {
    const errors: string[] = [];
    
    if (!Array.isArray(ids)) {
      errors.push('IDs must be provided as an array');
      return { valid: false, errors };
    }
    
    if (ids.length === 0) {
      errors.push('At least one ID must be provided');
      return { valid: false, errors };
    }
    
    if (ids.length > maxItems) {
      errors.push(`Cannot process more than ${maxItems} IDs at once`);
      return { valid: false, errors };
    }
    
    const sanitizedIds: string[] = [];
    const validationErrors: string[] = [];
    
    for (let i = 0; i < ids.length; i++) {
      const validation = this.validateResourceId(ids[i], resourceType);
      
      if (!validation.valid) {
        validationErrors.push(`ID ${i + 1}: ${validation.errors.join(', ')}`);
        continue;
      }
      
      if (validation.sanitized) {
        // Check for duplicates
        if (sanitizedIds.includes(validation.sanitized)) {
          validationErrors.push(`Duplicate ID found: ${validation.sanitized}`);
          continue;
        }
        
        sanitizedIds.push(validation.sanitized);
      }
    }
    
    if (validationErrors.length > 0) {
      return { valid: false, errors: validationErrors };
    }
    
    return {
      valid: true,
      sanitized: sanitizedIds.join(','),
      errors: []
    };
  }
  
  /**
   * Generate cryptographically secure random ID
   */
  static generateSecureId(type: 'uuid' | 'token' = 'uuid'): string {
    if (type === 'uuid') {
      return crypto.randomUUID();
    }
    
    // Generate secure random token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Create IDOR-safe query parameters
   */
  static createSafeQueryParams(params: Record<string, unknown>): Record<string, string> {
    const safeParams: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(params)) {
      // Validate parameter name
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
        console.warn(`Skipping unsafe parameter name: ${key}`);
        continue;
      }
      
      if (value === null || value === undefined) {
        continue;
      }
      
      const stringValue = String(value);
      
      // Check for dangerous patterns
      if (this.containsDangerousPatterns(stringValue)) {
        console.warn(`Skipping parameter with dangerous pattern: ${key}`);
        continue;
      }
      
      // Limit parameter length
      if (stringValue.length > 1000) {
        console.warn(`Truncating long parameter: ${key}`);
        safeParams[key] = stringValue.substring(0, 1000);
      } else {
        safeParams[key] = stringValue;
      }
    }
    
    return safeParams;
  }
  
  /**
   * Validate URL path parameters
   */
  static validatePathParams(
    url: string,
    expectedParams: { name: string; type: ResourceType }[]
  ): ValidationResult {
    const errors: string[] = [];
    const sanitizedParams: Record<string, string> = {};
    
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      for (const expectedParam of expectedParams) {
        let foundValue: string | undefined;
        
        // Look for parameter in path
        for (const part of pathParts) {
          const validation = this.validateResourceId(part, expectedParam.type);
          if (validation.valid && validation.sanitized) {
            foundValue = validation.sanitized;
            break;
          }
        }
        
        if (!foundValue) {
          errors.push(`Required parameter '${expectedParam.name}' not found in URL path`);
          continue;
        }
        
        sanitizedParams[expectedParam.name] = foundValue;
      }
      
      if (errors.length > 0) {
        return { valid: false, errors };
      }
      
      return {
        valid: true,
        sanitized: JSON.stringify(sanitizedParams),
        errors: []
      };
      
    } catch (error) {
      errors.push('Invalid URL format');
      return { valid: false, errors };
    }
  }
  
  /**
   * Create audit-safe log entry for ID validation failures
   */
  static createValidationAuditLog(
    validation: ValidationResult,
    context: {
      userId?: string;
      ipAddress?: string;
      resourceType: ResourceType;
      operation: string;
    }
  ): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      event: 'id_validation_failure',
      severity: validation.errors.some(error => 
        error.includes('dangerous') || 
        error.includes('injection') ||
        error.includes('suspicious')
      ) ? 'high' : 'medium',
      userId: context.userId || 'anonymous',
      ipAddress: context.ipAddress || 'unknown',
      resourceType: context.resourceType,
      operation: context.operation,
      errors: validation.errors,
      timestamp_ms: Date.now()
    };
  }
}

/**
 * Convenience functions for common validation scenarios
 */
export const IdValidators = {
  
  /**
   * Validate user ID
   */
  user: (id: unknown): ValidationResult => 
    IDORProtectionUtils.validateResourceId(id, 'user'),
  
  /**
   * Validate event ID
   */
  event: (id: unknown): ValidationResult => 
    IDORProtectionUtils.validateResourceId(id, 'event'),
  
  /**
   * Validate competition result ID
   */
  competitionResult: (id: unknown): ValidationResult => 
    IDORProtectionUtils.validateResourceId(id, 'competition_result'),
  
  /**
   * Validate payment ID
   */
  payment: (id: unknown): ValidationResult => 
    IDORProtectionUtils.validateResourceId(id, 'payment'),
  
  /**
   * Validate support ticket ID
   */
  supportTicket: (id: unknown): ValidationResult => 
    IDORProtectionUtils.validateResourceId(id, 'support_ticket'),
  
  /**
   * Validate advertisement ID
   */
  advertisement: (id: unknown): ValidationResult => 
    IDORProtectionUtils.validateResourceId(id, 'advertisement'),
  
  /**
   * Validate organization ID
   */
  organization: (id: unknown): ValidationResult => 
    IDORProtectionUtils.validateResourceId(id, 'organization'),
  
  /**
   * Validate registration ID
   */
  registration: (id: unknown): ValidationResult => 
    IDORProtectionUtils.validateResourceId(id, 'registration'),
  
  /**
   * Validate notification ID
   */
  notification: (id: unknown): ValidationResult => 
    IDORProtectionUtils.validateResourceId(id, 'notification'),
  
  /**
   * Validate email template ID
   */
  emailTemplate: (id: unknown): ValidationResult => 
    IDORProtectionUtils.validateResourceId(id, 'email_template'),
  
  /**
   * Validate campaign ID
   */
  campaign: (id: unknown): ValidationResult => 
    IDORProtectionUtils.validateResourceId(id, 'campaign')
};

/**
 * TypeScript type guards for runtime type checking
 */
export const TypeGuards = {
  
  /**
   * Check if value is a valid UUID
   */
  isUUID: (value: unknown): value is string => {
    return typeof value === 'string' && IDORProtectionUtils.isValidUUID(value);
  },
  
  /**
   * Check if value is a valid integer ID
   */
  isIntegerId: (value: unknown): value is string => {
    const validation = IDORProtectionUtils.validateInteger(value);
    return validation.valid;
  },
  
  /**
   * Check if value is a safe string ID
   */
  isSafeStringId: (value: unknown): value is string => {
    return typeof value === 'string' && 
           value.length > 0 && 
           value.length <= 100 &&
           /^[a-zA-Z0-9_-]+$/.test(value) &&
           !IDORProtectionUtils.containsDangerousPatterns(value);
  },
  
  /**
   * Check if array contains valid IDs
   */
  isValidIdArray: (value: unknown, resourceType: ResourceType): value is string[] => {
    if (!Array.isArray(value)) return false;
    
    return value.every(item => {
      const validation = IDORProtectionUtils.validateResourceId(item, resourceType);
      return validation.valid;
    });
  }
};

/**
 * Error classes for IDOR protection
 */
export class IDORValidationError extends Error {
  public readonly code: string;
  public readonly details: ValidationResult;
  
  constructor(message: string, details: ValidationResult, code: string = 'IDOR_VALIDATION_ERROR') {
    super(message);
    this.name = 'IDORValidationError';
    this.code = code;
    this.details = details;
  }
}

export class IDORAccessDeniedError extends Error {
  public readonly code: string;
  public readonly resourceType: ResourceType;
  public readonly resourceId: string;
  public readonly userId?: string;
  
  constructor(
    message: string,
    resourceType: ResourceType,
    resourceId: string,
    userId?: string,
    code: string = 'IDOR_ACCESS_DENIED'
  ) {
    super(message);
    this.name = 'IDORAccessDeniedError';
    this.code = code;
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    this.userId = userId;
  }
}