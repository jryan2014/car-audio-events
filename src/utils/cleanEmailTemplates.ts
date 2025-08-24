// Utility to clean old dark styling from email templates
// Run this from the browser console while logged in as admin

import { supabase } from '../lib/supabase';

export async function cleanEmailTemplates() {
  console.log('🔍 Fetching all email templates...');
  
  const { data: templates, error } = await supabase
    .from('email_templates')
    .select('id, name, body, html_body');
  
  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }
  
  console.log(`Found ${templates?.length || 0} templates to check`);
  
  let updatedCount = 0;
  
  for (const template of templates || []) {
    const content = template.body || template.html_body || '';
    
    if (!content) continue;
    
    // Check if template has old dark styling
    const hasOldStyling = 
      content.includes('background:#1a1a2e') || 
      content.includes('background:#1f2937') ||
      content.includes('background: #1a1a2e') ||
      content.includes('background: #1f2937') ||
      content.includes('Professional Car Audio Competition Platform');
    
    if (hasOldStyling) {
      console.log(`\n📧 Template: ${template.name}`);
      console.log('  Found old styling, cleaning...');
      
      let cleanedContent = content;
      
      // Remove complete old header structures
      // This pattern matches the old dark header table structure
      cleanedContent = cleanedContent.replace(
        /<!--\[if mso\]>[\s\S]*?<!\[endif\]-->\s*<table[^>]*?style="[^"]*background:\s*#1a1a2e[^"]*"[\s\S]*?<td[^>]*?style="[^"]*background:\s*#ffffff[^"]*"[^>]*>/gi,
        ''
      );
      
      // Alternative pattern for headers without MSO conditionals
      cleanedContent = cleanedContent.replace(
        /<table[^>]*?style="[^"]*background:\s*#1a1a2e[^"]*"[\s\S]*?Professional Car Audio Competition Platform[\s\S]*?<td[^>]*?style="[^"]*background:\s*#ffffff[^"]*"[^>]*>/gi,
        ''
      );
      
      // Remove old footers
      cleanedContent = cleanedContent.replace(
        /<\/td>\s*<\/tr>\s*<tr>\s*<td[^>]*?style="[^"]*background:\s*#1f2937[^"]*"[\s\S]*?© 2025 Car Audio Events[\s\S]*?<\/table>\s*(?:<!--\[if mso\]>[\s\S]*?<!\[endif\]-->)?/gi,
        ''
      );
      
      // Remove any remaining tables with dark backgrounds
      cleanedContent = cleanedContent.replace(
        /<table[^>]*?style="[^"]*background:\s*#1a1a2e[^"]*"[^>]*>[\s\S]*?<\/table>/gi,
        ''
      );
      
      cleanedContent = cleanedContent.replace(
        /<table[^>]*?style="[^"]*background:\s*#1f2937[^"]*"[^>]*>[\s\S]*?<\/table>/gi,
        ''
      );
      
      // Remove trailing closing tags that might be left over
      cleanedContent = cleanedContent.replace(
        /^\s*<\/td>\s*<\/tr>\s*<\/table>\s*$/gi,
        ''
      );
      
      // Clean up any duplicate whitespace
      cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
      cleanedContent = cleanedContent.trim();
      
      // Only update if we actually changed something
      if (cleanedContent !== content) {
        // Update the template
        const { error: updateError } = await supabase
          .from('email_templates')
          .update({ 
            body: cleanedContent,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id);
        
        if (updateError) {
          console.error(`  ❌ Error updating template ${template.name}:`, updateError);
        } else {
          console.log(`  ✅ Successfully cleaned template`);
          updatedCount++;
        }
      }
    }
  }
  
  console.log(`\n✨ Cleaning complete! Updated ${updatedCount} templates`);
  
  // Also clean any emails currently in the queue
  console.log('\n🔍 Checking email queue...');
  
  const { data: queuedEmails, error: queueError } = await supabase
    .from('email_queue')
    .select('id, html_content, status')
    .eq('status', 'pending');
  
  if (!queueError && queuedEmails) {
    let queueUpdated = 0;
    
    for (const email of queuedEmails) {
      if (email.html_content && 
          (email.html_content.includes('background:#1a1a2e') || 
           email.html_content.includes('background:#1f2937') ||
           email.html_content.includes('background: #1a1a2e') ||
           email.html_content.includes('background: #1f2937'))) {
        
        console.log('  Cleaning queued email...');
        
        let cleanedContent = email.html_content;
        
        // Apply same cleaning patterns
        cleanedContent = cleanedContent.replace(
          /<!--\[if mso\]>[\s\S]*?<!\[endif\]-->\s*<table[^>]*?style="[^"]*background:\s*#1a1a2e[^"]*"[\s\S]*?<td[^>]*?style="[^"]*background:\s*#ffffff[^"]*"[^>]*>/gi,
          ''
        );
        
        cleanedContent = cleanedContent.replace(
          /<\/td>\s*<\/tr>\s*<tr>\s*<td[^>]*?style="[^"]*background:\s*#1f2937[^"]*"[\s\S]*?<\/table>\s*(?:<!--\[if mso\]>[\s\S]*?<!\[endif\]-->)?/gi,
          ''
        );
        
        cleanedContent = cleanedContent.replace(
          /<table[^>]*?style="[^"]*background:\s*#1a1a2e[^"]*"[^>]*>[\s\S]*?<\/table>/gi,
          ''
        );
        
        cleanedContent = cleanedContent.replace(
          /<table[^>]*?style="[^"]*background:\s*#1f2937[^"]*"[^>]*>[\s\S]*?<\/table>/gi,
          ''
        );
        
        cleanedContent = cleanedContent.trim();
        
        // Update the queued email
        const { error: updateError } = await supabase
          .from('email_queue')
          .update({ 
            html_content: cleanedContent
          })
          .eq('id', email.id);
        
        if (!updateError) {
          queueUpdated++;
        }
      }
    }
    
    if (queueUpdated > 0) {
      console.log(`✅ Cleaned ${queueUpdated} queued emails`);
    }
  }
  
  console.log('\n🎉 All done! Email templates have been cleaned of old dark styling.');
  console.log('The edge functions will now properly wrap them with the new theme.');
  
  return { templatesUpdated: updatedCount };
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).cleanEmailTemplates = cleanEmailTemplates;
}