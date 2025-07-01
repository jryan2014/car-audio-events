import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, Save, CheckCircle, AlertCircle, ExternalLink, TestTube } from 'lucide-react';

interface StripeSettingsState {
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  stripe_webhook_endpoint: string;
  stripe_test_mode: boolean;
}

export const StripeSettings: React.FC = () => {
  const [settings, setSettings] = useState<StripeSettingsState>({
    stripe_publishable_key: '',
    stripe_secret_key: '',
    stripe_webhook_secret: '',
    stripe_webhook_endpoint: '',
    stripe_test_mode: true,
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStripeSettings();
  }, []);

  const loadStripeSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', [
          'stripe_publishable_key',
          'stripe_secret_key',
          'stripe_webhook_secret',
          'stripe_webhook_endpoint',
          'stripe_test_mode',
        ]);
      if (error) throw error;
      if (data) {
        const keyMap: { [key: string]: string } = {};
        data.forEach((item: any) => {
          keyMap[item.key] = item.value || '';
        });
        setSettings({
          stripe_publishable_key: keyMap.stripe_publishable_key || '',
          stripe_secret_key: keyMap.stripe_secret_key || '',
          stripe_webhook_secret: keyMap.stripe_webhook_secret || '',
          stripe_webhook_endpoint: keyMap.stripe_webhook_endpoint || '',
          stripe_test_mode: keyMap.stripe_test_mode === 'true',
        });
      }
    } catch (err: any) {
      setError('Database Error: Failed to load Stripe settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: keyof StripeSettingsState, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveStatus('saving');
    setError(null);
    try {
      const settingsToUpdate = Object.entries(settings).map(([key, value]) => ({
        key,
        value: typeof value === 'boolean' ? value.toString() : value as string,
        is_sensitive: ['stripe_secret_key', 'stripe_webhook_secret'].includes(key),
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('admin_settings')
        .upsert(settingsToUpdate, { onConflict: 'key' });
      if (error) throw error;
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setError('Database Error: Failed to save Stripe settings. Please try again.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const validateKey = (key: keyof StripeSettingsState, value: string | boolean): boolean => {
    if (typeof value === 'boolean') return true;
    if (!value) return false;
    switch (key) {
      case 'stripe_publishable_key': return value.startsWith('pk_');
      case 'stripe_secret_key': return value.startsWith('sk_');
      case 'stripe_webhook_secret': return value.startsWith('whsec_');
      case 'stripe_webhook_endpoint': return value.startsWith('https://') && value.includes('supabase.co');
      default: return true;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center space-x-2 mb-6">
        <CreditCard className="h-6 w-6 text-electric-500" />
        <h2 className="text-2xl font-bold text-white">Stripe Configuration</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Publishable Key</label>
          <input
            type="text"
            value={settings.stripe_publishable_key}
            onChange={e => handleInputChange('stripe_publishable_key', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
            placeholder="Enter your publishable key"
          />
          <p className="text-xs text-gray-400">Your Stripe publishable key (starts with pk_). Safe to expose in frontend.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Secret Key</label>
          <input
            type="password"
            value={settings.stripe_secret_key}
            onChange={e => handleInputChange('stripe_secret_key', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
            placeholder="Enter your secret key"
          />
          <p className="text-xs text-gray-400">Your Stripe secret key (starts with sk_). Keep this secure and never expose in frontend.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Webhook Secret</label>
          <input
            type="password"
            value={settings.stripe_webhook_secret}
            onChange={e => handleInputChange('stripe_webhook_secret', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
            placeholder="Enter your webhook secret"
          />
          <p className="text-xs text-gray-400">Your Stripe webhook endpoint secret (starts with whsec_). Used to verify webhook signatures.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Webhook Endpoint URL</label>
          <input
            type="text"
            value={settings.stripe_webhook_endpoint}
            onChange={e => handleInputChange('stripe_webhook_endpoint', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
            placeholder="Enter your webhook endpoint url"
          />
          <p className="text-xs text-gray-400">Your Supabase edge function URL for handling Stripe webhooks (e.g., https://your-project.supabase.co/functions/v1/stripe-webhook)</p>
        </div>
        <div className="flex items-center space-x-3 mt-2">
          <input
            type="checkbox"
            checked={settings.stripe_test_mode}
            onChange={e => handleInputChange('stripe_test_mode', e.target.checked)}
            className="h-4 w-4 text-electric-500 border-gray-600 rounded focus:ring-electric-500"
            id="stripe_test_mode"
          />
          <label htmlFor="stripe_test_mode" className="text-sm text-gray-300">Test Mode (Safe for development)</label>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-blue-400 font-medium mb-2 flex items-center space-x-2">
            <ExternalLink className="h-4 w-4" />
            <span>Stripe Setup Instructions</span>
          </h3>
          <ol className="text-blue-300 text-sm space-y-1 list-decimal list-inside">
            <li><a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">Go to Stripe Dashboard</a></li>
            <li>Copy your publishable and secret keys</li>
            <li>Create webhook endpoint in Stripe</li>
            <li>Add webhook URL from Supabase</li>
            <li>Copy the webhook signing secret</li>
          </ol>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <h3 className="text-green-400 font-medium mb-2 flex items-center space-x-2">
            <TestTube className="h-4 w-4" />
            <span>Testing & Validation</span>
          </h3>
          <div className="space-y-2 text-green-300 text-sm">
            <div>Test your keys and webhook endpoint after saving.</div>
            <div>Full connection testing requires deployed Edge Functions.</div>
          </div>
        </div>
      </div>
    </div>
  );
}; 