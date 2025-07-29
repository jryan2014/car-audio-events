import React from 'react';
import { Calendar, Building2, User } from 'lucide-react';
import { EventFormData, Organization, EventCategory, DatabaseUser } from '../../../types/event';

interface BasicInfoSectionProps {
  formData: EventFormData;
  categories: EventCategory[];
  organizations: Organization[];
  users?: DatabaseUser[];
  selectedOrganization: Organization | null | undefined;
  isAdmin?: boolean;
  updateField: <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => void;
  getFieldError: (field: string) => string | undefined;
  touchField: (field: string) => void;
}

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  formData,
  categories,
  organizations,
  users = [],
  selectedOrganization,
  isAdmin = false,
  updateField,
  getFieldError,
  touchField
}) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
        <Calendar className="h-5 w-5 text-electric-500" />
        <span>Event Information</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Title */}
        <div className="md:col-span-2">
          <label htmlFor="title" className="block text-gray-400 text-sm mb-2">
            Event Title *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            aria-required="true"
            aria-invalid={!!getFieldError('title')}
            aria-describedby={getFieldError('title') ? 'title-error' : undefined}
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            onBlur={() => touchField('title')}
            className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
              getFieldError('title') ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="Name of your event"
          />
          {getFieldError('title') && (
            <p id="title-error" className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('title')}
            </p>
          )}
        </div>

        {/* Event Categories */}
        <div>
          <label className="block text-gray-400 text-sm mb-2">
            Event Categories *
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-700/30 p-3 rounded-lg border border-gray-600">
            {categories.map(category => (
              <label key={category.id} className="flex items-center space-x-2 hover:bg-gray-700/50 p-1 rounded cursor-pointer">
                <input
                  type="checkbox"
                  value={category.id}
                  checked={formData.category_ids?.includes(category.id) || formData.category_id === category.id}
                  onChange={(e) => {
                    const currentIds = formData.category_ids || (formData.category_id ? [formData.category_id] : []);
                    let newIds: string[];
                    
                    if (e.target.checked) {
                      newIds = [...currentIds, category.id];
                    } else {
                      newIds = currentIds.filter(id => id !== category.id);
                    }
                    
                    // Update category_ids
                    updateField('category_ids', newIds);
                    
                    // Update primary category_id (for legacy support)
                    if (newIds.length > 0 && !newIds.includes(formData.category_id)) {
                      updateField('category_id', newIds[0]);
                    } else if (newIds.length === 0) {
                      updateField('category_id', '');
                    }
                  }}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="text-white">{category.name}</span>
              </label>
            ))}
          </div>
          {getFieldError('category_id') && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('category_id')}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-400">Select all categories that apply to your event</p>
        </div>

        {/* Sanctioning Body */}
        <div>
          <label htmlFor="sanction-body" className="block text-gray-400 text-sm mb-2">
            Sanctioning Body
          </label>
          <select
            id="sanction-body"
            name="sanction_body_id"
            value={formData.sanction_body_id}
            onChange={(e) => updateField('sanction_body_id', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          >
            <option value="">Select sanctioning organization</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>
                {org.name}
                {org.organization_type === 'sanctioning_body' && ' (Sanctioning Body)'}
              </option>
            ))}
          </select>
          
          {/* Organization Preview */}
          {selectedOrganization && (
            <div className="mt-2 p-3 bg-gray-700/30 rounded-lg">
              <div className="flex items-center space-x-3">
                {selectedOrganization.logo_url && (
                  <img
                    src={selectedOrganization.logo_url}
                    alt={selectedOrganization.name}
                    className="w-8 h-8 object-contain"
                  />
                )}
                <div className="flex-1">
                  <p className="text-white text-sm">{selectedOrganization.name}</p>
                  {selectedOrganization.default_rules_content && (
                    <p className="text-gray-400 text-xs">
                      Has default rules template
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Season Year */}
        <div>
          <label htmlFor="season-year" className="block text-gray-400 text-sm mb-2">
            Competition Season Year *
          </label>
          <select
            id="season-year"
            name="season_year"
            required
            value={formData.season_year}
            onChange={(e) => updateField('season_year', parseInt(e.target.value))}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          >
            {Array.from({ length: 10 }, (_, i) => {
              const year = new Date().getFullYear() + (i - 2);
              return (
                <option key={year} value={year}>{year}</option>
              );
            })}
          </select>
        </div>

        {/* Max Participants */}
        <div>
          <label htmlFor="max-participants" className="block text-gray-400 text-sm mb-2">
            Max Participants
          </label>
          <input
            id="max-participants"
            name="max_participants"
            type="number"
            min="1"
            value={formData.max_participants || ''}
            onChange={(e) => updateField('max_participants', e.target.value ? parseInt(e.target.value) : null)}
            onBlur={() => touchField('max_participants')}
            className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
              getFieldError('max_participants') ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="Leave empty for unlimited"
          />
          {getFieldError('max_participants') && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('max_participants')}
            </p>
          )}
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <>
            <div className="md:col-span-2">
              <label htmlFor="organizer" className="block text-gray-400 text-sm mb-2">
                Event Organizer
              </label>
              <select
                id="organizer"
                name="organizer_id"
                value={formData.organizer_id}
                onChange={(e) => updateField('organizer_id', e.target.value)}
                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              >
                <option value="">Select organizer</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) - {u.membership_type}
                  </option>
                ))}
              </select>
              <p className="text-gray-500 text-xs mt-1">
                As an admin, you can assign any user as the event organizer.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="status" className="block text-gray-400 text-sm mb-2">
                  Event Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={(e) => updateField('status', e.target.value as any)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="draft">Draft</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="published">Published</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label htmlFor="approval-status" className="block text-gray-400 text-sm mb-2">
                  Approval Status
                </label>
                <select
                  id="approval-status"
                  name="approval_status"
                  value={formData.approval_status}
                  onChange={(e) => updateField('approval_status', e.target.value as any)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => updateField('is_active', e.target.checked)}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="text-gray-400">Event is Active</span>
              </label>
            </div>
          </>
        )}

        {/* Description */}
        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-gray-400 text-sm mb-2">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            required
            aria-required="true"
            aria-invalid={!!getFieldError('description')}
            aria-describedby={getFieldError('description') ? 'description-error' : undefined}
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            onBlur={() => touchField('description')}
            rows={3}
            className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
              getFieldError('description') ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="Describe your event..."
          />
          {getFieldError('description') && (
            <p id="description-error" className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('description')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BasicInfoSection;