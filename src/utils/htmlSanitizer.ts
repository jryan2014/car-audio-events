import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @param options - Optional configuration for specific use cases
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(
  html: string,
  options?: {
    allowedTags?: string[];
    allowedAttributes?: string[];
    allowIframes?: boolean;
  }
): string {
  const defaultConfig = {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'em', 'u', 's', 'mark', 'b', 'i',
      'ul', 'ol', 'li',
      'a', 'img',
      'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'title', 'alt', 'src',
      'class', 'style', 'id',
      'width', 'height',
      'colspan', 'rowspan'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ADD_ATTR: ['target'], // Allow target attribute for links
    FORBID_TAGS: ['script', 'style', 'object', 'embed', 'form', 'input', 'iframe'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
  };

  // Apply custom options if provided
  if (options?.allowedTags) {
    defaultConfig.ALLOWED_TAGS = options.allowedTags;
  }
  if (options?.allowedAttributes) {
    defaultConfig.ALLOWED_ATTR = options.allowedAttributes;
  }
  if (options?.allowIframes) {
    // Remove iframe from forbidden tags if explicitly allowed
    defaultConfig.FORBID_TAGS = defaultConfig.FORBID_TAGS?.filter(tag => tag !== 'iframe');
    defaultConfig.ALLOWED_TAGS?.push('iframe');
    defaultConfig.ALLOWED_ATTR?.push('frameborder', 'allowfullscreen');
  }

  return DOMPurify.sanitize(html, defaultConfig) as string;
}

/**
 * Sanitizes HTML for email templates (more permissive)
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string suitable for emails
 */
export function sanitizeEmailHTML(html: string): string {
  return sanitizeHTML(html, {
    allowedTags: [
      'html', 'head', 'body', 'meta', 'title',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'em', 'u', 's', 'mark', 'b', 'i',
      'ul', 'ol', 'li',
      'a', 'img',
      'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span',
      'center', 'font' // Legacy email tags
    ],
    allowedAttributes: [
      'href', 'target', 'rel', 'title', 'alt', 'src',
      'class', 'style', 'id',
      'width', 'height',
      'colspan', 'rowspan',
      'align', 'valign', 'bgcolor', 'color', // Legacy email attributes
      'cellpadding', 'cellspacing', 'border'
    ]
  });
}

/**
 * Strips all HTML tags and returns plain text
 * @param html - The HTML string to strip
 * @returns Plain text string
 */
export function stripHTML(html: string): string {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}