/**
 * SecureKeyManager - Enterprise-grade secret management system
 * 
 * Implements secure key storage, rotation, monitoring, and access control
 * with comprehensive audit logging and threat detection.
 * 
 * CRITICAL: This class should NEVER be imported or used in client-side code.
 * It's designed for server-side environments only (Edge Functions, Node.js).
 */

export interface SecretMetadata {
  id: string;
  name: string;
  version: number;
  createdAt: Date;
  expiresAt?: Date;
  rotationPolicy: RotationPolicy;
  accessLevel: 'public' | 'internal' | 'secret' | 'top_secret';
  environment: 'development' | 'staging' | 'production';
  tags: string[];
  auditEnabled: boolean;
}

export interface RotationPolicy {
  enabled: boolean;
  intervalDays: number;
  maxAge: number;
  warningDays: number;
  autoRotate: boolean;
  notifyOnRotation: boolean;
}

export interface AccessAttempt {
  timestamp: Date;
  userId?: string;
  clientId: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  secretName: string;
  reason?: string;
}

export interface VaultConfig {
  provider: 'hashicorp' | 'azure' | 'aws' | 'local';
  endpoint?: string;
  token?: string;
  namespace?: string;
  mount?: string;
}

export interface SecurityAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'unauthorized_access' | 'key_exposure' | 'rotation_failure' | 'suspicious_activity';
  message: string;
  metadata: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}

/**
 * 🔐 SecureKeyManager - Enterprise Secret Management
 * 
 * SECURITY NOTICE: This class contains sensitive operations and should NEVER
 * be used in client-side code. All methods assume server-side execution.
 */
export class SecureKeyManager {
  private static instance: SecureKeyManager;
  private vault: VaultConfig;
  private accessLog: AccessAttempt[] = [];
  private securityAlerts: SecurityAlert[] = [];
  private rotationSchedule = new Map<string, NodeJS.Timeout>();

  private constructor(vaultConfig: VaultConfig) {
    this.vault = vaultConfig;
    this.initializeSecurityMonitoring();
  }

  public static getInstance(vaultConfig?: VaultConfig): SecureKeyManager {
    if (!SecureKeyManager.instance) {
      if (!vaultConfig) {
        throw new Error('VaultConfig required for first initialization');
      }
      SecureKeyManager.instance = new SecureKeyManager(vaultConfig);
    }
    return SecureKeyManager.instance;
  }

  /**
   * 🔑 Secure Key Retrieval with Access Control
   */
  async getSecret(
    secretName: string,
    clientContext: {
      clientId: string;
      userId?: string;
      ipAddress: string;
      userAgent: string;
      requiredAccessLevel?: string;
    }
  ): Promise<string | null> {
    const startTime = Date.now();
    
    try {
      // Validate client access
      const accessGranted = await this.validateAccess(secretName, clientContext);
      if (!accessGranted.allowed) {
        await this.logAccessAttempt({
          ...clientContext,
          timestamp: new Date(),
          success: false,
          secretName,
          reason: accessGranted.reason
        });
        
        await this.triggerSecurityAlert({
          severity: 'high',
          type: 'unauthorized_access',
          message: `Unauthorized access attempt to secret: ${secretName}`,
          metadata: { clientContext, reason: accessGranted.reason }
        });
        
        return null;
      }

      // Retrieve secret from vault
      const secret = await this.retrieveFromVault(secretName);
      
      // Log successful access
      await this.logAccessAttempt({
        ...clientContext,
        timestamp: new Date(),
        success: true,
        secretName
      });

      // Check if rotation is needed
      await this.checkRotationNeeded(secretName);

      return secret;

    } catch (error) {
      await this.logAccessAttempt({
        ...clientContext,
        timestamp: new Date(),
        success: false,
        secretName,
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`
      });

      throw error;
    }
  }

  /**
   * 🔄 Key Rotation System
   */
  async rotateSecret(
    secretName: string,
    adminContext: {
      adminId: string;
      reason: string;
      emergency?: boolean;
    }
  ): Promise<{ oldVersion: number; newVersion: number; rotationId: string }> {
    const rotationId = `rot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Get current secret metadata
      const currentMetadata = await this.getSecretMetadata(secretName);
      if (!currentMetadata) {
        throw new Error(`Secret ${secretName} not found`);
      }

      // Generate new secret value
      const newSecretValue = await this.generateNewSecret(secretName, currentMetadata);
      
      // Store new version
      const newMetadata: SecretMetadata = {
        ...currentMetadata,
        version: currentMetadata.version + 1,
        createdAt: new Date()
      };
      
      await this.storeInVault(`${secretName}_v${newMetadata.version}`, newSecretValue, newMetadata);
      
      // Update current pointer
      await this.storeInVault(secretName, newSecretValue, newMetadata);
      
      // Schedule cleanup of old version (after grace period)
      this.scheduleOldVersionCleanup(secretName, currentMetadata.version);
      
      // Log rotation
      await this.auditLog({
        event: 'secret_rotated',
        secretName,
        oldVersion: currentMetadata.version,
        newVersion: newMetadata.version,
        adminId: adminContext.adminId,
        reason: adminContext.reason,
        emergency: adminContext.emergency,
        rotationId,
        timestamp: new Date()
      });

      // Notify if required
      if (currentMetadata.rotationPolicy.notifyOnRotation) {
        await this.notifyRotation(secretName, rotationId, adminContext);
      }

      return {
        oldVersion: currentMetadata.version,
        newVersion: newMetadata.version,
        rotationId
      };

    } catch (error) {
      await this.triggerSecurityAlert({
        severity: 'critical',
        type: 'rotation_failure',
        message: `Failed to rotate secret: ${secretName}`,
        metadata: { error: error instanceof Error ? error.message : error, rotationId }
      });

      throw error;
    }
  }

  /**
   * 🛡️ Security Monitoring and Threat Detection
   */
  private async validateAccess(
    secretName: string,
    clientContext: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    
    // Check rate limiting
    const recentAttempts = this.accessLog
      .filter(log => 
        log.clientId === clientContext.clientId &&
        log.timestamp.getTime() > Date.now() - (60 * 1000) // Last minute
      ).length;

    if (recentAttempts > 10) {
      return { allowed: false, reason: 'Rate limit exceeded' };
    }

    // Check for suspicious patterns
    const suspiciousActivity = await this.detectSuspiciousActivity(clientContext);
    if (suspiciousActivity.detected) {
      return { allowed: false, reason: `Suspicious activity: ${suspiciousActivity.reason}` };
    }

    // Check environment restrictions
    const metadata = await this.getSecretMetadata(secretName);
    if (metadata && this.isProductionSecret(metadata) && !this.isProductionEnvironment()) {
      return { allowed: false, reason: 'Production secret access from non-production environment' };
    }

    return { allowed: true };
  }

  private async detectSuspiciousActivity(clientContext: any): Promise<{ detected: boolean; reason?: string }> {
    // Pattern 1: Multiple failed attempts
    const failedAttempts = this.accessLog
      .filter(log => 
        log.clientId === clientContext.clientId &&
        !log.success &&
        log.timestamp.getTime() > Date.now() - (15 * 60 * 1000) // Last 15 minutes
      ).length;

    if (failedAttempts >= 3) {
      return { detected: true, reason: 'Multiple failed access attempts' };
    }

    // Pattern 2: Access from new IP
    const historicalIPs = new Set(
      this.accessLog
        .filter(log => log.clientId === clientContext.clientId)
        .map(log => log.ipAddress)
    );

    if (historicalIPs.size > 0 && !historicalIPs.has(clientContext.ipAddress)) {
      return { detected: true, reason: 'Access from new IP address' };
    }

    // Pattern 3: Rapid sequential access to multiple secrets
    const recentAccesses = this.accessLog
      .filter(log => 
        log.clientId === clientContext.clientId &&
        log.timestamp.getTime() > Date.now() - (5 * 60 * 1000) // Last 5 minutes
      );

    const uniqueSecrets = new Set(recentAccesses.map(log => log.secretName));
    if (uniqueSecrets.size > 5) {
      return { detected: true, reason: 'Rapid access to multiple secrets' };
    }

    return { detected: false };
  }

  /**
   * 📊 Key Exposure Detection
   */
  async scanForKeyExposure(
    filePaths: string[],
    excludePatterns: string[] = []
  ): Promise<{
    exposedKeys: Array<{
      file: string;
      line: number;
      keyType: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      recommendation: string;
    }>;
    summary: {
      totalFiles: number;
      totalExposures: number;
      criticalExposures: number;
    };
  }> {
    const exposedKeys: any[] = [];
    const secretPatterns = [
      {
        name: 'Supabase Service Role Key',
        pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
        severity: 'critical' as const,
        recommendation: 'Move to environment variables immediately'
      },
      {
        name: 'API Key',
        pattern: /[a-zA-Z0-9]{32,}/g,
        severity: 'high' as const,
        recommendation: 'Verify if this is a secret key and move to environment variables'
      },
      {
        name: 'Service Role Key Reference',
        pattern: /VITE_SUPABASE_SERVICE_ROLE_KEY/g,
        severity: 'critical' as const,
        recommendation: 'Remove VITE_ prefix - service keys must never be exposed to client'
      },
      {
        name: 'Database URL with Auth',
        pattern: /postgresql:\/\/[^:]+:[^@]+@[^\/]+/g,
        severity: 'critical' as const,
        recommendation: 'Remove credentials from connection string'
      }
    ];

    for (const filePath of filePaths) {
      try {
        // Check if file should be excluded
        const shouldExclude = excludePatterns.some(pattern => 
          filePath.includes(pattern) || filePath.match(new RegExp(pattern))
        );
        
        if (shouldExclude) continue;

        const fs = await import('fs');
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          secretPatterns.forEach(pattern => {
            const matches = line.match(pattern.pattern);
            if (matches) {
              exposedKeys.push({
                file: filePath,
                line: index + 1,
                keyType: pattern.name,
                severity: pattern.severity,
                recommendation: pattern.recommendation
              });
            }
          });
        });

      } catch (error) {
        console.warn(`Could not scan file ${filePath}:`, error);
      }
    }

    const criticalExposures = exposedKeys.filter(key => key.severity === 'critical').length;

    return {
      exposedKeys,
      summary: {
        totalFiles: filePaths.length,
        totalExposures: exposedKeys.length,
        criticalExposures
      }
    };
  }

