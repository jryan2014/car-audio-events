#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Security Headers Migration Script
 * 
 * This script applies security headers to all existing Supabase edge functions.
 * It updates the import statements and response creation to use the new security middleware.
 */

import { walk } from "https://deno.land/std@0.208.0/fs/walk.ts";

interface FunctionUpdate {
  file: string;
  updated: boolean;
  errors: string[];
}

/**
 * Apply security headers to an edge function file
 */
async function updateEdgeFunction(filePath: string): Promise<FunctionUpdate> {
  const result: FunctionUpdate = {
    file: filePath,
    updated: false,
    errors: []
  };

  try {
    const content = await Deno.readTextFile(filePath);
    let updatedContent = content;
    
    // Check if already updated
    if (content.includes('security-headers.ts')) {
      result.errors.push('Already contains security headers import - skipping');
      return result;
    }
    
    // Add security headers import after CORS import
    if (content.includes("from '../_shared/cors.ts'")) {
      updatedContent = updatedContent.replace(
        "from '../_shared/cors.ts'",
        "from '../_shared/cors.ts'\nimport { EdgeFunctionHeaders, createSecurityMiddleware, addRateLimitHeaders } from '../_shared/security-headers.ts'"
      );
    } else {
      // Add import at the top with other imports
      const importPattern = /import.*from.*['"]https:\/\/.*['"];?\s*\n/g;
      const lastImportMatch = Array.from(content.matchAll(importPattern)).pop();
      
      if (lastImportMatch) {
        const insertIndex = lastImportMatch.index! + lastImportMatch[0].length;
        updatedContent = 
          updatedContent.slice(0, insertIndex) +
          "import { EdgeFunctionHeaders, createSecurityMiddleware, addRateLimitHeaders } from '../_shared/security-headers.ts'\n" +
          updatedContent.slice(insertIndex);
      }
    }
    
    // Replace handleCors with handleSecureCors
    updatedContent = updatedContent.replace(/handleCors\(/g, 'handleSecureCors(');
    
    // Add security middleware initialization
    if (content.includes('const corsHeaders = getCorsHeaders(req)')) {
      updatedContent = updatedContent.replace(
        'const corsHeaders = getCorsHeaders(req);',
        `// Initialize security middleware
  const securityMiddleware = createSecurityMiddleware();
  
  // Validate request security
  const requestValidation = securityMiddleware.validateRequest(req);
  if (!requestValidation.valid) {
    return requestValidation.response!;
  }
  
  const corsHeaders = getCorsHeaders(req);`
      );
    }
    
    // Determine function type and apply appropriate headers
    let headerType = 'data';
    if (filePath.includes('payment') || filePath.includes('stripe') || filePath.includes('paypal')) {
      headerType = 'payment';
    } else if (filePath.includes('auth') || filePath.includes('login') || filePath.includes('register')) {
      headerType = 'auth';
    } else if (filePath.includes('webhook')) {
      headerType = 'webhook';
    } else if (filePath.includes('admin')) {
      headerType = 'admin';
    } else if (filePath.includes('email') || filePath.includes('mailgun')) {
      headerType = 'email';
    }
    
    // Add appropriate headers based on function type
    if (!content.includes('EdgeFunctionHeaders.')) {
      updatedContent = updatedContent.replace(
        'const corsHeaders = getCorsHeaders(req);',
        `const corsHeaders = getCorsHeaders(req);
  const secureHeaders = EdgeFunctionHeaders.${headerType}(corsHeaders);`
      );
    }
    
    // Update response creation patterns
    const responsePatterns = [
      // Standard JSON responses
      {
        pattern: /new Response\(\s*JSON\.stringify\([^)]+\),\s*{\s*headers:\s*{\s*\.\.\.corsHeaders(?:,\s*\.\.\.rateLimitHeaders)?\s*},\s*status:\s*(\d+)/g,
        replacement: (match: string, status: string) => {
          const hasRateLimit = match.includes('rateLimitHeaders');
          const headersVar = hasRateLimit ? 'addRateLimitHeaders(secureHeaders, rateLimitHeaders)' : 'secureHeaders';
          return match.replace(
            /headers:\s*{\s*\.\.\.corsHeaders(?:,\s*\.\.\.rateLimitHeaders)?\s*}/,
            `headers: ${headersVar}`
          );
        }
      }
    ];
    
    // Apply response pattern updates
    responsePatterns.forEach(({ pattern, replacement }) => {
      updatedContent = updatedContent.replace(pattern, replacement as any);
    });
    
    // Check if any changes were made
    if (updatedContent !== content) {
      await Deno.writeTextFile(filePath, updatedContent);
      result.updated = true;
      console.log(`✅ Updated: ${filePath}`);
    } else {
      result.errors.push('No changes needed or pattern not matched');
    }
    
  } catch (error) {
    result.errors.push(`Error processing file: ${error.message}`);
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
  
  return result;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔒 Applying security headers to Supabase edge functions...\n');
  
  const functionsDir = '../supabase/functions';
  const results: FunctionUpdate[] = [];
  
  // Walk through all TypeScript files in functions directory
  for await (const entry of walk(functionsDir, { 
    exts: ['.ts'], 
    skip: [/_shared/] // Skip shared directory
  })) {
    if (entry.isFile && entry.name === 'index.ts') {
      const result = await updateEdgeFunction(entry.path);
      results.push(result);
    }
  }
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`Total functions processed: ${results.length}`);
  console.log(`Successfully updated: ${results.filter(r => r.updated).length}`);
  console.log(`Skipped/Errors: ${results.filter(r => !r.updated).length}`);
  
  // Show errors
  const errored = results.filter(r => r.errors.length > 0);
  if (errored.length > 0) {
    console.log('\n⚠️  Functions with issues:');
    errored.forEach(r => {
      console.log(`  ${r.file}:`);
      r.errors.forEach(err => console.log(`    - ${err}`));
    });
  }
  
  console.log('\n✅ Security headers migration complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Test all edge functions to ensure they work correctly');
  console.log('2. Deploy functions using: npx supabase functions deploy --all');
  console.log('3. Monitor function logs for any security header issues');
}

// Run the script
if (import.meta.main) {
  main().catch(console.error);
}