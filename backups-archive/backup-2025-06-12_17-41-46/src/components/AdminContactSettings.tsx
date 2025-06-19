import React, { useState, useEffect } from 'react';
import { Mail, Phone, Save, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ContactSettings {
  contact_email: string;
  contact_phone: string;
  support_email: string;
  business_email: string;
}

export default function AdminContactSettings() {
  const [settings, setSettings] = useState<ContactSettings>({
    contact_email: '',
    contact_phone: '',
    support_email: '',
    business_email: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Check if organizations table has system config
      const { data, error } = await supabase
        .from('organizations')
        .select('system_config')
        .eq('type', 'platform')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
      }

      if (data?.system_config) {
        const config = data.system_config;
        setSettings({
          contact_email: config.contact_email || '',
          contact_phone: config.contact_phone || '',
          support_email: config.support_email || '',
          business_email: config.business_email || ''
        });
      }
    } catch (error) {
      console.error('Error loading contact settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      // First, try to update existing system config
      const { data: existing, error: fetchError } = await supabase
        .from('organizations')
        .select('id, system_config')
        .eq('type', 'platform')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const newConfig = {
        ...(existing?.system_config || {}),
        contact_email: settings.contact_email,
        contact_phone: settings.contact_phone,
        support_email: settings.support_email,
        business_email: settings.business_email,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ system_config: newConfig })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Create new platform organization
        const { error: insertError } = await supabase
          .from('organizations')
          .insert({
            name: 'Car Audio Events Platform',
            type: 'platform',
            system_config: newConfig,
            description: 'Platform system configuration'
          });

        if (insertError) throw insertError;
      }

      setMessage('Contact settings saved successfully! 🎉');
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500 mx-auto"></div>
        <p className="text-center text-gray-400 mt-2">Loading contact settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="h-6 w-6 text-electric-400" />
          <h2 className="text-xl font-bold text-white">Contact Information Settings</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              <Mail className="h-4 w-4 inline mr-1" />
              Primary Contact Email
            </label>
            <input
              type="email"
              value={settings.contact_email}
              onChange={(e) => setSettings(prev => ({ ...prev, contact_email: e.target.value }))}
              placeholder="info@caraudioevents.com"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              This email will be displayed in the footer contact section
            </p>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              <Phone className="h-4 w-4 inline mr-1" />
              Contact Phone Number
            </label>
            <input
              type="tel"
              value={settings.contact_phone}
              onChange={(e) => setSettings(prev => ({ ...prev, contact_phone: e.target.value }))}
              placeholder="+1 (555) 123-4567"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Phone number displayed in the footer contact section
            </p>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Support Email (Optional)
            </label>
            <input
              type="email"
              value={settings.support_email}
              onChange={(e) => setSettings(prev => ({ ...prev, support_email: e.target.value }))}
              placeholder="support@caraudioevents.com"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Dedicated support email for customer service
            </p>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Business Email (Optional)
            </label>
            <input
              type="email"
              value={settings.business_email}
              onChange={(e) => setSettings(prev => ({ ...prev, business_email: e.target.value }))}
              placeholder="business@caraudioevents.com"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Business inquiries and partnerships
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-600">
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="flex items-center space-x-2 px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>

            {message && (
              <div className={`text-sm ${message.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="text-sm font-medium text-blue-400 mb-2">💡 How it works</h3>
          <p className="text-xs text-gray-400">
            These contact details will be stored in the system configuration and displayed in the footer. 
            The primary contact email and phone are required for the footer display.
          </p>
        </div>
      </div>
    </div>
  );
} 