// Outlook-compatible email wrapper for Car Audio Events (Client-side version)
// Uses table-based layout and inline styles that work in Outlook

export const EMAIL_TEMPLATE_HEADER_OUTLOOK = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 0; background: #581c87; background: linear-gradient(to right, #000000 0%, #581c87 100%);">
      <!--[if mso]>
      <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:700px; height:135px;">
        <v:fill type="gradient" color="#000000" color2="#581c87" angle="270" />
        <v:textbox style="mso-fit-shape-to-text:true" inset="0,20px,0,20px">
      <![endif]-->
      <table width="700" cellpadding="0" cellspacing="0" border="0" style="max-width: 700px; width: 100%;">
        <tr>
          <td align="center" style="padding: 20px 30px 15px 30px;">
            <!--[if mso]>
            <img src="https://caraudioevents.com/assets/logos/cae-logo-main.png" alt="Car Audio Events" width="180" height="65" style="display: block; border: 0;" />
            <![endif]-->
            <!--[if !mso]><!-->
            <img src="https://caraudioevents.com/assets/logos/cae-logo-main.png" alt="Car Audio Events" width="180" height="auto" style="display: block; margin: 0 auto; width: 180px; max-width: 180px;" />
            <!--<![endif]-->
            <p style="color: #ffffff; font-size: 13px; margin: 10px 0 0 0; padding: 0; font-family: Arial, sans-serif;">
              The Premier Car Audio Competition Platform
            </p>
          </td>
        </tr>
      </table>
      <!--[if mso]>
        </v:textbox>
      </v:rect>
      <![endif]-->
    </td>
  </tr>
</table>
`;

export const EMAIL_TEMPLATE_FOOTER_OUTLOOK = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 20px; background: #581c87; background: linear-gradient(to right, #000000 0%, #581c87 100%);">
      <!--[if mso]>
      <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:700px;height:250px;">
        <v:fill type="gradient" color="#000000" color2="#581c87" angle="270" />
        <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
      <![endif]-->
      <table width="700" cellpadding="0" cellspacing="0" border="0" style="max-width: 700px; width: 100%;">
        <tr>
          <td align="center" style="padding: 30px; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding-bottom: 20px;">
                  <a href="https://facebook.com/caraudioevents" style="color: #ffffff; text-decoration: none; margin: 0 10px;">Facebook</a>
                  <a href="https://twitter.com/caraudioevents" style="color: #ffffff; text-decoration: none; margin: 0 10px;">Twitter</a>
                  <a href="https://instagram.com/caraudioevents" style="color: #ffffff; text-decoration: none; margin: 0 10px;">Instagram</a>
                  <a href="https://youtube.com/caraudioevents" style="color: #ffffff; text-decoration: none; margin: 0 10px;">YouTube</a>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-bottom: 10px;">
                  <p style="margin: 0; color: #ffffff;">© 2025 Car Audio Events. All rights reserved.</p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-bottom: 10px;">
                  <a href="{{websiteUrl}}" style="color: #ffffff; text-decoration: none;">Visit Website</a>
                  <span style="color: #ffffff;"> • </span>
                  <a href="{{websiteUrl}}/support" style="color: #ffffff; text-decoration: none;">Support</a>
                  <span style="color: #ffffff;"> • </span>
                  <a href="{{websiteUrl}}/privacy" style="color: #ffffff; text-decoration: none;">Privacy Policy</a>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-top: 15px;">
                  <p style="margin: 0; color: #cccccc; font-size: 12px;">
                    You received this email because you're registered with Car Audio Events.<br>
                    <a href="{{unsubscribe_link}}" style="color: #cccccc;">Unsubscribe</a> • 
                    <a href="{{preferences_link}}" style="color: #cccccc;">Email Preferences</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <!--[if mso]>
        </v:textbox>
      </v:rect>
      <![endif]-->
    </td>
  </tr>
</table>
`;

export function wrapEmailTemplateOutlook(
  content: string,
  options?: {
    includeHeader?: boolean;
    includeFooter?: boolean;
    title?: string;
    websiteUrl?: string;
    logoUrl?: string;
    unsubscribeLink?: string;
    preferencesLink?: string;
  }
): string {
  const {
    includeHeader = true,
    includeFooter = true,
    title = 'Car Audio Events',
    websiteUrl = 'https://caraudioevents.com',
    logoUrl = 'https://caraudioevents.com/assets/logos/cae-logo-main.png',
    unsubscribeLink = 'https://caraudioevents.com/unsubscribe',
    preferencesLink = 'https://caraudioevents.com/preferences'
  } = options || {};

  // Clean content - remove any existing wrapper structure
  let cleanContent = content;
  
  // Remove any existing DOCTYPE, html, head, or body tags
  cleanContent = cleanContent.replace(/<!DOCTYPE[^>]*>/gi, '');
  cleanContent = cleanContent.replace(/<html[^>]*>/gi, '');
  cleanContent = cleanContent.replace(/<\/html>/gi, '');
  cleanContent = cleanContent.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  cleanContent = cleanContent.replace(/<body[^>]*>/gi, '');
  cleanContent = cleanContent.replace(/<\/body>/gi, '');
  
  // Remove any email-wrapper divs that might be nested
  cleanContent = cleanContent.replace(/<div class="email-wrapper"[^>]*>[\s\S]*?<div class="email-container"[^>]*>/gi, '');
  cleanContent = cleanContent.replace(/<div class="email-header"[^>]*>[\s\S]*?<\/div>\s*<div class="email-body"[^>]*>/gi, '');
  cleanContent = cleanContent.replace(/<\/div>\s*<div class="email-footer"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, '');
  
  // Replace placeholders
  let header = EMAIL_TEMPLATE_HEADER_OUTLOOK;
  header = header.replace(/{{websiteUrl}}/g, websiteUrl);
  header = header.replace(/{{logoUrl}}/g, logoUrl);

  let footer = EMAIL_TEMPLATE_FOOTER_OUTLOOK;
  footer = footer.replace(/{{websiteUrl}}/g, websiteUrl);
  footer = footer.replace(/{{unsubscribe_link}}/g, unsubscribeLink);
  footer = footer.replace(/{{preferences_link}}/g, preferencesLink);

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    
    /* Remove default styling */
    body { margin: 0; padding: 0; width: 100% !important; min-width: 100%; background-color: #f4f4f4; }
    
    /* Table styles */
    table { border-collapse: collapse !important; }
    
    /* Links */
    a { color: #7c3aed; text-decoration: underline; }
    
    /* Responsive styles */
    @media only screen and (max-width: 700px) {
      .container { width: 100% !important; }
      .content { padding: 10px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  <!-- Wrapper table -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        
        <!-- Main container with rounded corners -->
        <table width="700" cellpadding="0" cellspacing="0" border="0" style="max-width: 700px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          ${includeHeader ? header : ''}
          
          <!-- Content area -->
          <tr>
            <td bgcolor="#ffffff" style="padding: 60px 30px 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #333333; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6;">
                    ${cleanContent}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          ${includeFooter ? footer : ''}
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>`;
}