import React, { useState, useEffect } from 'react';
import { Mail, Settings, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MailgunSettings {
  apiKey: string;
  domain: string;
  fromEmail: string;
  fromName: string;
}

export default function AdminEmailSettings() {
  const [settings, setSettings] = useState<MailgunSettings>({
    apiKey: '',
    domain: '',
    fromEmail: '',
    fromName: ''
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
        apiKey: data.apiKey || '',
        domain: data.domain || '',
        fromEmail: data.fromEmail || '',
        fromName: data.fromName || '',
      }));
    } catch (err: any) {
      console.error('Error loading email settings:', err);
      setError('Failed to load current email settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings.apiKey || !settings.domain || !settings.fromEmail || !settings.fromName) {
        setError('All fields are required to save.');
        return;
    }
    
    setIsSaving(true);
    setMessage('');
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('admin-update-email-settings', {
        body: {
          apiKey: settings.apiKey,
          domain: settings.domain,
          fromEmail: settings.fromEmail,
          fromName: settings.fromName,
        }
      });

      if (error) throw error;

      setMessage(data.message || 'Settings saved successfully! 🎉');
      
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
          <h2 className="text-xl font-bold text-white">Mailgun Email Configuration</h2>
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
              Mailgun API Key *
            </label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Enter your Mailgun API key"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              For security, this is write-only. If you need to change it, just enter a new one.
            </p>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Mailgun Domain *
            </label>
            <input
              type="text"
              value={settings.domain}
              onChange={(e) => setSettings(prev => ({ ...prev, domain: e.target.value }))}
              placeholder="e.g., mg.yourdomain.com"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              From Email Address *
            </label>
            <input
              type="email"
              value={settings.fromEmail}
              onChange={(e) => setSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
              placeholder="noreply@yourdomain.com"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              From Name *
            </label>
            <input
              type="text"
              value={settings.fromName}
              onChange={(e) => setSettings(prev => ({ ...prev, fromName: e.target.value }))}
              placeholder="Car Audio Events"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-start pt-6 border-t border-gray-600 mt-6">
          <button
            onClick={saveSettings}
            disabled={isSaving || isLoading}
            className="flex items-center space-x-2 px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Mailgun Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
} 