/**
 * CSRF validation for Edge Functions
 */

import { getCorsHeaders } from './cors.ts';

/**
 * Validates CSRF token from request headers
 * Since Edge Functions are stateless, we rely on the client to provide
 * both the token and a way to validate it (e.g., from auth session)
 */
export function validateCSRFToken(req: Request): boolean {
  // Get CSRF token from header
  const csrfToken = req.headers.get('X-CSRF-Token');
  
  // In production, you would validate this against a stored token
  // For Edge Functions, we can use these strategies:
  
  // 1. Check that token exists and has expected format
  if (!csrfToken || csrfToken.length < 32) {
    return false;
  }
  
  // 2. Check that it's a hex string (our tokens are hex)
  if (!/^[0-9a-f]+$/i.test(csrfToken)) {
    return false;
  }
  
  // 3. For authenticated requests, we can include CSRF token in JWT claims
  // or validate it against user session data
  
  // For now, we'll accept any properly formatted token
  // In production, implement proper validation against stored tokens
  return true;
}

/**
 * CSRF protection middleware for Edge Functions
 */
export function requireCSRFToken(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    // Skip CSRF check for OPTIONS requests
    if (req.method === 'OPTIONS') {
      return handler(req);
    }
    
    // Skip CSRF check for GET requests (they should be idempotent)
    if (req.method === 'GET') {
      return handler(req);
    }
    
    // Validate CSRF token for state-changing requests
    if (!validateCSRFToken(req)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or missing CSRF token',
          code: 'CSRF_VALIDATION_FAILED'
        }),
        { 
          status: 403,
          headers: getCorsHeaders(req)
        }
      );
    }
    
    // Token is valid, proceed with request
    return handler(req);
  };
}