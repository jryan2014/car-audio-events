import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Settings, Save, ArrowLeft, BarChart3, Eye, Clock, Target } from 'lucide-react';

export default function AnalyticsSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    enablePageTracking: true,
    enableEventTracking: true,
    enableAdTracking: true,
    dataRetentionDays: 365,
    enableRealTimeUpdates: true,
    anonymizeUserData: false,
    enableExports: true,
    enableReports: true,
    trackingFrequency: 'realtime', // realtime, hourly, daily
    enableAlerts: true,
    alertThresholds: {
      lowEngagement: 5,
      highTraffic: 1000,
      adPerformance: 2
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save settings to localStorage for now
      localStorage.setItem('analytics_settings', JSON.stringify(settings));
      setSuccess('Analytics settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleThresholdChange = (key: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      alertThresholds: {
        ...prev.alertThresholds,
        [key]: value
      }
    }));
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/analytics')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Analytics Settings</h1>
              <p className="text-gray-400">Configure analytics tracking and reporting preferences</p>
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-400 font-medium">{success}</span>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Tracking Settings */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Eye className="h-5 w-5 text-electric-500" />
              <span>Tracking Configuration</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-white font-medium">Page View Tracking</label>
                  <input
                    type="checkbox"
                    checked={settings.enablePageTracking}
                    onChange={(e) => handleSettingChange('enablePageTracking', e.target.checked)}
                    className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-white font-medium">Event Tracking</label>
                  <input
                    type="checkbox"
                    checked={settings.enableEventTracking}
                    onChange={(e) => handleSettingChange('enableEventTracking', e.target.checked)}
                    className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-white font-medium">Advertisement Tracking</label>
                  <input
                    type="checkbox"
                    checked={settings.enableAdTracking}
                    onChange={(e) => handleSettingChange('enableAdTracking', e.target.checked)}
                    className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-white font-medium">Real-time Updates</label>
                  <input
                    type="checkbox"
                    checked={settings.enableRealTimeUpdates}
                    onChange={(e) => handleSettingChange('enableRealTimeUpdates', e.target.checked)}
                    className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-white font-medium">Anonymize User Data</label>
                  <input
                    type="checkbox"
                    checked={settings.anonymizeUserData}
                    onChange={(e) => handleSettingChange('anonymizeUserData', e.target.checked)}
                    className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                  />
                </div>
                
                <div>
                  <label className="text-white font-medium block mb-2">Data Retention (Days)</label>
                  <input
                    type="number"
                    value={settings.dataRetentionDays}
                    onChange={(e) => handleSettingChange('dataRetentionDays', parseInt(e.target.value))}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-electric-500 focus:outline-none"
                    min="30"
                    max="2555"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Report Settings */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-electric-500" />
              <span>Reporting Options</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-white font-medium">Enable Data Exports</label>
                  <input
                    type="checkbox"
                    checked={settings.enableExports}
                    onChange={(e) => handleSettingChange('enableExports', e.target.checked)}
                    className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-white font-medium">Enable Report Generation</label>
                  <input
                    type="checkbox"
                    checked={settings.enableReports}
                    onChange={(e) => handleSettingChange('enableReports', e.target.checked)}
                    className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-white font-medium block mb-2">Tracking Frequency</label>
                <select
                  value={settings.trackingFrequency}
                  onChange={(e) => handleSettingChange('trackingFrequency', e.target.value)}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-electric-500 focus:outline-none"
                >
                  <option value="realtime">Real-time</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
            </div>
          </div>

          {/* Alert Settings */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Target className="h-5 w-5 text-electric-500" />
              <span>Alert Configuration</span>
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-white font-medium">Enable Performance Alerts</label>
                <input
                  type="checkbox"
                  checked={settings.enableAlerts}
                  onChange={(e) => handleSettingChange('enableAlerts', e.target.checked)}
                  className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                />
              </div>
              
              {settings.enableAlerts && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-gray-700">
                  <div>
                    <label className="text-white font-medium block mb-2">Low Engagement Threshold (%)</label>
                    <input
                      type="number"
                      value={settings.alertThresholds.lowEngagement}
                      onChange={(e) => handleThresholdChange('lowEngagement', parseInt(e.target.value))}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-electric-500 focus:outline-none"
                      min="1"
                      max="100"
                    />
                  </div>
                  
                  <div>
                    <label className="text-white font-medium block mb-2">High Traffic Threshold (views)</label>
                    <input
                      type="number"
                      value={settings.alertThresholds.highTraffic}
                      onChange={(e) => handleThresholdChange('highTraffic', parseInt(e.target.value))}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-electric-500 focus:outline-none"
                      min="100"
                    />
                  </div>
                  
                  <div>
                    <label className="text-white font-medium block mb-2">Ad Performance Threshold (CTR %)</label>
                    <input
                      type="number"
                      value={settings.alertThresholds.adPerformance}
                      onChange={(e) => handleThresholdChange('adPerformance', parseInt(e.target.value))}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-electric-500 focus:outline-none"
                      min="0.1"
                      step="0.1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 