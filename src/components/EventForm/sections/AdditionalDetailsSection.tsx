import React from 'react';
import { Trophy } from 'lucide-react';
import { EventFormData } from '../../../types/event';

interface AdditionalDetailsSectionProps {
  formData: EventFormData;
  updateField: <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => void;
  getFieldError: (field: string) => string | undefined;
  touchField: (field: string) => void;
}

const AdditionalDetailsSection: React.FC<AdditionalDetailsSectionProps> = ({
  formData,
  updateField
}) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
        <Trophy className="h-5 w-5 text-electric-500" />
        <span>Additional Details</span>
      </h2>
      
      <div className="space-y-6">
        {/* Trophy Placements */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Trophy Placements</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { key: 'first_place_trophy', label: '1st Place' },
              { key: 'second_place_trophy', label: '2nd Place' },
              { key: 'third_place_trophy', label: '3rd Place' },
              { key: 'fourth_place_trophy', label: '4th Place' },
              { key: 'fifth_place_trophy', label: '5th Place' }
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData[key as keyof EventFormData] as boolean}
                  onChange={(e) => updateField(key as keyof EventFormData, e.target.checked)}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="text-gray-400 text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Raffle */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.has_raffle}
              onChange={(e) => updateField('has_raffle', e.target.checked)}
              className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
            />
            <span className="text-gray-400">Will there be a raffle?</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default AdditionalDetailsSection;