import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Bug, Save, CheckCircle, AlertCircle, Activity, FileText, Download, Trash2, Eye, EyeOff } from 'lucide-react';

interface DebugSettingsState {
  debug_mode_enabled: boolean;
  log_level: string;
  enable_error_reporting: boolean;
  enable_performance_monitoring: boolean;
  enable_activity_logging: boolean;
  log_retention_days: string;
  enable_console_logging: boolean;
}

interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  user_id?: string;
  session_id?: string;
  metadata?: any;
}

export const DebugSettings: React.FC = () => {
  const [settings, setSettings] = useState<DebugSettingsState>({
    debug_mode_enabled: false,
    log_level: 'info',
    enable_error_reporting: true,
    enable_performance_monitoring: true,
    enable_activity_logging: true,
    log_retention_days: '30',
    enable_console_logging: false,
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  useEffect(() => {
    loadDebugSettings();
    getSystemInfo();
  }, []);

  const loadDebugSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', [
          'debug_mode_enabled',
          'log_level',
          'enable_error_reporting',
          'enable_performance_monitoring',
          'enable_activity_logging',
          'log_retention_days',
          'enable_console_logging',
        ]);
      if (error) throw error;
      if (data) {
        const keyMap: { [key: string]: string } = {};
        data.forEach((item: any) => {
          keyMap[item.key] = item.value || '';
        });
        setSettings({
          debug_mode_enabled: keyMap.debug_mode_enabled === 'true',
          log_level: keyMap.log_level || 'info',
          enable_error_reporting: keyMap.enable_error_reporting === 'true',
          enable_performance_monitoring: keyMap.enable_performance_monitoring === 'true',
          enable_activity_logging: keyMap.enable_activity_logging === 'true',
          log_retention_days: keyMap.log_retention_days || '30',
          enable_console_logging: keyMap.enable_console_logging === 'true',
        });
      }
    } catch (err: any) {
      setError('Database Error: Failed to load debug settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSystemInfo = () => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      memory: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round((performance as any).memory.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1048576) + ' MB',
      } : null,
      localStorage: {
        available: typeof Storage !== 'undefined',
        size: localStorage.length,
      },
      sessionStorage: {
        available: typeof Storage !== 'undefined',
        size: sessionStorage.length,
      },
    };
    setSystemInfo(info);
  };

  const loadRecentLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);
      if (error) throw error;
      if (data) {
        setLogs(data);
      }
    } catch (err: any) {
      console.error('Failed to load logs:', err);
    }
  };

  const handleInputChange = (key: keyof DebugSettingsState, value: string | boolean) => {
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
      setError('Database Error: Failed to save debug settings. Please try again.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('system_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Keep at least one record
      if (error) throw error;
      await loadRecentLogs();
      alert('All logs have been cleared successfully.');
    } catch (err: any) {
      setError('Failed to clear logs. Please try again.');
    }
  };

  const exportLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      
      const csvContent = [
        'Timestamp,Level,Message,User ID,Session ID',
        ...data.map(log => 
          `"${log.timestamp}","${log.level}","${log.message}","${log.user_id || ''}","${log.session_id || ''}"`
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to export logs. Please try again.');
    }
  };

  const testLogging = async () => {
    try {
      const testLog = {
        level: 'info',
        message: 'Test log entry from debug settings',
        timestamp: new Date().toISOString(),
        user_id: 'admin',
        session_id: 'test-session',
        metadata: { source: 'debug-settings-test' }
      };
      
      const { error } = await supabase
        .from('system_logs')
        .insert(testLog);
      if (error) throw error;
      
      await loadRecentLogs();
      alert('Test log entry created successfully.');
    } catch (err: any) {
      setError('Failed to create test log entry. Please try again.');
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      case 'debug': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center space-x-2 mb-6">
        <Bug className="h-6 w-6 text-electric-500" />
        <h2 className="text-2xl font-bold text-white">Debug & System Settings</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
              <Activity className="h-5 w-5 text-electric-500" />
              <span>Debug Configuration</span>
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="debug_mode_enabled"
                  checked={settings.debug_mode_enabled}
                  onChange={e => handleInputChange('debug_mode_enabled', e.target.checked)}
                  className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
                />
                <label htmlFor="debug_mode_enabled" className="text-sm font-medium text-gray-300">
                  Enable Debug Mode
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable_console_logging"
                  checked={settings.enable_console_logging}
                  onChange={e => handleInputChange('enable_console_logging', e.target.checked)}
                  className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
                />
                <label htmlFor="enable_console_logging" className="text-sm font-medium text-gray-300">
                  Enable Console Logging
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Log Level</label>
                <select
                  value={settings.log_level}
                  onChange={e => handleInputChange('log_level', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                >
                  <option value="error">Error</option>
                  <option value="warn">Warning</option>
                  <option value="info">Info</option>
                  <option value="debug">Debug</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-4">Monitoring Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable_error_reporting"
                  checked={settings.enable_error_reporting}
                  onChange={e => handleInputChange('enable_error_reporting', e.target.checked)}
                  className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
                />
                <label htmlFor="enable_error_reporting" className="text-sm font-medium text-gray-300">
                  Enable Error Reporting
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable_performance_monitoring"
                  checked={settings.enable_performance_monitoring}
                  onChange={e => handleInputChange('enable_performance_monitoring', e.target.checked)}
                  className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
                />
                <label htmlFor="enable_performance_monitoring" className="text-sm font-medium text-gray-300">
                  Enable Performance Monitoring
                </label>
              </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Log Retention (days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.log_retention_days}
                  onChange={e => handleInputChange('log_retention_days', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                  placeholder="30"
                />
                <p className="text-xs text-gray-400">How long to keep log entries (1-365 days)</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
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
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
              <FileText className="h-5 w-5 text-electric-500" />
              <span>System Information</span>
            </h3>
            {systemInfo && (
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-400">Platform:</span> <span className="text-white">{systemInfo.platform}</span></div>
                <div><span className="text-gray-400">Browser:</span> <span className="text-white">{systemInfo.userAgent.split(' ')[0]}</span></div>
                <div><span className="text-gray-400">Language:</span> <span className="text-white">{systemInfo.language}</span></div>
                <div><span className="text-gray-400">Timezone:</span> <span className="text-white">{systemInfo.timezone}</span></div>
                <div><span className="text-gray-400">Screen:</span> <span className="text-white">{systemInfo.screenResolution}</span></div>
                <div><span className="text-gray-400">Online:</span> <span className="text-white">{systemInfo.onLine ? 'Yes' : 'No'}</span></div>
                {systemInfo.memory && (
                  <div><span className="text-gray-400">Memory:</span> <span className="text-white">{systemInfo.memory.used} / {systemInfo.memory.total}</span></div>
                )}
                <div><span className="text-gray-400">Local Storage:</span> <span className="text-white">{systemInfo.localStorage.size} items</span></div>
                <div><span className="text-gray-400">Session Storage:</span> <span className="text-white">{systemInfo.sessionStorage.size} items</span></div>
              </div>
            )}
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white flex items-center space-x-2">
                <Activity className="h-5 w-5 text-electric-500" />
                <span>Recent Logs</span>
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  {showLogs ? 'Hide' : 'Show'} Logs
                </button>
                <button
                  onClick={loadRecentLogs}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>
            
            {showLogs && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {logs.length > 0 ? (
                  logs.map(log => (
                    <div key={log.id} className="bg-gray-700/50 rounded p-2 text-sm">
                      <div className="flex justify-between items-start">
                        <span className={`font-mono ${getLogLevelColor(log.level)}`}>
                          [{log.level.toUpperCase()}]
                        </span>
                        <span className="text-gray-400 text-xs">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-white mt-1">{log.message}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-sm">No logs available</div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={testLogging}
                className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm"
              >
                Test Logging
              </button>
              <button
                onClick={exportLogs}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Export Logs
              </button>
              <button
                onClick={clearLogs}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
              >
                Clear Logs
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-8">
        <h3 className="text-red-400 font-medium mb-2">Debug Mode Warning</h3>
        <p className="text-red-300 text-sm">
          Debug mode should only be enabled during development. It may expose sensitive information 
          and impact performance. Remember to disable it in production environments.
        </p>
      </div>
    </div>
  );
}; 