import React from 'react';
import { Eye } from 'lucide-react';
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
      </div>
    </div>
  );
};

export default VisibilitySection;