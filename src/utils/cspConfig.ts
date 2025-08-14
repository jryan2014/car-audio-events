/**
 * Content Security Policy configuration
 */

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for React
    'https://maps.googleapis.com',
    'https://cdn.tiny.cloud',
    'https://js.stripe.com',
    'https://www.paypal.com',
    'https://www.sandbox.paypal.com'
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind
    'https://fonts.googleapis.com'
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:',
    '*.supabase.co'
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com'
  ],
  'connect-src': [
    "'self'",
    '*.supabase.co',
    'https://api.stripe.com',
    'https://api.paypal.com',
    'https://maps.googleapis.com'
  ],
  'frame-src': [
    "'self'",
    'https://js.stripe.com',
    'https://www.paypal.com',
    'https://www.sandbox.paypal.com'
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};

export function generateCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, values]) => {
      if (values.length === 0) return directive;
      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');
}
