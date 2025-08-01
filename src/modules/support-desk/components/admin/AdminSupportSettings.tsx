import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { requestTypeService, fieldService, supportAgentService, systemConfigService } from '../../services/supabase-client';
import type { SupportGeneralSettings } from '../../services/system-config-service';
import RequestTypeModal from './RequestTypeModal';
import CustomFieldModal from './CustomFieldModal';
import SupportAgentModal from './SupportAgentModal';
import CannedResponsesManager from './CannedResponsesManager';
import type { SupportRequestType, SupportFieldDefinition, SupportAgentWithUser } from '../../types';

const AdminSupportSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'request-types' | 'fields' | 'agents' | 'canned-responses' | 'organizations' | 'analytics'>('general');
  const [loading, setLoading] = useState(false);
  const [requestTypes, setRequestTypes] = useState<SupportRequestType[]>([]);
  const [customFields, setCustomFields] = useState<SupportFieldDefinition[]>([]);
  const [supportAgents, setSupportAgents] = useState<SupportAgentWithUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Modal states
  const [showRequestTypeModal, setShowRequestTypeModal] = useState(false);
  const [editingRequestType, setEditingRequestType] = useState<SupportRequestType | undefined>();
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [editingCustomField, setEditingCustomField] = useState<SupportFieldDefinition | undefined>();
  const [showSupportAgentModal, setShowSupportAgentModal] = useState(false);
  const [editingSupportAgent, setEditingSupportAgent] = useState<SupportAgentWithUser | undefined>();

  // General settings state
  const [generalSettings, setGeneralSettings] = useState<SupportGeneralSettings>({
    system_enabled: true,
    allow_anonymous_tickets: true,
    require_captcha: true,
    auto_assign_enabled: false,
    default_priority: 'normal',
    email_notifications_enabled: true,
    support_email: '',
    max_attachments: 5,
    max_attachment_size: 10, // MB
    allowed_file_types: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'],
    ticket_number_prefix: 'SUP-',
    auto_close_resolved_days: 7,
    spam_detection_enabled: true
  });

  useEffect(() => {
    loadData();
    if (activeTab === 'general') {
      loadGeneralSettings();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'request-types') {
        const types = await requestTypeService.getRequestTypes();
        setRequestTypes(types);
      } else if (activeTab === 'fields') {
        const fields = await fieldService.getFields();
        setCustomFields(fields);
      } else if (activeTab === 'agents') {
        const agents = await supportAgentService.getAgents();
        setSupportAgents(agents);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load configuration data');
    } finally {
      setLoading(false);
    }
  };

  const loadGeneralSettings = async () => {
    try {
      const settings = await systemConfigService.getSupportSettings();
      setGeneralSettings(settings);
    } catch (error) {
      console.error('Error loading general settings:', error);
      setError('Failed to load general settings');
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await systemConfigService.updateSupportSettings(generalSettings);
      setSuccess('General settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRequestType = () => {
    setEditingRequestType(undefined);
    setShowRequestTypeModal(true);
  };

  const handleEditRequestType = (requestType: SupportRequestType) => {
    setEditingRequestType(requestType);
    setShowRequestTypeModal(true);
  };

  const handleDeleteRequestType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request type? This action cannot be undone.')) {
      return;
    }

    try {
      await requestTypeService.deleteRequestType(id);
      setSuccess('Request type deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
      await loadData();
    } catch (error) {
      console.error('Error deleting request type:', error);
      setError('Failed to delete request type');
    }
  };

  const handleRequestTypeModalSave = async () => {
    await loadData();
    setSuccess(editingRequestType ? 'Request type updated successfully' : 'Request type created successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCreateCustomField = () => {
    setEditingCustomField(undefined);
    setShowCustomFieldModal(true);
  };

  const handleEditCustomField = (field: SupportFieldDefinition) => {
    setEditingCustomField(field);
    setShowCustomFieldModal(true);
  };

  const handleDeleteCustomField = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom field? This action cannot be undone.')) {
      return;
    }

    try {
      await fieldService.deleteField(id);
      setSuccess('Custom field deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
      await loadData();
    } catch (error) {
      console.error('Error deleting custom field:', error);
      setError('Failed to delete custom field');
    }
  };

  const handleCustomFieldModalSave = async () => {
    await loadData();
    setSuccess(editingCustomField ? 'Custom field updated successfully' : 'Custom field created successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCreateSupportAgent = () => {
    setEditingSupportAgent(undefined);
    setShowSupportAgentModal(true);
  };

  const handleEditSupportAgent = (agent: SupportAgentWithUser) => {
    setEditingSupportAgent(agent);
    setShowSupportAgentModal(true);
  };

  const handleDeleteSupportAgent = async (id: string) => {
    if (!confirm('Are you sure you want to remove this support agent? This action cannot be undone.')) {
      return;
    }

    try {
      await supportAgentService.deleteAgent(id);
      setSuccess('Support agent removed successfully');
      setTimeout(() => setSuccess(''), 3000);
      await loadData();
    } catch (error) {
      console.error('Error deleting support agent:', error);
      setError('Failed to remove support agent');
    }
  };

  const handleSupportAgentModalSave = async () => {
    await loadData();
    setSuccess(editingSupportAgent ? 'Support agent updated successfully' : 'Support agent added successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  const tabs = [
    { id: 'general', label: 'General Settings', icon: '⚙️' },
    { id: 'request-types', label: 'Request Types', icon: '📋' },
    { id: 'fields', label: 'Custom Fields', icon: '📝' },
    { id: 'agents', label: 'Support Agents', icon: '👥' },
    { id: 'canned-responses', label: 'Canned Responses', icon: '💬' },
    { id: 'organizations', label: 'Organizations', icon: '🏢' },
    { id: 'analytics', label: 'Analytics', icon: '📊' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link
              to="/admin/support"
              className="inline-flex items-center text-gray-400 hover:text-white mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Tickets
            </Link>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Support Desk Configuration
          </h1>
          <p className="text-gray-400">
            Configure system-wide support desk settings and features
          </p>
        </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-900/20 border border-green-700 rounded-lg p-4">
          <p className="text-green-400">{success}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-gray-800/50 rounded-lg mb-6">
        <div className="border-b border-gray-700">
          <nav className="flex space-x-2 p-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-electric-500 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="large" />
            </div>
          ) : (
            <>
              {/* General Settings Tab */}
              {activeTab === 'general' && (
                <form onSubmit={handleSaveGeneral} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* System Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">
                        System Settings
                      </h3>
                      
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={generalSettings.system_enabled}
                            onChange={(e) => setGeneralSettings({ ...generalSettings, system_enabled: e.target.checked })}
                            className="rounded border-gray-600 text-electric-500 focus:ring-electric-500 bg-gray-700"
                          />
                          <span className="ml-2 text-sm text-gray-300">
                            Enable support desk system
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={generalSettings.allow_anonymous_tickets}
                            onChange={(e) => setGeneralSettings({ ...generalSettings, allow_anonymous_tickets: e.target.checked })}
                            className="rounded border-gray-600 text-electric-500 focus:ring-electric-500 bg-gray-700"
                          />
                          <span className="ml-2 text-sm text-gray-300">
                            Allow anonymous users to create tickets
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={generalSettings.require_captcha}
                            onChange={(e) => setGeneralSettings({ ...generalSettings, require_captcha: e.target.checked })}
                            className="rounded border-gray-600 text-electric-500 focus:ring-electric-500 bg-gray-700"
                          />
                          <span className="ml-2 text-sm text-gray-300">
                            Require CAPTCHA for anonymous tickets
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={generalSettings.spam_detection_enabled}
                            onChange={(e) => setGeneralSettings({ ...generalSettings, spam_detection_enabled: e.target.checked })}
                            className="rounded border-gray-600 text-electric-500 focus:ring-electric-500 bg-gray-700"
                          />
                          <span className="ml-2 text-sm text-gray-300">
                            Enable spam detection
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Support Email Address
                        </label>
                        <input
                          type="email"
                          value={generalSettings.support_email}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, support_email: e.target.value })}
                          placeholder="support@yourcompany.com"
                          className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Ticket Number Prefix
                        </label>
                        <input
                          type="text"
                          value={generalSettings.ticket_number_prefix}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, ticket_number_prefix: e.target.value })}
                          placeholder="SUP-"
                          maxLength={10}
                          className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                        />
                      </div>
                    </div>

                    {/* File & Ticket Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">
                        File & Ticket Settings
                      </h3>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Default Priority
                        </label>
                        <select
                          value={generalSettings.default_priority}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, default_priority: e.target.value as any })}
                          className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Maximum Attachments per Ticket
                        </label>
                        <input
                          type="number"
                          value={generalSettings.max_attachments}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, max_attachments: parseInt(e.target.value) || 5 })}
                          min="1"
                          max="20"
                          className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Maximum Attachment Size (MB)
                        </label>
                        <input
                          type="number"
                          value={generalSettings.max_attachment_size}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, max_attachment_size: parseInt(e.target.value) || 10 })}
                          min="1"
                          max="100"
                          className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Auto-close Resolved Tickets After (days)
                        </label>
                        <input
                          type="number"
                          value={generalSettings.auto_close_resolved_days}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, auto_close_resolved_days: parseInt(e.target.value) || 7 })}
                          min="0"
                          max="90"
                          className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          Set to 0 to disable auto-closing
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Allowed File Types
                        </label>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'].map((type) => (
                            <label key={type} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={generalSettings.allowed_file_types.includes(type)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setGeneralSettings({
                                      ...generalSettings,
                                      allowed_file_types: [...generalSettings.allowed_file_types, type]
                                    });
                                  } else {
                                    setGeneralSettings({
                                      ...generalSettings,
                                      allowed_file_types: generalSettings.allowed_file_types.filter(t => t !== type)
                                    });
                                  }
                                }}
                                className="rounded border-gray-600 text-electric-500 focus:ring-electric-500 bg-gray-700"
                              />
                              <span className="ml-1 text-xs text-gray-400">{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-gray-700">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600 focus:outline-none focus:ring-2 focus:ring-electric-500 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              )}

              {/* Request Types Tab */}
              {activeTab === 'request-types' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Support Request Types
                    </h3>
                    <button 
                      onClick={handleCreateRequestType}
                      className="px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600"
                    >
                      Add Request Type
                    </button>
                  </div>

                  {requestTypes.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No request types configured</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {requestTypes.map((type) => (
                        <div key={type.id} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-white">{type.name}</h4>
                              <p className="text-sm text-gray-400">{type.description}</p>
                              <div className="mt-2 flex space-x-4 text-xs text-gray-400">
                                <span>Category: {type.category}</span>
                                <span>Priority: {type.default_priority}</span>
                                <span>Routing: {type.default_routing}</span>
                                <span>Status: {type.is_active ? 'Active' : 'Inactive'}</span>
                              </div>
                              <div className="mt-1 text-xs text-gray-600">
                                Allowed roles: {type.allowed_roles.join(', ')}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleEditRequestType(type)}
                                className="text-electric-500 hover:text-electric-400 text-sm"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteRequestType(type.id)}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Custom Fields Tab */}
              {activeTab === 'fields' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Custom Fields
                    </h3>
                    <button 
                      onClick={handleCreateCustomField}
                      className="px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600"
                    >
                      Add Custom Field
                    </button>
                  </div>

                  {customFields.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No custom fields configured</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customFields.map((field) => (
                        <div key={field.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-white">{field.label}</h4>
                              <p className="text-xs text-gray-400 font-mono">Key: {field.field_key}</p>
                              <p className="text-sm text-gray-300 mt-1">{field.description}</p>
                              <div className="mt-2 flex space-x-4 text-xs text-gray-400">
                                <span>Type: {field.field_type}</span>
                                <span>Required: {field.is_required ? 'Yes' : 'No'}</span>
                                <span>Active: {field.is_active ? 'Yes' : 'No'}</span>
                                <span>Sort: {field.sort_order}</span>
                              </div>
                              {field.options && field.options.length > 0 && (
                                <div className="mt-1 text-xs text-gray-400">
                                  Options: {field.options.map(opt => opt.label).join(', ')}
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleEditCustomField(field)}
                                className="text-electric-500 hover:text-electric-400 text-sm"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteCustomField(field.id)}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Support Agents Tab */}
              {activeTab === 'agents' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Support Agents
                    </h3>
                    <button 
                      onClick={handleCreateSupportAgent}
                      className="px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600"
                    >
                      Add Support Agent
                    </button>
                  </div>

                  <div className="mb-4 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                    <h4 className="font-medium text-blue-400 mb-2">Car Audio Events Support Team</h4>
                    <p className="text-blue-300 text-sm">
                      Manage your internal support team members who can handle tickets, assist users, and manage the support desk.
                      Each agent can be configured with specific permissions and specialties.
                    </p>
                  </div>

                  {supportAgents.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No support agents configured</p>
                      <p className="text-sm text-gray-500 mt-1">Add your first support team member to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {supportAgents.map((agent) => (
                        <div key={agent.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <h4 className="font-medium text-white">
                                  {agent.name || 'No name'}
                                </h4>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  agent.is_active 
                                    ? 'bg-green-900/50 text-green-400' 
                                    : 'bg-red-900/50 text-red-400'
                                }`}>
                                  {agent.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-300 mt-1">{agent.email}</p>
                              
                              <div className="mt-2 flex flex-wrap gap-2">
                                {agent.specialties && agent.specialties.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {agent.specialties.map((specialty) => (
                                      <span 
                                        key={specialty}
                                        className="px-2 py-1 text-xs bg-electric-500/20 text-electric-400 rounded capitalize"
                                      >
                                        {specialty}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-400">
                                <span>Max tickets: {agent.max_tickets_per_day}/day</span>
                                <span>View all: {agent.can_view_all_tickets ? 'Yes' : 'No'}</span>
                                <span>Assign: {agent.can_assign_tickets ? 'Yes' : 'No'}</span>
                                <span>Close: {agent.can_close_tickets ? 'Yes' : 'No'}</span>
                              </div>

                              <div className="mt-1 text-xs text-gray-500">
                                Added: {new Date(agent.created_at).toLocaleDateString()}
                                {agent.created_by_name && ` by ${agent.created_by_name}`}
                              </div>
                            </div>
                            
                            <div className="flex space-x-2 ml-4">
                              <button 
                                onClick={() => handleEditSupportAgent(agent)}
                                className="text-electric-500 hover:text-electric-400 text-sm"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteSupportAgent(agent.id)}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Canned Responses Tab */}
              {activeTab === 'canned-responses' && (
                <CannedResponsesManager />
              )}

              {/* Organizations Tab */}
              {activeTab === 'organizations' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Organization Support Management
                  </h3>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-2">Organization Support Provisioning</h4>
                    <p className="text-gray-300 text-sm mb-3">
                      Configure which organizations have access to the support desk system and manage their settings.
                    </p>
                    <Link
                      to="/admin/support/organizations"
                      className="inline-block px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600 text-sm"
                    >
                      Manage Organization Access
                    </Link>
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="font-medium text-white mb-3">Quick Actions</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <h5 className="font-medium text-white">Bulk Organization Setup</h5>
                        <p className="text-sm text-gray-300 mt-1">
                          Enable support for multiple organizations at once
                        </p>
                        <Link
                          to="/admin/support/organizations/bulk-setup"
                          className="inline-block mt-2 px-3 py-1 bg-electric-500 text-white rounded text-sm hover:bg-electric-600"
                        >
                          Setup Multiple
                        </Link>
                      </div>
                      
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <h5 className="font-medium text-white">Organization Settings</h5>
                        <p className="text-sm text-gray-300 mt-1">
                          Configure default settings for organization support
                        </p>
                        <Link
                          to="/admin/support/organizations/settings"
                          className="inline-block mt-2 px-3 py-1 bg-electric-500 text-white rounded text-sm hover:bg-electric-600"
                        >
                          Configure Settings
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Support Analytics
                  </h3>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-2">Support Metrics Dashboard</h4>
                    <p className="text-gray-300 text-sm mb-3">
                      View comprehensive analytics and reports for your support system including ticket volumes, response times, and customer satisfaction.
                    </p>
                    <Link
                      to="/admin/support/analytics"
                      className="inline-block px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600 text-sm"
                    >
                      View Full Analytics
                    </Link>
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="font-medium text-white mb-3">Quick Stats</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <h5 className="font-medium text-white">Ticket Reports</h5>
                        <p className="text-sm text-gray-300 mt-1">
                          Volume trends, status breakdown, and resolution times
                        </p>
                        <Link
                          to="/admin/support/analytics/tickets"
                          className="inline-block mt-2 px-3 py-1 bg-electric-500 text-white rounded text-sm hover:bg-electric-600"
                        >
                          View Reports
                        </Link>
                      </div>
                      
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <h5 className="font-medium text-white">Agent Performance</h5>
                        <p className="text-sm text-gray-300 mt-1">
                          Response times, resolution rates, and workload distribution
                        </p>
                        <Link
                          to="/admin/support/analytics/agents"
                          className="inline-block mt-2 px-3 py-1 bg-electric-500 text-white rounded text-sm hover:bg-electric-600"
                        >
                          View Performance
                        </Link>
                      </div>
                      
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <h5 className="font-medium text-white">Customer Satisfaction</h5>
                        <p className="text-sm text-gray-300 mt-1">
                          Feedback scores, trends, and improvement insights
                        </p>
                        <Link
                          to="/admin/support/analytics/satisfaction"
                          className="inline-block mt-2 px-3 py-1 bg-electric-500 text-white rounded text-sm hover:bg-electric-600"
                        >
                          View Feedback
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Request Type Modal */}
      <RequestTypeModal
        isOpen={showRequestTypeModal}
        onClose={() => {
          setShowRequestTypeModal(false);
          setEditingRequestType(undefined);
        }}
        onSave={handleRequestTypeModalSave}
        requestType={editingRequestType}
      />

      {/* Custom Field Modal */}
      <CustomFieldModal
        isOpen={showCustomFieldModal}
        onClose={() => {
          setShowCustomFieldModal(false);
          setEditingCustomField(undefined);
        }}
        onSave={handleCustomFieldModalSave}
        field={editingCustomField}
      />

      {/* Support Agent Modal */}
      <SupportAgentModal
        isOpen={showSupportAgentModal}
        onClose={() => {
          setShowSupportAgentModal(false);
          setEditingSupportAgent(undefined);
        }}
        onSave={handleSupportAgentModalSave}
        agent={editingSupportAgent}
      />
      </div>
    </div>
  );
};

export default AdminSupportSettings;