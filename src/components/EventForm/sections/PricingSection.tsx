import React from 'react';
import { DollarSign } from 'lucide-react';
import { EventFormData } from '../../../types/event';

interface PricingSectionProps {
  formData: EventFormData;
  updateField: <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => void;
  getFieldError: (field: string) => string | undefined;
  touchField: (field: string) => void;
}

const PricingSection: React.FC<PricingSectionProps> = ({
  formData,
  updateField,
  getFieldError,
  touchField
}) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
        <DollarSign className="h-5 w-5 text-electric-500" />
        <span>Pricing & Registration</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registration Fee */}
        <div>
          <label htmlFor="registration-fee" className="block text-gray-400 text-sm mb-2">
            Registration Fee *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="registration-fee"
              name="registration_fee"
              type="number"
              min="0"
              step="0.01"
              required
              aria-required="true"
              aria-invalid={!!getFieldError('registration_fee')}
              value={formData.registration_fee}
              onChange={(e) => updateField('registration_fee', parseFloat(e.target.value) || 0)}
              onBlur={() => touchField('registration_fee')}
              className={`w-full pl-10 pr-4 py-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
                getFieldError('registration_fee') ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="0.00"
            />
          </div>
          {getFieldError('registration_fee') && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('registration_fee')}
            </p>
          )}
        </div>

        {/* Early Bird Name */}
        <div>
          <label htmlFor="early-bird-name" className="block text-gray-400 text-sm mb-2">
            Early Bird Name
          </label>
          <input
            id="early-bird-name"
            name="early_bird_name"
            type="text"
            value={formData.early_bird_name}
            onChange={(e) => updateField('early_bird_name', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            placeholder="Early Bird Special"
          />
        </div>

        {/* Early Bird Fee */}
        <div>
          <label htmlFor="early-bird-fee" className="block text-gray-400 text-sm mb-2">
            {formData.early_bird_name || 'Early Bird'} Fee
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="early-bird-fee"
              name="early_bird_fee"
              type="number"
              min="0"
              step="0.01"
              value={formData.early_bird_fee || ''}
              onChange={(e) => updateField('early_bird_fee', e.target.value ? parseFloat(e.target.value) : null)}
              onBlur={() => touchField('early_bird_fee')}
              className={`w-full pl-10 pr-4 py-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
                getFieldError('early_bird_fee') ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="0.00"
            />
          </div>
          {getFieldError('early_bird_fee') && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('early_bird_fee')}
            </p>
          )}
        </div>

        {/* Early Bird Deadline */}
        <div>
          <label htmlFor="early-bird-deadline" className="block text-gray-400 text-sm mb-2">
            {formData.early_bird_name || 'Early Bird'} Deadline
          </label>
          <input
            id="early-bird-deadline"
            name="early_bird_deadline"
            type="datetime-local"
            value={formData.early_bird_deadline}
            onChange={(e) => updateField('early_bird_deadline', e.target.value)}
            onBlur={() => touchField('early_bird_deadline')}
            className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
              getFieldError('early_bird_deadline') ? 'border-red-500' : 'border-gray-600'
            }`}
          />
          {getFieldError('early_bird_deadline') && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('early_bird_deadline')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingSection;