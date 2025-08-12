/**
 * Security Audit Logging and Monitoring System for Car Audio Events Platform
 * 
 * Implements comprehensive security event logging, suspicious activity detection,
 * rate limiting, and IP-based restrictions with real-time threat monitoring.
 */

import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { RateLimiter, createRateLimitHeaders } from './rate-limiting';

// SECURITY FIX: Service role keys must NEVER be exposed to client-side code
// Audit logging now uses regular authenticated client with proper RLS policies
// For admin operations requiring elevated privileges, use Edge Functions
const auditSupabase = supabase; // Use regular client - removed service role key exposure

export interface SecurityEvent {
  eventType: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  timestamp?: Date;
}

export interface AccessEvent {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  result: 'allowed' | 'denied';
  details: Record<string, any>;
  timestamp?: Date;
}

export interface SuspiciousActivityAlert {
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  ipAddress: string;
  evidence: Record<string, any>;
  recommendedAction: string;
  timestamp: Date;
}

export interface ThreatIntelligence {
  ipAddress: string;
  riskScore: number;
  lastActivity: Date;
  activityCount: number;
  flags: string[];
  blockedAt?: Date;
  blockReason?: string;
}

/**
 * 🔐 Security Audit Logger with Real-time Monitoring
 */
export class AuditSecurityLogger {
  private static instance: AuditSecurityLogger;
  private static suspiciousActivityBuffer: SecurityEvent[] = [];
  private static threatIntelligence = new Map<string, ThreatIntelligence>();
  private static ipBlocklist = new Set<string>();
  
  // Rate limiters for different operations
  private static loginRateLimiter = new RateLimiter({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'login_attempts'
  });

  private static adminRateLimiter = new RateLimiter({
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'admin_operations'
  });

  private static apiRateLimiter = new RateLimiter({
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'api_requests'
  });

  private constructor() {
    // Initialize background monitoring
    this.initializeBackgroundMonitoring();
    this.loadIPBlocklist();
  }

  public static getInstance(): AuditSecurityLogger {
    if (!AuditSecurityLogger.instance) {
      AuditSecurityLogger.instance = new AuditSecurityLogger();
    }
    return AuditSecurityLogger.instance;
  }

  /**
   * 📊 Log Security Event with Enhanced Context
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const timestamp = event.timestamp || new Date();
    
    try {
      // Enrich event with additional context
      const enrichedEvent = await this.enrichSecurityEvent(event);
      
      // Store in database with retry logic
      await this.persistSecurityEvent(enrichedEvent, timestamp);
      
      // Add to suspicious activity buffer for analysis
      AuditSecurityLogger.suspiciousActivityBuffer.push(enrichedEvent);
      
      // Update threat intelligence
      if (event.ipAddress) {
        await this.updateThreatIntelligence(event.ipAddress, event);
      }
      
      // Trigger real-time analysis
      await this.analyzeEventForThreats(enrichedEvent);
      
      // Clean up buffer if it gets too large
      if (AuditSecurityLogger.suspiciousActivityBuffer.length > 1000) {
        AuditSecurityLogger.suspiciousActivityBuffer = 
          AuditSecurityLogger.suspiciousActivityBuffer.slice(-500);
      }

    } catch (error) {
      // Fallback logging to console if database fails
      console.error('🚨 CRITICAL: Security event logging failed:', {
        originalEvent: event,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: timestamp.toISOString()
      });
      
      // Try to store in local storage as emergency backup
      this.emergencyLogToLocalStorage(event, error);
    }
  }

  /**
   * 👥 Log Access Control Events
   */
  async logAccessEvent(event: AccessEvent): Promise<void> {
    const timestamp = event.timestamp || new Date();
    
    try {
      await auditSupabase
        .from('security_audit_log')
        .insert({
          user_id: event.userId,
          action: `${event.action}_${event.result}`,
          resource_type: event.resource,
          resource_id: event.resourceId,
          ip_address: '127.0.0.1', // Default for API calls since IP not available in frontend context
          user_agent: 'Frontend API Client',
          risk_level: event.result === 'denied' ? 'medium' : 'low',
          details: {
            ...event.details,
            result: event.result,
            original_action: event.action
          },
          timestamp: timestamp.toISOString(),
          created_at: timestamp.toISOString()
        });

      // Track failed access attempts for suspicious activity detection
      if (event.result === 'denied') {
        await this.trackFailedAccess(event.userId, event.action, event.resource);
      }

    } catch (error) {
      console.error('🚨 Access event logging failed:', error);
    }
  }

