import React from 'react';
import { Search, X } from 'lucide-react';
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
          </label>
          <input
            id="seo-title"
            type="text"
            value={formData.seo_title}
            onChange={(e) => updateField('seo_title', e.target.value)}
            onBlur={() => touchField('seo_title')}
            className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
              getFieldError('seo_title') ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="SEO Title"
          />
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
      </div>
    </div>
  );
};

export default SEOSection;