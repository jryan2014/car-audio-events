import React, { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { SupportFieldDefinition } from '../../types';

interface CustomFieldRendererProps {
  field: SupportFieldDefinition;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

const CustomFieldRenderer: React.FC<CustomFieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
  disabled = false
}) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // Load events for dynamic dropdown
  useEffect(() => {
    if (field.field_type === 'dropdown_dynamic_event') {
      loadEvents();
    }
  }, [field.field_type]);
  
  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, start_date, organization_id')
        .eq('status', 'published')
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(100);
      
      if (!error && data) {
        setEvents(data);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };
  
  const renderField = () => {
    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            id={field.field_key}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.is_required}
            disabled={disabled}
            maxLength={field.validation_rules?.max_length}
            minLength={field.validation_rules?.min_length}
            pattern={field.validation_rules?.pattern}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
          />
        );
      
      case 'textarea':
        return (
          <textarea
            id={field.field_key}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.is_required}
            disabled={disabled}
            rows={4}
            maxLength={field.validation_rules?.max_length}
            minLength={field.validation_rules?.min_length}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            id={field.field_key}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.is_required}
            disabled={disabled}
            min={field.validation_rules?.min}
            max={field.validation_rules?.max}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
          />
        );
      
      case 'dropdown_static':
        return (
          <select
            id={field.field_key}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.is_required}
            disabled={disabled}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Select an option</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'dropdown_dynamic_event':
        return (
          <select
            id={field.field_key}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.is_required}
            disabled={disabled || loadingEvents}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">
              {loadingEvents ? 'Loading events...' : 'Select an event'}
            </option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} - {new Date(event.start_date).toLocaleDateString()}
              </option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <div className="mt-1">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                id={field.field_key}
                checked={value || false}
                onChange={(e) => onChange(e.target.checked)}
                required={field.is_required && !value}
                disabled={disabled}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                {field.placeholder || 'Check this box'}
              </span>
            </label>
          </div>
        );
      
      case 'file':
        return (
          <div className="mt-1">
            <input
              type="file"
              id={field.field_key}
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  onChange(files[0]);
                }
              }}
              required={field.is_required}
              disabled={disabled}
              accept={field.validation_rules?.accept}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {field.validation_rules?.max_size && (
              <p className="mt-1 text-xs text-gray-500">
                Max size: {(field.validation_rules.max_size / 1024 / 1024).toFixed(1)}MB
              </p>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div>
      <label 
        htmlFor={field.field_key} 
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {field.label} {field.is_required && '*'}
      </label>
      {field.description && (
        <p className="text-xs text-gray-500 mb-1">{field.description}</p>
      )}
      {renderField()}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export { CustomFieldRenderer };