import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Database, Save, CheckCircle, AlertCircle } from 'lucide-react';

interface SupabaseSettingsState {
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_role_key: string;
}

export const SupabaseSettings: React.FC = () => {
  const [settings, setSettings] = useState<SupabaseSettingsState>({
    supabase_url: '',
    supabase_anon_key: '',
    supabase_service_role_key: '',
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSupabaseSettings();
  }, []);

  const loadSupabaseSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', [
          'supabase_url',
          'supabase_anon_key',
          'supabase_service_role_key',
        ]);
      if (error) throw error;
      if (data) {
        const keyMap: { [key: string]: string } = {};
        data.forEach((item: any) => {
          keyMap[item.key] = item.value || '';
        });
        setSettings({
          supabase_url: keyMap.supabase_url || '',
          supabase_anon_key: keyMap.supabase_anon_key || '',
          supabase_service_role_key: keyMap.supabase_service_role_key || '',
        });
      }
    } catch (err: any) {
      setError('Database Error: Failed to load Supabase settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: keyof SupabaseSettingsState, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveStatus('saving');
    setError(null);
    try {
      const settingsToUpdate = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        is_sensitive: key === 'supabase_service_role_key',
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('admin_settings')
        .upsert(settingsToUpdate, { onConflict: 'key' });
      if (error) throw error;
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setError('Database Error: Failed to save Supabase settings. Please try again.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center space-x-2 mb-6">
        <Database className="h-6 w-6 text-electric-500" />
        <h2 className="text-2xl font-bold text-white">Supabase Configuration</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Project URL</label>
          <input
            type="text"
            value={settings.supabase_url}
            onChange={e => handleInputChange('supabase_url', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
            placeholder="Enter your Supabase project URL"
          />
          <p className="text-xs text-gray-400">Your Supabase project URL (e.g., https://your-project.supabase.co)</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Anonymous Key</label>
          <input
            type="text"
            value={settings.supabase_anon_key}
            onChange={e => handleInputChange('supabase_anon_key', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
            placeholder="Enter your Supabase anon/public key"
          />
          <p className="text-xs text-gray-400">Your Supabase anonymous/public key. Safe to expose in frontend.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Service Role Key</label>
          <input
            type="password"
            value={settings.supabase_service_role_key}
            onChange={e => handleInputChange('supabase_service_role_key', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
            placeholder="Enter your Supabase service role key"
          />
          <p className="text-xs text-gray-400">Your Supabase service role key. Keep this secure and only use in backend/edge functions.</p>
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
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mt-8">
        <h3 className="text-green-400 font-medium mb-2">Supabase Setup Instructions</h3>
        <ol className="text-green-300 text-sm space-y-1 list-decimal list-inside">
          <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Supabase Dashboard</a></li>
          <li>Navigate to Settings → API</li>
          <li>Copy your Project URL and API keys</li>
          <li>Set up your database schema and RLS policies</li>
        </ol>
      </div>
    </div>
  );
}; 