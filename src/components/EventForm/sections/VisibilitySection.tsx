import React from 'react';
import { Eye, ExternalLink } from 'lucide-react';
import { EventFormData } from '../../../types/event';

interface VisibilitySectionProps {
  formData: EventFormData;
  updateField: <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => void;
  getFieldError: (field: string) => string | undefined;
  touchField: (field: string) => void;
}

const VisibilitySection: React.FC<VisibilitySectionProps> = ({
  formData,
  updateField
}) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
        <Eye className="h-5 w-5 text-electric-500" />
        <span>Visibility</span>
      </h2>
      
      <div className="space-y-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.is_public}
            onChange={(e) => updateField('is_public', e.target.checked)}
            className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
          />
          <span className="text-gray-400">Make this event publicly visible</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.is_featured}
            onChange={(e) => updateField('is_featured', e.target.checked)}
            className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
          />
          <div className="flex flex-col">
            <span className="text-gray-400">Feature on home page</span>
            <span className="text-gray-500 text-xs">This event will be displayed prominently on the home page</span>
          </div>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.allows_online_registration}
            onChange={(e) => updateField('allows_online_registration', e.target.checked)}
            className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
          />
          <div className="flex flex-col">
            <span className="text-gray-400">Allow online registration</span>
            <span className="text-gray-500 text-xs">Competitors can register for this event through the website</span>
          </div>
        </label>
        
        {/* External Registration URL */}
        {!formData.allows_online_registration && (
          <div className="mt-4 p-4 bg-gray-700/30 rounded-lg">
            <label htmlFor="external-registration-url" className="block text-gray-400 text-sm mb-2">
              External Registration URL
            </label>
            <div className="relative">
              <ExternalLink className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="external-registration-url"
                type="url"
                value={formData.external_registration_url || ''}
                onChange={(e) => updateField('external_registration_url', e.target.value)}
                placeholder="https://example.com/register"
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Provide a link to an external registration system if you're not using the built-in registration
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisibilitySection;