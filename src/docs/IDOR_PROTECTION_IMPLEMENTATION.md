# IDOR Protection Implementation Guide

## Overview

This document provides comprehensive guidance on implementing Insecure Direct Object Reference (IDOR) protection across the Car Audio Events platform. The implementation includes resource authorization middleware, UUID validation, and audit logging.

## Architecture Components

### 1. ResourceAuthorizationMiddleware (`src/middleware/resource-authorization.ts`)

The core middleware that provides:
- **Ownership Validation**: Ensures users can only access resources they own
- **Permission Checking**: Validates user roles and permissions for resource access
- **Resource Existence**: Verifies resources exist before allowing operations
- **Audit Logging**: Comprehensive logging of all authorization attempts

### 2. IDOR Protection Utilities (`src/utils/idorProtection.ts`)

Utilities for:
- **UUID Validation**: Strict validation of UUID formats
- **Input Sanitization**: Removes dangerous patterns from user input
- **Type Checking**: Runtime validation of resource IDs
- **Batch Validation**: Efficient validation of multiple IDs

### 3. Endpoint Protection (`src/middleware/endpoint-protection.ts`)

Pre-configured middleware for:
- **URL Parameter Extraction**: Automatically extracts resource IDs from URLs
- **Middleware Composition**: Combines authentication and authorization
- **Request Validation**: Validates request bodies and parameters

## Implementation Examples

### Basic API Endpoint Protection

```typescript
import { EndpointProtection, ResourceExtractors } from '../middleware/endpoint-protection';
import { ProtectedAPIService } from '../api/protected-api-service';

// Protect user profile endpoints
app.get('/api/users/:userId', EndpointProtection.userProfile, async (req, res) => {
  const context = ProtectedAPIService.createRequestContext(req, req.user);
  const result = await ProtectedAPIService.getUserProfile(req.params.userId, context);
  
  if (!result.success) {
    return res.status(result.error?.code === 'ACCESS_DENIED' ? 403 : 400)
      .json(result.error);
  }
  
  res.json(result.data);
});
```

### Manual Resource Authorization

```typescript
import { ResourceAuthorizationMiddleware } from '../middleware/resource-authorization';
import { IdValidators } from '../utils/idorProtection';

async function getCompetitionResult(resultId: string, user: AuthenticatedUser) {
  // 1. Validate ID format
  const idValidation = IdValidators.competitionResult(resultId);
  if (!idValidation.valid) {
    throw new Error(`Invalid result ID: ${idValidation.errors.join(', ')}`);
  }
  
  // 2. Check authorization
  const resource = {
    type: 'competition_result',
    id: idValidation.sanitized!
  };
  
  const authContext = {
    user,
    ipAddress: 'api-client',
    userAgent: 'server',
    operation: 'read',
    timestamp: new Date()
  };
  
  const authResult = await ResourceAuthorizationMiddleware.authorize(resource, authContext);
  
  if (!authResult.allowed) {
    throw new Error(`Access denied: ${authResult.reason}`);
  }
  
  // 3. Fetch resource (user is authorized)
  const { data } = await supabase
    .from('competition_results')
    .select('*')
    .eq('id', resource.id)
    .single();
  
  return data;
}
```

## Resource Type Mapping

| Resource Type | ID Format | Example | Authorization Rules |
|---------------|-----------|---------|-------------------|
| `user` | UUID | `550e8400-e29b-41d4-a716-446655440000` | Own profile or admin |
| `event` | Integer | `12345` | Public events, organizer, or admin |
| `competition_result` | UUID | `550e8400-e29b-41d4-a716-446655440000` | Own results, event organizer, or admin |
| `payment` | UUID | `550e8400-e29b-41d4-a716-446655440000` | Own payments or admin |
| `support_ticket` | UUID | `550e8400-e29b-41d4-a716-446655440000` | Own tickets, support staff, or admin |
| `organization` | Integer | `67890` | Organization members or admin |
| `advertisement` | Integer | `11111` | Own ads, organization, or admin |

## API Integration Patterns

### 1. Express Middleware Integration

```typescript
import express from 'express';
import { MiddlewareComposer } from '../middleware/endpoint-protection';

const app = express();

// User endpoints with comprehensive protection
app.get('/api/users/:userId', 
  MiddlewareComposer.createStack('user', {
    requireAuth: true,
    requireCSRF: false
  }),
  handleGetUser
);

// Admin-only endpoint
app.delete('/api/users/:userId',
  MiddlewareComposer.createStack('user', {
    requireAuth: true,
    requireAdmin: true,
    requireCSRF: true
  }),
  handleDeleteUser
);
```

### 2. Supabase Edge Functions Integration

```typescript
// Edge function with IDOR protection
import { ResourceAuthorizationMiddleware } from '../middleware/resource-authorization.ts';
import { IdValidators } from '../utils/idorProtection.ts';

Deno.serve(async (req) => {
  try {
    // Extract and validate resource ID from URL
    const url = new URL(req.url);
    const eventId = url.pathname.split('/').pop();
    
    const idValidation = IdValidators.event(eventId);
    if (!idValidation.valid) {
      return new Response(JSON.stringify({
        error: 'Invalid event ID',
        details: idValidation.errors
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check authorization
    const resource = {
      type: 'event',
      id: idValidation.sanitized!
    };
    
    const authContext = {
      user: await getUserFromRequest(req),
      ipAddress: req.headers.get('cf-connecting-ip') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      operation: req.method.toLowerCase(),
      timestamp: new Date()
    };
    
    const authResult = await ResourceAuthorizationMiddleware.authorize(resource, authContext);
    
    if (!authResult.allowed) {
      return new Response(JSON.stringify({
        error: authResult.reason,
        auditId: authResult.auditId
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Process authorized request
    return await handleEventRequest(req, resource);
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### 3. React Frontend Integration

```typescript
import { IdValidators } from '../utils/idorProtection';

