import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Save, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface RecaptchaSettingsState {
  recaptcha_site_key: string;
  recaptcha_secret_key: string;
  recaptcha_enabled: boolean;
  recaptcha_version: string;
}

export const RecaptchaSettings: React.FC = () => {
  const [settings, setSettings] = useState<RecaptchaSettingsState>({
    recaptcha_site_key: '',
    recaptcha_secret_key: '',
    recaptcha_enabled: true,
    recaptcha_version: 'v2',
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);

  useEffect(() => {
    loadRecaptchaSettings();
  }, []);

  const loadRecaptchaSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', [
          'recaptcha_site_key',
          'recaptcha_secret_key',
          'recaptcha_enabled',
          'recaptcha_version',
        ]);
      if (error) throw error;
      if (data) {
        const keyMap: { [key: string]: string } = {};
        data.forEach((item: any) => {
          keyMap[item.key] = item.value || '';
        });
        setSettings({
          recaptcha_site_key: keyMap.recaptcha_site_key || '',
          recaptcha_secret_key: keyMap.recaptcha_secret_key || '',
          recaptcha_enabled: keyMap.recaptcha_enabled === 'true',
          recaptcha_version: keyMap.recaptcha_version || 'v2',
        });
      }
    } catch (err: any) {
      setError('Database Error: Failed to load reCAPTCHA settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: keyof RecaptchaSettingsState, value: string | boolean) => {
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
        is_sensitive: key === 'recaptcha_secret_key',
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('admin_settings')
        .upsert(settingsToUpdate, { onConflict: 'key' });
      if (error) throw error;
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setError('Database Error: Failed to save reCAPTCHA settings. Please try again.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center space-x-2 mb-6">
        <Shield className="h-6 w-6 text-electric-500" />
        <h2 className="text-2xl font-bold text-white">reCAPTCHA Configuration</h2>
      </div>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="recaptcha_enabled"
            checked={settings.recaptcha_enabled}
            onChange={e => handleInputChange('recaptcha_enabled', e.target.checked)}
            className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
          />
          <label htmlFor="recaptcha_enabled" className="text-sm font-medium text-gray-300">
            Enable reCAPTCHA Protection
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Site Key</label>
          <input
            type="text"
            value={settings.recaptcha_site_key}
            onChange={e => handleInputChange('recaptcha_site_key', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
            placeholder="Enter your reCAPTCHA site key"
          />
          <p className="text-xs text-gray-400">Your reCAPTCHA site key (public key). Safe to expose in frontend.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Secret Key</label>
          <div className="relative">
            <input
              type={showSecretKey ? "text" : "password"}
              value={settings.recaptcha_secret_key}
              onChange={e => handleInputChange('recaptcha_secret_key', e.target.value)}
              className="w-full p-3 pr-12 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
              placeholder="Enter your reCAPTCHA secret key"
            />
            <button
              type="button"
              onClick={() => setShowSecretKey(!showSecretKey)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showSecretKey ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400">Your reCAPTCHA secret key. Keep this secure and only use in backend.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">reCAPTCHA Version</label>
          <select
            value={settings.recaptcha_version}
            onChange={e => handleInputChange('recaptcha_version', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
          >
            <option value="v2">reCAPTCHA v2 (Checkbox)</option>
            <option value="v2_invisible">reCAPTCHA v2 (Invisible)</option>
            <option value="v3">reCAPTCHA v3</option>
          </select>
          <p className="text-xs text-gray-400">Choose the reCAPTCHA version that best fits your needs.</p>
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
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mt-8">
        <h3 className="text-orange-400 font-medium mb-2">reCAPTCHA Setup Instructions</h3>
        <ol className="text-orange-300 text-sm space-y-1 list-decimal list-inside">
          <li>Go to the <a href="https://www.google.com/recaptcha/admin" target="_blank" rel="noopener noreferrer" className="underline">reCAPTCHA Admin Console</a></li>
          <li>Click "+" to create a new site</li>
          <li>Choose the reCAPTCHA type (v2, v2 Invisible, or v3)</li>
          <li>Add your domain(s) to the allowed domains list</li>
          <li>Copy the Site Key and Secret Key</li>
        </ol>
      </div>
    </div>
  );
}; 