  /**
   * 🚨 Suspicious Activity Detection Engine
   */
  private async analyzeEventForThreats(event: SecurityEvent): Promise<void> {
    const alerts: SuspiciousActivityAlert[] = [];
    
    // Pattern 1: Multiple failed login attempts
    if (event.eventType === 'login_failed' && event.ipAddress) {
      const recentFailures = AuditSecurityLogger.suspiciousActivityBuffer
        .filter(e => 
          e.eventType === 'login_failed' && 
          e.ipAddress === event.ipAddress &&
          e.timestamp && (Date.now() - e.timestamp.getTime()) < 15 * 60 * 1000 // 15 minutes
        ).length;

      if (recentFailures >= 3) {
        alerts.push({
          alertType: 'brute_force_login',
          severity: 'high',
          description: `${recentFailures} failed login attempts from IP ${event.ipAddress}`,
          ipAddress: event.ipAddress,
          evidence: { failureCount: recentFailures, timeWindow: '15min' },
          recommendedAction: 'Consider IP blocking',
          timestamp: new Date()
        });
      }
    }

    // Pattern 2: Rapid-fire requests (potential bot/scraper)
    if (event.ipAddress) {
      const recentEvents = AuditSecurityLogger.suspiciousActivityBuffer
        .filter(e => 
          e.ipAddress === event.ipAddress &&
          e.timestamp && (Date.now() - e.timestamp.getTime()) < 60 * 1000 // 1 minute
        ).length;

      if (recentEvents >= 50) {
        alerts.push({
          alertType: 'rapid_fire_requests',
          severity: 'medium',
          description: `${recentEvents} requests in 1 minute from IP ${event.ipAddress}`,
          ipAddress: event.ipAddress,
          evidence: { requestCount: recentEvents, timeWindow: '1min' },
          recommendedAction: 'Rate limiting recommended',
          timestamp: new Date()
        });
      }
    }

    // Pattern 3: Permission escalation attempts
    if (event.eventType.includes('permission') && event.severity === 'high') {
      alerts.push({
        alertType: 'permission_escalation',
        severity: 'high',
        description: 'Potential privilege escalation attempt detected',
        userId: event.userId,
        ipAddress: event.ipAddress || 'unknown',
        evidence: event.details,
        recommendedAction: 'Review user permissions and account status',
        timestamp: new Date()
      });
    }

    // Pattern 4: Security threat indicators
    if (event.details.threats && Array.isArray(event.details.threats)) {
      alerts.push({
        alertType: 'security_payload_detected',
        severity: 'critical',
        description: `Security threats detected: ${event.details.threats.join(', ')}`,
        userId: event.userId,
        ipAddress: event.ipAddress || 'unknown',
        evidence: { threats: event.details.threats, blocked: event.details.blocked },
        recommendedAction: 'Immediate investigation required',
        timestamp: new Date()
      });
    }

    // Process all alerts
    for (const alert of alerts) {
      await this.processSecurityAlert(alert);
    }
  }

