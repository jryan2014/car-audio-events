import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { fieldService } from '../../services/supabase-client';
import type { SupportFieldDefinition, FieldType, FieldOption, ValidationRules } from '../../types';

interface CustomFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  field?: SupportFieldDefinition;
}

const CustomFieldModal: React.FC<CustomFieldModalProps> = ({ isOpen, onClose, onSave, field }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    field_key: '',
    label: '',
    description: '',
    field_type: 'text' as FieldType,
    is_required: false,
    default_value: '',
    placeholder: '',
    options: [] as FieldOption[],
    validation_rules: {} as ValidationRules,
    sort_order: 0,
    is_active: true
  });

  useEffect(() => {
    if (field) {
      setFormData({
        field_key: field.field_key,
        label: field.label,
        description: field.description || '',
        field_type: field.field_type,
        is_required: field.is_required,
        default_value: field.default_value || '',
        placeholder: field.placeholder || '',
        options: field.options || [],
        validation_rules: field.validation_rules || {},
        sort_order: field.sort_order,
        is_active: field.is_active
      });
    } else {
      setFormData({
        field_key: '',
        label: '',
        description: '',
        field_type: 'text',
        is_required: false,
        default_value: '',
        placeholder: '',
        options: [],
        validation_rules: {},
        sort_order: 0,
        is_active: true
      });
    }
    setError('');
  }, [field, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (field) {
        await fieldService.updateField(field.id, formData);
      } else {
        await fieldService.createField(formData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving field:', error);
      setError('Failed to save custom field');
    } finally {
      setSaving(false);
    }
  };

  const handleAddOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { value: '', label: '' }]
    });
  };

  const handleRemoveOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index)
    });
  };

  const handleOptionChange = (index: number, field: 'value' | 'label', value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  const updateValidationRule = (key: string, value: any) => {
    setFormData({
      ...formData,
      validation_rules: {
        ...formData.validation_rules,
        [key]: value
      }
    });
  };

  if (!isOpen) return null;

  const fieldTypeOptions: { value: FieldType; label: string }[] = [
    { value: 'text', label: 'Text Input' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'date', label: 'Date Picker' },
    { value: 'dropdown_static', label: 'Dropdown (Static Options)' },
    { value: 'dropdown_dynamic_event', label: 'Dropdown (Events)' },
    { value: 'file', label: 'File Upload' },
    { value: 'checkbox', label: 'Checkbox' }
  ];

  const needsOptions = ['dropdown_static'].includes(formData.field_type);
  const needsFileValidation = formData.field_type === 'file';
  const needsTextValidation = ['text', 'textarea'].includes(formData.field_type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {field ? 'Edit Custom Field' : 'Create Custom Field'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Field Key *
              </label>
              <input
                type="text"
                value={formData.field_key}
                onChange={(e) => setFormData({ ...formData, field_key: e.target.value })}
                required
                pattern="[a-z][a-z0-9_]*"
                title="Must start with a letter and contain only lowercase letters, numbers, and underscores"
                className="block w-full rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                placeholder="e.g., customer_phone"
              />
              <p className="mt-1 text-xs text-gray-400">
                Lowercase letters, numbers, and underscores only
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Label *
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                required
                className="block w-full rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                placeholder="e.g., Phone Number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Field Type *
              </label>
              <select
                value={formData.field_type}
                onChange={(e) => setFormData({ ...formData, field_type: e.target.value as FieldType })}
                className="block w-full rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
              >
                {fieldTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                min="0"
                className="block w-full rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_required}
                  onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="ml-2 text-sm text-gray-300">Required</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="ml-2 text-sm text-gray-300">Active</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Optional description or help text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Placeholder Text
            </label>
            <input
              type="text"
              value={formData.placeholder}
              onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Placeholder text for the input field"
            />
          </div>

          {/* Options for dropdown fields */}
          {needsOptions && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Dropdown Options
                </label>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="inline-flex items-center px-3 py-1 border border-gray-600 rounded-md text-sm bg-gray-700 text-gray-300 hover:bg-gray-600"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </button>
              </div>
              
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={option.value}
                      onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                      placeholder="Display Label"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="px-2 py-1 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation rules */}
          {needsTextValidation && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">
                Text Validation
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Min Length</label>
                  <input
                    type="number"
                    value={formData.validation_rules.min_length || ''}
                    onChange={(e) => updateValidationRule('min_length', parseInt(e.target.value) || undefined)}
                    min="0"
                    className="block w-full rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Max Length</label>
                  <input
                    type="number"
                    value={formData.validation_rules.max_length || ''}
                    onChange={(e) => updateValidationRule('max_length', parseInt(e.target.value) || undefined)}
                    min="0"
                    className="block w-full rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                  />
                </div>
              </div>
            </div>
          )}

          {needsFileValidation && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">
                File Validation
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Accepted File Types</label>
                  <input
                    type="text"
                    value={formData.validation_rules.accept || ''}
                    onChange={(e) => updateValidationRule('accept', e.target.value || undefined)}
                    placeholder=".pdf,.doc,.docx"
                    className="block w-full rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Max Size (MB)</label>
                  <input
                    type="number"
                    value={formData.validation_rules.max_size || ''}
                    onChange={(e) => updateValidationRule('max_size', parseInt(e.target.value) || undefined)}
                    min="1"
                    className="block w-full rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-electric-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.field_key || !formData.label}
              className="px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600 focus:outline-none focus:ring-2 focus:ring-electric-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : field ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomFieldModal;