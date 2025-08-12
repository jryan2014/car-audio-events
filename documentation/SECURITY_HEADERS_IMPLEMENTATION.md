# Security Headers Implementation

This document describes the comprehensive security headers system implemented for the Car Audio Events platform.

## Overview

The security headers system provides protection against common web vulnerabilities including:
- Cross-Site Scripting (XSS)
- Clickjacking
- Content-Type sniffing
- Man-in-the-Middle attacks
- Information leakage
- CSRF attacks

## Architecture

### Frontend Security Headers (Vite + Netlify)

1. **Vite Configuration** (`vite.config.ts`)
   - Environment-aware security headers
   - Development vs production configurations
   - Automatic CSP generation

2. **Netlify Headers** (`public/_headers`)
   - Route-specific security policies
   - Static asset caching with security
   - API endpoint protection

3. **Middleware** (`src/middleware/security-headers.ts`)
   - Reusable security header utilities
   - Environment-specific configurations
   - Validation and sanitization

### Backend Security Headers (Edge Functions)

1. **Security Headers Module** (`supabase/functions/_shared/security-headers.ts`)
   - Edge function security headers
   - Operation-specific configurations
   - Integration with CORS headers

2. **Enhanced CORS** (`supabase/functions/_shared/cors.ts`)
   - Secure CORS with origin validation
   - Security headers integration
   - Preflight request validation

## Implementation Details

### Content Security Policy (CSP)

The CSP is configured to allow necessary resources while blocking potential attacks:

```typescript
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' 
    https://js.stripe.com 
    https://maps.googleapis.com 
    https://cdn.tiny.cloud
    https://js.hcaptcha.com
    https://www.paypal.com;
  style-src 'self' 'unsafe-inline' 
    https://fonts.googleapis.com
    https://cdn.tiny.cloud;
  connect-src 'self' 
    https://nqvisvranvjaghvrdaaz.supabase.co
    https://api.stripe.com
    https://api.paypal.com;
  frame-src 'self' 
    https://js.stripe.com
    https://www.paypal.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self' https://api.stripe.com;
  frame-ancestors 'none';
```

### Security Headers Applied

| Header | Purpose | Value |
|--------|---------|-------|
| `X-Frame-Options` | Prevent clickjacking | `DENY` |
| `X-Content-Type-Options` | Prevent MIME sniffing | `nosniff` |
| `X-XSS-Protection` | Enable XSS filtering | `1; mode=block` |
| `Referrer-Policy` | Control referrer info | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | Enforce HTTPS | `max-age=31536000; includeSubDomains; preload` |
| `Permissions-Policy` | Control browser features | Restrictive policy |
| `Content-Security-Policy` | Control resource loading | See above |

### Route-Specific Security

Different routes have different security requirements:

#### API Endpoints (`/api/*`)
- Strict CSP
- No caching
- Enhanced validation

#### Payment Pages (`/payment/*`, `/checkout/*`)
- Maximum security headers
- No indexing by search engines
- Private caching only

#### Admin Pages (`/admin/*`)
- Strictest CSP
- No external resources
- Maximum privacy protection

#### Static Assets (`/assets/*`)
- Basic security headers
- Long-term caching
- Immutable assets

## Usage Examples

### Frontend Middleware

```typescript
import { SecurityHeadersMiddleware } from '../middleware/security-headers';

// Get headers for current environment
const headers = SecurityHeadersMiddleware.getHeaders({
  environment: 'production',
  includeDevHeaders: false
});

// Create Express middleware
const middleware = SecurityHeadersMiddleware.createMiddleware({
  environment: 'production'
});
```

### Edge Function Implementation

```typescript
import { EdgeFunctionHeaders, createSecurityMiddleware } from '../_shared/security-headers.ts';

// Initialize security middleware
const securityMiddleware = createSecurityMiddleware();

// Validate request
const validation = securityMiddleware.validateRequest(req);
if (!validation.valid) {
  return validation.response!;
}

// Get appropriate headers for operation type
const headers = EdgeFunctionHeaders.payment(corsHeaders);

// Create secure response
return securityMiddleware.createResponse(data, corsHeaders, {
  sensitiveOperation: true
});
```

## Security Header Types

### 1. API Operations
- Basic security headers
- JSON content type
- No caching

### 2. Payment Operations
- Enhanced security headers
- Stripe/PayPal CSP allowances
- Sensitive operation flags

### 3. Authentication Operations
- Maximum security
- No external connections
- Private caching

### 4. Webhook Operations
- Minimal CSP (no scripts)
- Enhanced validation
- Audit logging

### 5. Admin Operations
- Strictest security policy
- No external resources
- Maximum privacy

## Environment Configuration

### Development
- More permissive CSP for localhost
- Dev-specific headers
- Hot reload support

### Production
- Strict security policies
- HSTS enforcement
- Preload directives

### Testing
- Minimal policies for testing
- Flexible configurations
- Debug information

## Validation and Monitoring

### Request Validation
- Header injection detection
- Length validation
- Content validation

### Response Validation
- Header sanitization
- Policy compliance
- Security best practices

### Monitoring
- Security header compliance
- CSP violation reporting
- Attack attempt logging

## Migration Guide

### Existing Edge Functions

Use the migration script to update existing functions:

```bash
deno run --allow-read --allow-write scripts/apply-security-headers.ts
```

### Manual Migration

1. Add security headers import:
```typescript
import { EdgeFunctionHeaders, createSecurityMiddleware } from '../_shared/security-headers.ts';
```

2. Initialize security middleware:
```typescript
const securityMiddleware = createSecurityMiddleware();
const validation = securityMiddleware.validateRequest(req);
```

3. Apply appropriate headers:
```typescript
const headers = EdgeFunctionHeaders.payment(corsHeaders);
```

4. Use secure response creation:
```typescript
return securityMiddleware.createResponse(data, corsHeaders);
```

## Testing Security Headers

### Browser Testing
1. Open browser developer tools
2. Check Network tab for response headers
3. Verify security headers are present
4. Test CSP violations in console

### Automated Testing
```bash
# Test security headers endpoint
curl -I https://caraudioevents.com/api/test

# Check for required headers
curl -s -D - https://caraudioevents.com/ | grep -E "(X-Frame-Options|Content-Security-Policy)"
```

### Security Scanners
- OWASP ZAP
- Mozilla Observatory
- Security Headers (securityheaders.com)

## Best Practices

1. **Always validate requests** before processing
2. **Use operation-specific headers** for different function types
3. **Monitor CSP violations** and adjust policies as needed
4. **Test in development** before deploying to production
5. **Keep policies minimal** - only allow what's necessary
6. **Regular security reviews** of header configurations
7. **Document any policy changes** and their justifications

## Troubleshooting

### Common Issues

1. **CSP Violations**
   - Check browser console for specific violations
   - Add necessary sources to CSP policy
   - Test in development first

2. **CORS + Security Headers Conflicts**
   - Ensure proper header precedence
   - Use integrated CORS + security functions
   - Validate preflight requests

3. **Third-party Service Issues**
   - Update CSP to include required domains
   - Test with specific service requirements
   - Monitor for new service endpoints

### Debug Mode

Enable debug headers in development:

```typescript
const headers = SecurityHeadersMiddleware.getHeaders({
  environment: 'development',
  includeDevHeaders: true
});
```

## Security Considerations

1. **Never bypass security headers** for convenience
2. **Always use HTTPS** in production
3. **Keep CSP policies up to date** with new services
4. **Monitor for security vulnerabilities** in allowed sources
5. **Regular security audits** of header configurations
6. **Test all user flows** after header changes
7. **Document security exceptions** with justifications

## Future Enhancements

1. **CSP Nonce Support** for inline scripts
2. **Report-URI Implementation** for CSP violations
3. **Automated Security Testing** in CI/CD
4. **Dynamic Header Configuration** based on user context
5. **Security Header Analytics** and monitoring
6. **Integration with Security Scanning** tools