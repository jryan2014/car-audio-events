// Professional email template wrapper for Car Audio Events
// Provides consistent theming and styling for all email templates

export const EMAIL_TEMPLATE_STYLES = `
  <style>
    /* Reset and Base Styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    
    /* Main Styles - Light theme background */
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #f4f4f4 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    /* Outer wrapper with light background */
    .email-wrapper {
      background-color: #f4f4f4;
      padding: 40px 20px;
    }
    
    .email-container {
      max-width: 700px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .email-header {
      background: #581c87;
      background: linear-gradient(to right, #000000 0%, #581c87 100%);
      padding: 35px 30px 25px 30px;
      text-align: center;
      border-bottom: none;
    }
    
    .email-logo {
      font-size: 32px;
      font-weight: bold;
      color: #ffffff;
      text-decoration: none;
      display: inline-block;
      margin-bottom: 5px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    .email-logo img {
      width: 100%;
      max-width: 250px;
      height: auto;
      display: block;
      margin: 0 auto;
    }
    
    .email-tagline {
      color: rgba(255, 255, 255, 0.95);
      font-size: 14px;
      margin-top: 0;
      font-weight: 300;
    }
    
    .email-body {
      padding: 40px 30px;
      background-color: #f9fafb;
      color: #1f2937;
    }
    
    .email-content {
      line-height: 1.6;
      font-size: 16px;
      color: #374151;
      text-align: left;
    }
    
    .email-content h1 {
      color: #1f2937;
      font-size: 28px;
      margin: 0 0 20px 0;
      font-weight: 600;
      text-align: left;
    }
    
    .email-content h2 {
      color: #1f2937;
      font-size: 24px;
      margin: 30px 0 15px 0;
      font-weight: 600;
      text-align: left;
    }
    
    .email-content h3 {
      color: #1f2937;
      font-size: 20px;
      margin: 25px 0 10px 0;
      font-weight: 600;
      text-align: left;
    }
    
    .email-content p {
      margin: 0 0 15px 0;
      color: #4b5563;
      text-align: left;
    }
    
    .email-content a {
      color: #7c3aed;
      text-decoration: underline;
    }
    
    .email-content a:hover {
      color: #6d28d9;
    }
    
    /* Button Styles - Using purple gradient to match website */
    .email-button {
      display: inline-block;
      padding: 14px 30px;
      background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
      color: #ffffff !important;
      text-decoration: none !important;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
    }
    
    .email-button:hover {
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.5);
      transform: translateY(-1px);
      background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%);
    }
    
    .email-button-secondary {
      display: inline-block;
      padding: 12px 24px;
      background-color: #e5e7eb;
      color: #4b5563 !important;
      text-decoration: none !important;
      border-radius: 8px;
      font-weight: 500;
      font-size: 14px;
      margin: 10px 5px;
      border: 1px solid #d1d5db;
    }
    
    /* Info Box */
    .email-info-box {
      background-color: #f3f4f6;
      border-left: 4px solid #7c3aed;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    
    .email-info-box h4 {
      color: #1f2937;
      margin: 0 0 10px 0;
      font-size: 18px;
      font-weight: 600;
    }
    
    .email-info-box p {
      margin: 0;
      color: #4b5563;
    }
    
    /* Alert Boxes */
    .email-alert {
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 8px;
      border-left: 4px solid;
    }
    
    .email-alert-success {
      background-color: #dcfce7;
      border-left-color: #10b981;
      color: #166534;
    }
    
    .email-alert-warning {
      background-color: #fef3c7;
      border-left-color: #f59e0b;
      color: #92400e;
    }
    
    .email-alert-error {
      background-color: #fee2e2;
      border-left-color: #ef4444;
      color: #991b1b;
    }
    
    .email-alert-info {
      background-color: #ede9fe;
      border-left-color: #7c3aed;
      color: #4c1d95;
    }
    
    /* List Styles */
    .email-content ul, .email-content ol {
      margin: 15px 0;
      padding-left: 25px;
      color: #4b5563;
      text-align: left;
    }
    
    .email-content li {
      margin: 8px 0;
      color: #4b5563;
      text-align: left;
    }
    
    /* Table Styles */
    .email-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .email-table th {
      background-color: #7c3aed;
      color: #ffffff;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #6d28d9;
    }
    
    .email-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      color: #4b5563;
    }
    
    .email-table tr:hover {
      background-color: #f9fafb;
    }
    
    /* Footer - Matching header gradient */
    .email-footer {
      background: #581c87;
      background: linear-gradient(to right, #000000 0%, #581c87 100%);
      padding: 30px;
      text-align: center;
      border-top: none;
    }
    
    .email-footer p {
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      margin: 5px 0;
    }
    
    .email-footer a {
      color: #ffffff;
      text-decoration: none;
      font-weight: 500;
    }
    
    .email-footer a:hover {
      text-decoration: underline;
      color: rgba(255, 255, 255, 0.8);
    }
    
    .email-social-links {
      margin: 20px 0;
    }
    
    .email-social-links a {
      display: inline-block;
      margin: 0 10px;
      color: rgba(255, 255, 255, 0.9);
      text-decoration: none;
      font-weight: 500;
    }
    
    .email-social-links a:hover {
      color: #ffffff;
      text-decoration: underline;
    }
    
    .email-divider {
      height: 1px;
      background-color: rgba(255, 255, 255, 0.2);
      margin: 20px 0;
    }
    
    /* Utility class for centering specific content */
    .email-center {
      text-align: center !important;
    }
    
    /* Responsive Design */
    @media only screen and (max-width: 700px) {
      .email-wrapper {
        padding: 0 !important;
      }
      
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }
      
      .email-header {
        padding: 20px 15px 15px 15px !important;
      }
      
      .email-header img {
        max-width: 180px !important;
      }
      
      .email-body {
        padding: 30px 20px !important;
      }
      
      .email-footer {
        padding: 20px !important;
      }
      
      .email-content h1 {
        font-size: 24px !important;
      }
      
      .email-content h2 {
        font-size: 20px !important;
      }
      
      .email-button {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        box-sizing: border-box !important;
      }
      
      .email-table {
        font-size: 14px !important;
      }
      
      .email-table th,
      .email-table td {
        padding: 8px !important;
      }
      
      .email-social-links a {
        display: inline-block !important;
        margin: 5px !important;
      }
    }
    
    @media only screen and (max-width: 480px) {
      .email-header {
        padding: 15px 10px 12px 10px !important;
      }
      
      .email-header img {
        max-width: 150px !important;
      }
      
      .email-body {
        padding: 25px 15px !important;
      }
      
      .email-content h1 {
        font-size: 22px !important;
      }
      
      .email-content h2 {
        font-size: 18px !important;
      }
      
      .email-content {
        font-size: 14px !important;
      }
      
      .email-button {
        padding: 12px 20px !important;
        font-size: 14px !important;
      }
    }
  </style>
`;

export const EMAIL_TEMPLATE_HEADER = `
  <div class="email-header">
    <a href="{{websiteUrl}}" class="email-logo">
      <img src="{{logoUrl}}" alt="Car Audio Events" style="width: 100%; max-width: 250px; height: auto; margin-bottom: 5px; display: block; margin-left: auto; margin-right: auto;">
    </a>
    <div class="email-tagline">The Premier Car Audio Competition Platform</div>
  </div>
`;

export const EMAIL_TEMPLATE_FOOTER = `
  <div class="email-footer">
    <div class="email-social-links">
      <a href="https://facebook.com/caraudioevents">Facebook</a>
      <a href="https://twitter.com/caraudioevents">Twitter</a>
      <a href="https://instagram.com/caraudioevents">Instagram</a>
      <a href="https://youtube.com/caraudioevents">YouTube</a>
    </div>
    
    <div class="email-divider"></div>
    
    <p>© 2025 Car Audio Events. All rights reserved.</p>
    <p>
      <a href="{{websiteUrl}}">Visit Website</a> • 
      <a href="{{websiteUrl}}/support">Support</a> • 
      <a href="{{websiteUrl}}/privacy">Privacy Policy</a>
    </p>
    <p style="margin-top: 15px; font-size: 12px; color: rgba(255, 255, 255, 0.7);">
      You received this email because you're registered with Car Audio Events.
      <br>
      <a href="{{unsubscribe_link}}" style="color: rgba(255, 255, 255, 0.6);">Unsubscribe</a> • 
      <a href="{{preferences_link}}" style="color: rgba(255, 255, 255, 0.6);">Email Preferences</a>
    </p>
  </div>
`;

export function wrapEmailTemplate(content: string, options?: {
  includeHeader?: boolean;
  includeFooter?: boolean;
  title?: string;
  websiteUrl?: string;
  logoUrl?: string;
  unsubscribeLink?: string;
  preferencesLink?: string;
}): string {
  const { 
    includeHeader = true, 
    includeFooter = true, 
    title = 'Car Audio Events',
    websiteUrl = 'https://caraudioevents.com',
    logoUrl = 'https://caraudioevents.com/assets/logos/cae-logo-main.png',
    unsubscribeLink = 'https://caraudioevents.com/unsubscribe',
    preferencesLink = 'https://caraudioevents.com/preferences'
  } = options || {};
  
  // Replace placeholders
  let header = EMAIL_TEMPLATE_HEADER;
  header = header.replace(/{{websiteUrl}}/g, websiteUrl);
  header = header.replace(/{{logoUrl}}/g, logoUrl);
  
  let footer = EMAIL_TEMPLATE_FOOTER;
  footer = footer.replace(/{{websiteUrl}}/g, websiteUrl);
  footer = footer.replace(/{{unsubscribe_link}}/g, unsubscribeLink);
  footer = footer.replace(/{{preferences_link}}/g, preferencesLink);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  ${EMAIL_TEMPLATE_STYLES}
</head>
<body>
  <div class="email-wrapper">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center">
          <div class="email-container">
            ${includeHeader ? header : ''}
            <div class="email-body">
              <div class="email-content">
                ${content}
              </div>
            </div>
            ${includeFooter ? footer : ''}
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `.trim();
}

// Example usage components for common email patterns
export const EMAIL_COMPONENTS = {
  button: (text: string, url: string, secondary = false) => 
    `<div class="email-center">
      <a href="${url}" class="${secondary ? 'email-button-secondary' : 'email-button'}">${text}</a>
    </div>`,
  
  infoBox: (title: string, content: string) => `
    <div class="email-info-box">
      <h4>${title}</h4>
      <p>${content}</p>
    </div>
  `,
  
  alert: (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => `
    <div class="email-alert email-alert-${type}">
      ${message}
    </div>
  `,
  
  divider: () => '<div class="email-divider"></div>',
  
  table: (headers: string[], rows: string[][]) => {
    const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
    const rowsHtml = rows.map(row => 
      `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
    ).join('');
    
    return `
      <table class="email-table">
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;
  }
};