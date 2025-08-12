/**
 * IDOR Protection Test Suite
 * 
 * Comprehensive tests for Insecure Direct Object Reference protection
 * across the Car Audio Events platform.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { 
  ResourceAuthorizationMiddleware,
  type ResourceIdentifier,
  type ResourceAuthContext
} from '../middleware/resource-authorization';
import { 
  IDORProtectionUtils, 
  IdValidators, 
  IDORValidationError,
  IDORAccessDeniedError,
  TypeGuards
} from '../utils/idorProtection';
import { ProtectedAPIService } from '../api/protected-api-service';
import type { AuthenticatedUser } from '../middleware/auth-middleware';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockData, error: null }))
        }))
      }))
    }))
  }
}));

// Mock audit logger
jest.mock('../middleware/audit-security', () => ({
  auditLogger: {
    logSecurityEvent: jest.fn(),
    logAccessEvent: jest.fn()
  }
}));

let mockData: any = {};

// Test fixtures
const mockUsers = {
  regularUser: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    membershipType: 'competitor',
    status: 'active',
    verificationStatus: 'verified',
    permissions: ['view_events', 'register_events', 'view_results', 'create_results']
  } as AuthenticatedUser,
  
  adminUser: {
    id: '660f9511-f3ac-52e5-b827-557766551111',
    email: 'admin@example.com',
    membershipType: 'admin',
    status: 'active',
    verificationStatus: 'verified',
    permissions: ['*']
  } as AuthenticatedUser,
  
  organizationUser: {
    id: '770f9511-f3ac-52e5-b827-557766552222',
    email: 'org@example.com',
    membershipType: 'organization',
    organizationId: 12345,
    status: 'active',
    verificationStatus: 'verified',
    permissions: ['view_events', 'create_events', 'manage_organization']
  } as AuthenticatedUser
};

const createMockContext = (user: AuthenticatedUser, operation: 'read' | 'create' | 'update' | 'delete' = 'read'): ResourceAuthContext => ({
  user,
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent',
  operation,
  timestamp: new Date()
});

describe('IDOR Protection Utils', () => {
  describe('UUID Validation', () => {
    test('should validate correct UUID format', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const result = IDORProtectionUtils.isValidUUID(validUUID);
      expect(result).toBe(true);
    });
    
    test('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '550e8400-e29b-41d4-a716', // too short
        '550e8400-e29b-41d4-a716-446655440000-extra', // too long
        '550e8400_e29b_41d4_a716_446655440000', // wrong separators
        null,
        undefined,
        123,
        ''
      ];
      
      invalidUUIDs.forEach(uuid => {
        expect(IDORProtectionUtils.isValidUUID(uuid as any)).toBe(false);
      });
    });
    
    test('should validate UUIDs with case insensitivity', () => {
      const upperUUID = '550E8400-E29B-41D4-A716-446655440000';
      const lowerUUID = '550e8400-e29b-41d4-a716-446655440000';
      
      expect(IDORProtectionUtils.isValidUUID(upperUUID)).toBe(true);
      expect(IDORProtectionUtils.isValidUUID(lowerUUID)).toBe(true);
    });
  });
  
  describe('Integer Validation', () => {
    test('should validate positive integers', () => {
      const validIntegers = [1, 123, 999999];
      
      validIntegers.forEach(int => {
        const result = IDORProtectionUtils.validateInteger(int);
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe(int.toString());
      });
    });
    
    test('should reject invalid integers', () => {
      const invalidIntegers = [
        0,           // not positive
        -1,          // negative
        1.5,         // decimal
        'abc',       // non-numeric
        '',          // empty
        null,        // null
        undefined,   // undefined
        2147483648   // exceeds safe integer
      ];
      
      invalidIntegers.forEach(int => {
        const result = IDORProtectionUtils.validateInteger(int);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
    
    test('should handle string representations of integers', () => {
      const stringIntegers = ['1', '123', '999999'];
      
      stringIntegers.forEach(str => {
        const result = IDORProtectionUtils.validateInteger(str);
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe(str);
      });
    });
  });
  
  describe('Dangerous Pattern Detection', () => {
    test('should detect SQL injection patterns', () => {
      const sqlInjections = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "UNION SELECT * FROM passwords"
      ];
      
      sqlInjections.forEach(injection => {
        const result = IDORProtectionUtils.containsDangerousPatterns(injection);
        expect(result).toBeTruthy();
      });
    });
    
    test('should detect XSS patterns', () => {
      const xssAttacks = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<img src="x" onerror="alert(1)">'
      ];
      
      xssAttacks.forEach(xss => {
        const result = IDORProtectionUtils.containsDangerousPatterns(xss);
        expect(result).toBeTruthy();
      });
    });
    
    test('should detect path traversal patterns', () => {
      const pathTraversals = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '....//....//etc/passwd'
      ];
      
      pathTraversals.forEach(path => {
        const result = IDORProtectionUtils.containsDangerousPatterns(path);
        expect(result).toBeTruthy();
      });
    });
    
    test('should allow safe strings', () => {
      const safeStrings = [
        '550e8400-e29b-41d4-a716-446655440000',
        'user@example.com',
        'My Event Title',
        'Category: SPL Competition'
      ];
      
      safeStrings.forEach(safe => {
        const result = IDORProtectionUtils.containsDangerousPatterns(safe);
        expect(result).toBeFalsy();
      });
    });
  });
  
  describe('Resource ID Validation', () => {
    test('should validate user IDs (UUIDs)', () => {
      const validUserId = '550e8400-e29b-41d4-a716-446655440000';
      const result = IDORProtectionUtils.validateResourceId(validUserId, 'user');
      
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe(validUserId.toLowerCase());
      expect(result.errors).toHaveLength(0);
    });
    
    test('should validate event IDs (integers)', () => {
      const validEventId = '12345';
      const result = IDORProtectionUtils.validateResourceId(validEventId, 'event');
      
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('12345');
      expect(result.errors).toHaveLength(0);
    });
    
    test('should reject mismatched ID types', () => {
      // Try to use UUID for integer resource
      const uuidForEvent = '550e8400-e29b-41d4-a716-446655440000';
      const result = IDORProtectionUtils.validateResourceId(uuidForEvent, 'event');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
  
  describe('ID Array Validation', () => {
    test('should validate arrays of valid IDs', () => {
      const validUserIds = [
        '550e8400-e29b-41d4-a716-446655440000',
        '660f9511-f3ac-52e5-b827-557766551111',
        '770f9511-f3ac-52e5-b827-557766552222'
      ];
      
      const result = IDORProtectionUtils.validateIdArray(validUserIds, 'user');
      
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeTruthy();
      expect(result.errors).toHaveLength(0);
    });
    
    test('should reject arrays with invalid IDs', () => {
      const mixedIds = [
        '550e8400-e29b-41d4-a716-446655440000', // valid
        'invalid-id',                            // invalid
        '770f9511-f3ac-52e5-b827-557766552222'  // valid
      ];
      
      const result = IDORProtectionUtils.validateIdArray(mixedIds, 'user');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    test('should reject arrays exceeding size limit', () => {
      const largeArray = new Array(101).fill('550e8400-e29b-41d4-a716-446655440000');
      
      const result = IDORProtectionUtils.validateIdArray(largeArray, 'user', 100);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cannot process more than 100 IDs at once');
    });
    
    test('should detect duplicate IDs', () => {
      const duplicateIds = [
        '550e8400-e29b-41d4-a716-446655440000',
        '660f9511-f3ac-52e5-b827-557766551111',
        '550e8400-e29b-41d4-a716-446655440000' // duplicate
      ];
      
      const result = IDORProtectionUtils.validateIdArray(duplicateIds, 'user');
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Duplicate ID'))).toBe(true);
    });
  });
});

describe('Resource Authorization Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockData = {};
  });
  
  describe('User Resource Authorization', () => {
    test('should allow users to access their own profile', async () => {
      const user = mockUsers.regularUser;
      const resource: ResourceIdentifier = { type: 'user', id: user.id };
      const context = createMockContext(user, 'read');
      
      // Mock user exists
      mockData = { id: user.id, membership_type: 'competitor', status: 'active' };
      
      const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
      
      expect(result.allowed).toBe(true);
      expect(result.restrictions).toContain('own_profile');
    });
    
    test('should deny users access to other users\' profiles', async () => {
      const user = mockUsers.regularUser;
      const otherUserId = '660f9511-f3ac-52e5-b827-557766551111';
      const resource: ResourceIdentifier = { type: 'user', id: otherUserId };
      const context = createMockContext(user, 'read');
      
      // Mock other user exists
      mockData = { id: otherUserId, membership_type: 'competitor', status: 'active' };
      
      const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cannot access other users');
    });
    
    test('should allow admins to access any user profile', async () => {
      const admin = mockUsers.adminUser;
      const otherUserId = '770f9511-f3ac-52e5-b827-557766552222';
      const resource: ResourceIdentifier = { type: 'user', id: otherUserId };
      const context = createMockContext(admin, 'read');
      
      // Mock other user exists
      mockData = { id: otherUserId, membership_type: 'competitor', status: 'active' };
      
      const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
      
      expect(result.allowed).toBe(true);
      expect(result.restrictions).toContain('admin_bypass');
    });
  });
  
  describe('Competition Result Authorization', () => {
    test('should allow users to access their own results', async () => {
      const user = mockUsers.regularUser;
      const resultId = '880f9511-f3ac-52e5-b827-557766553333';
      const resource: ResourceIdentifier = { type: 'competition_result', id: resultId };
      const context = createMockContext(user, 'read');
      
      // Mock result belongs to user
      mockData = { 
        id: resultId, 
        user_id: user.id, 
        event_id: 12345, 
        verified: true 
      };
      
      const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
      
      expect(result.allowed).toBe(true);
      expect(result.restrictions).toContain('own_result');
    });
    
    test('should prevent users from deleting verified results', async () => {
      const user = mockUsers.regularUser;
      const resultId = '880f9511-f3ac-52e5-b827-557766553333';
      const resource: ResourceIdentifier = { type: 'competition_result', id: resultId };
      const context = createMockContext(user, 'delete');
      
      // Mock verified result belongs to user
      mockData = { 
        id: resultId, 
        user_id: user.id, 
        event_id: 12345, 
        verified: true 
      };
      
      const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cannot delete verified results');
    });
    
    test('should allow users to delete unverified results', async () => {
      const user = mockUsers.regularUser;
      const resultId = '880f9511-f3ac-52e5-b827-557766553333';
      const resource: ResourceIdentifier = { type: 'competition_result', id: resultId };
      const context = createMockContext(user, 'delete');
      
      // Mock unverified result belongs to user
      mockData = { 
        id: resultId, 
        user_id: user.id, 
        event_id: 12345, 
        verified: false 
      };
      
      const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
      
      expect(result.allowed).toBe(true);
      expect(result.restrictions).toContain('own_result');
    });
  });
  
  describe('Event Authorization', () => {
    test('should allow anyone to read public events', async () => {
      const user = mockUsers.regularUser;
      const eventId = '12345';
      const resource: ResourceIdentifier = { type: 'event', id: eventId };
      const context = createMockContext(user, 'read');
      
      // Mock public event
      mockData = { 
        id: 12345, 
        organizer_id: 'another-user-id', 
        status: 'published', 
        is_public: true 
      };
      
      const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
      
      expect(result.allowed).toBe(true);
      expect(result.restrictions).toContain('public_read_only');
    });
    
    test('should allow event organizers to manage their events', async () => {
      const user = mockUsers.regularUser;
      const eventId = '12345';
      const resource: ResourceIdentifier = { type: 'event', id: eventId };
      const context = createMockContext(user, 'update');
      
      // Mock event owned by user
      mockData = { 
        id: 12345, 
        organizer_id: user.id, 
        status: 'published', 
        is_public: true 
      };
      
      const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
      
      expect(result.allowed).toBe(true);
      expect(result.restrictions).toContain('event_owner');
    });
    
    test('should deny access to private events for non-owners', async () => {
      const user = mockUsers.regularUser;
      const eventId = '12345';
      const resource: ResourceIdentifier = { type: 'event', id: eventId };
      const context = createMockContext(user, 'read');
      
      // Mock private event owned by someone else
      mockData = { 
        id: 12345, 
        organizer_id: 'another-user-id', 
        status: 'draft', 
        is_public: false 
      };
      
      const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Insufficient permissions');
    });
  });
  
  describe('Payment Authorization', () => {
    test('should allow users to access their own payments', async () => {
      const user = mockUsers.regularUser;
      const paymentId = '990f9511-f3ac-52e5-b827-557766554444';
      const resource: ResourceIdentifier = { type: 'payment', id: paymentId };
      const context = createMockContext(user, 'read');
      
      // Mock payment belongs to user
      mockData = { 
        id: paymentId, 
        user_id: user.id, 
        amount: 5000, 
        status: 'completed' 
      };
      
      const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
      
      expect(result.allowed).toBe(true);
      expect(result.restrictions).toContain('own_payment');
    });
    
    test('should deny users access to other users\' payments', async () => {
      const user = mockUsers.regularUser;
      const paymentId = '990f9511-f3ac-52e5-b827-557766554444';
      const resource: ResourceIdentifier = { type: 'payment', id: paymentId };
      const context = createMockContext(user, 'read');
      
      // Mock payment belongs to another user
      mockData = { 
        id: paymentId, 
        user_id: 'another-user-id', 
        amount: 5000, 
        status: 'completed' 
      };
      
      const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cannot access other users\' payment information');
    });
    
    test('should prevent modification of completed payments', async () => {
      const user = mockUsers.regularUser;
      const paymentId = '990f9511-f3ac-52e5-b827-557766554444';
      const resource: ResourceIdentifier = { type: 'payment', id: paymentId };
      const context = createMockContext(user, 'update');
      
      // Mock completed payment belongs to user
      mockData = { 
        id: paymentId, 
        user_id: user.id, 
        amount: 5000, 
        status: 'completed' 
      };
      
      const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cannot modify completed or refunded payments');
    });
  });
  
  describe('Input Validation', () => {
    test('should reject malformed resource identifiers', async () => {
      const user = mockUsers.regularUser;
      const invalidResource: ResourceIdentifier = { type: 'user', id: 'invalid-uuid' };
      const context = createMockContext(user, 'read');
      
      const result = await ResourceAuthorizationMiddleware.authorize(invalidResource, context);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Invalid resource format');
    });
    
    test('should reject suspicious resource IDs', async () => {
      const user = mockUsers.regularUser;
      const maliciousResource: ResourceIdentifier = { 
        type: 'user', 
        id: '550e8400-e29b-41d4-a716\'; DROP TABLE users; --' 
      };
      const context = createMockContext(user, 'read');
      
      const result = await ResourceAuthorizationMiddleware.authorize(maliciousResource, context);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Invalid resource format');
    });
    
    test('should handle non-existent resources gracefully', async () => {
      const user = mockUsers.regularUser;
      const resource: ResourceIdentifier = { 
        type: 'user', 
        id: '550e8400-e29b-41d4-a716-446655440000' 
      };
      const context = createMockContext(user, 'read');
      
      // Mock resource doesn't exist
      mockData = null;
      
      const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Resource not found');
    });
  });
  
  describe('Rate Limiting', () => {
    test('should enforce rate limits on authorization checks', async () => {
      const user = mockUsers.regularUser;
      const resource: ResourceIdentifier = { type: 'user', id: user.id };
      const context = createMockContext(user, 'read');
      
      mockData = { id: user.id, membership_type: 'competitor', status: 'active' };
      
      // Simulate many rapid requests
      const requests = Array(200).fill(null).map(() => 
        ResourceAuthorizationMiddleware.authorize(resource, context)
      );
      
      const results = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimited = results.filter(r => !r.allowed && r.reason?.includes('Rate limit'));
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});

describe('Type Guards', () => {
  test('should correctly identify UUIDs', () => {
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';
    const invalidId = 'not-a-uuid';
    
    expect(TypeGuards.isUUID(validUUID)).toBe(true);
    expect(TypeGuards.isUUID(invalidId)).toBe(false);
    expect(TypeGuards.isUUID(null)).toBe(false);
    expect(TypeGuards.isUUID(123)).toBe(false);
  });
  
  test('should correctly identify integer IDs', () => {
    expect(TypeGuards.isIntegerId('123')).toBe(true);
    expect(TypeGuards.isIntegerId('0')).toBe(false); // not positive
    expect(TypeGuards.isIntegerId('-1')).toBe(false); // negative
    expect(TypeGuards.isIntegerId('1.5')).toBe(false); // decimal
    expect(TypeGuards.isIntegerId('abc')).toBe(false); // not numeric
  });
  
  test('should correctly identify safe string IDs', () => {
    expect(TypeGuards.isSafeStringId('valid-string-id')).toBe(true);
    expect(TypeGuards.isSafeStringId('string_with_underscore')).toBe(true);
    expect(TypeGuards.isSafeStringId('')).toBe(false); // empty
    expect(TypeGuards.isSafeStringId('string with spaces')).toBe(false); // spaces
    expect(TypeGuards.isSafeStringId('string<script>')).toBe(false); // dangerous
  });
});

describe('Error Classes', () => {
  test('should create IDORValidationError correctly', () => {
    const validationResult = { 
      valid: false, 
      errors: ['Invalid UUID format'] 
    };
    
    const error = new IDORValidationError(
      'Validation failed', 
      validationResult,
      'TEST_ERROR'
    );
    
    expect(error.name).toBe('IDORValidationError');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.details).toEqual(validationResult);
    expect(error.message).toBe('Validation failed');
  });
  
  test('should create IDORAccessDeniedError correctly', () => {
    const error = new IDORAccessDeniedError(
      'Access denied',
      'user',
      'user-123',
      'current-user-id',
      'ACCESS_ERROR'
    );
    
    expect(error.name).toBe('IDORAccessDeniedError');
    expect(error.code).toBe('ACCESS_ERROR');
    expect(error.resourceType).toBe('user');
    expect(error.resourceId).toBe('user-123');
    expect(error.userId).toBe('current-user-id');
  });
});

describe('Integration Tests', () => {
  describe('ProtectedAPIService', () => {
    const createAPIContext = (user: AuthenticatedUser) => ({
      user,
      ipAddress: '127.0.0.1',
      userAgent: 'test-client',
      requestId: 'test-request',
      timestamp: new Date()
    });
    
    test('should handle valid user profile request', async () => {
      const user = mockUsers.regularUser;
      const context = createAPIContext(user);
      
      mockData = {
        id: user.id,
        email: user.email,
        membership_type: user.membershipType,
        status: user.status
      };
      
      const result = await ProtectedAPIService.getUserProfile(user.id, context);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(user.id);
      expect(result.auditId).toBeTruthy();
    });
    
    test('should reject invalid user ID format', async () => {
      const user = mockUsers.regularUser;
      const context = createAPIContext(user);
      const invalidId = 'invalid-user-id';
      
      const result = await ProtectedAPIService.getUserProfile(invalidId, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_USER_ID');
    });
    
    test('should handle access denied scenarios', async () => {
      const user = mockUsers.regularUser;
      const context = createAPIContext(user);
      const otherUserId = '660f9511-f3ac-52e5-b827-557766551111';
      
      mockData = {
        id: otherUserId,
        email: 'other@example.com',
        membership_type: 'competitor',
        status: 'active'
      };
      
      const result = await ProtectedAPIService.getUserProfile(otherUserId, context);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ACCESS_DENIED');
    });
  });
});

describe('Performance Tests', () => {
  test('should complete authorization check within acceptable time', async () => {
    const user = mockUsers.regularUser;
    const resource: ResourceIdentifier = { type: 'user', id: user.id };
    const context = createMockContext(user, 'read');
    
    mockData = { id: user.id, membership_type: 'competitor', status: 'active' };
    
    const startTime = Date.now();
    const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
    const endTime = Date.now();
    
    expect(result.allowed).toBe(true);
    expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
  });
  
  test('should handle concurrent authorization requests', async () => {
    const user = mockUsers.regularUser;
    const resource: ResourceIdentifier = { type: 'user', id: user.id };
    const context = createMockContext(user, 'read');
    
    mockData = { id: user.id, membership_type: 'competitor', status: 'active' };
    
    // Run 50 concurrent authorization checks
    const concurrentRequests = Array(50).fill(null).map(() => 
      ResourceAuthorizationMiddleware.authorize(resource, context)
    );
    
    const results = await Promise.all(concurrentRequests);
    
    // All should succeed (within rate limits)
    const successful = results.filter(r => r.allowed);
    expect(successful.length).toBeGreaterThan(0);
  });
});

describe('Security Edge Cases', () => {
  test('should handle SQL injection attempts in resource IDs', async () => {
    const user = mockUsers.regularUser;
    const maliciousId = "'; DROP TABLE users; SELECT * FROM users WHERE id = '";
    const resource: ResourceIdentifier = { type: 'user', id: maliciousId };
    const context = createMockContext(user, 'read');
    
    const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Invalid resource format');
  });
  
  test('should handle path traversal attempts', async () => {
    const user = mockUsers.regularUser;
    const maliciousId = '../../../etc/passwd';
    const resource: ResourceIdentifier = { type: 'user', id: maliciousId };
    const context = createMockContext(user, 'read');
    
    const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Invalid resource format');
  });
  
  test('should handle script injection attempts', async () => {
    const user = mockUsers.regularUser;
    const maliciousId = '<script>alert("xss")</script>';
    const resource: ResourceIdentifier = { type: 'user', id: maliciousId };
    const context = createMockContext(user, 'read');
    
    const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Invalid resource format');
  });
  
  test('should handle null byte injection', async () => {
    const user = mockUsers.regularUser;
    const maliciousId = 'valid-id\x00malicious-code';
    const resource: ResourceIdentifier = { type: 'user', id: maliciousId };
    const context = createMockContext(user, 'read');
    
    const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Invalid resource format');
  });
});

export { };