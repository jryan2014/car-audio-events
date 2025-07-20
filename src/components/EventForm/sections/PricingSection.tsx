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

      <div className="space-y-6">
        {/* Member/Non-Member Pricing Section */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Event Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Member Price */}
            <div>
              <label htmlFor="member-price" className="block text-gray-400 text-sm mb-2">
                Member Price *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="member-price"
                  name="member_price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  aria-required="true"
                  value={formData.member_price || 0}
                  onChange={(e) => updateField('member_price', parseFloat(e.target.value) || 0)}
                  onBlur={() => touchField('member_price')}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="0.00"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Price for registered members</p>
            </div>

            {/* Non-Member Price */}
            <div>
              <label htmlFor="non-member-price" className="block text-gray-400 text-sm mb-2">
                Non-Member Price *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="non-member-price"
                  name="non_member_price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  aria-required="true"
                  value={formData.non_member_price || 0}
                  onChange={(e) => updateField('non_member_price', parseFloat(e.target.value) || 0)}
                  onBlur={() => touchField('non_member_price')}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="0.00"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Price for non-members</p>
            </div>
          </div>
        </div>

        {/* Legacy Registration Fee - Keep for backward compatibility but hide it */}
        <input
          type="hidden"
          name="registration_fee"
          value={formData.registration_fee || formData.non_member_price || 0}
        />

        {/* Early Bird Section - Now optional */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Early Registration Special (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Early Bird Name */}
            <div>
              <label htmlFor="early-bird-name" className="block text-gray-400 text-sm mb-2">
                Special Name
              </label>
              <input
                id="early-bird-name"
                name="early_bird_name"
                type="text"
                value={formData.early_bird_name}
                onChange={(e) => updateField('early_bird_name', e.target.value)}
                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                placeholder="e.g., Early Bird Special"
              />
            </div>

            {/* Early Bird Fee */}
            <div>
              <label htmlFor="early-bird-fee" className="block text-gray-400 text-sm mb-2">
                {formData.early_bird_name || 'Special'} Fee
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
            <div className="md:col-span-2">
              <label htmlFor="early-bird-deadline" className="block text-gray-400 text-sm mb-2">
                {formData.early_bird_name || 'Special'} Deadline
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
      </div>
    </div>
  );
};

export default PricingSection;