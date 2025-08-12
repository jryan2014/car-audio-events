// supabase/functions/_shared/cors.ts

import { getEdgeSecurityHeaders, createSecureResponseHeaders } from './security-headers.ts';

// Get allowed origins from environment variable, fallback to secure defaults
function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }
  
  // Secure defaults - only allow known safe origins
  return [
    'https://caraudioevents.com',
    'http://localhost:5173',
    'https://localhost:5173'
  ];
}

// Validate and get CORS origin header
function getCorsOrigin(request: Request): string {
  const requestOrigin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins();
  
  if (!requestOrigin) {
    // No origin header (e.g., from non-browser requests)
    return allowedOrigins[0]; // Return first allowed origin as default
  }
  
  if (allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  // Log potential security issue
  console.warn(`CORS: Origin not allowed: ${requestOrigin}`);
  
  // Don't set CORS headers for disallowed origins
  return '';
}

// Generate secure CORS headers based on request origin
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = getCorsOrigin(request);
  
  if (!origin) {
    // Return minimal headers for disallowed origins with security headers
    return createSecureResponseHeaders({
      'Content-Type': 'application/json'
    }, {
      sensitiveOperation: true // Treat disallowed origins as sensitive
    });
  }
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };

  // Add security headers to CORS headers
  return createSecureResponseHeaders(corsHeaders);
}

// Legacy headers - DEPRECATED, use getCorsHeaders instead
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // SECURITY WARNING: This allows all origins!
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

// Helper function to handle CORS preflight requests with secure origin validation
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const corsHeaders = getCorsHeaders(req);
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }
  return null;
}

// Enhanced CORS handler with security validation
export function handleSecureCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const corsHeaders = getCorsHeaders(req);
    
    // Additional security validation for preflight
    const requestHeaders = req.headers.get('Access-Control-Request-Headers');
    const requestMethod = req.headers.get('Access-Control-Request-Method');
    
    // Validate requested headers
    if (requestHeaders) {
      const allowedHeaders = ['authorization', 'x-client-info', 'apikey', 'content-type', 'x-csrf-token'];
      const requestedHeaders = requestHeaders.toLowerCase().split(',').map(h => h.trim());
      
      for (const header of requestedHeaders) {
        if (!allowedHeaders.includes(header)) {
          console.warn(`CORS: Disallowed header requested: ${header}`);
          return new Response(null, {
            status: 403,
            headers: createSecureResponseHeaders({}, { sensitiveOperation: true })
          });
        }
      }
    }
    
    // Validate requested method
    if (requestMethod) {
      const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
      if (!allowedMethods.includes(requestMethod.toUpperCase())) {
        console.warn(`CORS: Disallowed method requested: ${requestMethod}`);
        return new Response(null, {
          status: 405,
          headers: createSecureResponseHeaders({}, { sensitiveOperation: true })
        });
      }
    }
    
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }
  return null;
}

// Helper function for legacy compatibility - DEPRECATED
export function handleCorsLegacy(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }
  return null;
} 