import React, { useState, useEffect } from 'react';
import { Download, Trash2, Database, Clock, AlertTriangle, CheckCircle, RefreshCw, Calendar, FileText, Archive, Zap, Play, Settings } from 'lucide-react';
import BackupSettings from './BackupSettings';

interface BackupFile {
  id: string;
  filename: string;
  created_at: string;
  size: number;
  type: 'manual' | 'automatic';
  status: 'completed' | 'in_progress' | 'failed';
  tables_count: number;
  rows_count: number;
  download_url?: string;
}

interface CronStatus {
  running: boolean;
  jobCount: number;
  enabledJobs: number;
  nextRun: string | null;
  settings: {
    backupTime: string;
    timezone: string;
    enableAutoBackup: boolean;
    enableAutoCleanup: boolean;
    retentionDays: number;
  };
}

export default function BackupManager() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [showSettings, setShowSettings] = useState(false);


  useEffect(() => {
    loadBackups();
    loadCronStatus();
  }, []);

  const loadCronStatus = async () => {
    try {
      const { cronService } = await import('../utils/cronService');
      const status = cronService.getStatus();
      console.log('📊 Current cron status:', status);
      setCronStatus(status);
    } catch (error) {
      console.error('Failed to load cron status:', error);
    }
  };

  const loadBackups = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Import backup utilities dynamically
      const { getBackupHistory } = await import('../utils/backup');
      
      // Load backups using backup utility
      const backupHistory = getBackupHistory();
      setBackups(backupHistory);
    } catch (err) {
      console.error('Failed to load backups:', err);
      setError('Failed to load backup history');
    } finally {
      setIsLoading(false);
    }
  };

  const createManualBackup = async () => {
    try {
      setIsCreatingBackup(true);
      setError(null);

      // Import backup utilities dynamically
      const { createDatabaseBackup } = await import('../utils/backup');
      
      // Create backup using our backup system
      const result = await createDatabaseBackup('manual');

      if (!result.success) {
        throw new Error(result.error || 'Failed to create backup');
      }

      // Reload backups to show the new one
      await loadBackups();

      setSuccessMessage('Manual backup created successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (err) {
      console.error('Failed to create backup:', err);
      setError(err instanceof Error ? err.message : 'Failed to create backup');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const runAutomaticBackup = async () => {
    try {
      setError(null);
      const { cronService } = await import('../utils/cronService');
      await cronService.runJob('daily-backup');
      
      // Reload backups and status
      await loadBackups();
      await loadCronStatus();
      
      setSuccessMessage('Automatic backup triggered successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to run automatic backup:', err);
      setError(err instanceof Error ? err.message : 'Failed to run automatic backup');
      setTimeout(() => setError(null), 5000);
    }
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = async () => {
    setShowSettings(false);
    // Reload cron status in case settings changed with a delay
    console.log('🔄 Refreshing cron status after settings change...');
    // Add a small delay to allow settings to propagate
    setTimeout(async () => {
      await loadCronStatus();
      console.log('✅ Cron status refreshed');
    }, 200);
  };

  const downloadBackup = async (backup: BackupFile) => {
    try {
      // In a real implementation, this would download from the server
      // For now, we'll regenerate the backup data as a download
      const { createDatabaseBackup } = await import('../utils/backup');
      
      const result = await createDatabaseBackup('manual');
      if (result.success && result.downloadUrl) {
        // Create download link
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = backup.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        setTimeout(() => {
          URL.revokeObjectURL(result.downloadUrl!);
        }, 1000);
      }

      setSuccessMessage(`Backup ${backup.filename} downloaded successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err) {
      console.error('Failed to download backup:', err);
      setError('Failed to download backup');
      setTimeout(() => setError(null), 5000);
    }
  };

  const deleteBackup = async (backupId: string) => {
    try {
      // Import backup utilities dynamically
      const { deleteBackup: deleteBackupUtil } = await import('../utils/backup');
      
      const success = deleteBackupUtil(backupId);
      if (!success) {
        throw new Error('Failed to delete backup');
      }

      // Reload backups to reflect deletion
      await loadBackups();

      setSuccessMessage('Backup deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err) {
      console.error('Failed to delete backup:', err);
      setError('Failed to delete backup');
      setTimeout(() => setError(null), 5000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateWithTimezone = (dateString: string, timezone: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatBackupTime = (time: string, timezone: string) => {
    // Parse HH:MM format and create a date for formatting
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    // Format in the specified timezone with AM/PM
    const timeString = date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    // Get timezone abbreviation
    const timezoneAbbr = date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    }).split(' ').pop();
    
    return `${timeString} ${timezoneAbbr}`;
  };

  const formatNextRunTime = (dateString: string, timezone: string) => {
    const date = new Date(dateString);
    
    // Format date and time with timezone
    const formatted = date.toLocaleString('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
    
    return formatted;
  };

  const formatTimezoneDisplay = (timezone: string) => {
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
  };

  const formatBackupCreatedTime = (dateString: string, timezone: string) => {
    const date = new Date(dateString);
    
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30'
    };

    const icons = {
      completed: CheckCircle,
      in_progress: RefreshCw,
      failed: AlertTriangle
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        <Icon className={`h-3 w-3 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
        <span>{status.replace('_', ' ').toUpperCase()}</span>
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles = {
      manual: 'bg-blue-500/20 text-blue-400',
      automatic: 'bg-purple-500/20 text-purple-400'
    };

    const icons = {
      manual: Database,
      automatic: Clock
    };

    const Icon = icons[type as keyof typeof icons];

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${styles[type as keyof typeof styles]}`}>
        <Icon className="h-3 w-3" />
        <span>{type.toUpperCase()}</span>
      </span>
    );
  };



  if (isLoading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500 mr-3"></div>
          <span className="text-gray-400">Loading backup history...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-electric-500 rounded-lg flex items-center justify-center">
              <Archive className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Backup Management</h2>
              <p className="text-gray-400 text-sm">Create, download, and manage database backups</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={openSettings}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-500 transition-all duration-200 flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
            

            <button
              onClick={runAutomaticBackup}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-600 transition-all duration-200 flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>Test Auto Backup</span>
            </button>
            
            <button
              onClick={createManualBackup}
              disabled={isCreatingBackup}
              className="bg-electric-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingBackup ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  <span>Create Backup</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-green-400 font-semibold">Success</h3>
              <p className="text-green-300">{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-red-400 font-semibold">Error</h3>
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Cron Status */}
        {cronStatus && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Zap className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-blue-400 font-semibold">Automatic Backup Service</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-400">Status</p>
                    <p className={`text-sm font-medium ${cronStatus.running ? 'text-green-400' : 'text-red-400'}`}>
                      {cronStatus.running ? 'Running' : 'Stopped'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Active Jobs</p>
                    <p className="text-sm font-medium text-white">{cronStatus.enabledJobs}/{cronStatus.jobCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Next Run</p>
                    <p className="text-sm font-medium text-white">
                      {cronStatus.nextRun ? formatNextRunTime(cronStatus.nextRun, cronStatus.settings.timezone) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Schedule</p>
                    <p className="text-sm font-medium text-white">
                      {cronStatus.settings.enableAutoBackup 
                        ? `Daily at ${formatBackupTime(cronStatus.settings.backupTime, cronStatus.settings.timezone)}`
                        : 'Disabled'
                      }
                    </p>
                  </div>
                </div>
                {cronStatus.settings.timezone && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400">Timezone</p>
                    <p className="text-sm text-blue-300">{formatTimezoneDisplay(cronStatus.settings.timezone)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Backup Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Archive className="h-4 w-4 text-electric-400" />
              <span className="text-gray-400 text-sm">Total Backups</span>
            </div>
            <p className="text-2xl font-bold text-white">{backups.length}</p>
          </div>
          
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Database className="h-4 w-4 text-blue-400" />
              <span className="text-gray-400 text-sm">Manual Backups</span>
            </div>
            <p className="text-2xl font-bold text-white">{backups.filter(b => b.type === 'manual').length}</p>
          </div>
          
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-purple-400" />
              <span className="text-gray-400 text-sm">Automatic Backups</span>
            </div>
            <p className="text-2xl font-bold text-white">{backups.filter(b => b.type === 'automatic').length}</p>
          </div>
          
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="h-4 w-4 text-green-400" />
              <span className="text-gray-400 text-sm">Total Size</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatFileSize(backups.reduce((sum, backup) => sum + backup.size, 0))}
            </p>
          </div>
        </div>

        {/* Backup List */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Backup</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    <div className="flex flex-col items-center space-y-2">
                      <Archive className="h-12 w-12 text-gray-600" />
                      <p>No backups found</p>
                      <p className="text-sm">Create your first backup to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white font-medium">{backup.filename}</div>
                        <div className="text-gray-400 text-sm">ID: {backup.id.slice(0, 8)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getTypeBadge(backup.type)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(backup.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300">{formatFileSize(backup.size)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300 text-sm">
                        <div>{backup.tables_count} tables</div>
                        <div>{backup.rows_count} rows</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300 text-sm">
                        {formatBackupCreatedTime(backup.created_at, cronStatus?.settings.timezone || 'America/New_York')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => downloadBackup(backup)}
                          className="text-electric-400 hover:text-electric-300 transition-colors p-1"
                          title="Download Backup"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteBackup(backup.id)}
                          className="text-red-400 hover:text-red-300 transition-colors p-1"
                          title="Delete Backup"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Auto-backup Info */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-blue-400 font-semibold">Automatic Backups</h3>
              <p className="text-blue-300 text-sm">
                {cronStatus?.settings.enableAutoBackup 
                  ? `Daily backups are scheduled to run at ${formatBackupTime(cronStatus.settings.backupTime, cronStatus.settings.timezone)} in ${formatTimezoneDisplay(cronStatus.settings.timezone)}. Automatic backups are retained for ${cronStatus.settings.retentionDays} days.`
                  : 'Automatic backups are currently disabled. Use the Settings button to enable them.'
                }
                <br />
                Use the "Test Auto Backup" button to manually trigger the automatic backup process.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && <BackupSettings onClose={closeSettings} />}
    </>
  );
} 