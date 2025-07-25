import React, { useState, useEffect } from 'react';
import { Mail, Bell, CheckCircle, XCircle, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PreferenceSettings {
  newsletter_subscribed: boolean;
  email_notifications: boolean;
  marketing_emails: boolean;
}

export default function NewsletterPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<PreferenceSettings>({
    newsletter_subscribed: false,
    email_notifications: true,
    marketing_emails: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | '';
    text: string;
  }>({ type: '', text: '' });

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('newsletter_subscribed, email_notifications, marketing_emails')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setPreferences({
          newsletter_subscribed: data.newsletter_subscribed || false,
          email_notifications: data.email_notifications !== false,
          marketing_emails: data.marketing_emails || false
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase
        .from('users')
        .update({
          newsletter_subscribed: preferences.newsletter_subscribed,
          email_notifications: preferences.email_notifications,
          marketing_emails: preferences.marketing_emails,
          newsletter_subscribed_at: preferences.newsletter_subscribed ? new Date().toISOString() : null
        })
        .eq('id', user.id);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Your email preferences have been updated successfully!'
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({
        type: 'error',
        text: 'Failed to update preferences. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof PreferenceSettings) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-700 rounded-lg"></div>
        <div className="h-20 bg-gray-700 rounded-lg"></div>
        <div className="h-20 bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Mail className="h-6 w-6 text-electric-400" />
        <h2 className="text-xl font-bold text-white">Email Preferences</h2>
      </div>

      <div className="space-y-4">
        {/* Newsletter Subscription */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Mail className="h-5 w-5 text-electric-400" />
                <h3 className="text-white font-medium">Newsletter</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Receive our newsletter with latest events, tips, and exclusive content
              </p>
            </div>
            <button
              onClick={() => handleToggle('newsletter_subscribed')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.newsletter_subscribed ? 'bg-electric-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.newsletter_subscribed ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Email Notifications */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Bell className="h-5 w-5 text-blue-400" />
                <h3 className="text-white font-medium">Email Notifications</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Important updates about your account, events, and activities
              </p>
            </div>
            <button
              onClick={() => handleToggle('email_notifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.email_notifications ? 'bg-electric-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.email_notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Marketing Emails */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Info className="h-5 w-5 text-purple-400" />
                <h3 className="text-white font-medium">Marketing & Promotions</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Special offers, partner deals, and promotional content
              </p>
            </div>
            <button
              onClick={() => handleToggle('marketing_emails')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.marketing_emails ? 'bg-electric-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.marketing_emails ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button and Message */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        {message.text && (
          <div className={`mb-4 flex items-center space-x-2 text-sm ${
            message.type === 'success' ? 'text-green-400' : 'text-red-400'
          }`}>
            {message.type === 'success' ? 
              <CheckCircle className="h-4 w-4" /> : 
              <XCircle className="h-4 w-4" />
            }
            <span>{message.text}</span>
          </div>
        )}
        
        <button
          onClick={savePreferences}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-xs text-gray-400">
          <strong className="text-blue-400">Note:</strong> You can unsubscribe from individual emails 
          using the link at the bottom of each email. Email notifications are required for important 
          account and security updates.
        </p>
      </div>
    </div>
  );
}