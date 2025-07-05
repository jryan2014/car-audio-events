import React, { useState, useEffect } from 'react';
import { CreditCard, Settings, AlertTriangle, CheckCircle, Key, Eye, EyeOff, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../NotificationSystem';

interface PaymentConfig {
  mode: 'test' | 'live';
  stripe_active: boolean;
  paypal_active: boolean;
  stripe_test_publishable_key: string;
  stripe_test_secret_key: string;
  stripe_test_webhook_secret: string;
  stripe_live_publishable_key: string;
  stripe_live_secret_key: string;
  stripe_live_webhook_secret: string;
  paypal_test_client_id: string;
  paypal_test_client_secret: string;
  paypal_live_client_id: string;
  paypal_live_client_secret: string;
}

export default function PaymentSettings() {
  const { showSuccess, showError, showInfo, showWarning } = useNotifications();
  
  const [config, setConfig] = useState<PaymentConfig>({
    mode: 'test',
    stripe_active: true,
    paypal_active: false,
    stripe_test_publishable_key: '',
    stripe_test_secret_key: '',
    stripe_test_webhook_secret: '',
    stripe_live_publishable_key: '',
    stripe_live_secret_key: '',
    stripe_live_webhook_secret: '',
    paypal_test_client_id: '',
    paypal_test_client_secret: '',
    paypal_live_client_id: '',
    paypal_live_client_secret: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentConfig();
  }, []);

  const loadPaymentConfig = async () => {
    try {
      setLoading(true);
      
      // Load all payment settings
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('category', 'payment');

      if (error) {
        throw error;
      }

      // Convert array of settings to config object
      const loadedConfig = { ...config };
      
      if (data && data.length > 0) {
        data.forEach(setting => {
          const key = setting.key as keyof PaymentConfig;
          if (key === 'stripe_active' || key === 'paypal_active') {
            loadedConfig[key] = setting.value === 'true';
          } else if (key === 'mode') {
            loadedConfig[key] = setting.value as 'test' | 'live';
          } else {
            loadedConfig[key] = setting.value || '';
          }
        });
        
        setConfig(loadedConfig);
      }
    } catch (error) {
      console.error('Error loading payment config:', error);
      setError('Failed to load payment configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveStripeConfig = async () => {
    try {
      setSaving(true);
      showInfo('Saving Stripe configuration...', 'Validating and updating payment settings');
      
      // Validate Stripe settings
      if (config.stripe_active && config.mode === 'test' && !config.stripe_test_publishable_key) {
        throw new Error('STRIPE TEST PUBLISHABLE KEY is required for test mode');
      }
      if (config.stripe_active && config.mode === 'test' && !config.stripe_test_secret_key) {
        throw new Error('STRIPE TEST SECRET KEY is required for test mode');
      }
      if (config.stripe_active && config.mode === 'live' && !config.stripe_live_publishable_key) {
        throw new Error('STRIPE LIVE PUBLISHABLE KEY is required for live mode');
      }
      if (config.stripe_active && config.mode === 'live' && !config.stripe_live_secret_key) {
        throw new Error('STRIPE LIVE SECRET KEY is required for live mode');
      }

      // Prepare settings to save
      const settingsToSave = [
        { category: 'payment', key: 'stripe_active', value: config.stripe_active.toString(), is_sensitive: false },
        { category: 'payment', key: 'stripe_test_publishable_key', value: config.stripe_test_publishable_key, is_sensitive: false },
        { category: 'payment', key: 'stripe_test_secret_key', value: config.stripe_test_secret_key, is_sensitive: true },
        { category: 'payment', key: 'stripe_test_webhook_secret', value: config.stripe_test_webhook_secret, is_sensitive: true },
        { category: 'payment', key: 'stripe_live_publishable_key', value: config.stripe_live_publishable_key, is_sensitive: false },
        { category: 'payment', key: 'stripe_live_secret_key', value: config.stripe_live_secret_key, is_sensitive: true },
        { category: 'payment', key: 'stripe_live_webhook_secret', value: config.stripe_live_webhook_secret, is_sensitive: true },
        { category: 'payment', key: 'mode', value: config.mode.toString(), is_sensitive: false }
      ];

      // Save each setting individually using check-then-insert/update approach
      for (const setting of settingsToSave) {
        // Check if record exists
        const { data: existing, error: checkError } = await supabase
          .from('admin_settings')
          .select('*')
          .eq('category', setting.category)
          .eq('key', setting.key)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existing) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('admin_settings')
            .update({
              value: setting.value,
              is_sensitive: setting.is_sensitive,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('admin_settings')
            .insert({
              category: setting.category,
              key: setting.key,
              value: setting.value,
              is_sensitive: setting.is_sensitive,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) throw insertError;
        }
      }

      // Show success message
      const activeStatus = config.stripe_active ? 'ACTIVE' : 'INACTIVE';
      const modeStatus = config.mode.toUpperCase();
      showSuccess('Stripe Configuration Saved', `Settings updated successfully! Status: ${activeStatus} (${modeStatus} mode)`);
      
    } catch (error) {
      console.error('Error saving Stripe config:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save Stripe configuration';
      showError('Stripe Configuration Error', errorMessage);
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const savePayPalConfig = async () => {
    try {
      setSaving(true);
      showInfo('Saving PayPal configuration...', 'Validating and updating payment settings');
      
      // Validate PayPal settings
      if (config.paypal_active && config.mode === 'test' && !config.paypal_test_client_id) {
        throw new Error('PAYPAL TEST CLIENT ID is required for test mode');
      }
      if (config.paypal_active && config.mode === 'test' && !config.paypal_test_client_secret) {
        throw new Error('PAYPAL TEST CLIENT SECRET is required for test mode');
      }
      if (config.paypal_active && config.mode === 'live' && !config.paypal_live_client_id) {
        throw new Error('PAYPAL LIVE CLIENT ID is required for live mode');
      }
      if (config.paypal_active && config.mode === 'live' && !config.paypal_live_client_secret) {
        throw new Error('PAYPAL LIVE CLIENT SECRET is required for live mode');
      }

      // Prepare settings to save
      const settingsToSave = [
        { category: 'payment', key: 'paypal_active', value: config.paypal_active.toString(), is_sensitive: false },
        { category: 'payment', key: 'paypal_test_client_id', value: config.paypal_test_client_id, is_sensitive: false },
        { category: 'payment', key: 'paypal_test_client_secret', value: config.paypal_test_client_secret, is_sensitive: true },
        { category: 'payment', key: 'paypal_live_client_id', value: config.paypal_live_client_id, is_sensitive: false },
        { category: 'payment', key: 'paypal_live_client_secret', value: config.paypal_live_client_secret, is_sensitive: true }
      ];

      // Save each setting individually using check-then-insert/update approach
      for (const setting of settingsToSave) {
        // Check if record exists
        const { data: existing, error: checkError } = await supabase
          .from('admin_settings')
          .select('*')
          .eq('category', setting.category)
          .eq('key', setting.key)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existing) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('admin_settings')
            .update({
              value: setting.value,
              is_sensitive: setting.is_sensitive,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('admin_settings')
            .insert({
              category: setting.category,
              key: setting.key,
              value: setting.value,
              is_sensitive: setting.is_sensitive,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) throw insertError;
        }
      }

      // Show success message
      const activeStatus = config.paypal_active ? 'ACTIVE' : 'INACTIVE';
      const modeStatus = config.mode.toUpperCase();
      showSuccess('PayPal Configuration Saved', `Settings updated successfully! Status: ${activeStatus} (${modeStatus} mode)`);
      
    } catch (error) {
      console.error('Error saving PayPal config:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save PayPal configuration';
      showError('PayPal Configuration Error', errorMessage);
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const toggleSecretVisibility = (field: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleInputChange = (field: keyof PaymentConfig, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
    setSuccess(null);
  };

  const getCurrentKeys = () => {
    const mode = config.mode;
    return {
      stripe_publishable: config[`stripe_${mode}_publishable_key` as keyof PaymentConfig] as string,
      stripe_secret: config[`stripe_${mode}_secret_key` as keyof PaymentConfig] as string,
      paypal_client_id: config[`paypal_${mode}_client_id` as keyof PaymentConfig] as string
    };
  };

  const renderSecretField = (
    label: string,
    field: keyof PaymentConfig,
    placeholder: string,
    helpText?: string
  ) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
        {helpText && (
          <span className="text-xs text-gray-400 ml-2">({helpText})</span>
        )}
      </label>
      <div className="relative">
        <input
          type={showSecrets[field] ? 'text' : 'password'}
          value={config[field] as string}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 pr-10 text-white focus:border-electric-500 focus:ring-1 focus:ring-electric-500 outline-none"
        />
        <button
          type="button"
          onClick={() => toggleSecretVisibility(field)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
        >
          {showSecrets[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <Settings className="animate-spin h-8 w-8 text-electric-500" />
          <span className="ml-3 text-gray-300">Loading payment settings...</span>
        </div>
      </div>
    );
  }

  const currentKeys = getCurrentKeys();

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center space-x-2 mb-6">
        <CreditCard className="h-6 w-6 text-electric-500" />
        <h2 className="text-xl font-bold text-white">Payment Provider Settings</h2>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-6">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg mb-6">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <span className="text-green-400 text-sm">{success}</span>
        </div>
      )}

      {/* Payment Mode Selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Payment Mode
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleInputChange('mode', 'test')}
            className={`p-4 border-2 rounded-lg transition-all duration-200 ${
              config.mode === 'test'
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Settings className="h-5 w-5 text-yellow-400" />
              <span className="text-white font-medium">Test Mode</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">Safe for testing</div>
          </button>
          
          <button
            type="button"
            onClick={() => handleInputChange('mode', 'live')}
            className={`p-4 border-2 rounded-lg transition-all duration-200 ${
              config.mode === 'live'
                ? 'border-green-500 bg-green-500/10'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-white font-medium">Live Mode</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">Real payments</div>
          </button>
        </div>
      </div>

      {/* Payment Provider Toggles */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Payment Provider Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-5 w-5 text-blue-400" />
              <div>
                <span className="text-white font-medium">Stripe</span>
                <div className="text-xs text-gray-400">Credit card processing</div>
              </div>
            </div>
            <button
              onClick={() => handleInputChange('stripe_active', !config.stripe_active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.stripe_active ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.stripe_active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <Key className="h-5 w-5 text-yellow-400" />
              <div>
                <span className="text-white font-medium">PayPal</span>
                <div className="text-xs text-gray-400">PayPal processing</div>
              </div>
            </div>
            <button
              onClick={() => handleInputChange('paypal_active', !config.paypal_active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.paypal_active ? 'bg-yellow-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.paypal_active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Current Active Keys Display */}
      <div className="mb-8 p-4 bg-gray-700/30 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">
          Currently Active Keys ({config.mode.toUpperCase()} Mode)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Stripe Publishable:</span>
            <span className="text-white ml-2 font-mono">
              {currentKeys.stripe_publishable ? `${currentKeys.stripe_publishable.substring(0, 12)}...` : 'Not set'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">PayPal Client ID:</span>
            <span className="text-white ml-2 font-mono">
              {currentKeys.paypal_client_id ? `${currentKeys.paypal_client_id.substring(0, 12)}...` : 'Not set'}
            </span>
          </div>
        </div>
      </div>

      {/* Stripe Test Keys */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <span>Stripe Test Keys</span>
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">SANDBOX</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderSecretField(
            'Test Publishable Key',
            'stripe_test_publishable_key',
            'pk_test_...',
            'Frontend visible'
          )}
          {renderSecretField(
            'Test Secret Key',
            'stripe_test_secret_key',
            'sk_test_...',
            'Server only'
          )}
        </div>
        {renderSecretField(
          'Test Webhook Secret',
          'stripe_test_webhook_secret',
          'whsec_...',
          'From webhook endpoint'
        )}
      </div>

      {/* Stripe Live Keys */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <span>Stripe Live Keys</span>
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">PRODUCTION</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderSecretField(
            'Live Publishable Key',
            'stripe_live_publishable_key',
            'pk_live_...',
            'Frontend visible'
          )}
          {renderSecretField(
            'Live Secret Key',
            'stripe_live_secret_key',
            'sk_live_...',
            'Server only'
          )}
        </div>
        {renderSecretField(
          'Live Webhook Secret',
          'stripe_live_webhook_secret',
          'whsec_...',
          'From webhook endpoint'
        )}
      </div>

      {/* PayPal Keys */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">PayPal Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-white mb-3 flex items-center space-x-2">
              <span>Test/Sandbox</span>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">SANDBOX</span>
            </h4>
            {renderSecretField(
              'Test Client ID',
              'paypal_test_client_id',
              'Your PayPal test client ID',
              'From PayPal app'
            )}
            {renderSecretField(
              'Test Client Secret',
              'paypal_test_client_secret',
              'Your PayPal test client secret',
              'From PayPal app'
            )}
          </div>
          
          <div>
            <h4 className="text-md font-medium text-white mb-3 flex items-center space-x-2">
              <span>Live/Production</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">PRODUCTION</span>
            </h4>
            {renderSecretField(
              'Live Client ID',
              'paypal_live_client_id',
              'Your PayPal live client ID',
              'From PayPal app'
            )}
            {renderSecretField(
              'Live Client Secret',
              'paypal_live_client_secret',
              'Your PayPal live client secret',
              'From PayPal app'
            )}
          </div>
        </div>
      </div>

      {/* Test Card Helper Information */}
      {config.mode === 'test' && (
        <div className="mb-8 p-6 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <div className="flex items-center space-x-2 mb-4">
            <Info className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Test Card Information</h3>
          </div>
          <p className="text-blue-300 text-sm mb-6">
            Use these test card details for development and testing. These cards will not be charged.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stripe Test Cards */}
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3 flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-blue-400" />
                <span>Stripe Test Cards</span>
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Visa (Success):</span>
                  <span className="text-white font-mono">4242 4242 4242 4242</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Visa (Declined):</span>
                  <span className="text-white font-mono">4000 0000 0000 0002</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Mastercard:</span>
                  <span className="text-white font-mono">5555 5555 5555 4444</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">American Express:</span>
                  <span className="text-white font-mono">3782 822463 10005</span>
                </div>
                <div className="border-t border-gray-600 pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Expiration:</span>
                    <span className="text-white font-mono">Any future date</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">CVV:</span>
                    <span className="text-white font-mono">Any 3-4 digits</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PayPal Test Information */}
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3 flex items-center space-x-2">
                <Key className="h-4 w-4 text-yellow-400" />
                <span>PayPal Test Account</span>
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Email:</span>
                  <span className="text-white font-mono">sb-buyer@example.com</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Password:</span>
                  <span className="text-white font-mono">testpass123</span>
                </div>
                <div className="border-t border-gray-600 pt-3 mt-3">
                  <p className="text-gray-300 text-xs">
                    Use PayPal's sandbox accounts for testing. Create test accounts in your PayPal Developer dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-300 text-sm">
              <strong>Important:</strong> These test cards only work in test mode. Switch to live mode for real payments.
            </p>
          </div>
        </div>
      )}

      {/* Save Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-end">
        <button
          onClick={saveStripeConfig}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {saving ? (
            <>
              <Settings className="animate-spin h-5 w-5" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5" />
              <span>Save Stripe Settings</span>
            </>
          )}
        </button>
        
        <button
          onClick={savePayPalConfig}
          disabled={saving}
          className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {saving ? (
            <>
              <Settings className="animate-spin h-5 w-5" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Key className="h-5 w-5" />
              <span>Save PayPal Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
} 