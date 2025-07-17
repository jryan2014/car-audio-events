import React from 'react';
import { FileText } from 'lucide-react';
import { EventFormData, Organization } from '../../../types/event';
import { useSystemConfiguration } from '../../../hooks/useSystemConfiguration';

interface RulesSectionProps {
  formData: EventFormData;
  selectedOrganization: Organization | null | undefined;
  updateField: <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => void;
  getFieldError: (field: string) => string | undefined;
  touchField: (field: string) => void;
}

const RulesSection: React.FC<RulesSectionProps> = ({
  formData,
  selectedOrganization,
  updateField,
  getFieldError,
  touchField
}) => {
  const { getRulesTemplates } = useSystemConfiguration();
  
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
        <FileText className="h-5 w-5 text-electric-500" />
        <span>Rules & Regulations</span>
      </h2>
      
      <div className="space-y-4">
        {/* Template Selection */}
        {selectedOrganization?.default_rules_content && (
          <div className="mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.rules === selectedOrganization.default_rules_content}
                onChange={(e) => {
                  if (e.target.checked && selectedOrganization.default_rules_content) {
                    updateField('rules', selectedOrganization.default_rules_content);
                  } else {
                    updateField('rules', '');
                  }
                }}
                className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
              />
              <span className="text-gray-300">
                Use standard {selectedOrganization.name} rules
              </span>
            </label>
          </div>
        )}

        {/* Rules Text Area */}
        <div>
          <label htmlFor="rules" className="block text-gray-400 text-sm mb-2">
            Rules & Regulations Content
          </label>
          <textarea
            id="rules"
            name="rules"
            value={formData.rules}
            onChange={(e) => updateField('rules', e.target.value)}
            onBlur={() => touchField('rules')}
            rows={8}
            className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
              getFieldError('rules') ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="Enter event rules and regulations..."
          />
          {getFieldError('rules') && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('rules')}
            </p>
          )}
          <p className="text-gray-500 text-xs mt-2">
            You can use the templates above or write custom rules for your event.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RulesSection;