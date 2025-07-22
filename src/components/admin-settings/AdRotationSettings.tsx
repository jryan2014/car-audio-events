import React, { useState, useEffect } from 'react';
import { RotateCw, Save, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AdRotationSettings() {
  const [rotationInterval, setRotationInterval] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Try to get existing setting
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'ad_rotation_interval')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setRotationInterval(parseInt(data.value) || 10);
      }
    } catch (err) {
      console.error('Error loading ad rotation settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');

      // Validate input
      if (rotationInterval < 5) {
        setError('Rotation interval must be at least 5 seconds');
        return;
      }

      if (rotationInterval > 300) {
        setError('Rotation interval cannot exceed 300 seconds (5 minutes)');
        return;
      }

      // Save to database
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'ad_rotation_interval',
          value: rotationInterval.toString(),
          category: 'advertisements',
          description: 'Time in seconds between ad rotations',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      setMessage('Settings saved successfully! Refresh the page for changes to take effect.');
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error saving ad rotation settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center">
          <RotateCw className="h-6 w-6 text-electric-400 mr-3" />
          <h2 className="text-xl font-semibold text-white">Ad Rotation Settings</h2>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-400">
            Current: {rotationInterval}s
          </span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      <div 
        className={`border-t border-gray-700 transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-6">
          <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Rotation Interval (seconds)
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="number"
              min="5"
              max="300"
              value={rotationInterval}
              onChange={(e) => setRotationInterval(parseInt(e.target.value) || 10)}
              className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-400">
              seconds between ad rotations
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Minimum: 5 seconds | Maximum: 300 seconds (5 minutes)
          </p>
        </div>

        {/* Preview */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Preview</h3>
          <div className="text-sm text-gray-400">
            Ads will rotate every <span className="text-electric-400 font-medium">{rotationInterval} seconds</span>
            {rotationInterval >= 60 && (
              <span> ({Math.floor(rotationInterval / 60)} minute{Math.floor(rotationInterval / 60) !== 1 ? 's' : ''} {rotationInterval % 60 > 0 && `${rotationInterval % 60} seconds`})</span>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {message && (
          <div className="flex items-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" />
            <p className="text-sm text-green-400">{message}</p>
          </div>
        )}

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-electric-600 hover:bg-electric-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}