  /**
   * 🚫 IP Blocking and Rate Limiting
   */
  async checkIPBlocked(ipAddress: string): Promise<{ blocked: boolean; reason?: string }> {
    // Check static blocklist
    if (AuditSecurityLogger.ipBlocklist.has(ipAddress)) {
      return { blocked: true, reason: 'IP on permanent blocklist' };
    }

    // Check threat intelligence for temporary blocks
    const threatInfo = AuditSecurityLogger.threatIntelligence.get(ipAddress);
    if (threatInfo?.blockedAt) {
      const blockDuration = 24 * 60 * 60 * 1000; // 24 hours
      const now = Date.now();
      
      if (now - threatInfo.blockedAt.getTime() < blockDuration) {
        return { blocked: true, reason: `Temporarily blocked: ${threatInfo.blockReason}` };
      } else {
        // Unblock expired blocks
        threatInfo.blockedAt = undefined;
        threatInfo.blockReason = undefined;
        AuditSecurityLogger.threatIntelligence.set(ipAddress, threatInfo);
      }
    }

    return { blocked: false };
  }

  /**
   * ⚡ Rate Limiting with Enhanced Security
   */
  async checkRateLimit(
    operation: 'login' | 'admin' | 'api' | 'custom',
    identifier: string,
    customConfig?: { maxRequests: number; windowMs: number }
  ): Promise<{ allowed: boolean; retryAfter?: number; headers: Record<string, string> }> {
    
    let rateLimiter: any;
    
    switch (operation) {
      case 'login':
        rateLimiter = AuditSecurityLogger.loginRateLimiter;
        break;
      case 'admin':
        rateLimiter = AuditSecurityLogger.adminRateLimiter;
        break;
      case 'api':
        rateLimiter = AuditSecurityLogger.apiRateLimiter;
        break;
      case 'custom':
        if (!customConfig) throw new Error('Custom config required for custom rate limiting');
        rateLimiter = new RateLimiter({
          ...customConfig,
          keyPrefix: 'custom_operation'
        });
        break;
      default:
        rateLimiter = AuditSecurityLogger.apiRateLimiter;
    }

    const result = await rateLimiter.checkLimit(identifier);
    const headers = createRateLimitHeaders(result);

    // Log rate limit violations
    if (!result.allowed) {
      await this.logSecurityEvent({
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
        details: {
          operation,
          identifier,
          limit: result.limit,
          retryAfter: result.retryAfter
        }
      });
    }

    return {
      allowed: result.allowed,
      retryAfter: result.retryAfter,
      headers
    };
  }

