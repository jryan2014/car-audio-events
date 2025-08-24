// Helper functions to convert modern HTML content to Outlook-compatible table layouts

/**
 * Converts a modern styled div container to an Outlook-compatible table
 * This ensures proper rendering of boxes, backgrounds, and borders in Outlook
 */
export function createOutlookBox(
  content: string,
  options?: {
    backgroundColor?: string;
    borderColor?: string;
    borderRadius?: string;
    padding?: string;
    margin?: string;
    width?: string;
  }
): string {
  const {
    backgroundColor = '#fef3c7', // default yellow background
    borderColor = '#f59e0b',
    borderRadius = '8px',
    padding = '20px',
    margin = '20px 0',
    width = '100%'
  } = options || {};

  // For Outlook, we use tables with background colors
  // For modern clients, we use divs with border-radius
  return `
    <!--[if mso]>
    <table width="${width}" cellpadding="0" cellspacing="0" border="0" style="margin: ${margin};">
      <tr>
        <td bgcolor="${backgroundColor}" style="padding: ${padding}; border: 1px solid ${borderColor};">
    <![endif]-->
    <!--[if !mso]><!-->
    <div style="background-color: ${backgroundColor}; border: 1px solid ${borderColor}; border-radius: ${borderRadius}; padding: ${padding}; margin: ${margin}; width: ${width};">
    <!--<![endif]-->
      ${content}
    <!--[if !mso]><!-->
    </div>
    <!--<![endif]-->
    <!--[if mso]>
        </td>
      </tr>
    </table>
    <![endif]-->
  `;
}

/**
 * Creates an Outlook-compatible button
 */
export function createOutlookButton(
  text: string,
  href: string,
  options?: {
    backgroundColor?: string;
    textColor?: string;
    padding?: string;
    borderRadius?: string;
    fontSize?: string;
    fontWeight?: string;
    width?: string;
  }
): string {
  const {
    backgroundColor = '#dc2626',
    textColor = '#ffffff',
    padding = '12px 24px',
    borderRadius = '6px',
    fontSize = '16px',
    fontWeight = 'bold',
    width = 'auto'
  } = options || {};

  // VML button for Outlook
  return `
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" 
      href="${href}" 
      style="height:40px;v-text-anchor:middle;width:200px;" 
      arcsize="15%" 
      stroke="f" 
      fillcolor="${backgroundColor}">
      <w:anchorlock/>
      <center style="color:${textColor};font-family:Arial,sans-serif;font-size:${fontSize};font-weight:${fontWeight};">
        ${text}
      </center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
      <tr>
        <td align="left">
          <a href="${href}" style="display: inline-block; background-color: ${backgroundColor}; color: ${textColor}; padding: ${padding}; text-decoration: none; border-radius: ${borderRadius}; font-size: ${fontSize}; font-weight: ${fontWeight}; font-family: Arial, sans-serif;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
    <!--<![endif]-->
  `;
}

/**
 * Creates a properly spaced heading for Outlook
 */
export function createOutlookHeading(
  text: string,
  level: 'h1' | 'h2' | 'h3' = 'h2',
  options?: {
    color?: string;
    fontSize?: string;
    fontWeight?: string;
    margin?: string;
    padding?: string;
  }
): string {
  const defaults = {
    h1: { fontSize: '28px', fontWeight: 'bold', margin: '0 0 20px 0' },
    h2: { fontSize: '24px', fontWeight: 'bold', margin: '0 0 16px 0' },
    h3: { fontSize: '20px', fontWeight: 'bold', margin: '0 0 12px 0' }
  };

  const {
    color = '#1f2937',
    fontSize = defaults[level].fontSize,
    fontWeight = defaults[level].fontWeight,
    margin = defaults[level].margin,
    padding = '0'
  } = options || {};

  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: ${padding};">
          <${level} style="color: ${color}; font-size: ${fontSize}; font-weight: ${fontWeight}; margin: ${margin}; padding: 0; font-family: Arial, sans-serif;">
            ${text}
          </${level}>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Wraps content with proper padding for Outlook
 */
export function wrapWithPadding(content: string, padding: string = '20px'): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding: ${padding};">
          ${content}
        </td>
      </tr>
    </table>
  `;
}

/**
 * Processes email content to make it Outlook-compatible
 * This function should be called on the email body content before wrapping
 */
export function processEmailContentForOutlook(html: string): string {
  // Replace common patterns with Outlook-compatible versions
  
  // Replace styled divs with yellow backgrounds (like login details boxes)
  html = html.replace(
    /<div[^>]*style="[^"]*background-color:\s*#fef3c7[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    (match, content) => {
      return createOutlookBox(content, {
        backgroundColor: '#fef3c7',
        borderColor: '#f59e0b'
      });
    }
  );

  // Replace button links with proper Outlook buttons
  html = html.replace(
    /<a[^>]*style="[^"]*background-color:\s*#dc2626[^"]*"[^>]*>([^<]+)<\/a>/gi,
    (match, text) => {
      const href = match.match(/href="([^"]*)"/)?.[1] || '#';
      return createOutlookButton(text, href);
    }
  );

  // Add padding to h1, h2, h3 tags
  html = html.replace(/<h([1-3])>([^<]+)<\/h\1>/gi, (match, level, text) => {
    return createOutlookHeading(text, `h${level}` as 'h1' | 'h2' | 'h3');
  });

  // Ensure proper spacing around paragraphs
  html = html.replace(/<p>/gi, '<p style="margin: 0 0 16px 0; padding: 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333;">');

  return html;
}