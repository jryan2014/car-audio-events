import React, { useState, useEffect } from 'react';
import { Mail, Phone, Save, Settings, Info, HelpCircle, Globe, MessageSquare, Building2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ContactSettings {
  contact_email: string;
  contact_phone: string;
  support_email: string;
  business_email: string;
}

// Helper component to show where fields are used
const FieldLocationHelper = ({ locations }: { locations: Array<{ icon: React.ComponentType<any>, text: string, color: string }> }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="text-gray-400 hover:text-electric-400 transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      
      {showTooltip && (
        <div className="absolute z-50 left-6 top-0 transform -translate-y-1/2 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-64">
          <div className="text-xs text-gray-300 mb-2 font-medium">This field appears in:</div>
          <div className="space-y-2">
            {locations.map((location, index) => (
              <div key={index} className="flex items-center space-x-2">
                <location.icon className={`h-3 w-3 ${location.color}`} />
                <span className="text-xs text-gray-400">{location.text}</span>
              </div>
            ))}
          </div>
          <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-900 border-l border-b border-gray-700 rotate-45"></div>
        </div>
      )}
    </div>
  );
};

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
            <div className="flex items-center space-x-2 mb-2">
              <label className="block text-gray-300 text-sm font-medium">
                <Mail className="h-4 w-4 inline mr-1" />
                Primary Contact Email
              </label>
              <FieldLocationHelper 
                locations={[
                  { icon: Globe, text: "Footer Contact Section", color: "text-blue-400" },
                  { icon: MessageSquare, text: "Fallback for Resources 'Get Help'", color: "text-orange-400" }
                ]}
              />
            </div>
            <input
              type="email"
              value={settings.contact_email}
              onChange={(e) => setSettings(prev => ({ ...prev, contact_email: e.target.value }))}
              placeholder="info@caraudioevents.com"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Main contact email displayed in footer and used as fallback for support
            </p>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <label className="block text-gray-300 text-sm font-medium">
                <Phone className="h-4 w-4 inline mr-1" />
                Contact Phone Number
              </label>
              <FieldLocationHelper 
                locations={[
                  { icon: Globe, text: "Footer Contact Section", color: "text-blue-400" }
                ]}
              />
            </div>
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
            <div className="flex items-center space-x-2 mb-2">
              <label className="block text-gray-300 text-sm font-medium">
                <MessageSquare className="h-4 w-4 inline mr-1" />
                Support Email (Optional)
              </label>
              <FieldLocationHelper 
                locations={[
                  { icon: HelpCircle, text: "Resources Page 'Get Help' Button", color: "text-orange-400" },
                  { icon: Mail, text: "Customer Support Emails", color: "text-green-400" }
                ]}
              />
            </div>
            <input
              type="email"
              value={settings.support_email}
              onChange={(e) => setSettings(prev => ({ ...prev, support_email: e.target.value }))}
              placeholder="support@caraudioevents.com"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Dedicated support email for customer service and help requests
            </p>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <label className="block text-gray-300 text-sm font-medium">
                <Building2 className="h-4 w-4 inline mr-1" />
                Business Email (Optional)
              </label>
              <FieldLocationHelper 
                locations={[
                  { icon: Users, text: "Partnership Inquiries", color: "text-purple-400" },
                  { icon: Building2, text: "Business Development", color: "text-cyan-400" }
                ]}
              />
            </div>
            <input
              type="email"
              value={settings.business_email}
              onChange={(e) => setSettings(prev => ({ ...prev, business_email: e.target.value }))}
              placeholder="business@caraudioevents.com"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Business inquiries, partnerships, and commercial opportunities
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

        <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <h3 className="text-sm font-medium text-green-400 mb-2">🛡️ Anti-Bot Protection</h3>
          <div className="text-xs text-gray-400 space-y-1">
            <p>• Email addresses are automatically obfuscated using HTML entities</p>
            <p>• Phone numbers use encoded characters to prevent scraping</p>
            <p>• Contact links require user interaction to activate</p>
            <p>• This helps prevent spam bots from harvesting your contact information</p>
          </div>
        </div>
      </div>
    </div>
  );
} 