import React, { useState, useEffect } from 'react';
import { Key, Save, Eye, EyeOff, Shield, AlertCircle, CheckCircle, Settings, Database, CreditCard, Map, Mail, Bug, TestTube, ExternalLink, HardDrive, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminEmailSettings from '../components/AdminEmailSettings';
import { ServiceWorkerManager } from '../components/ServiceWorkerManager';

import { SupabaseSettings } from '../components/admin-settings/SupabaseSettings';
import { GoogleMapsSettings } from '../components/admin-settings/GoogleMapsSettings';
import { HCaptchaSettings } from '../components/admin-settings/HCaptchaSettings';
import { SessionSettings } from '../components/admin-settings/SessionSettings';
import { EmailSettings } from '../components/admin-settings/EmailSettings';
import { CacheSettings } from '../components/admin-settings/CacheSettings';
import { DebugSettings } from '../components/admin-settings/DebugSettings';
import PaymentSettings from '../components/admin-settings/PaymentSettings';
import NotificationManager from '../components/admin-settings/NotificationManager';

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
  hcaptcha_site_key: string;
  hcaptcha_secret_key: string;
  hcaptcha_enabled: boolean;
  hcaptcha_theme: string;
  hcaptcha_size: string;
  session_timeout_hours: string;
  session_inactivity_timeout_hours: string;
  session_remember_me_days: string;
}

