import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ConfigurationOption {
  id: string;
  category_id: string;
  key: string;
  label: string;
  value: string;
  description: string;
  data_type: string;
  sort_order: number;
  is_active: boolean;
  metadata: any;
}

interface FormFieldConfig {
  id: string;
  form_name: string;
  field_name: string;
  configuration_category_id: string;
  field_type: string;
  is_required: boolean;
  is_multiple: boolean;
  placeholder: string;
  help_text: string;
  validation_rules: any;
  sort_order: number;
  is_active: boolean;
}

interface RulesTemplate {
  id: string;
  name: string;
  organization_id?: string;
  content: string;
  is_default: boolean;
  is_active: boolean;
}

interface SavedFormData {
  id: string;
  user_id: string;
  form_name: string;
  field_name: string;
  field_value: string;
  usage_count: number;
  last_used_at: string;
}

interface UseSystemConfigurationReturn {
  // Configuration options by category
  getOptionsByCategory: (categoryName: string) => ConfigurationOption[];
  getOptionsByCategoryId: (categoryId: string) => ConfigurationOption[];
  
  // Form field configurations
  getFormFieldConfig: (formName: string, fieldName: string) => FormFieldConfig | null;
  getFormFieldConfigs: (formName: string) => FormFieldConfig[];
  
  // Rules templates
  getRulesTemplates: (organizationId?: string) => RulesTemplate[];
  getDefaultRulesTemplate: () => RulesTemplate | null;
  
  // Saved form data (auto-complete functionality)
  getSavedFormData: (formName: string, fieldName: string) => string[];
  saveFormData: (formName: string, fieldName: string, value: string) => Promise<void>;
  
  // Copy event functionality
  copyEventData: (eventId: string) => Promise<any>;
  
  // Helper functions
  getCategoryNameById: (categoryId: string) => string | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Data refresh
  refresh: () => Promise<void>;
}

export function useSystemConfiguration(): UseSystemConfigurationReturn {
  const [configOptions, setConfigOptions] = useState<ConfigurationOption[]>([]);
  const [formFieldConfigs, setFormFieldConfigs] = useState<FormFieldConfig[]>([]);
  const [rulesTemplates, setRulesTemplates] = useState<RulesTemplate[]>([]);
  const [savedFormData, setSavedFormData] = useState<SavedFormData[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load configuration categories first to create a name-to-id map
      const { data: categories, error: categoriesError } = await supabase
        .from('configuration_categories')
        .select('id, name')
        .eq('is_active', true);

      if (categoriesError) throw categoriesError;

      const catMap = new Map();
      categories?.forEach(cat => catMap.set(cat.name, cat.id));
      setCategoriesMap(catMap);

      // Load configuration options
      const { data: options, error: optionsError } = await supabase
        .from('configuration_options')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (optionsError) throw optionsError;
      setConfigOptions(options || []);

      // Load form field configurations
      const { data: formFields, error: formFieldsError } = await supabase
        .from('form_field_configurations')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (formFieldsError) throw formFieldsError;
      setFormFieldConfigs(formFields || []);

      // Load rules templates
      const { data: rules, error: rulesError } = await supabase
        .from('rules_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (rulesError) throw rulesError;
      setRulesTemplates(rules || []);

      // Load saved form data for the current user
      const { data: savedData, error: savedDataError } = await supabase
        .from('saved_form_data')
        .select('*')
        .order('usage_count', { ascending: false });

      if (savedDataError) {
        console.warn('Could not load saved form data:', savedDataError);
      } else {
        setSavedFormData(savedData || []);
      }

    } catch (err) {
      console.error('Failed to load system configuration:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getOptionsByCategory = (categoryName: string): ConfigurationOption[] => {
    const categoryId = categoriesMap.get(categoryName);
    if (!categoryId) return [];
    
    return configOptions.filter(option => 
      option.category_id === categoryId && option.is_active
    ).sort((a, b) => a.sort_order - b.sort_order);
  };

  const getOptionsByCategoryId = (categoryId: string): ConfigurationOption[] => {
    return configOptions.filter(option => 
      option.category_id === categoryId && option.is_active
    ).sort((a, b) => a.sort_order - b.sort_order);
  };

  const getCategoryNameById = (categoryId: string): string | null => {
    for (const [name, id] of categoriesMap.entries()) {
      if (id === categoryId) {
        return name;
      }
    }
    return null;
  };

  const getFormFieldConfig = (formName: string, fieldName: string): FormFieldConfig | null => {
    return formFieldConfigs.find(config => 
      config.form_name === formName && 
      config.field_name === fieldName && 
      config.is_active
    ) || null;
  };

  const getFormFieldConfigs = (formName: string): FormFieldConfig[] => {
    return formFieldConfigs.filter(config => 
      config.form_name === formName && config.is_active
    ).sort((a, b) => a.sort_order - b.sort_order);
  };

  const getRulesTemplates = (organizationId?: string): RulesTemplate[] => {
    return rulesTemplates.filter(template => {
      if (!template.is_active) return false;
      if (organizationId) {
        return template.organization_id === organizationId || template.organization_id === null;
      }
      return true;
    });
  };

  const getDefaultRulesTemplate = (): RulesTemplate | null => {
    return rulesTemplates.find(template => 
      template.is_default && template.is_active
    ) || null;
  };

  const getSavedFormData = (formName: string, fieldName: string): string[] => {
    return savedFormData
      .filter(data => data.form_name === formName && data.field_name === fieldName)
      .sort((a, b) => b.usage_count - a.usage_count)
      .map(data => data.field_value)
      .slice(0, 10); // Limit to top 10 most used values
  };

  const saveFormData = async (formName: string, fieldName: string, value: string): Promise<void> => {
    if (!value.trim()) return;

    try {
      const { error } = await supabase
        .from('saved_form_data')
        .upsert({
          form_name: formName,
          field_name: fieldName,
          field_value: value.trim(),
          last_used_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,form_name,field_name,field_value',
          ignoreDuplicates: false
        });

      if (error) {
        console.warn('Failed to save form data:', error);
      } else {
        // Refresh saved form data
        const { data: savedData } = await supabase
          .from('saved_form_data')
          .select('*')
          .order('usage_count', { ascending: false });
        
        if (savedData) {
          setSavedFormData(savedData);
        }
      }
    } catch (err) {
      console.warn('Failed to save form data:', err);
    }
  };

  const copyEventData = async (eventId: string): Promise<any> => {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      // Remove fields that shouldn't be copied
      const { id, created_at, updated_at, status, slug, ...copyableData } = event;

      return {
        ...copyableData,
        title: `Copy of ${copyableData.title}`,
        status: 'draft'
      };
    } catch (err) {
      console.error('Failed to copy event data:', err);
      throw err;
    }
  };

  const refresh = async () => {
    await loadData();
  };

  return {
    getOptionsByCategory,
    getOptionsByCategoryId,
    getFormFieldConfig,
    getFormFieldConfigs,
    getRulesTemplates,
    getDefaultRulesTemplate,
    getSavedFormData,
    saveFormData,
    copyEventData,
    getCategoryNameById,
    isLoading,
    error,
    refresh
  };
} 