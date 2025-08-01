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
            className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500 disabled:bg-gray-600"
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
            className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500 disabled:bg-gray-600"
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
            className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500 disabled:bg-gray-600"
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
            className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500 disabled:bg-gray-600"
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
            className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500 disabled:bg-gray-600"
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
                className="rounded border-gray-600 text-electric-500 shadow-sm focus:border-electric-500 focus:ring-electric-500 bg-gray-700"
              />
              <span className="ml-2 text-sm text-gray-300">
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
              className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-electric-500 file:text-white hover:file:bg-electric-600"
            />
            {field.validation_rules?.max_size && (
              <p className="mt-1 text-xs text-gray-400">
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
        className="block text-sm font-medium text-gray-300"
      >
        {field.label} {field.is_required && '*'}
      </label>
      {field.description && (
        <p className="text-xs text-gray-400 mb-1">{field.description}</p>
      )}
      {renderField()}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export { CustomFieldRenderer };