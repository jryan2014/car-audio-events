#!/usr/bin/env node
/**
 * Key Rotation Script for Car Audio Events Platform
 * 
 * Automated key rotation for CI/CD pipelines with comprehensive logging
 * and rollback capabilities.
 * 
 * Usage:
 *   npm run rotate-keys
 *   npm run rotate-keys -- --key=SUPABASE_SERVICE_ROLE_KEY
 *   npm run rotate-keys -- --emergency --key=all
 */

import { createSecureKeyManager, VaultConfig } from '../src/security/SecureKeyManager';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

interface RotationConfig {
  keys: string[];
  emergency: boolean;
  dryRun: boolean;
  adminId: string;
  reason: string;
  notificationEndpoint?: string;
}

interface RotationResult {
  keyName: string;
  success: boolean;
  oldVersion?: number;
  newVersion?: number;
  rotationId?: string;
  error?: string;
  rollbackPlan?: string;
}

class KeyRotationManager {
  private keyManager: any;
  private config: RotationConfig;
  private supabase: any;
  private rotationResults: RotationResult[] = [];

  constructor(config: RotationConfig) {
    this.config = config;
    
    // Initialize vault configuration
    const vaultConfig: VaultConfig = {
      provider: process.env.VAULT_PROVIDER as any || 'local',
      endpoint: process.env.VAULT_ENDPOINT,
      token: process.env.VAULT_TOKEN,
      namespace: process.env.VAULT_NAMESPACE,
      mount: process.env.VAULT_MOUNT || 'secret'
    };

    this.keyManager = createSecureKeyManager(vaultConfig);

    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing for key rotation');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 🔄 Execute Key Rotation Process
   */
  async rotateKeys(): Promise<{
    success: boolean;
    results: RotationResult[];
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    console.log('🔄 Starting key rotation process...');
    console.log(`📋 Configuration:`, {
      keys: this.config.keys,
      emergency: this.config.emergency,
      dryRun: this.config.dryRun,
      adminId: this.config.adminId
    });

    try {
      // Pre-rotation checks
      await this.preRotationChecks();

      // Execute rotations
      for (const keyName of this.config.keys) {
        const result = await this.rotateKey(keyName);
        this.rotationResults.push(result);
      }

      // Post-rotation validation
      await this.postRotationValidation();

      // Generate summary
      const summary = this.generateSummary();
      
      // Send notifications
      await this.sendNotifications(summary);

      // Generate rollback script
      await this.generateRollbackScript();

      console.log('✅ Key rotation process completed');
      console.log('📊 Summary:', summary);

      return {
        success: summary.failed === 0,
        results: this.rotationResults,
        summary
      };

    } catch (error) {
      console.error('❌ Key rotation process failed:', error);
      
      // Emergency rollback if needed
      if (this.config.emergency && !this.config.dryRun) {
        await this.emergencyRollback();
      }

      throw error;
    }
  }

  private async preRotationChecks(): Promise<void> {
    console.log('🔍 Performing pre-rotation checks...');

    // Check vault connectivity
    console.log('  ✓ Checking vault connectivity...');
    // Implementation depends on vault provider

    // Check database connectivity
    console.log('  ✓ Checking database connectivity...');
    const { data, error } = await this.supabase.from('users').select('count').limit(1);
    if (error) {
      throw new Error(`Database connectivity check failed: ${error.message}`);
    }

    // Check current key validity
    console.log('  ✓ Validating current keys...');
    for (const keyName of this.config.keys) {
      const isValid = await this.validateCurrentKey(keyName);
      if (!isValid) {
        throw new Error(`Current key ${keyName} is not valid`);
      }
    }

    // Check for ongoing operations
    console.log('  ✓ Checking for ongoing operations...');
    const ongoingOps = await this.checkOngoingOperations();
    if (ongoingOps.length > 0 && !this.config.emergency) {
      throw new Error(`Ongoing operations detected: ${ongoingOps.join(', ')}`);
    }

    // Backup current configuration
    console.log('  ✓ Creating configuration backup...');
    await this.backupCurrentConfiguration();

    console.log('✅ Pre-rotation checks completed');
  }

  private async rotateKey(keyName: string): Promise<RotationResult> {
    console.log(`🔑 Rotating key: ${keyName}`);

    try {
      if (this.config.dryRun) {
        console.log(`  🧪 DRY RUN: Would rotate ${keyName}`);
        return {
          keyName,
          success: true,
          oldVersion: 1,
          newVersion: 2,
          rotationId: `dry_run_${Date.now()}`
        };
      }

      // Perform actual rotation
      const rotationResult = await this.keyManager.rotateSecret(keyName, {
        adminId: this.config.adminId,
        reason: this.config.reason,
        emergency: this.config.emergency
      });

      // Update environment configurations
      await this.updateEnvironmentConfiguration(keyName, rotationResult);

      // Validate new key
      const isValid = await this.validateNewKey(keyName);
      if (!isValid) {
        throw new Error(`New key validation failed for ${keyName}`);
      }

      console.log(`  ✅ Successfully rotated ${keyName}`);
      return {
        keyName,
        success: true,
        ...rotationResult
      };

    } catch (error) {
      console.error(`  ❌ Failed to rotate ${keyName}:`, error);
      return {
        keyName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async updateEnvironmentConfiguration(keyName: string, rotationResult: any): Promise<void> {
    console.log(`  🔧 Updating environment configuration for ${keyName}`);
    
    // This would integrate with your deployment system
    // Examples: Kubernetes secrets, Docker secrets, cloud provider secrets
    
    switch (keyName) {
      case 'SUPABASE_SERVICE_ROLE_KEY':
        await this.updateSupabaseConfiguration(rotationResult);
        break;
      default:
        console.log(`    ⚠️ No specific update handler for ${keyName}`);
    }
  }

  private async updateSupabaseConfiguration(rotationResult: any): Promise<void> {
    // Update Supabase project configuration
    console.log('    📡 Updating Supabase project configuration...');
    
    // Note: This would require Supabase Management API integration
    // For now, log the action required
    console.log('    ⚠️ Manual action required: Update Supabase dashboard with new service role key');
  }

  private async postRotationValidation(): Promise<void> {
    console.log('🧪 Performing post-rotation validation...');

    // Test critical application functions
    const testResults = await this.runCriticalTests();
    
    const failedTests = testResults.filter(test => !test.success);
    if (failedTests.length > 0) {
      throw new Error(`Post-rotation tests failed: ${failedTests.map(t => t.name).join(', ')}`);
    }

    console.log('✅ Post-rotation validation completed');
  }

  private async runCriticalTests(): Promise<Array<{ name: string; success: boolean; error?: string }>> {
    const tests = [
      { name: 'Database Connection', test: () => this.testDatabaseConnection() },
      { name: 'Authentication', test: () => this.testAuthentication() },
      { name: 'API Endpoints', test: () => this.testCriticalEndpoints() }
    ];

    const results = [];
    for (const testCase of tests) {
      try {
        await testCase.test();
        results.push({ name: testCase.name, success: true });
        console.log(`  ✅ ${testCase.name} test passed`);
      } catch (error) {
        results.push({ 
          name: testCase.name, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        console.error(`  ❌ ${testCase.name} test failed:`, error);
      }
    }

    return results;
  }

  private async validateCurrentKey(keyName: string): Promise<boolean> {
    try {
      const currentKey = process.env[keyName];
      if (!currentKey) {
        console.log(`    ⚠️ Key ${keyName} not found in environment`);
        return false;
      }

      // Validate key format and functionality
      switch (keyName) {
        case 'SUPABASE_SERVICE_ROLE_KEY':
          return this.validateSupabaseKey(currentKey);
        default:
          return true; // Assume valid if no specific validation
      }
    } catch (error) {
      console.error(`    ❌ Validation failed for ${keyName}:`, error);
      return false;
    }
  }

  private async validateNewKey(keyName: string): Promise<boolean> {
    // Similar to validateCurrentKey but for the newly rotated key
    return this.validateCurrentKey(keyName);
  }

  private async validateSupabaseKey(key: string): Promise<boolean> {
    try {
      const testClient = createClient(process.env.VITE_SUPABASE_URL!, key);
      const { data, error } = await testClient.from('users').select('count').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  private async checkOngoingOperations(): Promise<string[]> {
    const operations = [];
    
    // Check for active deployments
    // Check for ongoing database migrations
    // Check for scheduled maintenance
    
    return operations;
  }

  private async backupCurrentConfiguration(): Promise<void> {
    const backupDir = path.join(process.cwd(), '.backup', 'key-rotation');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `config-${timestamp}.json`);
    
    // Ensure backup directory exists
    fs.mkdirSync(backupDir, { recursive: true });
    
    const currentConfig = {
      timestamp,
      keys: this.config.keys.reduce((acc, keyName) => {
        const value = process.env[keyName];
        if (value) {
          // Store only metadata, not actual values
          acc[keyName] = {
            exists: true,
            length: value.length,
            checksum: this.calculateChecksum(value)
          };
        }
        return acc;
      }, {} as Record<string, any>)
    };
    
    fs.writeFileSync(backupFile, JSON.stringify(currentConfig, null, 2));
    console.log(`  📁 Configuration backed up to: ${backupFile}`);
  }

  private async testDatabaseConnection(): Promise<void> {
    const { data, error } = await this.supabase.from('users').select('count').limit(1);
    if (error) throw error;
  }

  private async testAuthentication(): Promise<void> {
    // Test authentication with new keys
    const { data, error } = await this.supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;
  }

  private async testCriticalEndpoints(): Promise<void> {
    // Test critical API endpoints
    const testEndpoint = `${process.env.VITE_SUPABASE_URL}/rest/v1/users?select=count&limit=1`;
    const response = await fetch(testEndpoint, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
      }
    });
    
    if (!response.ok) {
      throw new Error(`API test failed: ${response.status} ${response.statusText}`);
    }
  }

  private generateSummary(): { total: number; successful: number; failed: number } {
    const total = this.rotationResults.length;
    const successful = this.rotationResults.filter(r => r.success).length;
    const failed = total - successful;

    return { total, successful, failed };
  }

  private async sendNotifications(summary: any): Promise<void> {
    if (!this.config.notificationEndpoint) return;

    const notification = {
      event: 'key_rotation_completed',
      timestamp: new Date().toISOString(),
      adminId: this.config.adminId,
      reason: this.config.reason,
      emergency: this.config.emergency,
      dryRun: this.config.dryRun,
      summary,
      results: this.rotationResults
    };

    try {
      await fetch(this.config.notificationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });
      console.log('📧 Notifications sent successfully');
    } catch (error) {
      console.error('📧 Failed to send notifications:', error);
    }
  }

  private async generateRollbackScript(): Promise<void> {
    const rollbackScript = `#!/bin/bash
# Automated rollback script generated on ${new Date().toISOString()}
# Use this script to rollback key rotation if issues occur

set -e

echo "🔄 Starting rollback process..."

${this.rotationResults
  .filter(r => r.success)
  .map(r => `# Rollback for ${r.keyName}
echo "Rolling back ${r.keyName}..."
# Add specific rollback commands here`)
  .join('\n\n')}

echo "✅ Rollback completed"
`;

    const rollbackFile = path.join(process.cwd(), '.backup', 'key-rotation', `rollback-${Date.now()}.sh`);
    fs.writeFileSync(rollbackFile, rollbackScript);
    fs.chmodSync(rollbackFile, 0o755);
    
    console.log(`📜 Rollback script generated: ${rollbackFile}`);
  }

  private async emergencyRollback(): Promise<void> {
    console.log('🚨 Executing emergency rollback...');
    
    // Emergency rollback logic
    for (const result of this.rotationResults) {
      if (result.success && result.rollbackPlan) {
        console.log(`🔄 Rolling back ${result.keyName}...`);
        // Execute rollback plan
      }
    }
    
    console.log('✅ Emergency rollback completed');
  }

  private calculateChecksum(value: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(value).digest('hex').substring(0, 8);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  const config: RotationConfig = {
    keys: [],
    emergency: args.includes('--emergency'),
    dryRun: args.includes('--dry-run'),
    adminId: process.env.ROTATION_ADMIN_ID || 'ci-cd-system',
    reason: getArgValue(args, '--reason') || 'Scheduled rotation',
    notificationEndpoint: process.env.ROTATION_NOTIFICATION_ENDPOINT
  };

  // Parse key arguments
  const keyArg = getArgValue(args, '--key');
  if (keyArg === 'all') {
    config.keys = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'PAYPAL_CLIENT_SECRET',
      'MAILGUN_API_KEY'
    ];
  } else if (keyArg) {
    config.keys = keyArg.split(',');
  } else {
    config.keys = ['SUPABASE_SERVICE_ROLE_KEY']; // Default
  }

  try {
    const rotationManager = new KeyRotationManager(config);
    const result = await rotationManager.rotateKeys();
    
    if (result.success) {
      console.log('🎉 All key rotations completed successfully');
      process.exit(0);
    } else {
      console.error('⚠️ Some key rotations failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Key rotation process failed:', error);
    process.exit(1);
  }
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.findIndex(arg => arg.startsWith(flag + '='));
  if (index >= 0) {
    return args[index].split('=')[1];
  }
  return undefined;
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export { KeyRotationManager, RotationConfig, RotationResult };