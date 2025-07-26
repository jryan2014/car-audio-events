import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Save, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { simpleNotificationService, NOTIFICATION_TYPES, NotificationPreference } from '../services/simpleNotificationService';
import { useNotifications } from './NotificationSystem';

const PREFERENCE_LABELS = {
  [NOTIFICATION_TYPES.EVENT_REMINDERS]: {
    label: 'Event Reminders',
    description: 'Get notified about upcoming events you\'re registered for'
  },
  [NOTIFICATION_TYPES.COMPETITION_RESULTS]: {
    label: 'Competition Results',
    description: 'Receive updates when competition results are posted'
  },
  [NOTIFICATION_TYPES.TEAM_INVITATIONS]: {
    label: 'Team Invitations',
    description: 'Get notified when you\'re invited to join a team'
  },
  [NOTIFICATION_TYPES.SYSTEM_UPDATES]: {
    label: 'System Updates',
    description: 'Important updates about the platform and features'
  },
  [NOTIFICATION_TYPES.MARKETING]: {
    label: 'Marketing & Promotions',
    description: 'Special offers, promotions, and partner deals'
  },
  [NOTIFICATION_TYPES.NEWSLETTER]: {
    label: 'Newsletter',
    description: 'Weekly digest of events and community updates'
  }
};

export default function NotificationPreferences() {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const prefs = await simpleNotificationService.getUserPreferences(user.id);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      showError('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (preferenceType: string) => {
    setPreferences(prev => {
      const existing = prev.find(p => p.preference_type === preferenceType);
      if (existing) {
        return prev.map(p => 
          p.preference_type === preferenceType 
            ? { ...p, enabled: !p.enabled }
            : p
        );
      } else {
        // Create new preference
        return [...prev, {
          id: 'temp-' + Date.now(),
          user_id: user!.id,
          preference_type: preferenceType,
          enabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }];
      }
    });
    setHasChanges(true);
  };

  const isPreferenceEnabled = (preferenceType: string): boolean => {
    const pref = preferences.find(p => p.preference_type === preferenceType);
    return pref ? pref.enabled : true; // Default to enabled
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Save all preferences
      const promises = Object.values(NOTIFICATION_TYPES).map(type => {
        const enabled = isPreferenceEnabled(type);
        return simpleNotificationService.updatePreference(user.id, type, enabled);
      });

      const results = await Promise.all(promises);
      
      if (results.every(r => r)) {
        showSuccess('Preferences Saved', 'Your notification preferences have been updated');
        setHasChanges(false);
        await loadPreferences(); // Reload to get server state
      } else {
        throw new Error('Some preferences failed to save');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      showError('Save Failed', 'Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Bell className="h-5 w-5" />
          <span>Notification Preferences</span>
        </h2>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {Object.entries(PREFERENCE_LABELS).map(([type, config]) => {
          const enabled = isPreferenceEnabled(type);
          
          return (
            <div
              key={type}
              className="flex items-start space-x-4 p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors"
            >
              <button
                onClick={() => handleToggle(type)}
                className={`mt-0.5 p-2 rounded-lg transition-colors ${
                  enabled 
                    ? 'bg-electric-500 text-white' 
                    : 'bg-gray-600 text-gray-400'
                }`}
              >
                {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              </button>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-white font-medium">{config.label}</h3>
                  {enabled && <Check className="h-4 w-4 text-green-400" />}
                </div>
                <p className="text-gray-400 text-sm mt-1">{config.description}</p>
              </div>

              <button
                onClick={() => handleToggle(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  enabled
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-electric-500/20 text-electric-400 hover:bg-electric-500/30'
                }`}
              >
                {enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-700/30 rounded-lg">
        <p className="text-gray-400 text-sm">
          <strong className="text-gray-300">Note:</strong> You will always receive critical system notifications 
          regardless of these preferences. These settings only affect optional notifications.
        </p>
      </div>
    </div>
  );
}