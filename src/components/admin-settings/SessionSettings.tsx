import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, Save, CheckCircle, AlertCircle, Shield, Users, LogOut } from 'lucide-react';

interface SessionSettingsState {
  session_timeout_minutes: string;
  max_login_attempts: string;
  lockout_duration_minutes: string;
  require_password_change_days: string;
  enable_session_tracking: boolean;
  enable_activity_logging: boolean;
}

export const SessionSettings: React.FC = () => {
  const [settings, setSettings] = useState<SessionSettingsState>({
    session_timeout_minutes: '30',
    max_login_attempts: '5',
    lockout_duration_minutes: '15',
    require_password_change_days: '90',
    enable_session_tracking: true,
    enable_activity_logging: true,
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessionSettings();
  }, []);

  const loadSessionSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', [
          'session_timeout_minutes',
          'max_login_attempts',
          'lockout_duration_minutes',
          'require_password_change_days',
          'enable_session_tracking',
          'enable_activity_logging',
        ]);
      if (error) throw error;
      if (data) {
        const keyMap: { [key: string]: string } = {};
        data.forEach((item: any) => {
          keyMap[item.key] = item.value || '';
        });
        setSettings({
          session_timeout_minutes: keyMap.session_timeout_minutes || '30',
          max_login_attempts: keyMap.max_login_attempts || '5',
          lockout_duration_minutes: keyMap.lockout_duration_minutes || '15',
          require_password_change_days: keyMap.require_password_change_days || '90',
          enable_session_tracking: keyMap.enable_session_tracking === 'true',
          enable_activity_logging: keyMap.enable_activity_logging === 'true',
        });
      }
    } catch (err: any) {
      setError('Database Error: Failed to load session settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: keyof SessionSettingsState, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveStatus('saving');
    setError(null);
    try {
      const settingsToUpdate = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value),
        is_sensitive: false,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('admin_settings')
        .upsert(settingsToUpdate, { onConflict: 'key' });
      if (error) throw error;
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setError('Database Error: Failed to save session settings. Please try again.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center space-x-2 mb-6">
        <Clock className="h-6 w-6 text-electric-500" />
        <h2 className="text-2xl font-bold text-white">Session & Security Settings</h2>
      </div>
      <div className="space-y-6">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
            <Clock className="h-5 w-5 text-electric-500" />
            <span>Session Management</span>
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Session Timeout (minutes)</label>
              <input
                type="number"
                min="5"
                max="1440"
                value={settings.session_timeout_minutes}
                onChange={e => handleInputChange('session_timeout_minutes', e.target.value)}
                className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                placeholder="30"
              />
              <p className="text-xs text-gray-400">How long before inactive sessions expire (5-1440 minutes)</p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enable_session_tracking"
                checked={settings.enable_session_tracking}
                onChange={e => handleInputChange('enable_session_tracking', e.target.checked)}
                className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
              />
              <label htmlFor="enable_session_tracking" className="text-sm font-medium text-gray-300">
                Enable Session Tracking
              </label>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
            <Shield className="h-5 w-5 text-electric-500" />
            <span>Security Settings</span>
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Max Login Attempts</label>
              <input
                type="number"
                min="1"
                max="20"
                value={settings.max_login_attempts}
                onChange={e => handleInputChange('max_login_attempts', e.target.value)}
                className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                placeholder="5"
              />
              <p className="text-xs text-gray-400">Number of failed login attempts before account lockout</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Lockout Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="1440"
                value={settings.lockout_duration_minutes}
                onChange={e => handleInputChange('lockout_duration_minutes', e.target.value)}
                className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                placeholder="15"
              />
              <p className="text-xs text-gray-400">How long accounts remain locked after max failed attempts</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password Change Requirement (days)</label>
              <input
                type="number"
                min="0"
                max="365"
                value={settings.require_password_change_days}
                onChange={e => handleInputChange('require_password_change_days', e.target.value)}
                className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                placeholder="90"
              />
              <p className="text-xs text-gray-400">Days before users must change their password (0 = no requirement)</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
            <Users className="h-5 w-5 text-electric-500" />
            <span>Activity Logging</span>
          </h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enable_activity_logging"
                checked={settings.enable_activity_logging}
                onChange={e => handleInputChange('enable_activity_logging', e.target.checked)}
                className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
              />
              <label htmlFor="enable_activity_logging" className="text-sm font-medium text-gray-300">
                Enable Activity Logging
              </label>
            </div>
            <p className="text-xs text-gray-400">Log user activities for security monitoring and audit trails</p>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2 mt-6">
        <button
          onClick={handleSave}
          disabled={loading}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold transition-all duration-200 ${
            saveStatus === 'success'
              ? 'bg-green-600 text-white'
              : saveStatus === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-electric-500 text-white hover:bg-electric-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : saveStatus === 'success' ? (
            <>
              <CheckCircle className="h-5 w-5" />
              <span>Saved Successfully</span>
            </>
          ) : saveStatus === 'error' ? (
            <>
              <AlertCircle className="h-5 w-5" />
              <span>Save Failed</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Save Configuration</span>
            </>
          )}
        </button>
      </div>
      {error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 mt-8">
        <h3 className="text-purple-400 font-medium mb-2">Security Best Practices</h3>
        <ul className="text-purple-300 text-sm space-y-1 list-disc list-inside">
          <li>Set session timeout to 30 minutes or less for sensitive applications</li>
          <li>Limit login attempts to 5 or fewer to prevent brute force attacks</li>
          <li>Enable activity logging for security monitoring</li>
          <li>Require password changes every 90 days for enhanced security</li>
        </ul>
      </div>
    </div>
  );
}; 