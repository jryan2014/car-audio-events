import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface BackupMetadata {
  id: string;
  filename: string;
  created_at: string;
  type: 'manual' | 'automatic';
  status: 'completed' | 'in_progress' | 'failed';
  size: number;
  tables_count: number;
  rows_count: number;
  error_message?: string;
}

export interface BackupResult {
  success: boolean;
  backup?: BackupMetadata;
  error?: string;
  downloadUrl?: string;
}

// List of tables to backup
const BACKUP_TABLES = [
  'users',
  'profiles', 
  'cms_pages',
  'organizations',
  'payments',
  'auth.users'
];

/**
 * Create a comprehensive database backup
 */
export async function createDatabaseBackup(type: 'manual' | 'automatic' = 'manual'): Promise<BackupResult> {
  const backupId = crypto.randomUUID();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${type}-backup-${timestamp}.zip`;

  try {
    console.log(`🚀 Starting ${type} backup: ${filename}`);

    // Initialize backup metadata
    const backupMetadata: BackupMetadata = {
      id: backupId,
      filename,
      created_at: new Date().toISOString(),
      type,
      status: 'in_progress',
      size: 0,
      tables_count: 0,
      rows_count: 0
    };

    // Store initial backup record
    await storeBackupMetadata(backupMetadata);

    const zip = new JSZip();
    let totalRows = 0;
    let successfulTables = 0;

    // Backup each table
    for (const tableName of BACKUP_TABLES) {
      try {
        console.log(`📊 Backing up table: ${tableName}`);
        
        const tableData = await backupTable(tableName);
        if (tableData) {
          zip.file(`${tableName}.json`, JSON.stringify(tableData, null, 2));
          totalRows += Array.isArray(tableData.data) ? tableData.data.length : 0;
          successfulTables++;
          console.log(`✅ Successfully backed up ${tableName}: ${Array.isArray(tableData.data) ? tableData.data.length : 0} rows`);
        }
      } catch (error) {
        console.error(`❌ Failed to backup table ${tableName}:`, error);
        // Continue with other tables even if one fails
      }
    }

    // Add backup manifest
    const manifest = {
      backup_id: backupId,
      created_at: new Date().toISOString(),
      type,
      tables_backed_up: successfulTables,
      total_rows: totalRows,
      backup_version: '1.0',
      platform: 'Car Audio Competition Platform',
      supabase_url: supabaseUrl
    };

    zip.file('backup-manifest.json', JSON.stringify(manifest, null, 2));

    // Generate ZIP file
    const zipContent = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Update backup metadata
    const finalMetadata: BackupMetadata = {
      ...backupMetadata,
      status: 'completed',
      size: zipContent.size,
      tables_count: successfulTables,
      rows_count: totalRows
    };

    await storeBackupMetadata(finalMetadata);

    // Create download URL (in a real app, you'd upload to cloud storage)
    const downloadUrl = URL.createObjectURL(zipContent);

    console.log(`🎉 Backup completed successfully: ${filename} (${formatFileSize(zipContent.size)})`);

    return {
      success: true,
      backup: finalMetadata,
      downloadUrl
    };

  } catch (error) {
    console.error(`💥 Backup failed:`, error);

    // Update backup status to failed
    const failedMetadata: BackupMetadata = {
      id: backupId,
      filename,
      created_at: new Date().toISOString(),
      type,
      status: 'failed',
      size: 0,
      tables_count: 0,
      rows_count: 0,
      error_message: error instanceof Error ? error.message : 'Unknown error'
    };

    await storeBackupMetadata(failedMetadata);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Backup a single table
 */
async function backupTable(tableName: string) {
  try {
    let query = supabase.from(tableName);
    
    // Handle auth.users table differently
    if (tableName === 'auth.users') {
      // For auth.users, we need to use a different approach
      // This is typically restricted, so we'll skip it or handle differently
      console.log(`⚠️ Skipping auth.users table (restricted access)`);
      return null;
    }

    const { data, error, count } = await query.select('*', { count: 'exact' });

    if (error) {
      console.error(`Error backing up ${tableName}:`, error);
      return null;
    }

    return {
      table_name: tableName,
      backup_timestamp: new Date().toISOString(),
      row_count: count || 0,
      data: data || []
    };

  } catch (error) {
    console.error(`Exception backing up ${tableName}:`, error);
    return null;
  }
}

/**
 * Store backup metadata
 */
async function storeBackupMetadata(metadata: BackupMetadata) {
  try {
    // Store in localStorage for now (in a real app, this would be in a database)
    const existingBackups = JSON.parse(localStorage.getItem('database_backups') || '[]');
    const updatedBackups = existingBackups.filter((b: BackupMetadata) => b.id !== metadata.id);
    updatedBackups.unshift(metadata);
    
    // Keep only last 50 backups
    if (updatedBackups.length > 50) {
      updatedBackups.splice(50);
    }

    localStorage.setItem('database_backups', JSON.stringify(updatedBackups));
    console.log(`💾 Stored backup metadata: ${metadata.id}`);

  } catch (error) {
    console.error('Failed to store backup metadata:', error);
  }
}

/**
 * Get all backup metadata
 */
export function getBackupHistory(): BackupMetadata[] {
  try {
    const backups = localStorage.getItem('database_backups');
    return backups ? JSON.parse(backups) : [];
  } catch (error) {
    console.error('Failed to load backup history:', error);
    return [];
  }
}

/**
 * Delete a backup
 */
export function deleteBackup(backupId: string): boolean {
  try {
    const existingBackups = JSON.parse(localStorage.getItem('database_backups') || '[]');
    const updatedBackups = existingBackups.filter((b: BackupMetadata) => b.id !== backupId);
    localStorage.setItem('database_backups', JSON.stringify(updatedBackups));
    console.log(`🗑️ Deleted backup: ${backupId}`);
    return true;
  } catch (error) {
    console.error('Failed to delete backup:', error);
    return false;
  }
}

/**
 * Schedule automatic daily backups
 */
export function scheduleAutomaticBackups() {
  // Check if we should run an automatic backup
  const lastBackup = getLastAutomaticBackup();
  const now = new Date();
  const today = now.toDateString();

  if (!lastBackup || new Date(lastBackup.created_at).toDateString() !== today) {
    // Check if it's after 2 AM
    if (now.getHours() >= 2) {
      console.log('⏰ Running scheduled automatic backup...');
      createDatabaseBackup('automatic');
    }
  }
}

/**
 * Get the last automatic backup
 */
function getLastAutomaticBackup(): BackupMetadata | null {
  const backups = getBackupHistory();
  const automaticBackups = backups.filter(b => b.type === 'automatic');
  return automaticBackups.length > 0 ? automaticBackups[0] : null;
}

/**
 * Clean up old automatic backups (keep last 30 days)
 */
export function cleanupOldBackups() {
  try {
    const backups = getBackupHistory();
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

    const filteredBackups = backups.filter(backup => {
      const backupDate = new Date(backup.created_at);
      
      // Keep all manual backups
      if (backup.type === 'manual') return true;
      
      // Keep automatic backups from last 30 days
      return backupDate > thirtyDaysAgo;
    });

    localStorage.setItem('database_backups', JSON.stringify(filteredBackups));
    
    const removedCount = backups.length - filteredBackups.length;
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} old automatic backups`);
    }

  } catch (error) {
    console.error('Failed to cleanup old backups:', error);
  }
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Initialize backup system
 */
export function initializeBackupSystem() {
  console.log('🔧 Initializing backup system...');
  
  // Clean up old backups on startup
  cleanupOldBackups();
  
  // Initialize cron service for automatic backups
  const initializeCronService = async () => {
    try {
      console.log('🔄 Loading cron service...');
      const { initializeCronService, cronService } = await import('./cronService');
      console.log('📦 Cron service loaded, initializing...');
      initializeCronService();
      console.log('🚀 Cron service initialization complete');
      
      // Log current status
      setTimeout(() => {
        const status = cronService.getStatus();
        console.log('📊 Cron service status:', status);
      }, 1000);
    } catch (error) {
      console.error('❌ Failed to initialize cron service:', error);
    }
  };
  
  initializeCronService();

  console.log('✅ Backup system initialized');
} 