const sections = [
  { id: 'payments', label: 'Payment Providers', icon: <CreditCard className="h-5 w-5" /> },
  { id: 'supabase', label: 'Supabase', icon: <Database className="h-5 w-5" /> },
  { id: 'google', label: 'Google Maps', icon: <Map className="h-5 w-5" /> },
      { id: 'hcaptcha', label: 'hCaptcha', icon: <Shield className="h-5 w-5" /> },
  { id: 'session', label: 'Session', icon: <Settings className="h-5 w-5" /> },
  { id: 'email', label: 'Email', icon: <Mail className="h-5 w-5" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-5 w-5" /> },
  { id: 'cache', label: 'Cache', icon: <HardDrive className="h-5 w-5" /> },
  { id: 'debug', label: 'Debug', icon: <Bug className="h-5 w-5" /> },
];

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
    google_maps_api_key: '',
    hcaptcha_site_key: '',
    hcaptcha_secret_key: '',
    hcaptcha_enabled: false,
    hcaptcha_theme: 'dark',
    hcaptcha_size: 'normal',
    session_timeout_hours: '',
    session_inactivity_timeout_hours: '',
    session_remember_me_days: ''
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [activeSection, setActiveSection] = useState('payments');
  const [debugModeEnabled, setDebugModeEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', [
          'stripe_publishable_key',
          'stripe_secret_key', 
          'stripe_webhook_secret',
          'stripe_webhook_endpoint',
          'stripe_test_mode',
          'supabase_url',
          'supabase_anon_key',
          'supabase_service_role_key',
          'google_maps_api_key',
          'hcaptcha_site_key',
          'hcaptcha_secret_key',
          'hcaptcha_enabled',
          'hcaptcha_theme',
          'hcaptcha_size',
          'session_timeout_hours',
          'session_inactivity_timeout_hours',
          'session_remember_me_days'
        ]);

      if (error) {
        console.error('Error loading admin settings:', error);
        return;
      }

      if (data) {
        const keyMap: { [key: string]: string } = {};
        data.forEach((item: any) => {
          keyMap[item.key] = item.value || '';
        });
        
        // Merge with environment variables as fallbacks
        setKeys({
          stripe_publishable_key: keyMap.stripe_publishable_key || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
          stripe_secret_key: keyMap.stripe_secret_key || '',
          stripe_webhook_secret: keyMap.stripe_webhook_secret || '',
          stripe_webhook_endpoint: keyMap.stripe_webhook_endpoint || '',
          stripe_test_mode: keyMap.stripe_test_mode === 'true',
          supabase_url: keyMap.supabase_url || import.meta.env.VITE_SUPABASE_URL || '',
          supabase_anon_key: keyMap.supabase_anon_key || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          supabase_service_role_key: keyMap.supabase_service_role_key || '',
          google_maps_api_key: keyMap.google_maps_api_key || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
          hcaptcha_site_key: keyMap.hcaptcha_site_key || import.meta.env.VITE_HCAPTCHA_SITE_KEY || '',
          hcaptcha_secret_key: keyMap.hcaptcha_secret_key || '',
          hcaptcha_enabled: keyMap.hcaptcha_enabled === 'true',
          hcaptcha_theme: keyMap.hcaptcha_theme || 'dark',
          hcaptcha_size: keyMap.hcaptcha_size || 'normal',
          session_timeout_hours: keyMap.session_timeout_hours || '24',
          session_inactivity_timeout_hours: keyMap.session_inactivity_timeout_hours || '2',
          session_remember_me_days: keyMap.session_remember_me_days || '30'
        });
      }
    } catch (error) {
      console.error('Error loading admin settings:', error);
    }
  };

  const loadDebugSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'login_debug_mode')
        .single();
      
      if (!error && data) {
        setDebugModeEnabled(data.value === 'true');
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
          key: 'login_debug_mode',
          value: enabled.toString(),
          is_sensitive: false,
          updated_by: user!.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
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
      const response = await fetch('/api/test-stripe-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publishable_key: keys.stripe_publishable_key,
          secret_key: keys.stripe_secret_key,
          test_mode: keys.stripe_test_mode
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Stripe connection successful!');
      } else {
        alert('❌ Stripe connection failed: ' + result.error);
      }
    } catch (error) {
      alert('❌ Error testing Stripe connection: ' + error);
    }
  };

  const validateWebhookEndpoint = async () => {
    if (!keys.stripe_webhook_endpoint) {
      alert('Please enter a webhook endpoint first.');
      return;
    }

    try {
      const response = await fetch('/api/validate-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: keys.stripe_webhook_endpoint,
          secret: keys.stripe_webhook_secret
        })
      });

      const result = await response.json();
      
      if (result.valid) {
        alert('✅ Webhook endpoint is valid!');
      } else {
        alert('❌ Webhook endpoint validation failed: ' + result.error);
      }
    } catch (error) {
      alert('❌ Error validating webhook: ' + error);
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
    setError(null);

    try {
      const settingsToUpdate = Object.entries(keys).map(([key, value]) => ({
        key,
        value: String(value),
        is_sensitive: key.includes('secret') || key.includes('key'),
        updated_by: user!.id,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('admin_settings')
        .upsert(settingsToUpdate, { onConflict: 'key' });

      if (error) throw error;

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      console.error('Error saving admin settings:', err);
      setError('Failed to save settings. Please try again.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const getKeyDescription = (key: string): string => {
    const descriptions: { [key: string]: string } = {
      stripe_publishable_key: 'Your Stripe publishable key (starts with pk_)',
      stripe_secret_key: 'Your Stripe secret key (starts with sk_)',
      stripe_webhook_secret: 'Webhook signing secret from Stripe dashboard',
      stripe_webhook_endpoint: 'Your webhook endpoint URL',
      supabase_url: 'Your Supabase project URL',
      supabase_anon_key: 'Your Supabase anonymous key',
      supabase_service_role_key: 'Your Supabase service role key (keep secure)',
      google_maps_api_key: 'Your Google Maps API key',
      hcaptcha_site_key: 'Your hCaptcha site key',
      hcaptcha_secret_key: 'Your hCaptcha secret key (keep secure)'
    };
    return descriptions[key] || 'Configuration key';
  };

  const validateKey = (key: string, value: string | boolean): boolean => {
    if (typeof value === 'boolean') return true;
    
    const validations: { [key: string]: (val: string) => boolean } = {
      stripe_publishable_key: (val) => val.startsWith('pk_'),
      stripe_secret_key: (val) => val.startsWith('sk_'),
      supabase_url: (val) => val.includes('supabase.co'),
      google_maps_api_key: (val) => val.length > 20,
              hcaptcha_site_key: (val) => val.length > 20
    };

    const validator = validations[key];
    return validator ? validator(value) : true;
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'payments': return <PaymentSettings />;
      case 'supabase': return <SupabaseSettings />;
      case 'google': return <GoogleMapsSettings />;
              case 'hcaptcha': return <HCaptchaSettings />;
      case 'session': return <SessionSettings />;
      case 'email': return <EmailSettings />;
      case 'notifications': return <NotificationManager />;
      case 'cache': return <CacheSettings />;
      case 'debug': return <DebugSettings />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Settings</h1>
          <p className="text-gray-400">Manage system configuration and integration settings</p>
        </div>

        {/* Security Notice */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-red-400" />
            <h3 className="text-red-400 font-medium">Security Notice</h3>
          </div>
          <p className="text-red-300 text-sm mt-2">
            This page contains sensitive configuration data. Ensure you're on a secure connection and 
            that only authorized administrators have access to these settings.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 bg-gray-800/50 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Settings Sections</h2>
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-electric-500 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  {section.icon}
                  <span>{section.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-gray-800/50 rounded-lg p-6">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}