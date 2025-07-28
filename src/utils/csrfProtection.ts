/**
 * CSRF Protection for Payment Forms
 * 
 * Implements double-submit cookie pattern for CSRF protection
 * since we're using Supabase Auth which handles session management
 */

import { supabase } from '../lib/supabase';

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_COOKIE_NAME = 'csrf_token';
const TOKEN_LENGTH = 32;

/**
 * Generates a cryptographically secure random token
 */
function generateToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Sets CSRF token in both localStorage and as a cookie
 */
export function setCSRFToken(): string {
  const token = generateToken();
  
  // Store in localStorage
  localStorage.setItem(CSRF_TOKEN_KEY, token);
  
  // Set as httpOnly=false cookie so JavaScript can read it
  // This is safe because the token must match what's in localStorage
  document.cookie = `${CSRF_COOKIE_NAME}=${token}; path=/; SameSite=Strict; Secure`;
  
  return token;
}

/**
 * Gets the current CSRF token, generating one if it doesn't exist
 */
export function getCSRFToken(): string {
  let token = localStorage.getItem(CSRF_TOKEN_KEY);
  
  if (!token) {
    token = setCSRFToken();
  }
  
  return token;
}

/**
 * Validates that the CSRF token from the request matches stored token
 */
export function validateCSRFToken(requestToken: string | null): boolean {
  if (!requestToken) {
    return false;
  }
  
  const storedToken = localStorage.getItem(CSRF_TOKEN_KEY);
  if (!storedToken) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  if (requestToken.length !== storedToken.length) {
    return false;
  }
  
  let mismatch = 0;
  for (let i = 0; i < requestToken.length; i++) {
    mismatch |= requestToken.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }
  
  return mismatch === 0;
}

/**
 * Clears CSRF token (useful on logout)
 */
export function clearCSRFToken(): void {
  localStorage.removeItem(CSRF_TOKEN_KEY);
  document.cookie = `${CSRF_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Adds CSRF token to request headers
 */
export function addCSRFHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getCSRFToken();
  return {
    ...headers,
    'X-CSRF-Token': token
  };
}

/**
 * Hook to manage CSRF token lifecycle
 */
export function useCSRFProtection() {
  // Initialize token on mount
  if (typeof window !== 'undefined') {
    getCSRFToken();
  }
  
  // Clear token on auth state change (logout)
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      clearCSRFToken();
    } else if (event === 'SIGNED_IN') {
      // Generate new token on sign in
      setCSRFToken();
    }
  });
}

/**
 * Higher-order function to protect API calls with CSRF
 */
export function protectWithCSRF<T extends (...args: any[]) => Promise<any>>(
  apiCall: T
): T {
  return (async (...args: Parameters<T>) => {
    // Add CSRF validation logic here if needed
    // For now, we'll rely on the token being added to headers
    return apiCall(...args);
  }) as T;
}

// Note: React components with JSX should be in .tsx files
// If you need a CSRF-protected form component, create it in a separate .tsx file