/**
 * Integration tests for validation framework
 * Tests the interaction between validation, rate limiting, and error handling
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ValidationSchemas, Validators } from '../input-validation';
import { handleError, handleValidationError, SecureErrorHandler } from '../secure-error-handler';

// Mock implementations for testing
const mockRateLimiter = {
  isLimited: jest.fn(() => false),
  recordAttempt: jest.fn(),
  getBlockedTime: jest.fn(() => 0),
  clear: jest.fn(),
};

// Mock client identifier function
jest.mock('../rateLimiter', () => ({
  ...jest.requireActual('../rateLimiter'),
  loginRateLimiter: mockRateLimiter,
  registerRateLimiter: mockRateLimiter,
  getClientIdentifier: jest.fn(() => 'test-client'),
}));

describe('Validation Framework Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Validation', () => {
    it('should validate correct email', async () => {
      const result = await Validators.input('admin@caraudioevents.com', ValidationSchemas.email);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('admin@caraudioevents.com');
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email formats', async () => {
      const testCases = [
        'invalid-email',
        'user@',
        '@domain.com',
        'user..name@domain.com',
        '.user@domain.com',
        'user@domain',
      ];

      for (const email of testCases) {
        const result = await Validators.input(email, ValidationSchemas.email);
        
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.data).toBeUndefined();
      }
    });

    it('should sanitize email input', async () => {
      const result = await Validators.input('  ADMIN@CARAUDIOEVENTS.COM  ', ValidationSchemas.email);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('admin@caraudioevents.com'); // Lowercase and trimmed
    });
  });

  describe('User Registration Validation', () => {
    const validRegistrationData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'admin@caraudioevents.com',
      password: 'SecurePass123!',
      acceptTerms: true,
    };

    it('should validate complete registration data', async () => {
      const result = await Validators.registration(validRegistrationData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should reject registration with missing required fields', async () => {
      const invalidData = {
        firstName: 'John',
        // Missing lastName, email, password
        acceptTerms: true,
      };

      const result = await Validators.registration(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'short',           // Too short
        'onlylowercase',   // No uppercase
        'ONLYUPPERCASE',   // No lowercase  
        'NoNumbers!',      // No numbers
        'NoSpecial123',    // No special characters
      ];

      for (const password of weakPasswords) {
        const data = { ...validRegistrationData, password };
        const result = await Validators.registration(data);
        
        expect(result.success).toBe(false);
        expect(result.errors.some(error => error.toLowerCase().includes('password'))).toBe(true);
      }
    });

    it('should reject fake/test names', async () => {
      const fakeNameCombinations = [
        { firstName: 'Test', lastName: 'User' },
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Foo', lastName: 'Bar' },
      ];

      for (const names of fakeNameCombinations) {
        const data = { ...validRegistrationData, ...names };
        const result = await Validators.registration(data);
        
        expect(result.success).toBe(false);
        expect(result.errors.some(error => error.toLowerCase().includes('real name'))).toBe(true);
      }
    });
  });

  describe('Payment Validation', () => {
    const validPaymentData = {
      amount: 2500,
      currency: 'usd' as const,
      email: 'admin@caraudioevents.com',
      metadata: {
        eventId: '12345',
        eventName: 'Car Audio Championship',
      },
    };

    it('should validate correct payment data', async () => {
      const result = await Validators.payment(validPaymentData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.amount).toBe(2500);
      expect(result.data!.currency).toBe('usd');
    });

    it('should reject payments with invalid amounts', async () => {
      const invalidAmounts = [0, -100, 999999999]; // Zero, negative, too large

      for (const amount of invalidAmounts) {
        const data = { ...validPaymentData, amount };
        const result = await Validators.payment(data);
        
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should reject unsupported currencies', async () => {
      const data = { ...validPaymentData, currency: 'xxx' as any };
      const result = await Validators.payment(data);
      
      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.toLowerCase().includes('currency'))).toBe(true);
    });

    it('should sanitize metadata', async () => {
      const dataWithDangerousMetadata = {
        ...validPaymentData,
        metadata: {
          normalField: 'safe value',
          xssAttempt: '<script>alert("xss")</script>',
          sqlInjection: "'; DROP TABLE users; --",
          longField: 'x'.repeat(1000), // Very long value
        },
      };

      const result = await Validators.payment(dataWithDangerousMetadata);
      
      expect(result.success).toBe(true);
      expect(result.data!.metadata).toBeDefined();
      
      // Check that dangerous content is sanitized
      const metadata = result.data!.metadata!;
      expect(metadata.xssAttempt).not.toContain('<script>');
      expect(metadata.sqlInjection).not.toContain('DROP TABLE');
      expect(metadata.longField.length).toBeLessThanOrEqual(500); // Truncated
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should respect rate limiting when enabled', async () => {
      mockRateLimiter.isLimited.mockReturnValue(true);
      mockRateLimiter.getBlockedTime.mockReturnValue(300); // 5 minutes

      const result = await Validators.input('admin@caraudioevents.com', ValidationSchemas.email, {
        enableRateLimit: true,
        rateLimiter: 'login',
      });

      expect(result.success).toBe(false);
      expect(result.rateLimited).toBe(true);
      expect(result.retryAfter).toBe(300);
      expect(result.errors).toContain('Too many requests. Please try again later.');
    });

    it('should record attempts when rate limiting is enabled', async () => {
      mockRateLimiter.isLimited.mockReturnValue(false);

      await Validators.input('admin@caraudioevents.com', ValidationSchemas.email, {
        enableRateLimit: true,
        rateLimiter: 'login',
      });

      expect(mockRateLimiter.recordAttempt).toHaveBeenCalledWith('test-client');
    });
  });

  describe('Error Handling Integration', () => {
    it('should create user-friendly error from validation failures', () => {
      const validationErrors = [
        'email: Invalid email format',
        'password: Password too weak',
        'firstName: Name too short',
      ];

      const secureError = handleValidationError(validationErrors);

      expect(secureError.code).toBe('VAL_001');
      expect(secureError.userMessage).toContain('correct the following errors');
      expect(secureError.details?.validationErrors).toEqual([
        'email: Invalid email format',
        'password: Password too weak',
        'firstName: Name too short',
      ]);
      expect(secureError.isRetryable).toBe(true);
    });

    it('should sanitize error messages to prevent information disclosure', () => {
      const dangerousError = new Error('Database connection failed: postgres://user:pass@localhost:5432/db');
      
      const secureError = handleError(dangerousError, {
        userId: '123',
        endpoint: '/api/test',
      });

      expect(secureError.userMessage).not.toContain('postgres://');
      expect(secureError.userMessage).not.toContain('user:pass');
      expect(secureError.userMessage).not.toContain('localhost:5432');
      expect(secureError.userMessage).toBe('We are experiencing technical difficulties. Please try again shortly.');
    });

    it('should generate unique error IDs for tracking', () => {
      const error1 = handleError('Test error 1');
      const error2 = handleError('Test error 2');

      expect(error1.details?.errorId).toBeDefined();
      expect(error2.details?.errorId).toBeDefined();
      expect(error1.details?.errorId).not.toBe(error2.details?.errorId);
    });

    it('should classify error severity correctly', () => {
      const errorHandler = SecureErrorHandler.getInstance();
      
      // Simulate different types of errors
      const authError = handleError('Unauthorized access', {}, 'AUTH_INVALID_CREDENTIALS');
      const paymentError = handleError('Payment failed', {}, 'PAYMENT_FAILED');
      const systemError = handleError('Internal server error', {}, 'INTERNAL_SERVER_ERROR');

      expect(authError.httpStatus).toBe(401);
      expect(paymentError.httpStatus).toBe(402);
      expect(systemError.httpStatus).toBe(500);
    });
  });

  describe('Security Features', () => {
    it('should prevent XSS in string inputs', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      const result = await Validators.input(xssPayload, ValidationSchemas.name);

      // Should either reject the input or sanitize it
      if (result.success) {
        expect(result.data).not.toContain('<script>');
      } else {
        expect(result.success).toBe(false);
      }
    });

    it('should prevent SQL injection in string inputs', async () => {
      const sqlPayload = "'; DROP TABLE users; --";
      const result = await Validators.input(sqlPayload, ValidationSchemas.name);

      // Should either reject the input or sanitize it
      if (result.success) {
        expect(result.data).not.toContain('DROP TABLE');
      } else {
        expect(result.success).toBe(false);
      }
    });

    it('should limit input lengths to prevent buffer overflow', async () => {
      const veryLongString = 'x'.repeat(10000);
      const result = await Validators.input(veryLongString, ValidationSchemas.name);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.toLowerCase().includes('exceed'))).toBe(true);
    });
  });

  describe('Performance and Caching', () => {
    it('should handle validation of multiple inputs efficiently', async () => {
      const emails = Array.from({ length: 100 }, (_, i) => `user${i}@caraudioevents.com`);
      const startTime = Date.now();

      const results = await Promise.all(
        emails.map(email => Validators.input(email, ValidationSchemas.email))
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // All validations should succeed
      expect(results.every(result => result.success)).toBe(true);
      
      // Should complete in reasonable time (less than 1 second for 100 validations)
      expect(duration).toBeLessThan(1000);
    });
  });
});

// Helper function to run integration tests with real data
export async function runIntegrationTests() {
  console.log('🧪 Running validation framework integration tests...');
  
  // Test real email validation
  const emailTests = [
    { email: 'admin@caraudioevents.com', shouldPass: true },
    { email: 'ironmaidenmen@gmail.com', shouldPass: true },
    { email: 'invalid-email', shouldPass: false },
    { email: '', shouldPass: false },
  ];
  
  for (const test of emailTests) {
    const result = await Validators.input(test.email, ValidationSchemas.email);
    console.log(`  📧 Email "${test.email}": ${result.success ? '✅' : '❌'} (expected: ${test.shouldPass ? '✅' : '❌'})`);
  }
  
  // Test payment validation
  const paymentTest = {
    amount: 2500,
    currency: 'usd' as const,
    email: 'admin@caraudioevents.com',
  };
  
  const paymentResult = await Validators.payment(paymentTest);
  console.log(`  💳 Payment validation: ${paymentResult.success ? '✅' : '❌'}`);
  
  // Test error handling
  const testError = handleError('Test database connection failed', {
    userId: 'test-user',
    endpoint: '/api/test',
  });
  
  console.log(`  🛡️  Error sanitization: ${testError.userMessage.includes('database') ? '❌' : '✅'}`);
  
  console.log('✅ Integration tests completed!');
  
  return {
    emailValidation: emailTests.every(test => 
      (Validators.input(test.email, ValidationSchemas.email).then(r => r.success)) === test.shouldPass
    ),
    paymentValidation: paymentResult.success,
    errorHandling: !testError.userMessage.includes('database'),
  };
}