// Client-side validation before API calls
export async function fetchUserProfile(userId: string) {
  // Pre-validate on client side
  const validation = IdValidators.user(userId);
  if (!validation.valid) {
    throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
  }
  
  try {
    const response = await fetch(`/api/users/${validation.sanitized}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch user profile');
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }
}
```

## Security Validation Checklist

### Pre-Request Validation

- [ ] **ID Format Validation**: All resource IDs validated against expected format (UUID/Integer)
- [ ] **Input Sanitization**: Request parameters sanitized for dangerous patterns
- [ ] **Parameter Limits**: Array parameters limited to reasonable sizes (default 100 items)
- [ ] **Content-Type Validation**: Request content-type matches expected format

### Authorization Checks

- [ ] **Resource Existence**: Verify resource exists before checking permissions
- [ ] **Ownership Validation**: Confirm user owns resource or has appropriate permissions
- [ ] **Role-Based Access**: Check user role allows requested operation
- [ ] **Organization Membership**: Validate organization-level access where applicable

### Audit and Monitoring

- [ ] **Access Logging**: All authorization attempts logged with full context
- [ ] **Failed Access Alerts**: Failed authorization attempts trigger security alerts
- [ ] **Rate Limiting**: Authorization checks are rate limited per user/IP
- [ ] **Anomaly Detection**: Unusual access patterns flagged for review

## Common IDOR Attack Patterns & Mitigations

### 1. Sequential ID Enumeration

**Attack**: Incrementing ID values to access unauthorized resources
```
GET /api/users/1
GET /api/users/2
GET /api/users/3
...
```

**Mitigation**: 
- Use UUIDs for sensitive resources
- Implement authorization checks for all resources
- Rate limit enumeration attempts

### 2. Parameter Tampering

**Attack**: Modifying resource IDs in requests
```
POST /api/events/123/register
// Tamper eventId to access different event
```

**Mitigation**:
- Validate all parameters against user permissions
- Check resource ownership for all operations
- Log parameter tampering attempts

### 3. Mass Assignment

**Attack**: Adding unauthorized fields to update requests
```javascript
// Attacker tries to elevate privileges
PUT /api/users/123
{
  "email": "new@email.com",
  "membership_type": "admin"  // Unauthorized field
}
```

**Mitigation**:
- Whitelist allowed fields for each operation
- Validate field permissions based on user role
- Reject requests with unauthorized fields

### 4. Nested Resource Access

**Attack**: Accessing parent resources through child relationships
```
GET /api/events/123/results/456
// Try to access other events' results
```

**Mitigation**:
- Validate all nested resource relationships
- Check permissions at each level of the hierarchy
- Implement cascading authorization checks

## Testing IDOR Protection

### Unit Tests

```typescript
import { ResourceAuthorizationMiddleware } from '../middleware/resource-authorization';
import { IdValidators } from '../utils/idorProtection';

describe('IDOR Protection', () => {
  test('should reject invalid UUID format', () => {
    const validation = IdValidators.user('invalid-id');
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Invalid UUID format');
  });
  
  test('should deny access to other users\' resources', async () => {
    const resource = { type: 'user', id: 'other-user-id' };
    const context = { 
      user: { id: 'current-user-id' }, 
      operation: 'read',
      // ... other context
    };
    
    const result = await ResourceAuthorizationMiddleware.authorize(resource, context);
    expect(result.allowed).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('API Endpoint Protection', () => {
  test('should protect user profile endpoint', async () => {
    const response = await request(app)
      .get('/api/users/other-user-id')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
    
    expect(response.body.error).toContain('Access denied');
  });
  
  test('should allow access to own resources', async () => {
    const response = await request(app)
      .get('/api/users/current-user-id')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    
    expect(response.body.id).toBe('current-user-id');
  });
});
```

## Performance Considerations

### Optimization Strategies

1. **Caching**: Cache authorization results for frequently accessed resources
2. **Batch Operations**: Process multiple authorization checks in parallel
3. **Database Indexes**: Ensure proper indexing for authorization queries
4. **Rate Limiting**: Prevent abuse while maintaining performance

### Monitoring Metrics

- Authorization check latency (target: <100ms)
- Failed authorization attempts per minute
- Rate limit triggers per user/IP
- Database query performance for authorization checks

## Deployment and Monitoring

### Production Setup

1. **Environment Variables**: Configure rate limits and security settings
2. **Database Policies**: Ensure RLS policies align with middleware
3. **Audit Log Retention**: Configure log retention and archival
4. **Alert Configuration**: Set up alerts for security events

### Monitoring Dashboard

Create dashboards to track:
- Authorization success/failure rates
- Most frequently accessed resources
- Users with highest failed authorization attempts
- Performance metrics for authorization middleware

## Troubleshooting

### Common Issues

1. **False Positives**: Legitimate users blocked by authorization
   - Check user permissions and role assignments
   - Verify resource ownership records
   - Review rate limiting configuration

2. **Performance Degradation**: Slow authorization checks
   - Check database query performance
   - Review authorization cache hit rates
   - Optimize authorization middleware logic

3. **Audit Log Issues**: Missing or incomplete security logs
   - Verify audit logger configuration
   - Check log storage and retention settings
   - Review error handling in middleware

### Debug Mode

Enable debug logging for authorization issues:

```typescript
// Enable detailed authorization logging
process.env.DEBUG_AUTH = 'true';

// Log additional context for failed authorizations
process.env.AUDIT_LEVEL = 'verbose';
```

## Migration Guide

### Existing API Endpoints

1. **Assessment**: Review all existing endpoints for IDOR vulnerabilities
2. **Prioritization**: Start with high-risk endpoints (payments, user data)
3. **Implementation**: Add IDOR protection middleware gradually
4. **Testing**: Comprehensive testing of each protected endpoint
5. **Monitoring**: Monitor for authorization failures after deployment

### Database Updates

Ensure database policies support the middleware:

```sql
-- Example: Update RLS policy to work with middleware
CREATE POLICY "users_own_profile" ON users
  FOR SELECT USING (auth.uid() = id);
  
-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_id_status 
  ON users(id, status) WHERE status = 'active';
```

This implementation provides comprehensive IDOR protection while maintaining performance and usability. Regular security audits and monitoring ensure the protection remains effective against evolving threats.