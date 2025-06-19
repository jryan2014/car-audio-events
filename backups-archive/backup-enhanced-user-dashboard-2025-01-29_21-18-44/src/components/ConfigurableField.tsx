import React, { useState, useEffect } from 'react';
import { ChevronDown, X, Check, AlertCircle, Copy, FileText } from 'lucide-react';
import { useSystemConfiguration } from '../hooks/useSystemConfiguration';

interface ConfigurableFieldProps {
  formName: string;
  fieldName: string;
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  className?: string;
  disabled?: boolean;
}

export default function ConfigurableField({
  formName,
  fieldName,
  value,
  onChange,
  onBlur,
  className = '',
  disabled = false
}: ConfigurableFieldProps) {
  const {
    getFormFieldConfig,
    getOptionsByCategoryId,
    getCategoryNameById,
    getRulesTemplates,
    getDefaultRulesTemplate,
    getSavedFormData,
    saveFormData,
    isLoading,
    error
  } = useSystemConfiguration();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRulesTemplates, setShowRulesTemplates] = useState(false);
  const [useStandardRules, setUseStandardRules] = useState(false);

  const fieldConfig = getFormFieldConfig(formName, fieldName);
  
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-600 rounded mb-2 w-24"></div>
        <div className="h-10 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="text-red-400 text-sm">Failed to load field configuration</span>
        </div>
      </div>
    );
  }

  if (!fieldConfig) {
    // Fallback to regular input if no configuration found
    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 ${className}`}
        disabled={disabled}
        placeholder={`Enter ${fieldName}`}
      />
    );
  }

  // Get configuration options for this field
  const options = getOptionsByCategoryId(fieldConfig.configuration_category_id);
  const savedData = getSavedFormData(formName, fieldName);
  const allOptions = [...new Set([...options.map((opt: any) => opt.value), ...savedData])];

  // Special handling for rules & regulations field
  const isRulesField = fieldName === 'rules_regulations';
  const rulesTemplates = isRulesField ? getRulesTemplates() : [];
  const defaultTemplate = isRulesField ? getDefaultRulesTemplate() : null;

  // Filter options based on search term
  const filteredOptions = allOptions.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOptionSelect = (optionValue: string) => {
    if (fieldConfig.is_multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
      setIsDropdownOpen(false);
      setSearchTerm('');
    }
    
    // Save the data for future autocomplete
    saveFormData(formName, fieldName, optionValue);
  };

  const handleRemoveValue = (valueToRemove: string) => {
    if (fieldConfig.is_multiple && Array.isArray(value)) {
      onChange(value.filter(v => v !== valueToRemove));
    }
  };

  const handleStandardRulesToggle = (checked: boolean) => {
    setUseStandardRules(checked);
    if (checked && defaultTemplate) {
      onChange(defaultTemplate.content);
    } else if (!checked) {
      onChange('');
    }
  };

  const handleRulesTemplateSelect = (template: any) => {
    onChange(template.content);
    setShowRulesTemplates(false);
  };



  const renderSelectField = () => {
    const displayValue = fieldConfig.is_multiple && Array.isArray(value)
      ? value.join(', ')
      : value || '';

    return (
      <div className="relative">
        <div
          onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
          className={`w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white cursor-pointer flex items-center justify-between ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-500'
          } ${className}`}
        >
          <span className={displayValue ? 'text-white' : 'text-gray-400'}>
            {displayValue || fieldConfig.placeholder}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </div>

        {isDropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2">
              <input
                type="text"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-electric-500"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.map((option) => {
                const isSelected = fieldConfig.is_multiple && Array.isArray(value)
                  ? value.includes(option)
                  : value === option;

                return (
                  <div
                    key={option}
                    onClick={() => handleOptionSelect(option)}
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-700 flex items-center justify-between ${
                      isSelected ? 'bg-electric-500/20 text-electric-400' : 'text-gray-300'
                    }`}
                  >
                    <span>{option}</span>
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                );
              })}
              {filteredOptions.length === 0 && (
                <div className="px-4 py-2 text-gray-500 text-sm">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show selected values for multi-select */}
        {fieldConfig.is_multiple && Array.isArray(value) && value.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {value.map((selectedValue) => (
              <span
                key={selectedValue}
                className="inline-flex items-center px-2 py-1 bg-electric-500/20 text-electric-400 rounded-full text-sm"
              >
                {selectedValue}
                <button
                  onClick={() => handleRemoveValue(selectedValue)}
                  className="ml-1 hover:text-electric-300"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderRulesField = () => {
    return (
      <div className="space-y-4">
        {/* Standard Rules Toggle */}
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useStandardRules}
              onChange={(e) => handleStandardRulesToggle(e.target.checked)}
              className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
            />
            <span className="text-gray-300">Use standard rules & regulations</span>
          </label>
          
          {rulesTemplates.length > 0 && (
            <button
              type="button"
              onClick={() => setShowRulesTemplates(!showRulesTemplates)}
              className="flex items-center space-x-1 text-electric-400 hover:text-electric-300 text-sm"
            >
              <FileText className="h-4 w-4" />
              <span>Templates</span>
            </button>
          )}
        </div>

        {/* Rules Templates Dropdown */}
        {showRulesTemplates && (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Select a rules template:</h4>
            <div className="space-y-2">
              {rulesTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleRulesTemplateSelect(template)}
                  className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span>{template.name}</span>
                    {template.is_default && (
                      <span className="text-electric-400 text-xs">Default</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text Area */}
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled || useStandardRules}
          placeholder={fieldConfig.placeholder}
          rows={6}
          className={`w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 resize-vertical ${
            disabled || useStandardRules ? 'opacity-50 cursor-not-allowed' : ''
          } ${className}`}
        />
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        {fieldConfig.placeholder || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        {fieldConfig.is_required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      {fieldConfig.help_text && (
        <p className="text-xs text-gray-500">{fieldConfig.help_text}</p>
      )}

      {isRulesField ? renderRulesField() : renderSelectField()}
    </div>
  );
} 