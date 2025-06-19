/**
 * Configurable Cron Service for Browser-based Backup Scheduling
 * 
 * This provides a client-side backup scheduler with configurable times and timezones.
 * For production use, you should implement server-side cron jobs.
 */

import { createDatabaseBackup, cleanupOldBackups } from './backup';

export interface CronJob {
  id: string;
  name: string;
  schedule: string; // Cron-like format (simplified)
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  timezone: string;
  handler: () => Promise<void>;
}

export interface CronSettings {
  backupTime: string; // HH:MM format
  timezone: string;
  enableAutoBackup: boolean;
  enableAutoCleanup: boolean;
  retentionDays: number;
}

class CronService {
  private jobs: Map<string, CronJob> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;
  private settings: CronSettings;

  constructor() {
    this.settings = this.loadSettings();
    this.setupDefaultJobs();
  }

  /**
   * Load cron settings from localStorage
   */
  private loadSettings(): CronSettings {
    const saved = localStorage.getItem('cron_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse cron settings:', error);
      }
    }

    // Default settings
    return {
      backupTime: '02:00',
      timezone: 'America/New_York', // Eastern Time
      enableAutoBackup: true,
      enableAutoCleanup: true,
      retentionDays: 30
    };
  }

  /**
   * Save cron settings to localStorage
   */
  private saveSettings() {
    localStorage.setItem('cron_settings', JSON.stringify(this.settings));
  }

  /**
   * Get current settings
   */
  getSettings(): CronSettings {
    return { ...this.settings };
  }

  /**
   * Update cron settings
   */
  updateSettings(newSettings: Partial<CronSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    
    // Restart jobs with new settings
    this.stop();
    this.setupDefaultJobs();
    if (this.isRunning) {
      this.start();
    }
    
    console.log('🔄 Updated cron settings:', this.settings);
  }

  /**
   * Setup default backup jobs based on current settings
   */
  private setupDefaultJobs() {
    // Clear existing jobs
    this.jobs.clear();

    if (this.settings.enableAutoBackup) {
      // Daily backup at configured time
      const [hours, minutes] = this.settings.backupTime.split(':').map(Number);
      this.addJob({
        id: 'daily-backup',
        name: 'Daily Database Backup',
        schedule: `${minutes} ${hours} * * *`,
        timezone: this.settings.timezone,
        enabled: true,
        handler: async () => {
          console.log('🕒 Running scheduled daily backup...');
          try {
            const result = await createDatabaseBackup('automatic');
            if (result.success) {
              console.log('✅ Scheduled backup completed successfully');
              
              // Store last backup time
              localStorage.setItem('last_automatic_backup', new Date().toISOString());
            } else {
              console.error('❌ Scheduled backup failed:', result.error);
            }
          } catch (error) {
            console.error('💥 Scheduled backup error:', error);
          }
        }
      });
    }

    if (this.settings.enableAutoCleanup) {
      // Weekly cleanup job
      const [hours, minutes] = this.settings.backupTime.split(':').map(Number);
      const cleanupHour = (hours + 1) % 24; // 1 hour after backup
      this.addJob({
        id: 'weekly-cleanup',
        name: 'Weekly Backup Cleanup', 
        schedule: `${minutes} ${cleanupHour} * * 0`, // 1 hour after backup on Sunday
        timezone: this.settings.timezone,
        enabled: true,
        handler: async () => {
          console.log('🧹 Running scheduled backup cleanup...');
          try {
            cleanupOldBackups();
            console.log('✅ Scheduled cleanup completed successfully');
          } catch (error) {
            console.error('💥 Scheduled cleanup error:', error);
          }
        }
      });
    }
  }

  /**
   * Add a new cron job
   */
  addJob(job: CronJob) {
    this.jobs.set(job.id, job);
    if (job.enabled && this.isRunning) {
      this.scheduleJob(job);
    }
    console.log(`📅 Added cron job: ${job.name} (${job.schedule} ${job.timezone})`);
  }

  /**
   * Remove a cron job
   */
  removeJob(jobId: string) {
    const interval = this.intervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(jobId);
    }
    this.jobs.delete(jobId);
    console.log(`🗑️ Removed cron job: ${jobId}`);
  }

  /**
   * Enable/disable a job
   */
  toggleJob(jobId: string, enabled: boolean) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = enabled;
      
      if (enabled && this.isRunning) {
        this.scheduleJob(job);
      } else {
        const interval = this.intervals.get(jobId);
        if (interval) {
          clearInterval(interval);
          this.intervals.delete(jobId);
        }
      }
      
      console.log(`${enabled ? '✅' : '❌'} ${enabled ? 'Enabled' : 'Disabled'} cron job: ${job.name}`);
    }
  }

  /**
   * Schedule a specific job
   */
  private scheduleJob(job: CronJob) {
    // Clear existing interval if any
    const existingInterval = this.intervals.get(job.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Calculate next run time
    const nextRun = this.calculateNextRun(job);
    if (!nextRun) {
      console.error(`Failed to calculate next run for job: ${job.id}`);
      return;
    }

    job.nextRun = nextRun.toISOString();

    // Set timeout for the next run
    const msUntilNextRun = nextRun.getTime() - Date.now();
    
    if (msUntilNextRun > 0) {
      const timeout = setTimeout(async () => {
        try {
          job.lastRun = new Date().toISOString();
          await job.handler();
          
          // Schedule the next occurrence
          this.scheduleJob(job);
        } catch (error) {
          console.error(`Cron job ${job.id} failed:`, error);
          // Still reschedule for next time
          this.scheduleJob(job);
        }
      }, msUntilNextRun);

      this.intervals.set(job.id, timeout as any);
      
      console.log(`⏰ Scheduled job ${job.name} to run at ${nextRun.toLocaleString('en-US', { timeZone: job.timezone })}`);
    } else {
      console.log(`⚠️ Next run time for ${job.name} is in the past, recalculating...`);
      // If the time is in the past, schedule for tomorrow
      setTimeout(() => this.scheduleJob(job), 1000);
    }
  }

  /**
   * Calculate the next run time for a job
   */
  private calculateNextRun(job: CronJob): Date | null {
    try {
      const [minute, hour] = job.schedule.split(' ').map(Number);
      console.log(`🕐 Calculating next run for ${job.name}: ${hour}:${minute.toString().padStart(2, '0')} in ${job.timezone}`);
      
      // Simple approach: create target time for today and tomorrow, then pick the right one
      const now = new Date();
      console.log(`📅 Current time: ${now.toLocaleString()}`);
      
      // Create target time for today at the specified hour/minute
      const today = new Date();
      today.setHours(hour, minute, 0, 0);
      
      // Create target time for tomorrow
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Choose today or tomorrow based on current time
      const targetTime = today > now ? today : tomorrow;
      
      console.log(`⏰ Target time: ${targetTime.toLocaleString()}`);
      console.log(`⏰ Target in ${job.timezone}: ${targetTime.toLocaleString('en-US', { timeZone: job.timezone })}`);
      
      // Validate the date is valid
      if (isNaN(targetTime.getTime())) {
        console.error('❌ Invalid target time calculated');
        return null;
      }
      
      return targetTime;
    } catch (error) {
      console.error('❌ Error calculating next run:', error);
      return null;
    }
  }

  /**
   * Start the cron service
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Starting cron service...');
    
    // Ensure jobs are set up with current settings
    this.setupDefaultJobs();
    
    // Schedule all enabled jobs
    for (const job of this.jobs.values()) {
      if (job.enabled) {
        console.log(`📋 Scheduling job: ${job.name} (${job.schedule})`);
        this.scheduleJob(job);
      }
    }
    
    console.log(`✅ Cron service started with ${this.jobs.size} jobs`);
    
    // Log job details for debugging
    for (const job of this.jobs.values()) {
      console.log(`🔍 Job: ${job.name}, Enabled: ${job.enabled}, Next Run: ${job.nextRun || 'Not scheduled'}`);
    }
  }

  /**
   * Stop the cron service
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    console.log('🛑 Stopping cron service...');
    
    // Clear all intervals
    for (const interval of this.intervals.values()) {
      clearTimeout(interval as any);
    }
    this.intervals.clear();
    
    console.log('✅ Cron service stopped');
  }

  /**
   * Get all jobs
   */
  getJobs(): CronJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      running: this.isRunning,
      jobCount: this.jobs.size,
      enabledJobs: Array.from(this.jobs.values()).filter(job => job.enabled).length,
      nextRun: this.getNextRun(),
      settings: this.settings
    };
  }

  /**
   * Get next scheduled run time
   */
  private getNextRun(): string | null {
    const enabledJobs = Array.from(this.jobs.values()).filter(job => job.enabled && job.nextRun);
    if (enabledJobs.length === 0) return null;
    
    const nextRuns = enabledJobs.map(job => new Date(job.nextRun!).getTime());
    const earliestRun = Math.min(...nextRuns);
    
    return new Date(earliestRun).toISOString();
  }

  /**
   * Manually trigger a job
   */
  async runJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    console.log(`▶️ Manually triggering job: ${job.name}`);
    try {
      job.lastRun = new Date().toISOString();
      await job.handler();
      console.log(`✅ Manual job execution completed: ${job.name}`);
    } catch (error) {
      console.error(`❌ Manual job execution failed: ${job.name}`, error);
      throw error;
    }
  }

  /**
   * Get available timezones
   */
  getAvailableTimezones(): string[] {
    return [
      'America/New_York',      // Eastern Time
      'America/Chicago',       // Central Time  
      'America/Denver',        // Mountain Time
      'America/Los_Angeles',   // Pacific Time
      'America/Phoenix',       // Arizona Time
      'America/Anchorage',     // Alaska Time
      'Pacific/Honolulu',      // Hawaii Time
      'UTC',                   // UTC
      'Europe/London',         // GMT
      'Europe/Paris',          // CET
      'Asia/Tokyo',            // JST
      'Australia/Sydney',      // AEST
    ];
  }

  /**
   * Format timezone for display
   */
  formatTimezone(timezone: string): string {
    const names: Record<string, string> = {
      'America/New_York': 'Eastern Time (ET)',
      'America/Chicago': 'Central Time (CT)', 
      'America/Denver': 'Mountain Time (MT)',
      'America/Los_Angeles': 'Pacific Time (PT)',
      'America/Phoenix': 'Arizona Time (MST)',
      'America/Anchorage': 'Alaska Time (AKST)',
      'Pacific/Honolulu': 'Hawaii Time (HST)',
      'UTC': 'Coordinated Universal Time (UTC)',
      'Europe/London': 'Greenwich Mean Time (GMT)',
      'Europe/Paris': 'Central European Time (CET)',
      'Asia/Tokyo': 'Japan Standard Time (JST)',
      'Australia/Sydney': 'Australian Eastern Time (AEST)',
    };
    
    return names[timezone] || timezone;
  }
}

// Global cron service instance
export const cronService = new CronService();

/**
 * Initialize and start the cron service
 */
export function initializeCronService() {
  console.log('🔧 Initializing cron service...');
  
  // Start the service
  cronService.start();
  
  // Stop the service when the page is unloaded
  window.addEventListener('beforeunload', () => {
    cronService.stop();
  });
  
  console.log('✅ Cron service initialized');
}

/**
 * Check if we should run immediate backup (for testing/demo)
 */
export function checkImmediateBackup() {
  const lastBackup = localStorage.getItem('last_automatic_backup');
  const today = new Date().toDateString();
  
  if (!lastBackup || new Date(lastBackup).toDateString() !== today) {
    console.log('📅 No backup today yet - you can trigger manual backup for testing');
    return true;
  }
  
  return false;
} 