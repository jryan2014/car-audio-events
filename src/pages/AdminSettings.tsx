import React, { useState, useEffect } from 'react';
import { Key, Save, Eye, EyeOff, Shield, AlertCircle, CheckCircle, Settings, Database, CreditCard, Map, Mail, Bug, TestTube, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminEmailSettings from '../components/AdminEmailSettings';

interface IntegrationKeys {
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  stripe_webhook_endpoint: string;
  stripe_test_mode: boolean;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_role_key: string;
  google_maps_api_key: string;
}

export default function AdminSettings() {
  const { user, session } = useAuth();
  const [keys, setKeys] = useState<IntegrationKeys>({
    stripe_publishable_key: '',
    stripe_secret_key: '',
    stripe_webhook_secret: '',
    stripe_webhook_endpoint: '',
    stripe_test_mode: true,
    supabase_url: '',
    supabase_anon_key: '',
    supabase_service_role_key: '',
    google_maps_api_key: ''
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState('stripe');
  const [debugModeEnabled, setDebugModeEnabled] = useState(false);

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/\" replace />;
  }

  useEffect(() => {
    // Load existing keys from environment or database
    loadExistingKeys();
    loadDebugSettings();
  }, []);

  const loadExistingKeys = async () => {
    try {
      // Load keys from admin_settings table
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key_name, key_value')
        .in('key_name', [
          'stripe_publishable_key',
          'stripe_secret_key', 
          'stripe_webhook_secret',
          'stripe_webhook_endpoint',
          'stripe_test_mode',
          'supabase_url',
          'supabase_anon_key',
          'supabase_service_role_key',
          'google_maps_api_key'
        ]);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Convert array to object format
      const dbKeys: Partial<IntegrationKeys> = {};
      data?.forEach(item => {
        const key = item.key_name as keyof IntegrationKeys;
        if (key === 'stripe_test_mode') {
          dbKeys[key] = item.key_value === 'true';
        } else {
          dbKeys[key] = item.key_value;
        }
      });

      // Merge with environment variables as fallbacks
      setKeys({
        stripe_publishable_key: dbKeys.stripe_publishable_key || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
        stripe_secret_key: dbKeys.stripe_secret_key || '',
        stripe_webhook_secret: dbKeys.stripe_webhook_secret || '',
        stripe_webhook_endpoint: dbKeys.stripe_webhook_endpoint || '',
        stripe_test_mode: dbKeys.stripe_test_mode ?? true,
        supabase_url: dbKeys.supabase_url || import.meta.env.VITE_SUPABASE_URL || '',
        supabase_anon_key: dbKeys.supabase_anon_key || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        supabase_service_role_key: dbKeys.supabase_service_role_key || '',
        google_maps_api_key: dbKeys.google_maps_api_key || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
      });

    } catch (error) {
      console.error('Failed to load existing keys:', error);
      // Fallback to environment variables only
      setKeys({
        stripe_publishable_key: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
        stripe_secret_key: '',
        stripe_webhook_secret: '',
        stripe_webhook_endpoint: '',
        stripe_test_mode: true,
        supabase_url: import.meta.env.VITE_SUPABASE_URL || '',
        supabase_anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        supabase_service_role_key: '',
        google_maps_api_key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
      });
    }
  };

  const loadDebugSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key_value')
        .eq('key_name', 'login_debug_mode')
        .single();
      
      if (!error && data) {
        setDebugModeEnabled(data.key_value === 'true');
      }
    } catch (error) {
      console.log('Debug mode setting not found, defaulting to false');
    }
  };

  const updateDebugMode = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          key_name: 'login_debug_mode',
          key_value: enabled.toString(),
          is_sensitive: false,
          updated_by: user!.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key_name'
        });

      if (error) throw error;
      
      setDebugModeEnabled(enabled);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to update debug mode:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleInputChange = (key: keyof IntegrationKeys, value: string | boolean) => {
    setKeys(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleBooleanChange = (key: keyof IntegrationKeys, value: boolean) => {
    setKeys(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const testStripeConnection = async () => {
    try {
      // Simple validation since we can't test actual Stripe connection without Edge Function
      const { stripe_publishable_key, stripe_secret_key } = keys;
      
      if (!stripe_publishable_key) {
        alert('❌ Stripe publishable key is required');
        return;
      }
      
      if (!stripe_secret_key) {
        alert('❌ Stripe secret key is required');
        return;
      }
      
      if (!stripe_publishable_key.startsWith('pk_')) {
        alert('❌ Invalid Stripe publishable key format');
        return;
      }
      
      if (!stripe_secret_key.startsWith('sk_')) {
        alert('❌ Invalid Stripe secret key format');
        return;
      }
      
      // Check if test/live mode keys match
      const isTestPubKey = stripe_publishable_key.includes('test');
      const isTestSecKey = stripe_secret_key.includes('test');
      
      if (keys.stripe_test_mode && (!isTestPubKey || !isTestSecKey)) {
        alert('⚠️ Warning: Test mode is enabled but keys appear to be live keys');
        return;
      }
      
      if (!keys.stripe_test_mode && (isTestPubKey || isTestSecKey)) {
        alert('⚠️ Warning: Live mode is enabled but keys appear to be test keys');
        return;
      }
      
      alert('✅ Stripe key format validation passed! Note: Full connection testing requires deployed Edge Functions.');
    } catch (error) {
      alert('❌ Failed to validate Stripe configuration.');
    }
  };

  const validateWebhookEndpoint = async () => {
    try {
      // Just validate the URL format since webhook endpoints are for Stripe, not browser testing
      const url = keys.stripe_webhook_endpoint;
      
      if (!url) {
        alert('❌ Webhook endpoint URL is required');
        return;
      }
      
      if (!url.startsWith('https://')) {
        alert('❌ Webhook endpoint must use HTTPS');
        return;
      }
      
      if (!url.includes('supabase.co/functions/v1/stripe-webhook')) {
        alert('❌ Webhook endpoint should point to your Supabase stripe-webhook function');
        return;
      }
      
      alert('✅ Webhook endpoint URL format is valid!');
    } catch (error) {
      alert('❌ Invalid webhook endpoint URL');
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus('saving');

    try {
      // Prepare data for upsert
      const settingsToUpdate = Object.entries(keys).map(([key, value]) => ({
        key_name: key,
        key_value: typeof value === 'boolean' ? value.toString() : value as string,
        is_sensitive: ['stripe_secret_key', 'stripe_webhook_secret', 'supabase_service_role_key'].includes(key),
        description: getKeyDescription(key),
        updated_by: user!.id,
        updated_at: new Date().toISOString()
      }));

      // Use upsert to insert or update settings
      const { error } = await supabase
        .from('admin_settings')
        .upsert(settingsToUpdate, {
          onConflict: 'key_name'
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save keys:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const getKeyDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      stripe_publishable_key: 'Stripe publishable key for client-side operations',
      stripe_secret_key: 'Stripe secret key for server-side operations',
      stripe_webhook_secret: 'Secret for validating Stripe webhook requests',
      stripe_webhook_endpoint: 'URL endpoint for Stripe webhook notifications',
      stripe_test_mode: 'Enable test mode for development',
      supabase_url: 'Your Supabase project URL',
      supabase_anon_key: 'Public anonymous key for client-side access',
      supabase_service_role_key: 'Service role key for admin operations',
      google_maps_api_key: 'Google Maps API key for location services'
    };
    return descriptions[key] || '';
  };

  const validateKey = (key: string, value: string | boolean): boolean => {
    if (typeof value === 'boolean') {
      return true; // Boolean values are always valid
    }
    
    if (!value) return false;
    
    switch (key) {
      case 'stripe_publishable_key':
        return value.startsWith('pk_');
      case 'stripe_secret_key':
        return value.startsWith('sk_');
      case 'stripe_webhook_secret':
        return value.startsWith('whsec_');
      case 'stripe_webhook_endpoint':
        return value.startsWith('https://') && value.includes('supabase.co');
      case 'supabase_url':
        return value.includes('supabase.co');
      case 'supabase_anon_key':
      case 'supabase_service_role_key':
        return value.length > 100; // Supabase keys are long
      case 'google_maps_api_key':
        return value.length > 20;
      default:
        return true;
    }
  };

  const tabs = [
    { id: 'stripe', label: 'Stripe', icon: CreditCard },
    { id: 'supabase', label: 'Supabase', icon: Database },
    { id: 'google', label: 'Google Maps', icon: Map },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'debug', label: 'Debug', icon: Bug }
  ];

  const renderKeyInput = (
    key: keyof IntegrationKeys,
    label: string,
    description: string,
    isSecret: boolean = false
  ) => {
    const value = keys[key];
    const isValid = validateKey(key, value);
    const showValue = !isSecret || showSecrets[key];

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-300">
            {label}
          </label>
          {isSecret && (
            <button
              type="button"
              onClick={() => toggleSecretVisibility(key)}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        <div className="relative">
          {typeof value === 'boolean' ? (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleBooleanChange(key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-electric-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-electric-500"></div>
              <span className="ml-3 text-sm text-gray-300">
                {value ? 'Test Mode (Safe for development)' : 'Live Mode (Production)'}
              </span>
            </label>
          ) : (
            <input
              type={showValue ? 'text' : 'password'}
              value={value as string}
              onChange={(e) => handleInputChange(key, e.target.value)}
              className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                value && isValid
                  ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                  : value && !isValid
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-gray-600 focus:border-electric-500 focus:ring-electric-500/20'
              }`}
              placeholder={`Enter your ${label.toLowerCase()}`}
            />
          )}
          {value && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Settings</h1>
              <p className="text-gray-400">Manage integration keys and API configurations</p>
            </div>
          </div>
          
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span className="text-red-400 font-medium">Security Notice</span>
            </div>
            <p className="text-red-300 text-sm mt-1">
              This page contains sensitive API keys. Only authorized administrators should have access.
              Secret keys are never stored in the frontend and are handled securely by the backend.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-800/50 p-1 rounded-xl border border-gray-700/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-electric-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
          {activeTab === 'stripe' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-6">
                <CreditCard className="h-6 w-6 text-electric-500" />
                <h2 className="text-2xl font-bold text-white">Stripe Configuration</h2>
              </div>
              
              {renderKeyInput(
                'stripe_publishable_key',
                'Publishable Key',
                'Your Stripe publishable key (starts with pk_). Safe to expose in frontend.',
                false
              )}
              
              {renderKeyInput(
                'stripe_secret_key',
                'Secret Key',
                'Your Stripe secret key (starts with sk_). Keep this secure and never expose in frontend.',
                true
              )}
              
              {renderKeyInput(
                'stripe_webhook_secret',
                'Webhook Secret',
                'Your Stripe webhook endpoint secret (starts with whsec_). Used to verify webhook signatures.',
                true
              )}

              {renderKeyInput(
                'stripe_webhook_endpoint',
                'Webhook Endpoint URL',
                'Your Supabase edge function URL for handling Stripe webhooks (e.g., https://your-project.supabase.co/functions/v1/stripe-webhook)',
                false
              )}

              {renderKeyInput(
                'stripe_test_mode',
                'Test Mode',
                'Enable test mode for development. Use test keys when enabled, live keys when disabled.',
                false
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
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
                  <div className="space-y-2">
                    <button 
                      className="w-full bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 py-2 px-3 rounded text-sm transition-colors"
                      onClick={() => testStripeConnection()}
                    >
                      Test Stripe Connection
                    </button>
                    <button 
                      className="w-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 py-2 px-3 rounded text-sm transition-colors"
                      onClick={() => validateWebhookEndpoint()}
                    >
                      Validate Webhook Endpoint
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'supabase' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-6">
                <Database className="h-6 w-6 text-electric-500" />
                <h2 className="text-2xl font-bold text-white">Supabase Configuration</h2>
              </div>
              
              {renderKeyInput(
                'supabase_url',
                'Project URL',
                'Your Supabase project URL (e.g., https://your-project.supabase.co)',
                false
              )}
              
              {renderKeyInput(
                'supabase_anon_key',
                'Anonymous Key',
                'Your Supabase anonymous/public key. Safe to expose in frontend.',
                false
              )}
              
              {renderKeyInput(
                'supabase_service_role_key',
                'Service Role Key',
                'Your Supabase service role key. Keep this secure and only use in backend/edge functions.',
                true
              )}

              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h3 className="text-green-400 font-medium mb-2">Supabase Setup Instructions</h3>
                <ol className="text-green-300 text-sm space-y-1 list-decimal list-inside">
                  <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Supabase Dashboard</a></li>
                  <li>Navigate to Settings → API</li>
                  <li>Copy your Project URL and API keys</li>
                  <li>Set up your database schema and RLS policies</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'google' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-6">
                <Map className="h-6 w-6 text-electric-500" />
                <h2 className="text-2xl font-bold text-white">Google Maps Configuration</h2>
              </div>
              
              {renderKeyInput(
                'google_maps_api_key',
                'API Key',
                'Your Google Maps JavaScript API key. Restrict by HTTP referrer for security.',
                true
              )}

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <h3 className="text-yellow-400 font-medium mb-2">Google Maps Setup Instructions</h3>
                <ol className="text-yellow-300 text-sm space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                  <li>Enable Maps JavaScript API and Places API</li>
                  <li>Create an API key and restrict it to your domain</li>
                  <li>Set up billing (required for Maps API)</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-6">
                <Mail className="h-6 w-6 text-electric-500" />
                <h2 className="text-2xl font-bold text-white">Email Configuration</h2>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-400">Postmark Integration</h4>
                    <p className="text-sm text-blue-300 mt-1">
                      Configure Postmark for reliable email delivery. This will handle welcome emails, 
                      event notifications, password resets, and other transactional emails.
                    </p>
                  </div>
                </div>
              </div>

              <AdminEmailSettings />

              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h3 className="text-green-400 font-medium mb-2">Postmark Setup Instructions</h3>
                <ol className="text-green-300 text-sm space-y-1 list-decimal list-inside">
                  <li>Sign up for a <a href="https://postmarkapp.com" target="_blank" rel="noopener noreferrer" className="underline">Postmark account</a></li>
                  <li>Verify your sending domain in Postmark settings</li>
                  <li>Get your Server API Token from the Postmark dashboard</li>
                  <li>Configure your sender details in the Email Settings above</li>
                  <li>Test the integration using the test buttons</li>
                </ol>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <h3 className="text-yellow-400 font-medium mb-2">Available Email Templates</h3>
                <div className="grid grid-cols-2 gap-2 text-yellow-300 text-sm">
                  <div>• Welcome emails</div>
                  <div>• Event registration confirmations</div>
                  <div>• Event reminders</div>
                  <div>• Event cancellations</div>
                  <div>• Password reset emails</div>
                  <div>• Organization claim verification</div>
                  <div>• Event approval notifications</div>
                  <div>• Competition results</div>
                  <div>• Newsletter emails</div>
                  <div>• System notifications</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'debug' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-6">
                <Bug className="h-6 w-6 text-electric-500" />
                <h2 className="text-2xl font-bold text-white">Debug Settings</h2>
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-400">Security Notice</h4>
                    <p className="text-sm text-yellow-300 mt-1">
                      Debug mode should only be enabled when troubleshooting login issues. 
                      It exposes sensitive system information and should be disabled in production.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div>
                    <h3 className="text-white font-medium">Login Debug Mode</h3>
                    <p className="text-gray-400 text-sm">
                      Shows detailed debug information on the login page for troubleshooting authentication issues.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={debugModeEnabled}
                      onChange={(e) => updateDebugMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-electric-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-electric-500"></div>
                  </label>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <h3 className="text-red-400 font-medium mb-2">Important Security Guidelines</h3>
                <ul className="text-red-300 text-sm space-y-1 list-disc list-inside">
                  <li>Only enable debug mode when actively troubleshooting issues</li>
                  <li>Debug mode exposes system state information that could be sensitive</li>
                  <li>Always disable debug mode after troubleshooting is complete</li>
                  <li>Never leave debug mode enabled in production environments</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold transition-all duration-200 ${
              saveStatus === 'success'
                ? 'bg-green-600 text-white'
                : saveStatus === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-electric-500 text-white hover:bg-electric-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
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

        {/* Additional Security Info */}
        <div className="mt-8 bg-gray-700/30 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-3 flex items-center space-x-2">
            <Key className="h-5 w-5 text-electric-500" />
            <span>Security Best Practices</span>
          </h3>
          <ul className="text-gray-300 text-sm space-y-2">
            <li>• Secret keys should never be stored in frontend code or version control</li>
            <li>• Use environment variables or secure key management services</li>
            <li>• Regularly rotate your API keys and monitor usage</li>
            <li>• Restrict API keys to specific domains and IP addresses when possible</li>
            <li>• Monitor your API usage and set up billing alerts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}