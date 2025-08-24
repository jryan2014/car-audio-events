// Outlook-compatible email wrapper for Car Audio Events
// Uses table-based layout and inline styles that work in Outlook

import { processEmailContentForOutlook } from './outlook-content-helper.ts';

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
  
  // Process content to make it Outlook-compatible
  cleanContent = processEmailContentForOutlook(cleanContent);

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
  <style type="text/css">
    table {border-collapse: collapse;}
    .gradient-bg {
      background-color: #581c87 !important;
    }
  </style>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    
    /* Remove default styling */
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100% !important; background-color: #f4f4f4 !important; font-family: Arial, sans-serif !important; }
    
    /* Table styles */
    table { border-collapse: collapse !important; }
    
    /* Links */
    a { color: #7c3aed; text-decoration: underline; }
    
    /* Hide MSO-specific content from other clients */
    .mso-hide { display: none !important; }
    
    /* Gradient background for modern clients */
    .gradient-bg {
      background: #581c87;
      background: -webkit-linear-gradient(left, #000000 0%, #581c87 100%);
      background: -o-linear-gradient(left, #000000 0%, #581c87 100%);
      background: -ms-linear-gradient(left, #000000 0%, #581c87 100%);
      background: -moz-linear-gradient(left, #000000 0%, #581c87 100%);
      background: linear-gradient(to right, #000000 0%, #581c87 100%);
    }
    
    /* Rounded corners for modern clients */
    .rounded-container {
      border-radius: 12px;
      overflow: hidden;
    }
    
    /* Responsive styles */
    @media only screen and (max-width: 700px) {
      .container { width: 100% !important; }
      .content { padding: 10px !important; }
      .mobile-padding { padding: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <!-- Email Body -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Container -->
        <!--[if mso]>
        <table width="700" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background-color: #ffffff;">
        <![endif]-->
        <!--[if !mso]><!-->
        <table width="700" cellpadding="0" cellspacing="0" border="0" class="rounded-container" style="max-width: 700px; width: 100%; background-color: #ffffff;">
        <!--<![endif]-->
          
          ${includeHeader ? `
          <!-- Header -->
          <tr>
            <td class="gradient-bg" style="padding: 0;">
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:700px;height:135px;">
                <v:fill type="gradient" color="#000000" color2="#581c87" angle="270" />
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,20px,0,20px">
              <![endif]-->
              <div>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding: 20px 30px 15px 30px;">
                      <!-- Logo with explicit height for Outlook -->
                      <!--[if mso]>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding: 0;">
                            <img src="${logoUrl}" alt="Car Audio Events" width="180" height="65" style="display: block; border: 0;" />
                          </td>
                        </tr>
                      </table>
                      <![endif]-->
                      <!--[if !mso]><!-->
                      <a href="${websiteUrl}" style="display: inline-block; text-decoration: none;">
                        <img src="${logoUrl}" alt="Car Audio Events" width="180" style="display: block; width: 180px; height: auto; max-width: 180px; border: 0;" />
                      </a>
                      <!--<![endif]-->
                      <p style="color: #ffffff; font-size: 13px; font-weight: 300; margin: 10px 0 0 0; padding: 0; font-family: Arial, sans-serif;">
                        The Premier Car Audio Competition Platform
                      </p>
                    </td>
                  </tr>
                </table>
              </div>
              <!--[if mso]>
                </v:textbox>
              </v:rect>
              <![endif]-->
            </td>
          </tr>
          ` : ''}
          
          <!-- Content Area -->
          <tr>
            <td bgcolor="#ffffff" style="padding: 60px 30px 40px 30px; background-color: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #333333; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6;">
                    ${cleanContent}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          ${includeFooter ? `
          <!-- Footer -->
          <tr>
            <td class="gradient-bg" style="padding: 0;">
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:700px;height:250px;">
                <v:fill type="gradient" color="#000000" color2="#581c87" angle="270" />
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <div>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding: 30px; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px;">
                      <!-- Social Links -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding-bottom: 20px;">
                            <a href="https://facebook.com/caraudioevents" style="color: #ffffff; text-decoration: none; margin: 0 10px; font-family: Arial, sans-serif;">Facebook</a>
                            <span style="color: #ffffff;"> &nbsp; </span>
                            <a href="https://twitter.com/caraudioevents" style="color: #ffffff; text-decoration: none; margin: 0 10px; font-family: Arial, sans-serif;">Twitter</a>
                            <span style="color: #ffffff;"> &nbsp; </span>
                            <a href="https://instagram.com/caraudioevents" style="color: #ffffff; text-decoration: none; margin: 0 10px; font-family: Arial, sans-serif;">Instagram</a>
                            <span style="color: #ffffff;"> &nbsp; </span>
                            <a href="https://youtube.com/caraudioevents" style="color: #ffffff; text-decoration: none; margin: 0 10px; font-family: Arial, sans-serif;">YouTube</a>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding-bottom: 10px;">
                            <p style="margin: 0; color: #ffffff; font-family: Arial, sans-serif;">© 2025 Car Audio Events. All rights reserved.</p>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding-bottom: 10px;">
                            <a href="${websiteUrl}" style="color: #ffffff; text-decoration: none; font-family: Arial, sans-serif;">Visit Website</a>
                            <span style="color: #ffffff;"> • </span>
                            <a href="${websiteUrl}/support" style="color: #ffffff; text-decoration: none; font-family: Arial, sans-serif;">Support</a>
                            <span style="color: #ffffff;"> • </span>
                            <a href="${websiteUrl}/privacy" style="color: #ffffff; text-decoration: none; font-family: Arial, sans-serif;">Privacy Policy</a>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding-top: 15px;">
                            <p style="margin: 0; color: #cccccc; font-size: 12px; font-family: Arial, sans-serif;">
                              You received this email because you're registered with Car Audio Events.<br>
                              <a href="${unsubscribeLink}" style="color: #cccccc; font-family: Arial, sans-serif;">Unsubscribe</a> • 
                              <a href="${preferencesLink}" style="color: #cccccc; font-family: Arial, sans-serif;">Email Preferences</a>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
              <!--[if mso]>
                </v:textbox>
              </v:rect>
              <![endif]-->
            </td>
          </tr>
          ` : ''}
          
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>`;
}