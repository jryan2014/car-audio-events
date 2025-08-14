#!/usr/bin/env node
/**
 * Secret Detection and Prevention System
 * 
 * Scans codebase for accidentally exposed secrets and sensitive data.
 * Can be used as pre-commit hook or in CI/CD pipeline.
 * 
 * Usage:
 *   npm run scan-secrets
 *   npm run scan-secrets -- --fix
 *   npm run scan-secrets -- --staged-only
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  falsePositivePatterns?: RegExp[];
}

interface SecretMatch {
  file: string;
  line: number;
  column: number;
  content: string;
  pattern: SecretPattern;
  context: string;
  redacted: string;
}

interface ScanResult {
  totalFiles: number;
  filesScanned: number;
  secretsFound: number;
  criticalSecrets: number;
  matches: SecretMatch[];
  summary: Record<string, number>;
}

class SecretScanner {
  private patterns: SecretPattern[];
  private excludePatterns: RegExp[];
  private excludeDirectories: string[];
  private secretsIgnorePatterns: string[];
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB

  constructor() {
    this.patterns = this.initializeSecretPatterns();
    this.excludePatterns = this.initializeExcludePatterns();
    this.excludeDirectories = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      '.nuxt',
      'coverage',
      '.backup',
      'logs',
      'tmp',
      'temp'
    ];
    this.secretsIgnorePatterns = this.loadSecretsIgnore();
  }

  /**
   * Load patterns from .secretsignore file
   */
  private loadSecretsIgnore(): string[] {
    const ignorePath = path.join(process.cwd(), '.secretsignore');
    if (!fs.existsSync(ignorePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(ignorePath, 'utf-8');
      return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    } catch (error) {
      console.warn('⚠️  Could not read .secretsignore file:', error);
      return [];
    }
  }

  /**
   * 🔍 Scan for Secrets
   */
  async scanForSecrets(options: {
    directory?: string;
    stagedOnly?: boolean;
    includeTests?: boolean;
    fix?: boolean;
  } = {}): Promise<ScanResult> {
    console.log('🔍 Starting secret detection scan...');
    console.log('📋 Configuration:', {
      directory: options.directory || process.cwd(),
      stagedOnly: options.stagedOnly || false,
      includeTests: options.includeTests || false,
      fix: options.fix || false
    });

    const startTime = Date.now();
    let filesToScan: string[];

    if (options.stagedOnly) {
      filesToScan = this.getStagedFiles();
      console.log(`📁 Scanning ${filesToScan.length} staged files`);
    } else {
      filesToScan = this.getAllSourceFiles(options.directory || process.cwd());
      console.log(`📁 Scanning ${filesToScan.length} source files`);
    }

    const matches: SecretMatch[] = [];
    let filesScanned = 0;

    for (const filePath of filesToScan) {
      try {
        const fileMatches = await this.scanFile(filePath, options.includeTests || false);
        matches.push(...fileMatches);
        filesScanned++;

        if (fileMatches.length > 0) {
          console.log(`⚠️  Found ${fileMatches.length} potential secrets in: ${filePath}`);
        }
      } catch (error) {
        console.warn(`⚠️  Could not scan file ${filePath}:`, error);
      }
    }

    // Generate results
    const result = this.generateScanResult(filesToScan.length, filesScanned, matches);
    
    // Auto-fix if requested
    if (options.fix && matches.length > 0) {
      await this.autoFixSecrets(matches);
    }

    // Display results
    this.displayResults(result, Date.now() - startTime);

    return result;
  }

  /**
   * 📁 Scan Single File
   */
  private async scanFile(filePath: string, includeTests: boolean): Promise<SecretMatch[]> {
    // Skip if file should be excluded
    if (this.shouldExcludeFile(filePath, includeTests)) {
      return [];
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size > this.maxFileSize) {
      console.warn(`⚠️  Skipping large file: ${filePath} (${Math.round(stats.size / 1024)}KB)`);
      return [];
    }

    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const matches: SecretMatch[] = [];

    // Scan each line
    lines.forEach((line, lineIndex) => {
      this.patterns.forEach(pattern => {
        const regex = new RegExp(pattern.pattern, 'gi');
        let match;

        while ((match = regex.exec(line)) !== null) {
          // Check for false positives
          if (this.isFalsePositive(match[0], pattern)) {
            continue;
          }

          matches.push({
            file: filePath,
            line: lineIndex + 1,
            column: match.index + 1,
            content: match[0],
            pattern,
            context: this.getContext(lines, lineIndex),
            redacted: this.redactSecret(match[0])
          });
        }
      });
    });

    return matches;
  }

  /**
   * 🔧 Auto-fix Detected Secrets
   */
  private async autoFixSecrets(matches: SecretMatch[]): Promise<void> {
    console.log('🔧 Attempting to auto-fix detected secrets...');

    const fileChanges = new Map<string, string>();

    for (const match of matches) {
      if (!fileChanges.has(match.file)) {
        fileChanges.set(match.file, fs.readFileSync(match.file, 'utf-8'));
      }

      let content = fileChanges.get(match.file)!;
      const fixedContent = this.applySecretFix(content, match);
      fileChanges.set(match.file, fixedContent);
    }

    // Write fixed files
    for (const [filePath, content] of fileChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed secrets in: ${filePath}`);
    }

    console.log(`🎉 Auto-fixed ${fileChanges.size} files`);
  }

  private applySecretFix(content: string, match: SecretMatch): string {
    const lines = content.split('\n');
    const line = lines[match.line - 1];

    // Apply specific fixes based on pattern
    let fixedLine = line;

    switch (match.pattern.name) {
      case 'VITE Service Role Key':
        // Remove VITE_ prefix from service role keys
        fixedLine = line.replace(/VITE_SUPABASE_SERVICE_ROLE_KEY/g, 'SUPABASE_SERVICE_ROLE_KEY');
        // Add warning comment
        if (!line.includes('# WARNING')) {
          fixedLine = `${fixedLine} # WARNING: Moved to server-side only - was client exposed!`;
        }
        break;
        
      case 'Hardcoded JWT':
        // Replace with environment variable reference
        fixedLine = line.replace(match.content, 'process.env.JWT_SECRET || ""');
        // Add comment
        fixedLine = `${fixedLine} // TODO: Set JWT_SECRET environment variable`;
        break;
        
      case 'Database URL with Credentials':
        // Replace credentials with environment variables
        fixedLine = line.replace(/postgresql:\/\/[^:]+:[^@]+@/, 'postgresql://${DB_USER}:${DB_PASSWORD}@');
        break;
        
      default:
        // Generic fix: replace with environment variable
        const envVarName = this.generateEnvVarName(match.pattern.name);
        fixedLine = line.replace(match.content, `process.env.${envVarName}`);
        fixedLine = `${fixedLine} // TODO: Set ${envVarName} environment variable`;
    }

    lines[match.line - 1] = fixedLine;
    return lines.join('\n');
  }

  private generateEnvVarName(patternName: string): string {
    return patternName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * 🔍 Initialize Secret Detection Patterns
   */
  private initializeSecretPatterns(): SecretPattern[] {
    return [
      {
        name: 'Supabase Service Role Key',
        pattern: /eyJ[a-zA-Z0-9_-]{100,}/,
        severity: 'critical',
        description: 'Supabase service role JWT token detected',
        recommendation: 'Move to server-side environment variables immediately'
      },
      {
        name: 'VITE Service Role Key',
        pattern: /VITE_SUPABASE_SERVICE_ROLE_KEY/,
        severity: 'critical',
        description: 'Service role key exposed to client-side with VITE_ prefix',
        recommendation: 'Remove VITE_ prefix and move to server-side only'
      },
      {
        name: 'API Key Pattern',
        pattern: /['"]?[a-zA-Z0-9]{32,}['"]?/,
        severity: 'medium',
        description: 'Potential API key or secret',
        recommendation: 'Verify if this is a secret and move to environment variables',
        falsePositivePatterns: [
          /^[a-f0-9]{32,}$/, // Hash-like strings
          /localhost|127\.0\.0\.1/, // Local addresses
          /example|test|demo|placeholder/i // Example values
        ]
      },
      {
        name: 'Database URL with Credentials',
        pattern: /(?:postgresql|mysql|mongodb):\/\/[^:]+:[^@]+@[^\/\s]+/,
        severity: 'critical',
        description: 'Database connection string with embedded credentials',
        recommendation: 'Use environment variables for database credentials'
      },
      {
        name: 'JWT Secret',
        pattern: /jwt[_-]?secret[\s]*[=:][\s]*['"][^'"]{20,}['"]/i,
        severity: 'high',
        description: 'JWT secret key hardcoded',
        recommendation: 'Move JWT secret to environment variables'
      },
      {
        name: 'Stripe Secret Key',
        pattern: /sk_[a-zA-Z0-9]{20,}/,
        severity: 'critical',
        description: 'Stripe secret key detected',
        recommendation: 'Move to server-side environment variables'
      },
      {
        name: 'PayPal Client Secret',
        pattern: /EO[a-zA-Z0-9_-]{50,}/,
        severity: 'critical',
        description: 'PayPal client secret detected',
        recommendation: 'Move to server-side environment variables'
      },
      {
        name: 'Mailgun API Key',
        pattern: /key-[a-f0-9]{32}/,
        severity: 'high',
        description: 'Mailgun API key detected',
        recommendation: 'Move to server-side environment variables'
      },
      {
        name: 'AWS Access Key',
        pattern: /AKIA[0-9A-Z]{16}/,
        severity: 'critical',
        description: 'AWS access key detected',
        recommendation: 'Rotate key immediately and use IAM roles'
      },
      {
        name: 'Private Key',
        pattern: /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
        severity: 'critical',
        description: 'Private key detected',
        recommendation: 'Remove private key and use secure key management'
      },
      {
        name: 'Generic Password',
        pattern: /password[\s]*[=:][\s]*['"][^'"]{8,}['"]/i,
        severity: 'high',
        description: 'Hardcoded password detected',
        recommendation: 'Use environment variables for passwords'
      }
    ];
  }

  private initializeExcludePatterns(): RegExp[] {
    return [
      /\.env\.example$/,
      /\.md$/,
      /\.json$/,
      /\.lock$/,
      /\.log$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /\.git/,
      /node_modules/
    ];
  }

  private shouldExcludeFile(filePath: string, includeTests: boolean): boolean {
    // Normalize file path for matching
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Check .secretsignore patterns
    for (const pattern of this.secretsIgnorePatterns) {
      // Check for exact file match
      if (normalizedPath.endsWith(pattern) || normalizedPath === pattern) {
        return true;
      }
      
      // Check for glob patterns
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\./g, '\\.'), 'i');
        if (regex.test(normalizedPath)) {
          return true;
        }
      }
      
      // Check if file is in an ignored directory
      if (normalizedPath.includes(`/${pattern}/`) || normalizedPath.includes(pattern)) {
        return true;
      }
    }
    
    // Check directory exclusions
    if (this.excludeDirectories.some(dir => filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`))) {
      return true;
    }

    // Check file pattern exclusions
    if (this.excludePatterns.some(pattern => pattern.test(filePath))) {
      return true;
    }

    // Exclude test files unless specifically included
    if (!includeTests && /\.(test|spec)\.[jt]sx?$/.test(filePath)) {
      return true;
    }

    return false;
  }

  private getStagedFiles(): string[] {
    try {
      const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf-8' });
      return output.trim().split('\n').filter(file => file.length > 0);
    } catch {
      console.warn('⚠️  Could not get staged files (not a git repository?)');
      return [];
    }
  }

  private getAllSourceFiles(directory: string): string[] {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.py', '.go', '.rs', '.java', '.php', '.rb'];

    const scanDirectory = (dir: string) => {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);

          if (stats.isDirectory()) {
            const relativePath = path.relative(directory, itemPath);
            if (!this.excludeDirectories.some(excluded => relativePath.startsWith(excluded))) {
              scanDirectory(itemPath);
            }
          } else if (stats.isFile()) {
            const ext = path.extname(item);
            if (extensions.includes(ext)) {
              files.push(itemPath);
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not scan directory ${dir}:`, error);
      }
    };

    scanDirectory(directory);
    return files;
  }

  private isFalsePositive(match: string, pattern: SecretPattern): boolean {
    if (!pattern.falsePositivePatterns) return false;
    
    return pattern.falsePositivePatterns.some(fp => fp.test(match));
  }

  private getContext(lines: string[], lineIndex: number): string {
    const start = Math.max(0, lineIndex - 1);
    const end = Math.min(lines.length - 1, lineIndex + 1);
    return lines.slice(start, end + 1).join('\n');
  }

  private redactSecret(secret: string): string {
    if (secret.length <= 8) {
      return '*'.repeat(secret.length);
    }
    return secret.substring(0, 4) + '*'.repeat(secret.length - 8) + secret.substring(secret.length - 4);
  }

  private generateScanResult(totalFiles: number, filesScanned: number, matches: SecretMatch[]): ScanResult {
    const summary: Record<string, number> = {};
    let criticalSecrets = 0;

    matches.forEach(match => {
      summary[match.pattern.name] = (summary[match.pattern.name] || 0) + 1;
      if (match.pattern.severity === 'critical') {
        criticalSecrets++;
      }
    });

    return {
      totalFiles,
      filesScanned,
      secretsFound: matches.length,
      criticalSecrets,
      matches,
      summary
    };
  }

  private displayResults(result: ScanResult, duration: number): void {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 SECRET DETECTION SCAN RESULTS');
    console.log('='.repeat(80));
    console.log(`📊 Files Scanned: ${result.filesScanned}/${result.totalFiles}`);
    console.log(`⏱️  Scan Duration: ${duration}ms`);
    console.log(`🚨 Secrets Found: ${result.secretsFound}`);
    console.log(`💥 Critical Secrets: ${result.criticalSecrets}`);
    
    if (result.secretsFound > 0) {
      console.log('\n📋 Summary by Pattern:');
      Object.entries(result.summary).forEach(([pattern, count]) => {
        console.log(`  • ${pattern}: ${count}`);
      });

      console.log('\n🔍 Detailed Findings:');
      result.matches.forEach((match, index) => {
        const severity = match.pattern.severity.toUpperCase();
        const severityIcon = {
          'CRITICAL': '💥',
          'HIGH': '🚨', 
          'MEDIUM': '⚠️',
          'LOW': 'ℹ️'
        }[severity] || '?';
        
        console.log(`\n${index + 1}. ${severityIcon} ${severity} - ${match.pattern.name}`);
        console.log(`   📁 File: ${match.file}:${match.line}:${match.column}`);
        console.log(`   🔍 Match: ${match.redacted}`);
        console.log(`   💡 Recommendation: ${match.pattern.recommendation}`);
      });

      console.log('\n' + '='.repeat(80));
      
      if (result.criticalSecrets > 0) {
        console.log('🚨 CRITICAL SECURITY ALERT:');
        console.log(`   ${result.criticalSecrets} critical secrets detected!`);
        console.log('   These require immediate attention.');
        console.log('\n🔧 Quick fixes:');
        console.log('   • Run: npm run scan-secrets -- --fix');
        console.log('   • Manually review and fix critical issues');
        console.log('   • Rotate any exposed keys immediately');
      }
    } else {
      console.log('\n✅ No secrets detected! Great job keeping your code secure.');
    }

    console.log('\n📚 For more information:');
    console.log('   • Security best practices: https://owasp.org/www-project-top-ten/');
    console.log('   • Key rotation guide: scripts/rotate-keys.ts');
    console.log('='.repeat(80));
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    directory: getArgValue(args, '--directory'),
    stagedOnly: args.includes('--staged-only'),
    includeTests: args.includes('--include-tests'),
    fix: args.includes('--fix')
  };

  try {
    const scanner = new SecretScanner();
    const result = await scanner.scanForSecrets(options);
    
    // Exit with error code if critical secrets found
    if (result.criticalSecrets > 0) {
      process.exit(1);
    }
    
    // Exit with warning code if any secrets found
    if (result.secretsFound > 0) {
      process.exit(2);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Secret scanning failed:', error);
    process.exit(3);
  }
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.findIndex(arg => arg.startsWith(flag + '='));
  if (index >= 0) {
    return args[index].split('=')[1];
  }
  return undefined;
}

// Execute main function
main().catch(console.error);

export { SecretScanner, SecretPattern, SecretMatch, ScanResult };