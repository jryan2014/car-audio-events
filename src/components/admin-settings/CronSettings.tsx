import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, RefreshCw, Save, AlertCircle, CheckCircle, Calendar, Timer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../NotificationSystem';

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  command: string;
  active: boolean;
  nodename?: string;
  nodeport?: number;
  database?: string;
  username?: string;
}

interface CronSchedulePreset {
  label: string;
  value: string;
  description: string;
}

const CRON_PRESETS: CronSchedulePreset[] = [
  { label: 'Every minute', value: '* * * * *', description: 'Runs every minute' },
  { label: 'Every 2 minutes', value: '*/2 * * * *', description: 'Runs every 2 minutes' },
  { label: 'Every 5 minutes', value: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 10 minutes', value: '*/10 * * * *', description: 'Runs every 10 minutes' },
  { label: 'Every 15 minutes', value: '*/15 * * * *', description: 'Runs every 15 minutes' },
  { label: 'Every 30 minutes', value: '*/30 * * * *', description: 'Runs every 30 minutes' },
  { label: 'Every hour', value: '0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every 2 hours', value: '0 */2 * * *', description: 'Runs every 2 hours' },
  { label: 'Every 6 hours', value: '0 */6 * * *', description: 'Runs every 6 hours' },
  { label: 'Daily at midnight', value: '0 0 * * *', description: 'Runs at 12:00 AM' },
  { label: 'Daily at noon', value: '0 12 * * *', description: 'Runs at 12:00 PM' },
];

export const CronSettings: React.FC = () => {
  const { showSuccess, showError, showInfo } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cronJob, setCronJob] = useState<CronJob | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState('*/2 * * * *');
  const [customSchedule, setCustomSchedule] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [cronEnabled, setCronEnabled] = useState(false);
  const [lastRunInfo, setLastRunInfo] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadCronSettings();
  }, []);

  const loadCronSettings = async () => {
    setLoading(true);
    try {
      // Just assume cron is enabled and try to load the jobs
      // If it fails, we'll handle it gracefully
      setCronEnabled(true);

      // Load existing cron job using the new function
      const { data: jobData, error: jobError } = await supabase
        .rpc('get_cron_jobs');

      if (!jobError && jobData && jobData.length > 0) {
        const job = jobData[0];
        setCronJob(job);
        setSelectedSchedule(job.schedule);
        
        // Check if it's a custom schedule
        const isPreset = CRON_PRESETS.some(preset => preset.value === job.schedule);
        if (!isPreset) {
          setUseCustom(true);
          setCustomSchedule(job.schedule);
        }
      }

      // Load last run info
      const { data: runData, error: runError } = await supabase
        .rpc('get_cron_last_run');

      if (!runError && runData && runData.length > 0) {
        setLastRunInfo(runData[0]);
      }

    } catch (error) {
      console.error('Error loading cron settings:', error);
      showError('Failed to load cron settings');
    } finally {
      setLoading(false);
    }
  };

  const saveCronSettings = async () => {
    setSaving(true);
    try {
      const schedule = useCustom ? customSchedule : selectedSchedule;
      
      if (!schedule) {
        showError('Please select or enter a schedule');
        return;
      }

      // Use the new update function
      const { data, error } = await supabase
        .rpc('update_cron_schedule', { p_schedule: schedule });

      if (error) throw error;

      if (data?.success) {
        showSuccess('Cron schedule updated successfully!');
        await loadCronSettings();
      } else {
        showError(data?.message || 'Failed to update schedule');
      }
    } catch (error) {
      console.error('Error saving cron settings:', error);
      showError('Failed to save cron settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleCronJob = async () => {
    if (!cronJob) return;

    try {
      const newStatus = !cronJob.active;
      
      const { data, error } = await supabase
        .rpc('toggle_cron_job', { p_active: newStatus });

      if (error) throw error;

      if (data?.success) {
        showSuccess(`Email processing ${newStatus ? 'enabled' : 'disabled'}`);
        await loadCronSettings();
      } else {
        showError(data?.message || 'Failed to toggle job');
      }
    } catch (error) {
      console.error('Error toggling cron job:', error);
      showError('Failed to toggle cron job');
    }
  };

  const testEmailProcessing = async () => {
    setTesting(true);
    try {
      showInfo('Triggering email processing...');
      
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        showError('Authentication required');
        return;
      }
      
      // Use secure admin endpoint instead of direct function call
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-trigger-email-processing`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const result = await response.json();
      
      if (response.ok) {
        showSuccess(`Email processing completed. ${result.message || 'Check email queue for results.'}`);
      } else {
        showError(`Processing failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error testing email processing:', error);
      showError('Failed to trigger email processing');
    } finally {
      setTesting(false);
    }
  };

  const formatCronSchedule = (schedule: string) => {
    const preset = CRON_PRESETS.find(p => p.value === schedule);
    return preset ? preset.label : schedule;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  if (!cronEnabled) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-medium mb-2">Cron Not Available</h3>
            <p className="text-gray-400 text-sm mb-3">
              The pg_cron extension is not enabled in your Supabase project.
            </p>
            <p className="text-gray-400 text-sm">
              To enable automatic email processing:
            </p>
            <ol className="list-decimal list-inside text-gray-400 text-sm mt-2 space-y-1">
              <li>Go to your Supabase Dashboard</li>
              <li>Navigate to Database → Extensions</li>
              <li>Search for "pg_cron"</li>
              <li>Click "Enable" next to pg_cron</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center">
            <Clock className="h-5 w-5 mr-2 text-electric-400" />
            Email Processing Status
          </h3>
          <button
            onClick={toggleCronJob}
            disabled={!cronJob}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              cronJob?.active
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            {cronJob?.active ? (
              <>
                <Pause className="h-4 w-4" />
                <span>Disable</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Enable</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700/30 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">Status</p>
            <p className={`font-medium ${cronJob?.active ? 'text-green-400' : 'text-gray-400'}`}>
              {cronJob?.active ? 'Active' : 'Inactive'}
            </p>
          </div>

          <div className="bg-gray-700/30 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">Current Schedule</p>
            <p className="text-white font-medium">
              {cronJob ? formatCronSchedule(cronJob.schedule) : 'Not configured'}
            </p>
          </div>

          <div className="bg-gray-700/30 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">Last Run</p>
            <p className="text-white font-medium">
              {lastRunInfo ? (
                <>
                  {new Date(lastRunInfo.start_time).toLocaleString()}
                  <span className={`text-xs ml-2 ${
                    lastRunInfo.status === 'succeeded' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ({lastRunInfo.status})
                  </span>
                </>
              ) : (
                'Never'
              )}
            </p>
          </div>
        </div>

        {/* Test Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={testEmailProcessing}
            disabled={testing}
            className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
          >
            {testing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span>{testing ? 'Processing...' : 'Test Now'}</span>
          </button>
        </div>
      </div>

      {/* Schedule Configuration */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <Timer className="h-5 w-5 mr-2 text-electric-400" />
          Schedule Configuration
        </h3>

        <div className="space-y-4">
          {/* Preset Schedules */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Select Schedule
            </label>
            <select
              value={useCustom ? 'custom' : selectedSchedule}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setUseCustom(true);
                } else {
                  setUseCustom(false);
                  setSelectedSchedule(e.target.value);
                }
              }}
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            >
              {CRON_PRESETS.map(preset => (
                <option key={preset.value} value={preset.value}>
                  {preset.label} - {preset.description}
                </option>
              ))}
              <option value="custom">Custom Schedule</option>
            </select>
          </div>

          {/* Custom Schedule Input */}
          {useCustom && (
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Custom Cron Expression
              </label>
              <input
                type="text"
                value={customSchedule}
                onChange={(e) => setCustomSchedule(e.target.value)}
                placeholder="*/5 * * * *"
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
              />
              <p className="text-gray-400 text-xs mt-1">
                Format: minute hour day month weekday (e.g., */5 * * * * runs every 5 minutes)
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveCronSettings}
              disabled={saving}
              className="px-6 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{saving ? 'Saving...' : 'Save Schedule'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 text-electric-400" />
          How It Works
        </h3>
        <div className="space-y-3 text-gray-400 text-sm">
          <p>
            The email processor automatically checks for pending emails in the queue and sends them according to your configured schedule.
          </p>
          <p>
            <strong className="text-gray-300">Recommended Settings:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>For high-volume: Every 1-2 minutes</li>
            <li>For moderate volume: Every 5-10 minutes</li>
            <li>For low volume: Every 15-30 minutes</li>
          </ul>
          <p>
            <strong className="text-gray-300">Note:</strong> More frequent processing may increase your Supabase function invocations. The processor only runs when there are emails to send.
          </p>
        </div>
      </div>
    </div>
  );
};