import React, { useState, useEffect } from 'react';
import { Building2, Upload, Save, Plus, Edit2, Trash2, Image, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Organization {
  id: string;
  name: string;
  organization_type: string;
  logo_url?: string;
  small_logo_url?: string;
  status: string;
  default_rules_template_id?: string;
  competition_classes: string[];
  description?: string;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  created_at?: string;
  updated_at?: string;
}

interface RulesTemplate {
  id: string;
  name: string;
  rules_content: string;
  organization_name?: string;
  description?: string;
  version?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function OrganizationManager() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [rulesTemplates, setRulesTemplates] = useState<RulesTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    organization_type: 'sanctioning_body',
    description: '',
    website: '',
    logo_url: '',
    small_logo_url: '',
    status: 'active',
    competition_classes: [''],
    default_rules_template_id: ''
  });

  // Check if user is admin
  const isAdmin = user?.membershipType === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setError('Access denied. Admin privileges required.');
      return;
    }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(''); // Clear previous errors
      
      // Load organizations with detailed error handling
      console.log('🔍 Loading organizations...');
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          organization_type,
          logo_url,
          small_logo_url,
          status,
          default_rules_template_id,
          competition_classes,
          description,
          website,
          contact_email,
          contact_phone,
          created_at,
          updated_at
        `)
        .order('name');

      if (orgError) {
        console.error('❌ Organizations error:', orgError);
        throw new Error(`Failed to load organizations: ${orgError.message}`);
      }
      
      console.log('✅ Organizations loaded:', orgData?.length || 0, 'records');
      console.log('📊 Sample organization:', orgData?.[0]);
      setOrganizations(orgData || []);

      // Load rules templates with detailed error handling
      console.log('🔍 Loading rules templates...');
      const { data: rulesData, error: rulesError } = await supabase
        .from('rules_templates')
        .select(`
          id,
          name,
          rules_content,
          organization_name,
          description,
          version,
          is_active,
          created_at,
          updated_at
        `)
        .order('name');

      if (rulesError) {
        console.error('⚠️ Rules templates error:', rulesError);
        console.warn('Continuing without rules templates...');
        setRulesTemplates([]);
      } else {
        console.log('✅ Rules templates loaded:', rulesData?.length || 0, 'records');
        setRulesTemplates(rulesData || []);
      }

      // Clear error if we got here successfully
      setError('');

    } catch (error) {
      console.error('💥 Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data. Check browser console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCompetitionClassChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      competition_classes: prev.competition_classes.map((cls, i) => 
        i === index ? value : cls
      )
    }));
  };

  const addCompetitionClass = () => {
    setFormData(prev => ({
      ...prev,
      competition_classes: [...prev.competition_classes, '']
    }));
  };

  const removeCompetitionClass = (index: number) => {
    setFormData(prev => ({
      ...prev,
      competition_classes: prev.competition_classes.filter((_, i) => i !== index)
    }));
  };

  const handleLogoUpload = async (file: File, type: 'logo' | 'small_logo') => {
    try {
      // For now, we'll use a placeholder image URL instead of uploading to storage
      // This avoids the storage bucket dependency issue
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          const fieldName = type === 'logo' ? 'logo_url' : 'small_logo_url';
          // Store as data URL for local preview (in production, upload to proper storage)
          handleInputChange(fieldName, result);
          setSuccess(`${type === 'logo' ? 'Logo' : 'Small logo'} loaded successfully`);
        }
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Error processing logo:', error);
      setError('Failed to process logo file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const orgData = {
        name: formData.name,
        organization_type: formData.organization_type,
        description: formData.description,
        website: formData.website,
        logo_url: formData.logo_url,
        small_logo_url: formData.small_logo_url,
        status: formData.status,
        competition_classes: formData.competition_classes.filter(cls => cls.trim()),
        default_rules_template_id: formData.default_rules_template_id || null
      };

      console.log('💾 Saving organization data:', orgData);

      if (editingOrg) {
        console.log('✏️ Updating organization ID:', editingOrg.id);
        const { data, error } = await supabase
          .from('organizations')
          .update(orgData)
          .eq('id', editingOrg.id)
          .select();

        if (error) {
          console.error('❌ Update error:', error);
          throw new Error(`Update failed: ${error.message} (Code: ${error.code})`);
        }
        
        console.log('✅ Update successful:', data);
        setSuccess('Organization updated successfully');
      } else {
        console.log('➕ Creating new organization');
        const { data, error } = await supabase
          .from('organizations')
          .insert([orgData])
          .select();

        if (error) {
          console.error('❌ Insert error:', error);
          throw new Error(`Insert failed: ${error.message} (Code: ${error.code})`);
        }
        
        console.log('✅ Insert successful:', data);
        setSuccess('Organization created successfully');
      }

      setShowForm(false);
      setEditingOrg(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('💥 Save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to save organization: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      organization_type: org.organization_type,
      description: org.description || '',
      website: org.website || '',
      logo_url: org.logo_url || '',
      small_logo_url: org.small_logo_url || '',
      status: org.status,
      competition_classes: org.competition_classes.length ? org.competition_classes : [''],
      default_rules_template_id: org.default_rules_template_id || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (orgId: string) => {
    if (!confirm('Are you sure you want to delete this organization?')) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgId);

      if (error) throw error;
      setSuccess('Organization deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting organization:', error);
      setError('Failed to delete organization');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      organization_type: 'sanctioning_body',
      description: '',
      website: '',
      logo_url: '',
      small_logo_url: '',
      status: 'active',
      competition_classes: [''],
      default_rules_template_id: ''
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
            <p className="text-gray-300">Admin privileges required to manage organizations.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Organization Manager</h1>
          <p className="text-gray-400">Manage sanctioning bodies, clubs, and other organizations</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-400">
            {success}
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingOrg(null);
              resetForm();
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Add Organization</span>
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">
              {editingOrg ? 'Edit Organization' : 'Add New Organization'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Organization Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Organization Type</label>
                  <select
                    value={formData.organization_type}
                    onChange={(e) => handleInputChange('organization_type', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  >
                    <option value="sanctioning_body">Sanctioning Body</option>
                    <option value="club">Club</option>
                    <option value="retailer">Retailer</option>
                    <option value="manufacturer">Manufacturer</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Organization description..."
                />
              </div>

              {/* Logo Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Main Logo</label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file, 'logo');
                      }}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    />
                    {formData.logo_url && (
                      <img
                        src={formData.logo_url}
                        alt="Logo preview"
                        className="w-24 h-24 object-contain bg-gray-600 rounded"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Small Logo (for map pins)</label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file, 'small_logo');
                      }}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    />
                    {formData.small_logo_url && (
                      <img
                        src={formData.small_logo_url}
                        alt="Small logo preview"
                        className="w-12 h-12 object-contain bg-gray-600 rounded"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Rules Template */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Default Rules Template</label>
                <select
                  value={formData.default_rules_template_id}
                  onChange={(e) => handleInputChange('default_rules_template_id', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="">No default template</option>
                  {rulesTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Competition Classes */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Competition Classes</label>
                <div className="space-y-3">
                  {formData.competition_classes.map((cls, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={cls}
                        onChange={(e) => handleCompetitionClassChange(index, e.target.value)}
                        className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder={`Competition class ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeCompetitionClass(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCompetitionClass}
                    className="text-electric-400 hover:text-electric-300 text-sm"
                  >
                    + Add Competition Class
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingOrg(null);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-600 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <Save className="h-5 w-5" />
                  <span>{isLoading ? 'Saving...' : editingOrg ? 'Update' : 'Create'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Organizations List */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Existing Organizations</h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500 mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading organizations...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org) => (
                <div key={org.id} className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {org.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt={org.name}
                          className="w-12 h-12 object-contain bg-gray-600 rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-white font-medium">{org.name}</h3>
                        <p className="text-gray-400 text-sm capitalize">{org.organization_type}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(org)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(org.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        org.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        org.status === 'inactive' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {org.status}
                      </span>
                    </div>
                    
                    {org.competition_classes?.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-xs">Competition Classes:</p>
                        <p className="text-white text-sm">{org.competition_classes.join(', ')}</p>
                      </div>
                    )}
                    
                    {org.website && (
                      <a
                        href={org.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-electric-400 hover:text-electric-300 text-sm"
                      >
                        Visit Website
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 