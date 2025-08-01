import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { organizationService } from '../../services/supabase-client';
import type { OrganizationSupportSettings } from '../../types';

const OrgSupportSettings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<OrganizationSupportSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    enable_support: true,
    auto_assign_tickets: false,
    notification_email: '',
    sla_response_hours: 24,
    sla_resolution_hours: 72,
    business_hours_only: true,
    working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    business_hours_start: '09:00',
    business_hours_end: '17:00',
    ticket_prefix: '',
    allow_anonymous_tickets: true,
    require_event_selection: false,
    auto_close_resolved_days: 7,
    satisfaction_survey_enabled: true
  });
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    if (!user?.organizationId) return;
    
    try {
      const data = await organizationService.getSupportSettings(user.organizationId);
      if (data) {
        setSettings(data);
        setFormData({
          enable_support: data.enable_support ?? true,
          auto_assign_tickets: data.auto_assign_tickets ?? false,
          notification_email: data.notification_email || '',
          sla_response_hours: data.sla_response_hours || 24,
          sla_resolution_hours: data.sla_resolution_hours || 72,
          business_hours_only: data.business_hours_only ?? true,
          working_days: data.working_days || ['mon', 'tue', 'wed', 'thu', 'fri'],
          business_hours_start: data.business_hours_start || '09:00',
          business_hours_end: data.business_hours_end || '17:00',
          ticket_prefix: data.ticket_prefix || '',
          allow_anonymous_tickets: data.allow_anonymous_tickets ?? true,
          require_event_selection: data.require_event_selection ?? false,
          auto_close_resolved_days: data.auto_close_resolved_days || 7,
          satisfaction_survey_enabled: data.satisfaction_survey_enabled ?? true
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setError('Failed to load support settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organizationId) return;
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await organizationService.updateSupportSettings(user.organizationId, formData);
      setSuccess('Support settings updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save support settings');
    } finally {
      setSaving(false);
    }
  };
  
  const handleWorkingDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day]
    }));
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Support Settings
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Configure how your organization handles support tickets
        </p>
      </div>
      
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-600">{success}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            General Settings
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.enable_support}
                  onChange={(e) => setFormData({ ...formData, enable_support: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Enable support ticket system
                </span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.auto_assign_tickets}
                  onChange={(e) => setFormData({ ...formData, auto_assign_tickets: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Automatically assign tickets to available team members
                </span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notification Email
              </label>
              <input
                type="email"
                value={formData.notification_email}
                onChange={(e) => setFormData({ ...formData, notification_email: e.target.value })}
                placeholder="support@yourcompany.com"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Receive notifications when new tickets are created
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ticket Number Prefix
              </label>
              <input
                type="text"
                value={formData.ticket_prefix}
                onChange={(e) => setFormData({ ...formData, ticket_prefix: e.target.value })}
                placeholder="e.g., ORG-"
                maxLength={10}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional prefix for ticket numbers (e.g., ORG-1234)
              </p>
            </div>
          </div>
        </div>
        
        {/* SLA Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Service Level Agreement (SLA)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Response Time (hours)
              </label>
              <input
                type="number"
                value={formData.sla_response_hours}
                onChange={(e) => setFormData({ ...formData, sla_response_hours: parseInt(e.target.value) || 24 })}
                min="1"
                max="168"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Resolution Time (hours)
              </label>
              <input
                type="number"
                value={formData.sla_resolution_hours}
                onChange={(e) => setFormData({ ...formData, sla_resolution_hours: parseInt(e.target.value) || 72 })}
                min="1"
                max="720"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.business_hours_only}
                onChange={(e) => setFormData({ ...formData, business_hours_only: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Count only business hours for SLA
              </span>
            </label>
          </div>
        </div>
        
        {/* Business Hours */}
        {formData.business_hours_only && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Business Hours
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Working Days
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {[
                    { value: 'sun', label: 'Sun' },
                    { value: 'mon', label: 'Mon' },
                    { value: 'tue', label: 'Tue' },
                    { value: 'wed', label: 'Wed' },
                    { value: 'thu', label: 'Thu' },
                    { value: 'fri', label: 'Fri' },
                    { value: 'sat', label: 'Sat' }
                  ].map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleWorkingDayToggle(day.value)}
                      className={`px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                        formData.working_days.includes(day.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.business_hours_start}
                    onChange={(e) => setFormData({ ...formData, business_hours_start: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.business_hours_end}
                    onChange={(e) => setFormData({ ...formData, business_hours_end: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Ticket Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Ticket Settings
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.allow_anonymous_tickets}
                  onChange={(e) => setFormData({ ...formData, allow_anonymous_tickets: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Allow anonymous users to create tickets
                </span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.require_event_selection}
                  onChange={(e) => setFormData({ ...formData, require_event_selection: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Require event selection for all tickets
                </span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.satisfaction_survey_enabled}
                  onChange={(e) => setFormData({ ...formData, satisfaction_survey_enabled: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Send satisfaction surveys after ticket resolution
                </span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Auto-close Resolved Tickets After (days)
              </label>
              <input
                type="number"
                value={formData.auto_close_resolved_days}
                onChange={(e) => setFormData({ ...formData, auto_close_resolved_days: parseInt(e.target.value) || 7 })}
                min="0"
                max="90"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Set to 0 to disable auto-closing
              </p>
            </div>
          </div>
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrgSupportSettings;