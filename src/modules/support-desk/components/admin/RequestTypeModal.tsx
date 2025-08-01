import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { requestTypeService } from '../../services/supabase-client';
import type { SupportRequestType, RequestCategory, RoutingType, TicketPriority, UserRole } from '../../types';

interface RequestTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  requestType?: SupportRequestType;
}

const RequestTypeModal: React.FC<RequestTypeModalProps> = ({ isOpen, onClose, onSave, requestType }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general' as RequestCategory,
    default_routing: 'internal' as RoutingType,
    default_priority: 'normal' as TicketPriority,
    is_active: true,
    requires_event: false,
    allowed_roles: ['public'] as UserRole[],
    sort_order: 0
  });

  useEffect(() => {
    if (requestType) {
      setFormData({
        name: requestType.name,
        description: requestType.description || '',
        category: requestType.category || 'general',
        default_routing: requestType.default_routing,
        default_priority: requestType.default_priority,
        is_active: requestType.is_active,
        requires_event: requestType.requires_event,
        allowed_roles: requestType.allowed_roles,
        sort_order: requestType.sort_order
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'general',
        default_routing: 'internal',
        default_priority: 'normal',
        is_active: true,
        requires_event: false,
        allowed_roles: ['public'],
        sort_order: 0
      });
    }
    setError('');
  }, [requestType, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (requestType) {
        await requestTypeService.updateRequestType(requestType.id, formData);
      } else {
        await requestTypeService.createRequestType(formData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving request type:', error);
      setError('Failed to save request type');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleToggle = (role: UserRole) => {
    const currentRoles = formData.allowed_roles;
    if (currentRoles.includes(role)) {
      setFormData({
        ...formData,
        allowed_roles: currentRoles.filter(r => r !== role)
      });
    } else {
      setFormData({
        ...formData,
        allowed_roles: [...currentRoles, role]
      });
    }
  };

  if (!isOpen) return null;

  const availableRoles: UserRole[] = [
    'public',
    'free_competitor', 
    'competitor_pro',
    'retailer',
    'manufacturer',
    'organization',
    'org_admin',
    'org_support',
    'admin'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {requestType ? 'Edit Request Type' : 'Create Request Type'}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                placeholder="e.g., Billing Issue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as RequestCategory })}
                className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white focus:border-electric-500 focus:ring-electric-500"
              >
                <option value="general">General</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="event">Event</option>
                <option value="account">Account</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Routing
              </label>
              <select
                value={formData.default_routing}
                onChange={(e) => setFormData({ ...formData, default_routing: e.target.value as RoutingType })}
                className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white focus:border-electric-500 focus:ring-electric-500"
              >
                <option value="internal">Internal (Admin Team)</option>
                <option value="organization">Organization</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Priority
              </label>
              <select
                value={formData.default_priority}
                onChange={(e) => setFormData({ ...formData, default_priority: e.target.value as TicketPriority })}
                className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white focus:border-electric-500 focus:ring-electric-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                min="0"
                className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500 bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-300">Active</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.requires_event}
                  onChange={(e) => setFormData({ ...formData, requires_event: e.target.checked })}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500 bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-300">Requires Event</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
              placeholder="Optional description of this request type"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Allowed User Roles
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableRoles.map((role) => (
                <label key={role} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.allowed_roles.includes(role)}
                    onChange={() => handleRoleToggle(role)}
                    className="rounded border-gray-600 text-electric-500 focus:ring-electric-500 bg-gray-700"
                  />
                  <span className="ml-2 text-sm text-gray-300 capitalize">
                    {role.replace('_', ' ')}
                  </span>
                </label>
              ))}
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
              disabled={saving || !formData.name}
              className="px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600 focus:outline-none focus:ring-2 focus:ring-electric-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : requestType ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestTypeModal;