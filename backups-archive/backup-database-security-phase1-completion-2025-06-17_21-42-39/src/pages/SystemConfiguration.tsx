import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit3, Trash2, Save, X, Check, AlertCircle, Search, Eye, EyeOff, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ConfigurationCategory {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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
  created_at: string;
  updated_at: string;
  configuration_categories?: { name: string };
}

interface RulesTemplate {
  id: string;
  name: string;
  organization_id: string | null;
  content: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FormFieldConfiguration {
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
  created_at: string;
  updated_at: string;
  configuration_categories?: { name: string };
}

export default function SystemConfiguration() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState<ConfigurationCategory[]>([]);
  const [options, setOptions] = useState<ConfigurationOption[]>([]);
  const [rulesTemplates, setRulesTemplates] = useState<RulesTemplate[]>([]);
  const [formFields, setFormFields] = useState<FormFieldConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await loadCategories();
      
      switch (activeTab) {
        case 'options':
          await loadOptions();
          break;
        case 'rules':
          await loadRulesTemplates();
          break;
        case 'forms':
          await loadFormFields();
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load configuration data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('configuration_categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    setCategories(data || []);
  };

  const loadOptions = async () => {
    const { data, error } = await supabase
      .from('configuration_options')
      .select(`
        *,
        configuration_categories(name)
      `)
      .order('sort_order');
    
    if (error) throw error;
    setOptions(data || []);
  };

  const loadRulesTemplates = async () => {
    const { data, error } = await supabase
      .from('rules_templates')
      .select('*')
      .order('name');
    
    if (error) throw error;
    setRulesTemplates(data || []);
  };

  const loadFormFields = async () => {
    const { data, error } = await supabase
      .from('form_field_configurations')
      .select(`
        *,
        configuration_categories(name)
      `)
      .order('form_name', { ascending: true })
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    setFormFields(data || []);
  };

  const getTableName = (tab: string) => {
    switch (tab) {
      case 'categories': return 'configuration_categories';
      case 'options': return 'configuration_options';
      case 'rules': return 'rules_templates';
      case 'forms': return 'form_field_configurations';
      default: return '';
    }
  };

  const handleSave = async (item: any) => {
    try {
      setError(null);
      const table = getTableName(activeTab);
      
      if (item.id) {
        // Update existing
        const { error } = await supabase
          .from(table)
          .update({ ...item, updated_at: new Date().toISOString() })
          .eq('id', item.id);
        
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from(table)
          .insert([{ ...item, id: undefined }]);
        
        if (error) throw error;
      }
      
      setEditingItem(null);
      setShowCreateModal(false);
      setSuccessMessage(`${item.id ? 'Updated' : 'Created'} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      loadData();
    } catch (error) {
      console.error('Error saving:', error);
      setError(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const table = getTableName(activeTab);
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSuccessMessage('Deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const table = getTableName(activeTab);
      const { error } = await supabase
        .from(table)
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      loadData();
    } catch (error) {
      console.error('Error toggling status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const getNewItem = (tab: string) => {
    switch (tab) {
      case 'categories':
        return {
          name: '',
          description: '',
          is_active: true
        };
      case 'options':
        return {
          category_id: categories[0]?.id || '',
          key: '',
          label: '',
          value: '',
          description: '',
          data_type: 'string',
          sort_order: 0,
          is_active: true,
          metadata: {}
        };
      case 'rules':
        return {
          name: '',
          organization_id: null,
          content: '',
          is_default: false,
          is_active: true
        };
      case 'forms':
        return {
          form_name: '',
          field_name: '',
          configuration_category_id: categories[0]?.id || '',
          field_type: 'select',
          is_required: false,
          is_multiple: false,
          placeholder: '',
          help_text: '',
          validation_rules: {},
          sort_order: 0,
          is_active: true
        };
      default:
        return {};
    }
  };

  const filteredData = () => {
    const filter = (items: any[]) => {
      if (!searchTerm) return items;
      return items.filter(item => 
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.label && item.label.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.form_name && item.form_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.field_name && item.field_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    };

    switch (activeTab) {
      case 'categories': return filter(categories);
      case 'options': return filter(options);
      case 'rules': return filter(rulesTemplates);
      case 'forms': return filter(formFields);
      default: return [];
    }
  };

  const renderEditForm = () => {
    if (!editingItem) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">
              {editingItem.id ? 'Edit' : 'Create'} {activeTab.slice(0, -1)}
            </h3>
            <button
              onClick={() => {
                setEditingItem(null);
                setShowCreateModal(false);
              }}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            {activeTab === 'categories' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                  <input
                    type="text"
                    value={editingItem.name || ''}
                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="e.g., event_categories"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    rows={3}
                    placeholder="Description of this category"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={editingItem.is_active}
                    onChange={(e) => setEditingItem({...editingItem, is_active: e.target.checked})}
                    className="w-4 h-4 text-electric-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-300">Active</label>
                </div>
              </>
            )}

            {activeTab === 'options' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
                  <select
                    value={editingItem.category_id || ''}
                    onChange={(e) => setEditingItem({...editingItem, category_id: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Key *</label>
                  <input
                    type="text"
                    value={editingItem.key || ''}
                    onChange={(e) => setEditingItem({...editingItem, key: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="e.g., bass_competition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Label *</label>
                  <input
                    type="text"
                    value={editingItem.label || ''}
                    onChange={(e) => setEditingItem({...editingItem, label: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="e.g., Bass Competition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Value *</label>
                  <input
                    type="text"
                    value={editingItem.value || ''}
                    onChange={(e) => setEditingItem({...editingItem, value: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="e.g., Bass Competition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sort Order</label>
                  <input
                    type="number"
                    value={editingItem.sort_order || 0}
                    onChange={(e) => setEditingItem({...editingItem, sort_order: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="option_active"
                    checked={editingItem.is_active}
                    onChange={(e) => setEditingItem({...editingItem, is_active: e.target.checked})}
                    className="w-4 h-4 text-electric-500"
                  />
                  <label htmlFor="option_active" className="text-sm text-gray-300">Active</label>
                </div>
              </>
            )}

            {activeTab === 'rules' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Template Name *</label>
                  <input
                    type="text"
                    value={editingItem.name || ''}
                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="e.g., IASCA Standard Rules"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Content *</label>
                  <textarea
                    value={editingItem.content || ''}
                    onChange={(e) => setEditingItem({...editingItem, content: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    rows={8}
                    placeholder="Enter the rules and regulations content..."
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={editingItem.is_default}
                      onChange={(e) => setEditingItem({...editingItem, is_default: e.target.checked})}
                      className="w-4 h-4 text-electric-500"
                    />
                    <label htmlFor="is_default" className="text-sm text-gray-300">Default Template</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="rules_active"
                      checked={editingItem.is_active}
                      onChange={(e) => setEditingItem({...editingItem, is_active: e.target.checked})}
                      className="w-4 h-4 text-electric-500"
                    />
                    <label htmlFor="rules_active" className="text-sm text-gray-300">Active</label>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'forms' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Form Name *</label>
                  <input
                    type="text"
                    value={editingItem.form_name || ''}
                    onChange={(e) => setEditingItem({...editingItem, form_name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="e.g., create_event"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Field Name *</label>
                  <input
                    type="text"
                    value={editingItem.field_name || ''}
                    onChange={(e) => setEditingItem({...editingItem, field_name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="e.g., category"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Configuration Category *</label>
                  <select
                    value={editingItem.configuration_category_id || ''}
                    onChange={(e) => setEditingItem({...editingItem, configuration_category_id: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Field Type</label>
                  <select
                    value={editingItem.field_type || 'select'}
                    onChange={(e) => setEditingItem({...editingItem, field_type: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="select">Select</option>
                    <option value="multiselect">Multi Select</option>
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="checkbox">Checkbox</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Placeholder</label>
                  <input
                    type="text"
                    value={editingItem.placeholder || ''}
                    onChange={(e) => setEditingItem({...editingItem, placeholder: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="Placeholder text for the field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Help Text</label>
                  <input
                    type="text"
                    value={editingItem.help_text || ''}
                    onChange={(e) => setEditingItem({...editingItem, help_text: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="Help text for users"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sort Order</label>
                  <input
                    type="number"
                    value={editingItem.sort_order || 0}
                    onChange={(e) => setEditingItem({...editingItem, sort_order: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_required"
                      checked={editingItem.is_required}
                      onChange={(e) => setEditingItem({...editingItem, is_required: e.target.checked})}
                      className="w-4 h-4 text-electric-500"
                    />
                    <label htmlFor="is_required" className="text-sm text-gray-300">Required</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_multiple"
                      checked={editingItem.is_multiple}
                      onChange={(e) => setEditingItem({...editingItem, is_multiple: e.target.checked})}
                      className="w-4 h-4 text-electric-500"
                    />
                    <label htmlFor="is_multiple" className="text-sm text-gray-300">Multiple Values</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="form_active"
                      checked={editingItem.is_active}
                      onChange={(e) => setEditingItem({...editingItem, is_active: e.target.checked})}
                      className="w-4 h-4 text-electric-500"
                    />
                    <label htmlFor="form_active" className="text-sm text-gray-300">Active</label>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => handleSave(editingItem)}
              className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
            <button
              onClick={() => {
                setEditingItem(null);
                setShowCreateModal(false);
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    const data = filteredData();
    
    if (activeTab === 'categories') {
      return (
        <div className="grid gap-4">
          {data.map((category: ConfigurationCategory) => (
            <div key={category.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-white font-medium">{category.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      category.is_active 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {category.description && (
                    <p className="text-gray-400 text-sm mt-1">{category.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingItem(category)}
                    className="p-2 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(category.id, category.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      category.is_active 
                        ? 'hover:bg-gray-700 text-gray-400' 
                        : 'hover:bg-green-600 text-green-400'
                    }`}
                    title={category.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {category.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 hover:bg-gray-700 text-red-400 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'options') {
      return (
        <div className="grid gap-4">
          {data.map((option: ConfigurationOption) => (
            <div key={option.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-white font-medium">{option.label}</h3>
                    <span className="px-2 py-1 bg-electric-500/20 text-electric-400 rounded-full text-xs">
                      {option.configuration_categories?.name}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      option.is_active 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {option.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    <span className="font-mono bg-gray-700 px-2 py-1 rounded text-xs mr-2">{option.key}</span>
                    <span>→ {option.value}</span>
                  </div>
                  {option.description && (
                    <p className="text-gray-500 text-sm mt-1">{option.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingItem(option)}
                    className="p-2 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(option.id, option.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      option.is_active 
                        ? 'hover:bg-gray-700 text-gray-400' 
                        : 'hover:bg-green-600 text-green-400'
                    }`}
                    title={option.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {option.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(option.id)}
                    className="p-2 hover:bg-gray-700 text-red-400 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'rules') {
      return (
        <div className="grid gap-4">
          {data.map((template: RulesTemplate) => (
            <div key={template.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-white font-medium">{template.name}</h3>
                    {template.is_default && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                        Default
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      template.is_active 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                    {template.content.substring(0, 150)}...
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingItem(template)}
                    className="p-2 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(template.id, template.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      template.is_active 
                        ? 'hover:bg-gray-700 text-gray-400' 
                        : 'hover:bg-green-600 text-green-400'
                    }`}
                    title={template.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {template.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 hover:bg-gray-700 text-red-400 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'forms') {
      return (
        <div className="grid gap-4">
          {data.map((field: FormFieldConfiguration) => (
            <div key={field.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-white font-medium">{field.form_name}.{field.field_name}</h3>
                    <span className="px-2 py-1 bg-electric-500/20 text-electric-400 rounded-full text-xs">
                      {field.configuration_categories?.name}
                    </span>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                      {field.field_type}
                    </span>
                    {field.is_required && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
                        Required
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      field.is_active 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {field.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {field.help_text && (
                    <p className="text-gray-400 text-sm mt-1">{field.help_text}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingItem(field)}
                    className="p-2 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(field.id, field.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      field.is_active 
                        ? 'hover:bg-gray-700 text-gray-400' 
                        : 'hover:bg-green-600 text-green-400'
                    }`}
                    title={field.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {field.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(field.id)}
                    className="p-2 hover:bg-gray-700 text-red-400 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'categories': return 'Configuration Categories';
      case 'options': return 'Configuration Options';
      case 'rules': return 'Rules Templates';
      case 'forms': return 'Form Field Configurations';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-electric-500 rounded-lg flex items-center justify-center">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">System Configuration</h1>
              <p className="text-gray-400">Manage configurable options and settings</p>
            </div>
            <Link
              to="/admin/system-configuration-demo"
              className="flex items-center space-x-2 px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>View Demo</span>
            </Link>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-500/20 border border-green-500/30 rounded-lg p-4 flex items-center space-x-2">
            <Check className="h-5 w-5 text-green-400" />
            <span className="text-green-400">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="border-b border-gray-700">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'categories', label: 'Categories' },
                { id: 'options', label: 'Options' },
                { id: 'rules', label: 'Rules Templates' },
                { id: 'forms', label: 'Form Fields' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-electric-500 text-electric-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading configuration data...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Tab Header with Search and Add Button */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">{getTabTitle()}</h2>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setEditingItem(getNewItem(activeTab));
                        setShowCreateModal(true);
                      }}
                      className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add {activeTab.slice(0, -1)}</span>
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                {filteredData().length === 0 ? (
                  <div className="text-center py-12">
                    <Settings className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">No {activeTab} found</h3>
                    <p className="text-gray-500">
                      {searchTerm ? 'No items match your search.' : `Create your first ${activeTab.slice(0, -1)} to get started.`}
                    </p>
                  </div>
                ) : (
                  renderTabContent()
                )}
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {editingItem && renderEditForm()}
      </div>
    </div>
  );
} 