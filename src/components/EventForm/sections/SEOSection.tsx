import React from 'react';
import { Search, X, Trophy, Tag, Award, Star } from 'lucide-react';
import { EventFormData } from '../../../types/event';

interface SEOSectionProps {
  formData: EventFormData;
  updateField: <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => void;
  getFieldError: (field: string) => string | undefined;
  touchField: (field: string) => void;
}

const SEOSection: React.FC<SEOSectionProps> = ({
  formData,
  updateField,
  getFieldError,
  touchField
}) => {
  const handleKeywordChange = (index: number, value: string) => {
    const newKeywords = [...formData.seo_keywords];
    newKeywords[index] = value;
    updateField('seo_keywords', newKeywords);
  };

  const addKeyword = () => {
    updateField('seo_keywords', [...formData.seo_keywords, '']);
  };

  const removeKeyword = (index: number) => {
    updateField('seo_keywords', formData.seo_keywords.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
        <Search className="h-5 w-5 text-electric-500" />
        <span>SEO & Marketing</span>
      </h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="seo-title" className="block text-gray-400 text-sm mb-2">
            SEO Title
            <span className="text-xs text-gray-500 ml-2">(Max 160 characters for optimal display)</span>
          </label>
          <input
            id="seo-title"
            type="text"
            value={formData.seo_title}
            onChange={(e) => updateField('seo_title', e.target.value)}
            onBlur={() => touchField('seo_title')}
            maxLength={160}
            className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
              getFieldError('seo_title') ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="Custom title for search engines (leave blank to auto-generate)"
          />
          <div className="mt-1 text-xs text-gray-500">
            {formData.seo_title ? formData.seo_title.length : 0}/160 characters
          </div>
          {getFieldError('seo_title') && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('seo_title')}
            </p>
          )}
        </div>
        
        <div>
          <label htmlFor="seo-description" className="block text-gray-400 text-sm mb-2">
            SEO Description
          </label>
          <textarea
            id="seo-description"
            value={formData.seo_description}
            onChange={(e) => updateField('seo_description', e.target.value)}
            onBlur={() => touchField('seo_description')}
            rows={3}
            className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
              getFieldError('seo_description') ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="SEO Description"
          />
          {getFieldError('seo_description') && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('seo_description')}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-gray-400 text-sm mb-2">SEO Keywords</label>
          <div className="space-y-3">
            {formData.seo_keywords.map((keyword, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => handleKeywordChange(index, e.target.value)}
                  className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder={`Keyword ${index + 1}`}
                  aria-label={`SEO Keyword ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeKeyword(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  aria-label={`Remove keyword ${index + 1}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addKeyword}
              className="text-electric-400 hover:text-electric-300 text-sm transition-colors"
            >
              + Add Keyword
            </button>
          </div>
        </div>

        {/* Competition Format */}
        <div>
          <label htmlFor="competition-format" className="block text-gray-400 text-sm mb-2">
            <Trophy className="inline h-4 w-4 mr-1" />
            Competition Format
          </label>
          <select
            id="competition-format"
            value={formData.competition_format || ''}
            onChange={(e) => updateField('competition_format', e.target.value as any)}
            onBlur={() => touchField('competition_format')}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          >
            <option value="">Select competition format</option>
            <option value="spl">SPL Competition</option>
            <option value="sq">SQ Competition</option>
            <option value="demo">Demo/Exhibition</option>
            <option value="car_show">Car Show</option>
          </select>
        </div>

        {/* Sanctioning Body */}
        <div>
          <label htmlFor="sanctioning-body" className="block text-gray-400 text-sm mb-2">
            <Tag className="inline h-4 w-4 mr-1" />
            Sanctioning Body
          </label>
          <input
            id="sanctioning-body"
            type="text"
            value={formData.sanctioning_body || ''}
            onChange={(e) => updateField('sanctioning_body', e.target.value)}
            onBlur={() => touchField('sanctioning_body')}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            placeholder="e.g., IASCA, MECA, DB Drag, USACI, Bass Wars, NSPL, Midwest SPL, ISPLL, MASQ, Independent/Club, Non-Sanctioned"
          />
        </div>

        {/* Competition Classes */}
        <div>
          <label className="block text-gray-400 text-sm mb-2">
            <Trophy className="inline h-4 w-4 mr-1" />
            Competition Classes
          </label>
          <div className="space-y-3">
            {(formData.competition_classes || []).map((compClass, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="text"
                  value={compClass}
                  onChange={(e) => {
                    const newClasses = [...(formData.competition_classes || [])];
                    newClasses[index] = e.target.value;
                    updateField('competition_classes', newClasses);
                  }}
                  className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="e.g., Street Stock, Modified, Extreme"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newClasses = (formData.competition_classes || []).filter((_, i) => i !== index);
                    updateField('competition_classes', newClasses);
                  }}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  aria-label={`Remove class ${index + 1}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                updateField('competition_classes', [...(formData.competition_classes || []), '']);
              }}
              className="text-electric-400 hover:text-electric-300 text-sm transition-colors"
            >
              + Add Competition Class
            </button>
          </div>
        </div>

        {/* Event Features */}
        <div>
          <label className="block text-gray-400 text-sm mb-2">
            <Star className="inline h-4 w-4 mr-1" />
            Event Features
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'vendor_booths', label: 'Vendor Booths' },
              { value: 'demo_vehicles', label: 'Demo Vehicles' },
              { value: 'workshops', label: 'Workshops/Clinics' },
              { value: 'meet_greet', label: 'Meet & Greet' },
              { value: 'dyno_testing', label: 'Dyno Testing' },
              { value: 'installation_demos', label: 'Installation Demos' }
            ].map((feature) => (
              <label key={feature.value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(formData.event_features || []).includes(feature.value)}
                  onChange={(e) => {
                    const features = formData.event_features || [];
                    if (e.target.checked) {
                      updateField('event_features', [...features, feature.value]);
                    } else {
                      updateField('event_features', features.filter(f => f !== feature.value));
                    }
                  }}
                  className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
                />
                <span className="text-sm text-gray-300">{feature.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Awards & Prizes */}
        <div>
          <label htmlFor="awards-prizes" className="block text-gray-400 text-sm mb-2">
            <Award className="inline h-4 w-4 mr-1" />
            Awards & Prizes
          </label>
          <textarea
            id="awards-prizes"
            value={formData.awards_prizes || ''}
            onChange={(e) => updateField('awards_prizes', e.target.value)}
            onBlur={() => touchField('awards_prizes')}
            rows={3}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            placeholder="Describe trophies, cash prizes, championship points, etc."
          />
        </div>
      </div>
    </div>
  );
};

export default SEOSection;