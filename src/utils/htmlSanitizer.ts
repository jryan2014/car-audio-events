import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * This is a security-enhanced version that removes dangerous elements and attributes
 */
export function sanitizeEmailHTML(html: string): string {
  if (!html) return '';
  
  // Configure DOMPurify with strict settings for email content
  const config = {
    ALLOWED_TAGS: [
      'a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'hr', 'i', 'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul',
      'span', 'img', 'u', 's', 'strike', 'sub', 'sup'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'style', 'class', 'id', 'target', 'rel', 'alt', 'src', 'width', 'height',
      'align', 'valign', 'bgcolor', 'color', 'face', 'size'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
    SANITIZE_DOM: true,
    FORCE_BODY: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false
  };

  // Additional security: Remove script tags and event handlers
  let sanitized = DOMPurify.sanitize(html, config);
  
  // Remove any remaining script-like content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*"[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*'[^']*'/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  
  return sanitized;
}

/**
 * Sanitizes user input for display in text contexts
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  // HTML encode special characters
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates and sanitizes URLs
 */
export function sanitizeURL(url: string): string {
  if (!url) return '';
  
  // Only allow http, https, and mailto protocols
  const allowedProtocols = ['http:', 'https:', 'mailto:'];
  
  try {
    const parsed = new URL(url);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    // If URL parsing fails, treat as relative URL
    // Ensure no javascript: or data: protocols
    if (url.match(/^(javascript|data|vbscript):/i)) {
      return '';
    }
    return url;
  }
}
