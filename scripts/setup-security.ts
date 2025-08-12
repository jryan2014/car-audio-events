#!/usr/bin/env tsx

/**
 * Security Setup Script for Car Audio Events Platform
 * Sets up comprehensive security scanning and monitoring
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

interface SecurityConfig {
  auditLevel: 'low' | 'moderate' | 'high' | 'critical';
  autoFix: boolean;
  scanSecrets: boolean;
  preCommitHooks: boolean;
  dependabotEnabled: boolean;
  githubActionsEnabled: boolean;
}

const DEFAULT_CONFIG: SecurityConfig = {
  auditLevel: 'moderate',
  autoFix: true,
  scanSecrets: true,
  preCommitHooks: true,
  dependabotEnabled: true,
  githubActionsEnabled: true,
};

class SecuritySetup {
  private config: SecurityConfig;
  private projectRoot: string;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.projectRoot = process.cwd();
  }

  public async setup(): Promise<void> {
    console.log('🔧 Setting up security infrastructure...');
    
    try {
      await this.checkPrerequisites();
      await this.setupNpmAudit();
      await this.setupSecretScanning();
      await this.setupPreCommitHooks();
      await this.validateConfiguration();
      await this.generateSecurityReport();
      
      console.log('✅ Security setup completed successfully!');
    } catch (error) {
      console.error('❌ Security setup failed:', error);
      process.exit(1);
    }
  }

  private async checkPrerequisites(): Promise<void> {
    console.log('📋 Checking prerequisites...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`Node.js version: ${nodeVersion}`);
    
    // Check npm version
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      console.log(`npm version: ${npmVersion}`);
    } catch {
      throw new Error('npm is not installed or not accessible');
    }
    
    // Check if Git is available
    try {
      execSync('git --version', { encoding: 'utf8' });
      console.log('Git is available');
    } catch {
      console.warn('⚠️  Git is not available - some features may be limited');
    }
    
    // Check package.json
    const packageJsonPath = join(this.projectRoot, 'package.json');
    if (!existsSync(packageJsonPath)) {
      throw new Error('package.json not found in current directory');
    }
  }

  private async setupNpmAudit(): Promise<void> {
    console.log('🔍 Setting up npm audit...');
    
    try {
      // Run initial audit
      console.log('Running initial security audit...');
      execSync(`npm audit --audit-level=${this.config.auditLevel}`, {
        stdio: 'inherit',
        cwd: this.projectRoot,
      });
      console.log('✅ No vulnerabilities found');
    } catch (error) {
      console.log('⚠️  Vulnerabilities detected');
      
      if (this.config.autoFix) {
        console.log('Attempting to fix vulnerabilities...');
        try {
          execSync('npm audit fix --audit-level=moderate', {
            stdio: 'inherit',
            cwd: this.projectRoot,
          });
          console.log('✅ Vulnerabilities fixed');
        } catch {
          console.warn('⚠️  Some vulnerabilities could not be automatically fixed');
        }
      }
    }
  }

  private async setupSecretScanning(): Promise<void> {
    if (!this.config.scanSecrets) return;
    
    console.log('🔐 Setting up secret scanning...');
    
    try {
      // Run secret scan
      execSync('npm run scan-secrets', {
        stdio: 'inherit',
        cwd: this.projectRoot,
      });
      console.log('✅ Secret scanning completed - no secrets found');
    } catch (error) {
      console.error('❌ Secret scanning failed or found issues');
      throw error;
    }
  }

  private async setupPreCommitHooks(): Promise<void> {
    if (!this.config.preCommitHooks) return;
    
    console.log('🪝 Setting up pre-commit hooks...');
    
    const preCommitConfigPath = join(this.projectRoot, '.pre-commit-config.yaml');
    if (existsSync(preCommitConfigPath)) {
      console.log('Pre-commit configuration already exists');
      
      try {
        // Try to install pre-commit hooks if available
        execSync('pre-commit install', {
          stdio: 'inherit',
          cwd: this.projectRoot,
        });
        console.log('✅ Pre-commit hooks installed');
      } catch {
        console.log('⚠️  pre-commit not available - install with: pip install pre-commit');
      }
    } else {
      console.log('⚠️  No pre-commit configuration found');
    }
  }

  private async validateConfiguration(): Promise<void> {
    console.log('🔍 Validating security configuration...');
    
    const checks = [
      this.checkPackageJsonScripts(),
      this.checkGitHubActions(),
      this.checkDependabot(),
      this.checkEnvironmentFiles(),
    ];
    
    const results = await Promise.all(checks);
    const failedChecks = results.filter(result => !result.passed);
    
    if (failedChecks.length > 0) {
      console.warn('⚠️  Some security checks failed:');
      failedChecks.forEach(check => {
        console.warn(`  - ${check.name}: ${check.message}`);
      });
    } else {
      console.log('✅ All security checks passed');
    }
  }

  private checkPackageJsonScripts(): { name: string; passed: boolean; message: string } {
    const packageJsonPath = join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    const requiredScripts = [
      'security:scan',
      'security:audit',
      'scan-secrets',
    ];
    
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);
    
    return {
      name: 'Package.json Scripts',
      passed: missingScripts.length === 0,
      message: missingScripts.length > 0 
        ? `Missing scripts: ${missingScripts.join(', ')}`
        : 'All required security scripts present',
    };
  }

  private checkGitHubActions(): { name: string; passed: boolean; message: string } {
    const workflowsPath = join(this.projectRoot, '.github', 'workflows');
    const securityWorkflowPath = join(workflowsPath, 'security.yml');
    
    return {
      name: 'GitHub Actions Security Workflow',
      passed: existsSync(securityWorkflowPath),
      message: existsSync(securityWorkflowPath)
        ? 'Security workflow configured'
        : 'Security workflow not found',
    };
  }

  private checkDependabot(): { name: string; passed: boolean; message: string } {
    const dependabotConfigPath = join(this.projectRoot, '.github', 'dependabot.yml');
    
    return {
      name: 'Dependabot Configuration',
      passed: existsSync(dependabotConfigPath),
      message: existsSync(dependabotConfigPath)
        ? 'Dependabot configured'
        : 'Dependabot configuration not found',
    };
  }

  private checkEnvironmentFiles(): { name: string; passed: boolean; message: string } {
    const envFiles = ['.env', '.env.local', '.env.production', '.env.development'];
    const presentEnvFiles = envFiles.filter(file => 
      existsSync(join(this.projectRoot, file))
    );
    
    return {
      name: 'Environment Files Check',
      passed: true, // Just informational
      message: presentEnvFiles.length > 0
        ? `Environment files present: ${presentEnvFiles.join(', ')}`
        : 'No environment files detected',
    };
  }

  private async generateSecurityReport(): Promise<void> {
    console.log('📊 Generating security report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      nodeVersion: process.version,
      npmVersion: execSync('npm --version', { encoding: 'utf8' }).trim(),
      vulnerabilities: await this.getVulnerabilityReport(),
      outdatedPackages: await this.getOutdatedPackages(),
      recommendations: this.generateRecommendations(),
    };
    
    const reportPath = join(this.projectRoot, 'security-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✅ Security report generated: ${reportPath}`);
  }

  private async getVulnerabilityReport(): Promise<any> {
    try {
      const auditResult = execSync('npm audit --json', { 
        encoding: 'utf8',
        cwd: this.projectRoot,
      });
      return JSON.parse(auditResult);
    } catch (error: any) {
      // npm audit returns non-zero exit code when vulnerabilities are found
      if (error.stdout) {
        try {
          return JSON.parse(error.stdout);
        } catch {
          return { error: 'Failed to parse audit output' };
        }
      }
      return { error: 'Audit failed' };
    }
  }

  private async getOutdatedPackages(): Promise<any> {
    try {
      const outdatedResult = execSync('npm outdated --json', {
        encoding: 'utf8',
        cwd: this.projectRoot,
      });
      return JSON.parse(outdatedResult);
    } catch (error: any) {
      // npm outdated returns non-zero when packages are outdated
      if (error.stdout) {
        try {
          return JSON.parse(error.stdout);
        } catch {
          return { error: 'Failed to parse outdated output' };
        }
      }
      return {};
    }
  }

  private generateRecommendations(): string[] {
    const recommendations = [
      'Run security scans regularly (weekly minimum)',
      'Keep dependencies updated to latest secure versions',
      'Monitor security advisories for used packages',
      'Use npm audit before deployment',
      'Enable GitHub security alerts',
      'Review and rotate API keys periodically',
      'Use environment variables for sensitive configuration',
      'Enable pre-commit hooks for secret detection',
      'Configure Dependabot for automated security updates',
      'Monitor build logs for security warnings',
    ];
    
    return recommendations;
  }
}


export { SecuritySetup, SecurityConfig };

// Simple execution check for tsx
const scriptName = import.meta.url.split('/').pop()?.replace('.ts', '');
const isExecutedDirectly = process.argv.some(arg => arg.includes('setup-security'));

if (isExecutedDirectly) {
  console.log('🔧 Starting security setup...');
  const setup = new SecuritySetup();
  setup.setup();
}

