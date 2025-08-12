import React, { useState, useEffect } from 'react';
import { Bell, Calendar, Check, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function EventReminderSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    event_reminders_enabled: true,
    event_reminder_days: 1
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load current settings
  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('event_reminders_enabled, event_reminder_days')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          event_reminders_enabled: data.event_reminders_enabled ?? true,
          event_reminder_days: data.event_reminder_days ?? 1
        });
      }
    } catch (error) {
      console.error('Error loading reminder settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          event_reminders_enabled: settings.event_reminders_enabled,
          event_reminder_days: settings.event_reminder_days,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Event reminder settings saved successfully!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error saving reminder settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  const reminderOptions = [
    { value: 0, label: 'On event day' },
    { value: 1, label: '1 day before' },
    { value: 2, label: '2 days before' },
    { value: 3, label: '3 days before' },
    { value: 4, label: '4 days before' },
    { value: 5, label: '5 days before' },
    { value: 6, label: '6 days before' },
    { value: 7, label: '1 week before' }
  ];

  return (
    <div className="space-y-6">
      {/* Enable/Disable Event Reminders */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center space-x-3">
            <Bell className="h-5 w-5 text-electric-400" />
            <div>
              <span className="text-white font-medium">Enable Event Reminders</span>
              <p className="text-gray-400 text-sm">Get notified about your saved events</p>
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={settings.event_reminders_enabled}
              onChange={(e) => setSettings({ ...settings, event_reminders_enabled: e.target.checked })}
              className="sr-only"
            />
            <div className={`w-11 h-6 rounded-full transition-colors ${
              settings.event_reminders_enabled ? 'bg-electric-500' : 'bg-gray-600'
            }`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings.event_reminders_enabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </div>
        </label>
      </div>

      {/* Reminder Timing */}
      {settings.event_reminders_enabled && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-4">
            <Clock className="h-5 w-5 text-purple-400" />
            <h4 className="text-white font-medium">When to Remind Me</h4>
          </div>
          
          <div className="space-y-2">
            {reminderOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-700/30 p-2 rounded-lg transition-colors"
              >
                <input
                  type="radio"
                  name="reminder_days"
                  value={option.value}
                  checked={settings.event_reminder_days === option.value}
                  onChange={(e) => setSettings({ ...settings, event_reminder_days: parseInt(e.target.value) })}
                  className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 focus:ring-electric-500"
                />
                <span className="text-gray-300">{option.label}</span>
                {option.value === 1 && (
                  <span className="text-xs text-gray-500 ml-2">(Recommended)</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Calendar className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300">
            <p className="mb-2">Event reminders will appear in your notification bell for events you've saved.</p>
            <p>You'll receive a notification at the time you've selected before each saved event starts.</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {message && (
            <div className={`flex items-center space-x-2 text-sm ${
              message.type === 'success' ? 'text-green-400' : 'text-red-400'
            }`}>
              {message.type === 'success' ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>{message.text}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-electric-600 hover:bg-electric-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}