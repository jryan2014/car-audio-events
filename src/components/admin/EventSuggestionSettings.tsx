import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, AlertCircle, Clock, Mail, Globe, Shield, Activity } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Alert } from '../ui/Alert';

interface SuggestionSettings {
  id: string;
  enabled: boolean;
  max_per_email_hourly: number;
  max_per_email_daily: number;
  max_per_email_weekly: number;
  max_per_email_monthly: number;
  max_per_ip_hourly: number;
  max_per_ip_daily: number;
  max_per_ip_weekly: number;
  max_per_ip_monthly: number;
  require_email_verification: boolean;
  block_disposable_emails: boolean;
  minimum_time_between_submissions: number;
  rate_limit_message: string;
  disabled_message: string;
}

interface SubmissionStats {
  total_today: number;
  total_week: number;
  total_month: number;
  unique_emails_today: number;
  unique_ips_today: number;
  recent_submissions: Array<{
    email: string;
    ip_address: string;
    submitted_at: string;
  }>;
}

export default function EventSuggestionSettings() {
  const [settings, setSettings] = useState<SuggestionSettings | null>(null);
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('event_suggestion_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
      } else {
        // Create default settings if none exist
        const { data: newSettings, error: insertError } = await supabase
          .from('event_suggestion_settings')
          .insert([{
            id: '00000000-0000-0000-0000-000000000001',
            enabled: true,
            max_per_email_hourly: 2,
            max_per_email_daily: 5,
            max_per_email_weekly: 10,
            max_per_email_monthly: 20,
            max_per_ip_hourly: 3,
            max_per_ip_daily: 10,
            max_per_ip_weekly: 20,
            max_per_ip_monthly: 50,
            require_email_verification: false,
            block_disposable_emails: false,
            minimum_time_between_submissions: 5,
            rate_limit_message: 'You have reached the maximum number of event suggestions allowed. Please try again later or create an account for unlimited submissions.',
            disabled_message: 'Event suggestions are temporarily disabled. Please check back later.'
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const weekStart = new Date(now.setDate(now.getDate() - 7));
      const monthStart = new Date(now.setMonth(now.getMonth() - 1));

      // Get submission counts
      const { data: submissions, error } = await supabase
        .from('event_suggestion_submissions')
        .select('email, ip_address, submitted_at')
        .gte('submitted_at', monthStart.toISOString())
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const todaySubmissions = submissions?.filter(s => new Date(s.submitted_at) >= todayStart) || [];
      const weekSubmissions = submissions?.filter(s => new Date(s.submitted_at) >= weekStart) || [];

      const uniqueEmailsToday = new Set(todaySubmissions.map(s => s.email)).size;
      const uniqueIPsToday = new Set(todaySubmissions.filter(s => s.ip_address).map(s => s.ip_address)).size;

      setStats({
        total_today: todaySubmissions.length,
        total_week: weekSubmissions.length,
        total_month: submissions?.length || 0,
        unique_emails_today: uniqueEmailsToday,
        unique_ips_today: uniqueIPsToday,
        recent_submissions: submissions?.slice(0, 10) || []
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('event_suggestion_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof SuggestionSettings>(
    key: K,
    value: SuggestionSettings[K]
  ) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Failed to load settings</span>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {stats && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-electric-500" />
              Event Suggestion Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{stats.total_today}</div>
                <div className="text-sm text-gray-400">Today</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{stats.total_week}</div>
                <div className="text-sm text-gray-400">This Week</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{stats.total_month}</div>
                <div className="text-sm text-gray-400">This Month</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{stats.unique_emails_today}</div>
                <div className="text-sm text-gray-400">Unique Emails Today</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{stats.unique_ips_today}</div>
                <div className="text-sm text-gray-400">Unique IPs Today</div>
              </div>
            </div>

            {stats.recent_submissions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Recent Submissions</h4>
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-300">Email</th>
                        <th className="px-4 py-2 text-left text-gray-300">IP Address</th>
                        <th className="px-4 py-2 text-left text-gray-300">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {stats.recent_submissions.map((submission, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-gray-300">{submission.email}</td>
                          <td className="px-4 py-2 text-gray-400">{submission.ip_address || 'N/A'}</td>
                          <td className="px-4 py-2 text-gray-400">
                            {new Date(submission.submitted_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Settings */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-electric-500" />
            Event Suggestion Settings
          </CardTitle>
          <CardDescription className="text-gray-400">
            Control how public users can submit event suggestions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-900/20 border-green-500/50 text-green-400">
              <span>Settings saved successfully!</span>
            </Alert>
          )}

          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <label className="text-white font-medium">Enable Event Suggestions</label>
              <p className="text-sm text-gray-400">Allow public users to suggest events</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => updateSetting('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-electric-500"></div>
            </label>
          </div>

          {/* Email Rate Limits */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-electric-500" />
              Email Rate Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Per Hour
                </label>
                <Input
                  type="number"
                  min="0"
                  value={settings.max_per_email_hourly}
                  onChange={(e) => updateSetting('max_per_email_hourly', parseInt(e.target.value) || 0)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Per Day
                </label>
                <Input
                  type="number"
                  min="0"
                  value={settings.max_per_email_daily}
                  onChange={(e) => updateSetting('max_per_email_daily', parseInt(e.target.value) || 0)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Per Week
                </label>
                <Input
                  type="number"
                  min="0"
                  value={settings.max_per_email_weekly}
                  onChange={(e) => updateSetting('max_per_email_weekly', parseInt(e.target.value) || 0)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Per Month
                </label>
                <Input
                  type="number"
                  min="0"
                  value={settings.max_per_email_monthly}
                  onChange={(e) => updateSetting('max_per_email_monthly', parseInt(e.target.value) || 0)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* IP Rate Limits */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-electric-500" />
              IP Address Rate Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Per Hour
                </label>
                <Input
                  type="number"
                  min="0"
                  value={settings.max_per_ip_hourly}
                  onChange={(e) => updateSetting('max_per_ip_hourly', parseInt(e.target.value) || 0)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Per Day
                </label>
                <Input
                  type="number"
                  min="0"
                  value={settings.max_per_ip_daily}
                  onChange={(e) => updateSetting('max_per_ip_daily', parseInt(e.target.value) || 0)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Per Week
                </label>
                <Input
                  type="number"
                  min="0"
                  value={settings.max_per_ip_weekly}
                  onChange={(e) => updateSetting('max_per_ip_weekly', parseInt(e.target.value) || 0)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Per Month
                </label>
                <Input
                  type="number"
                  min="0"
                  value={settings.max_per_ip_monthly}
                  onChange={(e) => updateSetting('max_per_ip_monthly', parseInt(e.target.value) || 0)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Other Settings */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-electric-500" />
              Additional Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Time Between Submissions (minutes)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={settings.minimum_time_between_submissions}
                  onChange={(e) => updateSetting('minimum_time_between_submissions', parseInt(e.target.value) || 0)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.require_email_verification}
                    onChange={(e) => updateSetting('require_email_verification', e.target.checked)}
                    className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                  />
                  <span className="text-gray-300">Require Email Verification</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.block_disposable_emails}
                    onChange={(e) => updateSetting('block_disposable_emails', e.target.checked)}
                    className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                  />
                  <span className="text-gray-300">Block Disposable Email Addresses</span>
                </label>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Custom Messages</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rate Limit Message
                </label>
                <textarea
                  value={settings.rate_limit_message}
                  onChange={(e) => updateSetting('rate_limit_message', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-electric-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Disabled Message
                </label>
                <textarea
                  value={settings.disabled_message}
                  onChange={(e) => updateSetting('disabled_message', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-electric-500"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              loading={isSaving}
              leftIcon={<Save className="h-4 w-4" />}
              className="bg-electric-500 hover:bg-electric-600 text-white"
            >
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}