  /**
   * 📈 Security Analytics and Reporting
   */
  async getSecurityMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    totalEvents: number;
    eventsBySeverity: Record<string, number>;
    topThreats: Array<{ type: string; count: number }>;
    topBlockedIPs: Array<{ ip: string; count: number; reason: string }>;
    suspiciousUsers: Array<{ userId: string; riskScore: number; lastActivity: string }>;
  }> {
    const now = new Date();
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }[timeRange];

    const since = new Date(now.getTime() - timeRangeMs);

    try {
      // Get security events from database
      const { data: events, error } = await supabase
        .from('audit_logs')
        .select('*')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate metrics
      const totalEvents = events?.length || 0;
      const eventsBySeverity: Record<string, number> = {};
      const threatCounts: Record<string, number> = {};

      events?.forEach(event => {
        // Count by severity
        eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
        
        // Count threats
        if (event.details?.threats) {
          event.details.threats.forEach((threat: string) => {
            threatCounts[threat] = (threatCounts[threat] || 0) + 1;
          });
        }
      });

      const topThreats = Object.entries(threatCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([type, count]) => ({ type, count }));

      // Get blocked IPs
      const topBlockedIPs = Array.from(AuditSecurityLogger.threatIntelligence.entries())
        .filter(([_, info]) => info.blockedAt)
        .sort(([,a], [,b]) => b.riskScore - a.riskScore)
        .slice(0, 10)
        .map(([ip, info]) => ({
          ip,
          count: info.activityCount,
          reason: info.blockReason || 'Unknown'
        }));

      // Identify suspicious users (high failed attempts, etc.)
      const suspiciousUsers = events
        ?.filter(e => e.user_id && e.severity === 'high')
        .reduce((acc: Record<string, any>, event) => {
          if (!acc[event.user_id!]) {
            acc[event.user_id!] = { count: 0, lastActivity: event.created_at };
          }
          acc[event.user_id!].count++;
          if (event.created_at > acc[event.user_id!].lastActivity) {
            acc[event.user_id!].lastActivity = event.created_at;
          }
          return acc;
        }, {});

      const topSuspiciousUsers = Object.entries(suspiciousUsers || {})
        .sort(([,a], [,b]) => (b as any).count - (a as any).count)
        .slice(0, 10)
        .map(([userId, data]: [string, any]) => ({
          userId,
          riskScore: Math.min(100, data.count * 10),
          lastActivity: data.lastActivity
        }));

      return {
        totalEvents,
        eventsBySeverity,
        topThreats,
        topBlockedIPs,
        suspiciousUsers: topSuspiciousUsers
      };

    } catch (error) {
      console.error('Failed to get security metrics:', error);
      return {
        totalEvents: 0,
        eventsBySeverity: {},
        topThreats: [],
        topBlockedIPs: [],
        suspiciousUsers: []
      };
    }
  }

  /**
   * 🔧 Administrative Security Functions
   */
  async blockIP(
    ipAddress: string, 
    reason: string, 
    permanent: boolean = false,
    adminUserId?: string
  ): Promise<void> {
    if (permanent) {
      AuditSecurityLogger.ipBlocklist.add(ipAddress);
      // Skip database persistence since ip_blocklist table doesn't exist
      if (import.meta.env.DEV) {
        console.log(`IP ${ipAddress} blocked permanently (in-memory only)`);
      }
    } else {
      // Temporary block via threat intelligence
      const threatInfo = AuditSecurityLogger.threatIntelligence.get(ipAddress) || {
        ipAddress,
        riskScore: 50,
        lastActivity: new Date(),
        activityCount: 0,
        flags: []
      };
      
      threatInfo.blockedAt = new Date();
      threatInfo.blockReason = reason;
      threatInfo.riskScore = Math.max(threatInfo.riskScore, 75);
      
      AuditSecurityLogger.threatIntelligence.set(ipAddress, threatInfo);
    }

    await this.logSecurityEvent({
      eventType: 'ip_blocked',
      severity: 'high',
      ipAddress,
      userId: adminUserId,
      details: { reason, permanent, blockedAt: new Date().toISOString() }
    });
  }

  async unblockIP(ipAddress: string, adminUserId?: string): Promise<void> {
    // Remove from permanent blocklist
    AuditSecurityLogger.ipBlocklist.delete(ipAddress);
    
    // Remove from threat intelligence
    const threatInfo = AuditSecurityLogger.threatIntelligence.get(ipAddress);
    if (threatInfo) {
      threatInfo.blockedAt = undefined;
      threatInfo.blockReason = undefined;
      threatInfo.riskScore = Math.max(0, threatInfo.riskScore - 25);
      AuditSecurityLogger.threatIntelligence.set(ipAddress, threatInfo);
    }

    // Skip database removal since ip_blocklist table doesn't exist
    if (import.meta.env.DEV) {
      console.log(`IP ${ipAddress} unblocked (in-memory only)`);
    }

    await this.logSecurityEvent({
      eventType: 'ip_unblocked',
      severity: 'info',
      ipAddress,
      userId: adminUserId,
      details: { unblockedAt: new Date().toISOString() }
    });
  }

  // 🔧 PRIVATE HELPER METHODS

  private async enrichSecurityEvent(event: SecurityEvent): Promise<SecurityEvent> {
    const enriched = { ...event };
    
    // Add geolocation if available (simplified - in production use a service)
    if (event.ipAddress && !event.details.location) {
      enriched.details.location = await this.getIPLocation(event.ipAddress);
    }
    
    // Add user context if available
    if (event.userId && !event.details.userContext) {
      enriched.details.userContext = await this.getUserContext(event.userId);
    }
    
    // Add timestamp if missing
    if (!enriched.timestamp) {
      enriched.timestamp = new Date();
    }
    
    return enriched;
  }

  private async persistSecurityEvent(event: SecurityEvent, timestamp: Date): Promise<void> {
    const maxRetries = 3;
    let attempt = 0;
    
    // Map severity to valid risk_level values for database constraint
    const mapSeverityToRiskLevel = (severity: string): string => {
      // Database constraint only allows: 'low', 'medium', 'high', 'critical'
      switch (severity) {
        case 'info':
          return 'low'; // Map 'info' to 'low' since 'info' is not allowed
        case 'low':
        case 'medium':
        case 'high':
        case 'critical':
          return severity; // These are valid
        default:
          return 'low'; // Default fallback
      }
    };
    
    while (attempt < maxRetries) {
      try {
        await auditSupabase
          .from('security_audit_log')
          .insert({
            user_id: event.userId,
            action: event.eventType,
            resource_type: event.details.resource || 'system',
            resource_id: event.details.resourceId,
            risk_level: mapSeverityToRiskLevel(event.severity),
            ip_address: event.ipAddress && event.ipAddress !== 'api-call' ? event.ipAddress : null,
            user_agent: event.userAgent,
            details: {
              ...event.details,
              severity: event.severity, // Keep original severity in details
              original_event_type: event.eventType
            },
            timestamp: timestamp.toISOString(),
            created_at: timestamp.toISOString()
          });
        
        return; // Success
        
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  private async updateThreatIntelligence(ipAddress: string, event: SecurityEvent): Promise<void> {
    const existing = AuditSecurityLogger.threatIntelligence.get(ipAddress) || {
      ipAddress,
      riskScore: 0,
      lastActivity: new Date(),
      activityCount: 0,
      flags: []
    };

    existing.lastActivity = new Date();
    existing.activityCount++;

    // Adjust risk score based on event severity
    const riskAdjustment = {
      'info': 0,
      'low': 1,
      'medium': 5,
      'high': 15,
      'critical': 25
    }[event.severity];

    existing.riskScore = Math.min(100, existing.riskScore + riskAdjustment);

    // Add flags based on event type
    if (event.eventType.includes('failed') && !existing.flags.includes('failed_attempts')) {
      existing.flags.push('failed_attempts');
    }
    
    if (event.details.threats && !existing.flags.includes('security_threats')) {
      existing.flags.push('security_threats');
    }

    AuditSecurityLogger.threatIntelligence.set(ipAddress, existing);

    // Auto-block high-risk IPs
    if (existing.riskScore >= 90 && !existing.blockedAt) {
      await this.blockIP(ipAddress, 'Automatic block due to high risk score', false);
    }
  }

  private async processSecurityAlert(alert: SuspiciousActivityAlert): Promise<void> {
    // Store alert in database
    await auditSupabase
      .from('security_alerts')
      .insert({
        alert_type: alert.alertType,
        severity: alert.severity,
        description: alert.description,
        user_id: alert.userId,
        ip_address: alert.ipAddress,
        evidence: alert.evidence,
        recommended_action: alert.recommendedAction,
        created_at: alert.timestamp.toISOString(),
        status: 'open'
      });

    // For critical alerts, consider immediate blocking
    if (alert.severity === 'critical') {
      await this.blockIP(
        alert.ipAddress,
        `Automatic block: ${alert.alertType}`,
        false
      );
    }
  }

  private async trackFailedAccess(userId: string, action: string, resource: string): Promise<void> {
    const key = `failed_access_${userId}_${action}_${resource}`;
    const recent = AuditSecurityLogger.suspiciousActivityBuffer
      .filter(e => 
        e.userId === userId && 
        e.eventType === 'access_denied' &&
        e.timestamp && (Date.now() - e.timestamp.getTime()) < 60 * 60 * 1000 // 1 hour
      ).length;

    if (recent >= 10) {
      await this.logSecurityEvent({
        eventType: 'excessive_failed_access',
        severity: 'high',
        userId,
        details: {
          action,
          resource,
          failureCount: recent,
          timeWindow: '1hour'
        }
      });
    }
  }

  private emergencyLogToLocalStorage(event: SecurityEvent, error: any): void {
    try {
      const emergencyLog = {
        timestamp: new Date().toISOString(),
        event,
        error: error instanceof Error ? error.message : error,
        source: 'audit-security-logger'
      };
      
      const existing = localStorage.getItem('emergency_security_log');
      const logs = existing ? JSON.parse(existing) : [];
      logs.push(emergencyLog);
      
      // Keep only last 100 emergency logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('emergency_security_log', JSON.stringify(logs));
    } catch (localError) {
      console.error('Emergency logging also failed:', localError);
    }
  }

  private async getIPLocation(ipAddress: string): Promise<string> {
    // Simplified location lookup - in production use a proper geolocation service
    try {
      // This is a placeholder - implement with actual geolocation service
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  private async getUserContext(userId: string): Promise<any> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('email, membership_type, status, created_at')
        .eq('id', userId)
        .single();
      
      return user || {};
    } catch {
      return {};
    }
  }

  private initializeBackgroundMonitoring(): void {
    // Clean up old buffer entries every 5 minutes
    setInterval(() => {
      const cutoff = Date.now() - (60 * 60 * 1000); // 1 hour
      AuditSecurityLogger.suspiciousActivityBuffer = 
        AuditSecurityLogger.suspiciousActivityBuffer.filter(e => 
          !e.timestamp || e.timestamp.getTime() > cutoff
        );
    }, 5 * 60 * 1000);

    // Update threat intelligence every 10 minutes
    setInterval(() => {
      this.cleanupThreatIntelligence();
    }, 10 * 60 * 1000);
  }

  private cleanupThreatIntelligence(): void {
    const now = Date.now();
    const cutoff = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (const [ip, info] of AuditSecurityLogger.threatIntelligence.entries()) {
      if (now - info.lastActivity.getTime() > cutoff && !info.blockedAt) {
        AuditSecurityLogger.threatIntelligence.delete(ip);
      }
    }
  }

  private async loadIPBlocklist(): Promise<void> {
    // Skip loading IP blocklist since the table doesn't exist yet
    // This is safe to skip as the system will work without persistent IP blocking
    if (import.meta.env.DEV) {
      console.log('IP blocklist table not available - using in-memory blocking only');
    }
    return;
  }
}

// Create and export singleton instance
export const auditLogger = AuditSecurityLogger.getInstance();

// Types are already exported above where they're defined

// Express middleware wrapper for security logging
export const createSecurityMiddleware = (options: {
  logAllRequests?: boolean;
  blockSuspiciousIPs?: boolean;
  rateLimitConfig?: { maxRequests: number; windowMs: number };
} = {}) => {
  return async (request: Request, context: any) => {
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check if IP is blocked
    if (options.blockSuspiciousIPs) {
      const blockCheck = await auditLogger.checkIPBlocked(ipAddress);
      if (blockCheck.blocked) {
        await auditLogger.logSecurityEvent({
          eventType: 'blocked_ip_access_attempt',
          severity: 'medium',
          ipAddress,
          userAgent,
          details: { reason: blockCheck.reason }
        });

        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Rate limiting
    if (options.rateLimitConfig) {
      const rateLimitCheck = await auditLogger.checkRateLimit(
        'custom',
        ipAddress,
        options.rateLimitConfig
      );

      if (!rateLimitCheck.allowed) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...rateLimitCheck.headers
          }
        });
      }
    }

    // Log request if enabled
    if (options.logAllRequests) {
      await auditLogger.logSecurityEvent({
        eventType: 'api_request',
        severity: 'info',
        ipAddress,
        userAgent,
        details: {
          method: request.method,
          url: request.url,
          timestamp: new Date().toISOString()
        }
      });
    }

    return null; // Continue to next middleware/handler
  };
};