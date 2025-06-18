import React, { useState, useEffect } from 'react';
import { Settings, Clock, Globe, Save, RotateCcw, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';

interface CronSettings {
  backupTime: string;
  timezone: string;
  enableAutoBackup: boolean;
  enableAutoCleanup: boolean;
  retentionDays: number;
}

interface BackupSettingsProps {
  onClose: () => void;
}

export default function BackupSettings({ onClose }: BackupSettingsProps) {
  const [settings, setSettings] = useState<CronSettings>({
    backupTime: '02:00',
    timezone: 'America/New_York',
    enableAutoBackup: true,
    enableAutoCleanup: true,
    retentionDays: 30
  });
  const [originalSettings, setOriginalSettings] = useState<CronSettings>(settings);
  const [availableTimezones, setAvailableTimezones] = useState<string[]>([]);
  const [timezoneNames, setTimezoneNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { cronService } = await import('../utils/cronService');
      
      // Load current settings
      const currentSettings = cronService.getSettings();
      setSettings(currentSettings);
      setOriginalSettings(currentSettings);

      // Load available timezones
      const timezones = cronService.getAvailableTimezones();
      setAvailableTimezones(timezones);

      // Load timezone display names
      const names: Record<string, string> = {};
      timezones.forEach(tz => {
        names[tz] = cronService.formatTimezone(tz);
      });
      setTimezoneNames(names);

    } catch (err) {
      console.error('Failed to load backup settings:', err);
      setError('Failed to load backup settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const { cronService } = await import('../utils/cronService');
      
      // Update cron service settings
      cronService.updateSettings(settings);

      setOriginalSettings(settings);
      setSuccessMessage('Backup settings saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Close the modal after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Failed to save backup settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    setSettings(originalSettings);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSettingChange = (key: keyof CronSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const formatNextBackupTime = () => {
    try {
      const now = new Date();
      const targetDate = new Date(now.toLocaleString('en-US', { timeZone: settings.timezone }));
      const [hours, minutes] = settings.backupTime.split(':').map(Number);
      
      targetDate.setHours(hours, minutes, 0, 0);
      
      // If target time has passed today, schedule for tomorrow
      const nowInTimezone = new Date(now.toLocaleString('en-US', { timeZone: settings.timezone }));
      if (targetDate <= nowInTimezone) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      
      return targetDate.toLocaleString('en-US', {
        timeZone: settings.timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch (error) {
      return 'Invalid configuration';
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500 mr-3"></div>
            <span className="text-gray-400">Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-electric-500 rounded-lg flex items-center justify-center">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Backup Settings</h2>
              <p className="text-gray-400 text-sm">Configure automatic backup schedule and preferences</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Messages */}
          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-green-400 font-semibold">Success</h3>
                <p className="text-green-300">{successMessage}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-red-400 font-semibold">Error</h3>
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Backup Schedule */}
          <div className="bg-gray-700/30 rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="h-5 w-5 text-electric-400" />
              <h3 className="text-lg font-semibold text-white">Backup Schedule</h3>
            </div>

            <div className="space-y-4">
              {/* Enable Auto Backup */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white font-medium">Enable Automatic Backups</label>
                  <p className="text-gray-400 text-sm">Automatically create database backups on schedule</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableAutoBackup}
                    onChange={(e) => handleSettingChange('enableAutoBackup', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-electric-500"></div>
                </label>
              </div>

              {settings.enableAutoBackup && (
                <>
                  {/* Backup Time */}
                  <div>
                    <label className="block text-white font-medium mb-2">Backup Time</label>
                    <input
                      type="time"
                      value={settings.backupTime}
                      onChange={(e) => handleSettingChange('backupTime', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-electric-500 focus:outline-none"
                    />
                    <p className="text-gray-400 text-sm mt-1">Time when daily backups will be created</p>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-white font-medium mb-2">Timezone</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => handleSettingChange('timezone', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-electric-500 focus:outline-none"
                    >
                      {availableTimezones.map(tz => (
                        <option key={tz} value={tz}>{timezoneNames[tz]}</option>
                      ))}
                    </select>
                    <p className="text-gray-400 text-sm mt-1">Timezone for backup scheduling</p>
                  </div>

                  {/* Next Backup Preview */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-400 font-medium">Next Scheduled Backup</span>
                    </div>
                    <p className="text-blue-300 text-sm">{formatNextBackupTime()}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Cleanup Settings */}
          <div className="bg-gray-700/30 rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Globe className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Cleanup Settings</h3>
            </div>

            <div className="space-y-4">
              {/* Enable Auto Cleanup */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white font-medium">Enable Automatic Cleanup</label>
                  <p className="text-gray-400 text-sm">Automatically remove old backup files</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableAutoCleanup}
                    onChange={(e) => handleSettingChange('enableAutoCleanup', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>

              {settings.enableAutoCleanup && (
                <div>
                  <label className="block text-white font-medium mb-2">Retention Period (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.retentionDays}
                    onChange={(e) => handleSettingChange('retentionDays', parseInt(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-electric-500 focus:outline-none"
                  />
                  <p className="text-gray-400 text-sm mt-1">
                    Automatic backups older than this will be deleted (manual backups are preserved)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <button
              onClick={resetSettings}
              disabled={!hasChanges}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={saveSettings}
                disabled={!hasChanges || isSaving}
                className="flex items-center space-x-2 px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 