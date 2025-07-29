/**
 * Content Security Policy (CSP) utilities
 * Helps minimize unsafe-inline usage through nonce implementation
 */

// Generate a random nonce for CSP
export const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
};

// Current nonce - should be regenerated per page load
let currentNonce: string | null = null;

/**
 * Get or generate the current CSP nonce
 */
export const getCurrentNonce = (): string => {
  if (!currentNonce) {
    currentNonce = generateNonce();
    
    // Add nonce to meta tag for script access
    const meta = document.createElement('meta');
    meta.name = 'csp-nonce';
    meta.content = currentNonce;
    document.head.appendChild(meta);
  }
  
  return currentNonce;
};

/**
 * Add nonce to inline script or style element
 */
export const addNonceToElement = (element: HTMLScriptElement | HTMLStyleElement): void => {
  element.nonce = getCurrentNonce();
};

/**
 * Create inline script with proper nonce
 */
export const createInlineScript = (content: string): HTMLScriptElement => {
  const script = document.createElement('script');
  script.textContent = content;
  script.nonce = getCurrentNonce();
  return script;
};

/**
 * Create inline style with proper nonce
 */
export const createInlineStyle = (content: string): HTMLStyleElement => {
  const style = document.createElement('style');
  style.textContent = content;
  style.nonce = getCurrentNonce();
  return style;
};

/**
 * Audit current page for CSP compliance
 */
export const auditCSPCompliance = (): {
  inlineScripts: number;
  inlineStyles: number;
  scriptsWithNonce: number;
  stylesWithNonce: number;
  issues: string[];
} => {
  const issues: string[] = [];
  
  // Check inline scripts
  const inlineScripts = document.querySelectorAll('script:not([src])');
  const scriptsWithNonce = Array.from(inlineScripts).filter(
    script => (script as HTMLScriptElement).nonce
  );
  
  // Check inline styles
  const inlineStyles = document.querySelectorAll('style');
  const stylesWithNonce = Array.from(inlineStyles).filter(
    style => (style as HTMLStyleElement).nonce
  );
  
  // Report issues
  if (inlineScripts.length > scriptsWithNonce.length) {
    issues.push(`${inlineScripts.length - scriptsWithNonce.length} inline scripts without nonce`);
  }
  
  if (inlineStyles.length > stylesWithNonce.length) {
    issues.push(`${inlineStyles.length - stylesWithNonce.length} inline styles without nonce`);
  }
  
  // Check for event handlers (onclick, etc.)
  const elementsWithEventHandlers = document.querySelectorAll('*[onclick], *[onload], *[onerror]');
  if (elementsWithEventHandlers.length > 0) {
    issues.push(`${elementsWithEventHandlers.length} elements with inline event handlers`);
  }
  
  return {
    inlineScripts: inlineScripts.length,
    inlineStyles: inlineStyles.length,
    scriptsWithNonce: scriptsWithNonce.length,
    stylesWithNonce: stylesWithNonce.length,
    issues
  };
};

/**
 * Enhanced CSP policy builder
 * Builds a more restrictive CSP policy using nonces where possible
 */
export const buildEnhancedCSP = (nonce: string): string => {
  const policies = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://maps.googleapis.com https://maps.gstatic.com https://www.google.com https://cdn.tiny.cloud https://*.tinymce.com blob:`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com https://cdn.tiny.cloud https://*.tinymce.com`,
    "img-src 'self' data: https: https://images.unsplash.com https://*.unsplash.com https://images.pexels.com https://*.pexels.com https://maps.googleapis.com https://maps.gstatic.com https://sp.tinymce.com https://cdn.tiny.cloud",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://nqvisvranvjaghvrdaaz.supabase.co wss://nqvisvranvjaghvrdaaz.supabase.co https://api.stripe.com https://maps.googleapis.com https://maps.gstatic.com https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.tiny.cloud https://*.tinymce.com https://nominatim.openstreetmap.org https://api.openai.com https://api.stability.ai",
    "frame-src 'self' https://js.stripe.com https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ];
  
  return policies.join('; ');
};