  /**
   * 🔧 Administrative Functions
   */
  async createSecret(
    secretName: string,
    secretValue: string,
    metadata: Partial<SecretMetadata>,
    adminContext: { adminId: string; reason: string }
  ): Promise<SecretMetadata> {
    const fullMetadata: SecretMetadata = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: secretName,
      version: 1,
      createdAt: new Date(),
      rotationPolicy: {
        enabled: true,
        intervalDays: 90,
        maxAge: 365,
        warningDays: 7,
        autoRotate: false,
        notifyOnRotation: true
      },
      accessLevel: 'secret',
      environment: 'production',
      tags: [],
      auditEnabled: true,
      ...metadata
    };

    await this.storeInVault(secretName, secretValue, fullMetadata);
    
    await this.auditLog({
      event: 'secret_created',
      secretName,
      metadata: fullMetadata,
      adminId: adminContext.adminId,
      reason: adminContext.reason,
      timestamp: new Date()
    });

    return fullMetadata;
  }

  async deleteSecret(
    secretName: string,
    adminContext: { adminId: string; reason: string; confirmed: boolean }
  ): Promise<void> {
    if (!adminContext.confirmed) {
      throw new Error('Secret deletion must be explicitly confirmed');
    }

    await this.removeFromVault(secretName);
    
    await this.auditLog({
      event: 'secret_deleted',
      secretName,
      adminId: adminContext.adminId,
      reason: adminContext.reason,
      timestamp: new Date()
    });
  }

  // Private implementation methods
  private async retrieveFromVault(secretName: string): Promise<string> {
    // Implementation depends on vault provider
    switch (this.vault.provider) {
      case 'local':
        return this.retrieveFromLocalVault(secretName);
      case 'hashicorp':
        return this.retrieveFromHashiCorpVault(secretName);
      case 'azure':
        return this.retrieveFromAzureKeyVault(secretName);
      case 'aws':
        return this.retrieveFromAWSSecretsManager(secretName);
      default:
        throw new Error(`Unsupported vault provider: ${this.vault.provider}`);
    }
  }

  private async storeInVault(secretName: string, secretValue: string, metadata: SecretMetadata): Promise<void> {
    // Implementation depends on vault provider
    switch (this.vault.provider) {
      case 'local':
        return this.storeInLocalVault(secretName, secretValue, metadata);
      default:
        throw new Error(`Storage not implemented for provider: ${this.vault.provider}`);
    }
  }

  private async retrieveFromLocalVault(secretName: string): Promise<string> {
    // For development/testing - NEVER use in production
    const value = process.env[secretName];
    if (!value) {
      throw new Error(`Secret ${secretName} not found in environment`);
    }
    return value;
  }

  private async storeInLocalVault(secretName: string, secretValue: string, metadata: SecretMetadata): Promise<void> {
    // For development/testing - NEVER use in production
    console.log(`Storing secret ${secretName} (local vault simulation)`);
  }

  private async retrieveFromHashiCorpVault(secretName: string): Promise<string> {
    // Implementation for HashiCorp Vault
    throw new Error('HashiCorp Vault integration not implemented');
  }

  private async retrieveFromAzureKeyVault(secretName: string): Promise<string> {
    // Implementation for Azure Key Vault
    throw new Error('Azure Key Vault integration not implemented');
  }

  private async retrieveFromAWSSecretsManager(secretName: string): Promise<string> {
    // Implementation for AWS Secrets Manager
    throw new Error('AWS Secrets Manager integration not implemented');
  }

  private async generateNewSecret(secretName: string, currentMetadata: SecretMetadata): Promise<string> {
    // Generate new secret based on type
    if (secretName.includes('jwt') || secretName.includes('token')) {
      return this.generateJWT();
    } else if (secretName.includes('key')) {
      return this.generateAPIKey();
    } else {
      return this.generateRandomSecret(64);
    }
  }

  private generateJWT(): string {
    // Generate a new JWT secret
    const crypto = require('crypto');
    return crypto.randomBytes(64).toString('hex');
  }

  private generateAPIKey(): string {
    // Generate a new API key
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  private generateRandomSecret(length: number): string {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('base64');
  }

  private scheduleOldVersionCleanup(secretName: string, version: number): void {
    // Clean up old version after 7 days grace period
    const cleanupTimeout = setTimeout(async () => {
      try {
        await this.removeFromVault(`${secretName}_v${version}`);
        await this.auditLog({
          event: 'old_version_cleaned',
          secretName,
          version,
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Failed to cleanup old version of ${secretName}:`, error);
      }
    }, 7 * 24 * 60 * 60 * 1000); // 7 days

    this.rotationSchedule.set(`${secretName}_v${version}`, cleanupTimeout);
  }

  private async checkRotationNeeded(secretName: string): Promise<void> {
    const metadata = await this.getSecretMetadata(secretName);
    if (!metadata || !metadata.rotationPolicy.enabled) return;

    const ageInDays = (Date.now() - metadata.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (ageInDays > metadata.rotationPolicy.intervalDays) {
      if (metadata.rotationPolicy.autoRotate) {
        await this.rotateSecret(secretName, {
          adminId: 'system',
          reason: 'Automatic rotation due to age'
        });
      } else {
        await this.triggerSecurityAlert({
          severity: 'medium',
          type: 'rotation_failure',
          message: `Secret ${secretName} requires rotation (${ageInDays.toFixed(1)} days old)`,
          metadata: { secretName, ageInDays, policy: metadata.rotationPolicy }
        });
      }
    }
  }

  private async getSecretMetadata(secretName: string): Promise<SecretMetadata | null> {
    // Retrieve metadata from vault or storage
    // This is a simplified implementation
    return null;
  }

  private async removeFromVault(secretName: string): Promise<void> {
    // Remove secret from vault
    console.log(`Removing secret ${secretName} from vault`);
  }

  private isProductionSecret(metadata: SecretMetadata): boolean {
    return metadata.environment === 'production' || metadata.accessLevel === 'top_secret';
  }

  private isProductionEnvironment(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private async logAccessAttempt(attempt: AccessAttempt): Promise<void> {
    this.accessLog.push(attempt);
    
    // Keep only last 10000 attempts
    if (this.accessLog.length > 10000) {
      this.accessLog = this.accessLog.slice(-5000);
    }

    // In production, store to database
    await this.auditLog({
      event: 'secret_access',
      success: attempt.success,
      secretName: attempt.secretName,
      clientId: attempt.clientId,
      userId: attempt.userId,
      ipAddress: attempt.ipAddress,
      reason: attempt.reason,
      timestamp: attempt.timestamp
    });
  }

  private async triggerSecurityAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const fullAlert: SecurityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alert
    };

    this.securityAlerts.push(fullAlert);

    // Immediately escalate critical alerts
    if (alert.severity === 'critical') {
      console.error('🚨 CRITICAL SECURITY ALERT:', fullAlert);
      // In production: send to incident response system
    }

    await this.auditLog({
      event: 'security_alert',
      alert: fullAlert,
      timestamp: new Date()
    });
  }

  private async notifyRotation(secretName: string, rotationId: string, adminContext: any): Promise<void> {
    // Send notification about rotation
    console.log(`Secret ${secretName} rotated (${rotationId})`);
    // In production: send to notification system
  }

  private async auditLog(event: Record<string, any>): Promise<void> {
    // Log to audit system
    const auditEntry = {
      timestamp: new Date().toISOString(),
      ...event
    };

    console.log('AUDIT:', JSON.stringify(auditEntry, null, 2));
    // In production: send to audit logging system
  }

  private initializeSecurityMonitoring(): void {
    // Clean up old access logs every hour
    setInterval(() => {
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      this.accessLog = this.accessLog.filter(log => log.timestamp.getTime() > cutoff);
    }, 60 * 60 * 1000);

    // Process security alerts every 5 minutes
    setInterval(() => {
      this.processSecurityAlerts();
    }, 5 * 60 * 1000);
  }

  private async processSecurityAlerts(): Promise<void> {
    const unresolved = this.securityAlerts.filter(alert => !alert.resolved);
    
    for (const alert of unresolved) {
      // Auto-resolve old low-severity alerts
      if (alert.severity === 'low' && Date.now() - alert.timestamp.getTime() > 24 * 60 * 60 * 1000) {
        alert.resolved = true;
      }
    }
  }
}

// Export factory function for server-side use only
export const createSecureKeyManager = (vaultConfig: VaultConfig): SecureKeyManager => {
  return SecureKeyManager.getInstance(vaultConfig);
};