import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';
import { EmailProviderManager } from '../_shared/email-provider-manager.ts';
import { wrapEmailTemplate } from '../_shared/email-wrapper.ts';
import { wrapEmailTemplateOutlook } from '../_shared/email-wrapper-outlook.ts';

interface RequestBody {
  provider_id?: string;
  provider_type?: 'postmark' | 'sendgrid' | 'smtp';
  test_email?: string;
  template_id?: string;
  placeholders?: Record<string, string>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { provider_id, provider_type, test_email, template_id, placeholders } = await req.json() as RequestBody;
    
    // Verify admin user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseAdmin = createSupabaseAdminClient();
    
    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Check if user is admin
    const { data: userData, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (roleError || userData?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get provider configuration
    let providerConfig;
    let fromEmail = 'noreply@caraudioevents.com';
    let fromName = 'Car Audio Events';
    
    if (provider_id) {
      // Get provider and a default address
      const { data: provider } = await supabaseAdmin
        .from('email_providers')
        .select('*')
        .eq('id', provider_id)
        .single();
      
      if (!provider) {
        throw new Error('Provider not found');
      }
      
      // Get a default address for this provider
      const { data: address } = await supabaseAdmin
        .from('email_addresses')
        .select('*')
        .eq('provider_id', provider_id)
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (address) {
        fromEmail = address.email_address;
        fromName = address.from_name;
      }
      
      providerConfig = provider.provider_type;
    } else if (provider_type) {
      providerConfig = provider_type;
    } else {
      // Use default primary provider
      providerConfig = 'auto';
    }

    // Initialize email manager
    const emailManager = new EmailProviderManager(providerConfig as any);
    
    // Prepare test email
    const testEmailAddress = test_email || user.email || 'admin@caraudioevents.com';
    let testSubject: string;
    let testHtml: string;
    let testText: string;
    let templateUsed = false;
    
    // Check if we should use a template
    if (template_id) {
      // Fetch the template
      const { data: template, error: templateError } = await supabaseAdmin
        .from('email_templates')
        .select('*')
        .eq('id', template_id)
        .single();
      
      if (template && !templateError) {
        testSubject = template.subject || `Test Email - ${template.name}`;
        testHtml = template.html_body || template.body || '';
        testText = template.body || '';
        templateUsed = true;
        
        // Create base replacements with system defaults
        const currentDate = new Date();
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const defaultReplacements = {
          // User data
          'user_name': placeholders?.user_name || 'Test User',
          'user_email': testEmailAddress,
          'first_name': placeholders?.first_name || 'Test',
          'firstName': placeholders?.first_name || 'Test', // Alternate format
          'last_name': placeholders?.last_name || 'User',
          
          // Event data
          'event_name': placeholders?.event_name || 'Test Event',
          'event_date': placeholders?.event_date || currentDate.toLocaleDateString(),
          
          // Payment data
          'amount': placeholders?.amount || '$100.00',
          
          // Date/Time data - multiple formats for compatibility
          'current_year': currentDate.getFullYear().toString(),
          'currentYear': currentDate.getFullYear().toString(),
          'current_date': currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          'currentDate': currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          'current_time': currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          'currentTime': currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          'week_date': `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
          'weekDate': `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
          
          // Newsletter specific - Weekly Digest
          'weekly_competitions': placeholders?.weekly_competitions || `
            <ul style="list-style: none; padding: 0;">
              <li style="margin-bottom: 10px;">🏆 <strong>Summer Bass Battle 2025</strong> - July 15, Miami FL</li>
              <li style="margin-bottom: 10px;">🎵 <strong>West Coast Sound Off</strong> - July 22, Los Angeles CA</li>
              <li style="margin-bottom: 10px;">🔊 <strong>Midwest Thunder Championship</strong> - July 29, Chicago IL</li>
            </ul>`,
          'competition_spotlight': placeholders?.competition_spotlight || `
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #dc2626; margin-top: 0;">Featured Event: Summer Bass Battle 2025</h3>
              <p>Join us for the biggest bass competition of the summer! Over $50,000 in prizes, live music, and vendor exhibits. Early bird registration now open with 20% discount.</p>
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://caraudioevents.com/events" style="height:40px;v-text-anchor:middle;width:150px;" arcsize="10%" stroke="f" fillcolor="#dc2626">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">Register Now</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <table cellspacing="0" cellpadding="0" style="margin-top: 10px;">
                <tr>
                  <td align="center" bgcolor="#dc2626" style="border-radius: 5px;">
                    <a href="https://caraudioevents.com/events" target="_blank" style="display: inline-block; background: #dc2626; color: #ffffff; font-family: sans-serif; font-size: 14px; font-weight: bold; line-height: 40px; text-align: center; text-decoration: none; width: 150px; -webkit-text-size-adjust: none; border-radius: 5px;">Register Now</a>
                  </td>
                </tr>
              </table>
              <!--<![endif]-->
            </div>`,
          'competitionSpotlight': placeholders?.competition_spotlight || `
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #dc2626; margin-top: 0;">Featured Event: Summer Bass Battle 2025</h3>
              <p>Join us for the biggest bass competition of the summer! Over $50,000 in prizes, live music, and vendor exhibits. Early bird registration now open with 20% discount.</p>
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://caraudioevents.com/events" style="height:40px;v-text-anchor:middle;width:150px;" arcsize="10%" stroke="f" fillcolor="#dc2626">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">Register Now</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <table cellspacing="0" cellpadding="0" style="margin-top: 10px;">
                <tr>
                  <td align="center" bgcolor="#dc2626" style="border-radius: 5px;">
                    <a href="https://caraudioevents.com/events" target="_blank" style="display: inline-block; background: #dc2626; color: #ffffff; font-family: sans-serif; font-size: 14px; font-weight: bold; line-height: 40px; text-align: center; text-decoration: none; width: 150px; -webkit-text-size-adjust: none; border-radius: 5px;">Register Now</a>
                  </td>
                </tr>
              </table>
              <!--<![endif]-->
            </div>`,
          'tech_tips': placeholders?.tech_tips || `
            <div style="margin: 20px 0;">
              <h4 style="color: #1e40af;">This Week's Tech Tip</h4>
              <p><strong>Proper Box Tuning for Maximum SPL</strong></p>
              <p>Did you know that tuning your enclosure 5-10Hz above your vehicle's resonant frequency can increase your SPL by 2-3dB? Use our Box Calculator tool to find your optimal tuning frequency.</p>
            </div>`,
          'techTips': placeholders?.tech_tips || `
            <div style="margin: 20px 0;">
              <h4 style="color: #1e40af;">This Week's Tech Tip</h4>
              <p><strong>Proper Box Tuning for Maximum SPL</strong></p>
              <p>Did you know that tuning your enclosure 5-10Hz above your vehicle's resonant frequency can increase your SPL by 2-3dB? Use our Box Calculator tool to find your optimal tuning frequency.</p>
            </div>`,
          'weeklyCompetitions': placeholders?.weekly_competitions || `
            <ul style="list-style: none; padding: 0;">
              <li style="margin-bottom: 10px;">🏆 <strong>Summer Bass Battle 2025</strong> - July 15, Miami FL</li>
              <li style="margin-bottom: 10px;">🎵 <strong>West Coast Sound Off</strong> - July 22, Los Angeles CA</li>
              <li style="margin-bottom: 10px;">🔊 <strong>Midwest Thunder Championship</strong> - July 29, Chicago IL</li>
            </ul>`,
          
          // System URLs - multiple formats for compatibility
          'site_url': 'https://caraudioevents.com',
          'siteUrl': 'https://caraudioevents.com',
          'website_url': 'https://caraudioevents.com',
          'websiteUrl': 'https://caraudioevents.com',
          'site_name': 'Car Audio Events',
          'siteName': 'Car Audio Events',
          'dashboard_link': 'https://caraudioevents.com/dashboard',
          'dashboardLink': 'https://caraudioevents.com/dashboard',
          'dashboardUrl': 'https://caraudioevents.com/dashboard',
          'unsubscribe_link': 'https://caraudioevents.com/unsubscribe',
          'unsubscribeLink': 'https://caraudioevents.com/unsubscribe',
          'preferences_link': 'https://caraudioevents.com/preferences',
          'preferencesLink': 'https://caraudioevents.com/preferences',
          'support_email': 'support@caraudioevents.com',
          'supportEmail': 'support@caraudioevents.com',
          'admin_email': 'admin@caraudioevents.com',
          'adminEmail': 'admin@caraudioevents.com'
        };
        
        // Merge any additional placeholders passed in
        const allReplacements = { ...defaultReplacements };
        if (placeholders) {
          // Add any custom placeholders that weren't in our defaults
          for (const [key, value] of Object.entries(placeholders)) {
            if (!allReplacements[key]) {
              allReplacements[key] = value;
            }
          }
        }
        
        // Replace all placeholders in content - handle both {{var}} and {{{var}}} formats
        for (const [key, value] of Object.entries(allReplacements)) {
          const regex1 = new RegExp(`{{${key}}}`, 'g');
          const regex2 = new RegExp(`{{{${key}}}}`, 'g');
          const stringValue = String(value);
          
          testHtml = testHtml.replace(regex1, stringValue).replace(regex2, stringValue);
          testText = testText.replace(regex1, stringValue).replace(regex2, stringValue);
          testSubject = testSubject.replace(regex1, stringValue).replace(regex2, stringValue);
        }
        
        // Clean any old wrapper from the template first
        let cleanContent = testHtml;
        
        // If template has old dark theme, extract just the content
        if (testHtml.includes('background:#1a1a2e') || 
            testHtml.includes('background:#1f2937') ||
            testHtml.includes('<!DOCTYPE html')) {
          // Try to extract just the content
          const contentMatch = testHtml.match(/<td[^>]*style="[^"]*background:\s*#ffffff[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
          if (contentMatch) {
            cleanContent = contentMatch[1];
          } else {
            const bodyMatch = testHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (bodyMatch) {
              cleanContent = bodyMatch[1];
            }
          }
        }
        
        // Check if the template already has a complete structure
        const isCompleteTemplate = testHtml && (
          testHtml.includes('<!DOCTYPE') ||
          testHtml.includes('<html') ||
          testHtml.includes('email-wrapper') ||
          testHtml.includes('email-container') ||
          testHtml.includes('xmlns:v="urn:schemas-microsoft-com:vml"') ||
          testHtml.includes('linear-gradient')
        );
        
        // Only wrap if it's NOT already complete
        if (!isCompleteTemplate) {
          // Wrap the template with Outlook-compatible header and footer
          testHtml = wrapEmailTemplateOutlook(cleanContent.trim(), {
            title: testSubject,
            includeHeader: true,
            includeFooter: true
          });
        } else {
          // Template is already complete, use as-is
          console.log('Template already has complete structure, not wrapping');
        }
      }
    }
    
    // Use default test email if no template
    if (!templateUsed) {
      testSubject = `Test Email from Car Audio Events - ${new Date().toLocaleString()}`;
      const testContent = `
          <h2>Email Provider Test</h2>
          <p>This is a test email to verify your email configuration is working correctly.</p>
          
          <div class="email-info-box">
            <h4>Test Details:</h4>
            <p><strong>Provider:</strong> ${providerConfig}</p>
            <p><strong>From:</strong> ${fromName} &lt;${fromEmail}&gt;</p>
            <p><strong>To:</strong> ${testEmailAddress}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p>If you received this email, your email configuration is working correctly!</p>
      `;
      
      // Wrap with Outlook-compatible header and footer for better email client support
      testHtml = wrapEmailTemplateOutlook(testContent, {
        title: testSubject,
        includeHeader: true,
        includeFooter: true
      });
      
      testText = `Email Provider Test

This is a test email to verify your email configuration is working correctly.

Test Details:
- Provider: ${providerConfig}
- From: ${fromName} <${fromEmail}>
- To: ${testEmailAddress}
- Time: ${new Date().toLocaleString()}

If you received this email, your email configuration is working correctly!

This is an automated test email from Car Audio Events.`;
    }

    // Send test email
    console.log(`Sending test email to ${testEmailAddress} via ${providerConfig}`);
    const result = await emailManager.sendEmail(
      testEmailAddress,
      testSubject,
      testHtml,
      testText,
      fromEmail,
      fromName
    );

    if (result.success) {
      console.log(`Test email sent successfully via ${result.provider}`);
      
      // Log the test in the database
      await supabaseAdmin
        .from('email_queue')
        .insert({
          to_email: testEmailAddress,
          from_email: fromEmail,
          from_name: fromName,
          subject: testSubject,
          html_content: testHtml,
          body: testText,
          status: 'sent',
          provider_used: result.provider,
          sent_at: new Date().toISOString(),
          metadata: {
            type: 'test',
            initiated_by: user.id,
            provider_tested: providerConfig,
            template_id: template_id || null,
            template_used: templateUsed
          }
        });
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Test email sent successfully via ${result.provider}`,
          provider: result.provider,
          messageId: result.messageId
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    } else {
      throw new Error(result.error || 'Failed to send test email');
    }

  } catch (error) {
    console.error('Test email error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to send test email' 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});