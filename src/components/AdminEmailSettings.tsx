import React, { useState, useEffect } from 'react';
import { Mail, Settings, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ZohoSettings {
  host: string;
  port: number | string;
  user: string;
  pass: string; // This will only be used for saving, not displaying
}

export default function AdminEmailSettings() {
  const [settings, setSettings] = useState<ZohoSettings>({
    host: '',
    port: '',
    user: '',
    pass: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.functions.invoke('admin-get-email-settings');
      if (error) throw error;
      
      setSettings(prev => ({
        ...prev,
        host: data.host || '',
        port: data.port || '',
        user: data.user || '',
      }));
    } catch (err: any) {
      console.error('Error loading email settings:', err);
      setError('Failed to load current email settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings.host || !settings.port || !settings.user || !settings.pass) {
        setError('All fields, including password, are required to save.');
        return;
    }
    
    setIsSaving(true);
    setMessage('');
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('admin-update-email-settings', {
        body: {
          host: settings.host,
          port: Number(settings.port),
          user: settings.user,
          pass: settings.pass,
        }
      });

      if (error) throw error;

      setMessage(data.message || 'Settings saved successfully! 🎉');
      // Clear the password field after successful save for security
      setSettings(prev => ({ ...prev, pass: '' }));
      
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500 mx-auto"></div>
        <p className="text-gray-400 mt-2">Loading Email Settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="h-6 w-6 text-electric-400" />
          <h2 className="text-xl font-bold text-white">Zoho Mail SMTP Configuration</h2>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
            </div>
        )}
        {message && (
            <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>{message}</span>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              SMTP Host *
            </label>
            <input
              type="text"
              value={settings.host}
              onChange={(e) => setSettings(prev => ({ ...prev, host: e.target.value }))}
              placeholder="e.g., smtp.zoho.com"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              SMTP Port *
            </label>
            <input
              type="number"
              value={settings.port}
              onChange={(e) => setSettings(prev => ({ ...prev, port: e.target.value }))}
              placeholder="e.g., 465 or 587"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              SMTP Username (Email) *
            </label>
            <input
              type="email"
              value={settings.user}
              onChange={(e) => setSettings(prev => ({ ...prev, user: e.target.value }))}
              placeholder="your-email@zoho.com"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              SMTP Password / App Password *
            </label>
            <input
              type="password"
              value={settings.pass}
              onChange={(e) => setSettings(prev => ({ ...prev, pass: e.target.value }))}
              placeholder="Enter password to save. Will not be shown again."
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              For security, this is write-only. If you need to change it, just enter a new one.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-start pt-6 border-t border-gray-600 mt-6">
          <button
            onClick={saveSettings}
            disabled={isSaving || isLoading}
            className="flex items-center space-x-2 px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save SMTP Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
} 