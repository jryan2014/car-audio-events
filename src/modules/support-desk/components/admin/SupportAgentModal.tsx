import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import type { SupportAgent } from '../../types';

interface User {
  id: string;
  email: string;
  name?: string;
  membership_type?: string;
  status?: string;
}

interface SupportAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  agent?: SupportAgent;
}

const SupportAgentModal: React.FC<SupportAgentModalProps> = ({ isOpen, onClose, onSave, agent }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [formData, setFormData] = useState({
    user_id: '',
    is_active: true,
    specialties: [] as string[],
    max_tickets_per_day: 50,
    can_view_all_tickets: true,
    can_assign_tickets: true,
    can_close_tickets: true,
    can_escalate_tickets: true,
    can_create_internal_notes: true,
    can_manage_organizations: false,
    email_notifications_enabled: true
  });

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (agent) {
      setFormData({
        user_id: agent.user_id,
        is_active: agent.is_active,
        specialties: agent.specialties || [],
        max_tickets_per_day: agent.max_tickets_per_day || 50,
        can_view_all_tickets: agent.can_view_all_tickets,
        can_assign_tickets: agent.can_assign_tickets,
        can_close_tickets: agent.can_close_tickets,
        can_escalate_tickets: agent.can_escalate_tickets,
        can_create_internal_notes: agent.can_create_internal_notes,
        can_manage_organizations: agent.can_manage_organizations,
        email_notifications_enabled: agent.email_notifications_enabled
      });
      
      // Load the selected user for editing
      if (agent.user_id) {
        loadUser(agent.user_id);
      }
    } else {
      setFormData({
        user_id: '',
        is_active: true,
        specialties: [],
        max_tickets_per_day: 50,
        can_view_all_tickets: true,
        can_assign_tickets: true,
        can_close_tickets: true,
        can_escalate_tickets: true,
        can_create_internal_notes: true,
        can_manage_organizations: false,
        email_notifications_enabled: true
      });
      setSelectedUser(null);
    }
    setError('');
  }, [agent, isOpen]);

  const loadUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, membership_type, status')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      if (data) {
        setSelectedUser(data);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      setAvailableUsers([]);
      return;
    }

    setLoadingUsers(true);
    try {
      // Get users that are not already support agents
      const { data: existingAgents } = await supabase
        .from('support_agents')
        .select('user_id');
      
      const existingAgentIds = existingAgents?.map(a => a.user_id) || [];
      
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, name, membership_type, status')
        .or(`email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
        .not('id', 'in', `(${existingAgentIds.join(',')})`)
        .limit(10);
      
      if (error) throw error;
      
      setAvailableUsers(users || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setError('Failed to search users');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (!agent) { // Only search for new agents, not when editing
        searchUsers();
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, agent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const agentData = {
        ...formData,
        created_by: user?.id
      };

      if (agent) {
        const { error } = await supabase
          .from('support_agents')
          .update(agentData)
          .eq('id', agent.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('support_agents')
          .insert([agentData]);
        
        if (error) throw error;
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving support agent:', error);
      setError('Failed to save support agent');
    } finally {
      setSaving(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setFormData({ ...formData, user_id: user.id });
    setAvailableUsers([]);
    setSearchTerm('');
  };

  const handleSpecialtyToggle = (specialty: string) => {
    const currentSpecialties = formData.specialties;
    if (currentSpecialties.includes(specialty)) {
      setFormData({
        ...formData,
        specialties: currentSpecialties.filter(s => s !== specialty)
      });
    } else {
      setFormData({
        ...formData,
        specialties: [...currentSpecialties, specialty]
      });
    }
  };

  if (!isOpen) return null;

  const availableSpecialties = [
    'billing',
    'technical',
    'events',
    'account',
    'general',
    'organizations',
    'payments'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {agent ? 'Edit Support Agent' : 'Add Support Agent'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* User Selection */}
          {!agent && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select User *
              </label>
              {!selectedUser ? (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search users by email or name..."
                      className="block w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md shadow-sm focus:border-electric-500 focus:ring-electric-500 placeholder-gray-400"
                    />
                  </div>
                  
                  {availableUsers.length > 0 && (
                    <div className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                      {availableUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleUserSelect(user)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-600 focus:bg-gray-600 focus:outline-none"
                        >
                          <div className="font-medium text-white">{user.name || 'No name'}</div>
                          <div className="text-sm text-gray-300">{user.email}</div>
                          <div className="text-xs text-gray-400">
                            {user.membership_type} - {user.status}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {loadingUsers && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-electric-500"></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-700 border border-gray-600 rounded-md">
                  <div>
                    <div className="font-medium text-white">{selectedUser.name || 'No name'}</div>
                    <div className="text-sm text-gray-300">{selectedUser.email}</div>
                    <div className="text-xs text-gray-400">
                      {selectedUser.membership_type} - {selectedUser.status}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setFormData({ ...formData, user_id: '' });
                    }}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Change User
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Agent Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Tickets Per Day
              </label>
              <input
                type="number"
                value={formData.max_tickets_per_day}
                onChange={(e) => setFormData({ ...formData, max_tickets_per_day: parseInt(e.target.value) || 50 })}
                min="1"
                max="200"
                className="block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-electric-500 focus:ring-electric-500"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="ml-2 text-sm text-gray-300">Active Agent</span>
              </label>
            </div>
          </div>

          {/* Specialties */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Specialties
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {availableSpecialties.map((specialty) => (
                <label key={specialty} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.specialties.includes(specialty)}
                    onChange={() => handleSpecialtyToggle(specialty)}
                    className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                  />
                  <span className="ml-2 text-sm text-gray-300 capitalize">
                    {specialty}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">
              Permissions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.can_view_all_tickets}
                  onChange={(e) => setFormData({ ...formData, can_view_all_tickets: e.target.checked })}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="ml-2 text-sm text-gray-300">View All Tickets</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.can_assign_tickets}
                  onChange={(e) => setFormData({ ...formData, can_assign_tickets: e.target.checked })}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="ml-2 text-sm text-gray-300">Assign Tickets</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.can_close_tickets}
                  onChange={(e) => setFormData({ ...formData, can_close_tickets: e.target.checked })}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="ml-2 text-sm text-gray-300">Close Tickets</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.can_escalate_tickets}
                  onChange={(e) => setFormData({ ...formData, can_escalate_tickets: e.target.checked })}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="ml-2 text-sm text-gray-300">Escalate Tickets</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.can_create_internal_notes}
                  onChange={(e) => setFormData({ ...formData, can_create_internal_notes: e.target.checked })}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="ml-2 text-sm text-gray-300">Create Internal Notes</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.can_manage_organizations}
                  onChange={(e) => setFormData({ ...formData, can_manage_organizations: e.target.checked })}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="ml-2 text-sm text-gray-300">Manage Organizations</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.email_notifications_enabled}
                  onChange={(e) => setFormData({ ...formData, email_notifications_enabled: e.target.checked })}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="ml-2 text-sm text-gray-300">Email Notifications</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-electric-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (!agent && !selectedUser)}
              className="px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600 focus:outline-none focus:ring-2 focus:ring-electric-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : agent ? 'Update Agent' : 'Add Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupportAgentModal;