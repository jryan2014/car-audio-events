import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Edit, Trash2, Save, X, Star, Check, AlertCircle, Users, Building, Wrench, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface MembershipPlan {
  id: string;
  name: string;
  type: 'competitor' | 'retailer' | 'manufacturer' | 'organization';
  price: number;
  billing_period: 'monthly' | 'yearly' | 'lifetime';
  description: string;
  features: string[];
  permissions: string[];
  is_active: boolean;
  is_featured: boolean;
  max_events_per_month?: number;
  max_team_members?: number;
  max_listings?: number;
  display_order?: number;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export default function AdminMembership() {
  const { user, session } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<MembershipPlan | null>(null);
  const [activeTab, setActiveTab] = useState('plans');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [newFeature, setNewFeature] = useState('');
  const [showFeatureInput, setShowFeatureInput] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/\" replace />;
  }

  const [formData, setFormData] = useState<Partial<MembershipPlan>>({
    name: '',
    type: 'competitor',
    price: 0,
    billing_period: 'yearly',
    description: '',
    features: [],
    permissions: [],
    is_active: true,
    is_featured: false,
    max_events_per_month: undefined,
    max_team_members: undefined,
    max_listings: undefined
  });

  const membershipTypes = [
    { id: 'competitor', name: 'Competitor', icon: Users, color: 'blue' },
    { id: 'retailer', name: 'Retailer', icon: Building, color: 'purple' },
    { id: 'manufacturer', name: 'Manufacturer', icon: Wrench, color: 'orange' },
    { id: 'organization', name: 'Organization', icon: Crown, color: 'green' }
  ];

  const [defaultPermissions, setDefaultPermissions] = useState([
    // Competitor permissions
    { id: 'view_events', name: 'View Events', description: 'Browse and view event listings', category: 'Events' },
    { id: 'register_events', name: 'Register for Events', description: 'Register and participate in events', category: 'Events' },
    { id: 'track_scores', name: 'Track Scores', description: 'View and track competition scores', category: 'Competition' },
    { id: 'create_profile', name: 'Create Profile', description: 'Create and manage user profile', category: 'Profile' },
    { id: 'join_teams', name: 'Join Teams', description: 'Join and participate in teams', category: 'Teams' },
    { id: 'advanced_analytics', name: 'Advanced Analytics', description: 'Access detailed performance analytics', category: 'Analytics' },
    { id: 'priority_registration', name: 'Priority Registration', description: 'Early access to event registration', category: 'Events' },
    { id: 'custom_showcase', name: 'Custom System Showcase', description: 'Create custom audio system showcases', category: 'Profile' },
    { id: 'export_history', name: 'Export Competition History', description: 'Export competition data and history', category: 'Data' },
    
    // Business permissions
    { id: 'directory_listing', name: 'Directory Listing', description: 'List business in directory', category: 'Business' },
    { id: 'create_events', name: 'Create Events', description: 'Create and manage events', category: 'Events' },
    { id: 'customer_analytics', name: 'Customer Analytics', description: 'Access customer insights and analytics', category: 'Analytics' },
    { id: 'advertising', name: 'Advertising Options', description: 'Access to advertising and promotion tools', category: 'Marketing' },
    { id: 'sponsorship_tools', name: 'Sponsorship Tools', description: 'Tools for event sponsorship management', category: 'Marketing' },
    { id: 'api_access', name: 'API Access', description: 'Access to platform APIs', category: 'Integration' },
    { id: 'priority_support', name: 'Priority Support', description: 'Priority customer support', category: 'Support' },
    { id: 'bulk_operations', name: 'Bulk Operations', description: 'Perform bulk data operations', category: 'Data' },
    { id: 'white_label', name: 'White Label Options', description: 'White label platform features', category: 'Branding' },
    
    // Organization permissions
    { id: 'member_management', name: 'Member Management', description: 'Manage organization members', category: 'Organization' },
    { id: 'event_hosting', name: 'Event Hosting', description: 'Host and organize events', category: 'Events' },
    { id: 'community_building', name: 'Community Building', description: 'Access community building tools', category: 'Community' },
    { id: 'custom_branding', name: 'Custom Branding', description: 'Custom branding and themes', category: 'Branding' }
  ]);

  useEffect(() => {
    loadPlans();
    loadPermissions();
  }, []);

  const loadPermissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role_name, permission, resource')
        .order('role_name');

      if (error) throw error;

      // Transform the data into our permissions format
      const permissionsMap = new Map();
      
      data.forEach((item: any) => {
        const id = item.permission;
        const name = item.permission
          .split('_')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        const category = item.resource.charAt(0).toUpperCase() + item.resource.slice(1);
        
        if (!permissionsMap.has(id)) {
          permissionsMap.set(id, {
            id,
            name,
            description: `Permission to ${item.permission.replace(/_/g, ' ')} ${item.resource}`,
            category
          });
        }
      });
      
      // If we have permissions from the database, use them
      if (permissionsMap.size > 0) {
        setDefaultPermissions(Array.from(permissionsMap.values()));
        setPermissions(Array.from(permissionsMap.values()));
      } else {
        // Otherwise keep using the default permissions
        setPermissions(defaultPermissions);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
      // Keep using the default permissions
      setPermissions(defaultPermissions);
    }
  }, [defaultPermissions]);

  const loadPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedPlans: MembershipPlan[] = (data || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        type: plan.type,
        price: plan.price,
        billing_period: plan.billing_period,
        description: plan.description,
        features: Array.isArray(plan.features) ? plan.features : [],
        permissions: Array.isArray(plan.permissions) ? plan.permissions : [],
        is_active: plan.is_active,
        is_featured: plan.is_featured,
        max_events_per_month: plan.limits?.max_events_per_month,
        max_team_members: plan.limits?.max_team_members,
        max_listings: plan.limits?.max_listings,
        display_order: plan.display_order,
        created_at: plan.created_at,
        updated_at: plan.updated_at
      }));

      setPlans(transformedPlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      type: 'competitor',
      price: 0,
      billing_period: 'yearly',
      description: '',
      features: [],
      permissions: [],
      is_active: true,
      is_featured: false
    });
    setShowPlanModal(true);
  };

  const handleEditPlan = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setFormData(plan);
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    try {
      if (editingPlan) {
        setSaveStatus('saving');
        
        // Prepare the data for update
        const limits = {
          max_events_per_month: formData.max_events_per_month,
          max_team_members: formData.max_team_members,
          max_listings: formData.max_listings
        };
        
        const { error } = await supabase
          .from('membership_plans')
          .update({
            name: formData.name,
            type: formData.type,
            price: formData.price,
            billing_period: formData.billing_period,
            description: formData.description,
            features: formData.features,
            permissions: formData.permissions,
            limits: limits,
            is_active: formData.is_active,
            is_featured: formData.is_featured,
            display_order: editingPlan.display_order || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPlan.id);

        if (error) throw error;
        
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
        
        // Reload plans to get the updated data
        await loadPlans();
      } else {
        setSaveStatus('saving');
        
        // Prepare the data for insert
        const limits = {
          max_events_per_month: formData.max_events_per_month,
          max_team_members: formData.max_team_members,
          max_listings: formData.max_listings
        };
        
        // Get the highest display order
        const maxDisplayOrder = Math.max(...plans.map(p => p.display_order || 0), 0);
        
        const { error } = await supabase
          .from('membership_plans')
          .insert({
            name: formData.name,
            type: formData.type,
            price: formData.price,
            billing_period: formData.billing_period,
            description: formData.description,
            features: formData.features,
            permissions: formData.permissions,
            limits: limits,
            is_active: formData.is_active,
            is_featured: formData.is_featured,
            display_order: maxDisplayOrder + 1
          });

        if (error) throw error;
        
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
        
        // Reload plans to get the updated data
        await loadPlans();
      }
      
      setShowPlanModal(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Failed to save plan:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('membership_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      
      // Reload plans after deletion
      await loadPlans();
      
      // Close the confirmation modal
      setShowDeleteConfirm(false);
      setPlanToDelete(null);
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), newFeature.trim()]
      });
      setNewFeature('');
      setShowFeatureInput(false);
    }
  };

  const startAddingFeature = () => {
    setShowFeatureInput(true);
    setNewFeature('');
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features?.filter((_, i) => i !== index) || []
    });
  };

  const togglePermission = (permissionId: string) => {
    const currentPermissions = formData.permissions || [];
    const hasPermission = currentPermissions.includes(permissionId);
    
    setFormData({
      ...formData,
      permissions: hasPermission
        ? currentPermissions.filter(p => p !== permissionId)
        : [...currentPermissions, permissionId]
    });
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = membershipTypes.find(t => t.id === type);
    return typeConfig ? typeConfig.icon : Users;
  };

  const getTypeColor = (type: string) => {
    const typeConfig = membershipTypes.find(t => t.id === type);
    return typeConfig ? typeConfig.color : 'blue';
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const togglePlanSelection = (planId: string) => {
    setSelectedPlans(prev => 
      prev.includes(planId) 
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedPlans.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('membership_plans')
        .delete()
        .in('id', selectedPlans);

      if (error) throw error;
      
      await loadPlans();
      setSelectedPlans([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Failed to delete plans:', error);
    }
  };

  const handleBulkToggleStatus = async (active: boolean) => {
    if (selectedPlans.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('membership_plans')
        .update({ is_active: active })
        .in('id', selectedPlans);

      if (error) throw error;
      
      await loadPlans();
      setSelectedPlans([]);
    } catch (error) {
      console.error('Failed to update plans:', error);
    }
  };

  const handleDuplicatePlan = (plan: MembershipPlan) => {
    setEditingPlan(null);
    setFormData({
      ...plan,
      name: `${plan.name} (Copy)`,
      is_featured: false
    });
    setShowPlanModal(true);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-electric-500 rounded-lg flex items-center justify-center">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Membership Management</h1>
              <p className="text-gray-400">Manage membership plans, features, and permissions</p>
            </div>
          </div>
          <button 
            onClick={handleCreatePlan}
            className="bg-electric-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Plan</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-800/50 p-1 rounded-xl border border-gray-700/50">
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'plans'
                ? 'bg-electric-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Membership Plans</span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'permissions'
                ? 'bg-electric-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Permissions</span>
          </button>
        </div>

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading plans...</p>
              </div>
            ) : (
              plans.map((plan) => {
                const TypeIcon = getTypeIcon(plan.type);
                const typeColor = getTypeColor(plan.type);
                
                return (
                  <div
                    key={plan.id}
                    className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border-2 transition-all duration-300 hover:scale-105 ${
                      plan.is_featured
                        ? 'border-electric-500 shadow-electric-500/20 shadow-2xl'
                        : 'border-gray-700/50 hover:border-gray-600'
                    }`}
                  >
                    {plan.is_featured && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <div className="bg-electric-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center space-x-1">
                          <Star className="h-3 w-3" />
                          <span>Featured</span>
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-${typeColor}-500`}>
                          <TypeIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditPlan(plan)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="Edit Plan"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setPlanToDelete(plan);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Delete Plan"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                      <div className={`text-xs font-medium px-2 py-1 rounded-full bg-${typeColor}-500/20 text-${typeColor}-400 mb-3 inline-block`}>
                        {plan.type.charAt(0).toUpperCase() + plan.type.slice(1)}
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                      
                      <div className="mb-4">
                        {plan.price === 0 ? (
                          <div className="text-2xl font-black text-white">Free</div>
                        ) : (
                          <div className="flex items-baseline">
                            <span className="text-3xl font-black text-white">${plan.price}</span>
                            <span className="text-gray-400 ml-2">/{plan.billing_period}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="text-white font-medium text-sm">Features:</div>
                        <ul className="space-y-1">
                          {plan.features.slice(0, 3).map((feature, index) => (
                            <li key={index} className="flex items-center space-x-2 text-gray-300 text-xs">
                              <Check className="h-3 w-3 text-electric-500 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                          {plan.features.length > 3 && (
                            <li className="text-gray-500 text-xs">
                              +{plan.features.length - 3} more features
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className={`px-2 py-1 rounded-full ${plan.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span>{plan.permissions.length} permissions</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
              <div key={category} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryPermissions.map((permission) => (
                    <div key={permission.id} className="bg-gray-700/30 p-4 rounded-lg">
                      <h4 className="text-white font-medium mb-2">{permission.name}</h4>
                      <p className="text-gray-400 text-sm">{permission.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Plan Modal */}
        {showPlanModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                  </h3>
                  <button
                    onClick={() => setShowPlanModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Plan Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Enter plan name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Membership Type</label>
                    <select
                      value={formData.type || 'competitor'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      {membershipTypes.map((type) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Price ($)</label>
                    <input
                      type="number"
                      value={formData.price || 0}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Billing Period</label>
                    <select
                      value={formData.billing_period || 'yearly'}
                      onChange={(e) => setFormData({ ...formData, billing_period: e.target.value as any })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 resize-none"
                    rows={3}
                    placeholder="Enter plan description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Max Events/Month</label>
                    <input
                      type="number"
                      value={formData.max_events_per_month || ''}
                      onChange={(e) => setFormData({ ...formData, max_events_per_month: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Unlimited"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Max Team Members</label>
                    <input
                      type="number"
                      value={formData.max_team_members || ''}
                      onChange={(e) => setFormData({ ...formData, max_team_members: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Unlimited"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Max Listings</label>
                    <input
                      type="number"
                      value={formData.max_listings || ''}
                      onChange={(e) => setFormData({ ...formData, max_listings: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-gray-400 text-sm">Features</label>
                    {!showFeatureInput && (
                      <button
                        onClick={startAddingFeature}
                        className="text-electric-400 hover:text-electric-300 text-sm flex items-center space-x-1"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Feature</span>
                      </button>
                    )}
                  </div>
                  
                  {showFeatureInput && (
                    <div className="mb-4 flex items-center space-x-2">
                      <input
                        type="text"
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        placeholder="Enter feature description..."
                        className="flex-1 p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                        autoFocus
                      />
                      <button
                        onClick={addFeature}
                        disabled={!newFeature.trim()}
                        className="bg-electric-500 text-white px-3 py-2 rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowFeatureInput(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {(formData.features || []).map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2 bg-gray-700/30 p-2 rounded">
                        <span className="flex-1 text-white text-sm">{feature}</span>
                        <button
                          onClick={() => removeFeature(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-4">Permissions</label>
                  <div className="space-y-4">
                    {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                      <div key={category}>
                        <h4 className="text-white font-medium mb-2">{category}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {categoryPermissions.map((permission) => (
                            <label key={permission.id} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(formData.permissions || []).includes(permission.id)}
                                onChange={() => togglePermission(permission.id)}
                                className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                              />
                              <span className="text-gray-300 text-sm">{permission.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active || false}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                    />
                    <span className="text-gray-300">Active</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_featured || false}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                    />
                    <span className="text-gray-300">Featured</span>
                  </label>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  disabled={saveStatus === 'saving'}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePlan}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                    saveStatus === 'success'
                      ? 'bg-green-600 text-white'
                      : saveStatus === 'error'
                      ? 'bg-red-600 text-white'
                      : 'bg-electric-500 text-white hover:bg-electric-600'
                  } disabled:opacity-50`}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : saveStatus === 'success' ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Saved Successfully</span>
                    </>
                  ) : saveStatus === 'error' ? (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      <span>Error Saving</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>{editingPlan ? 'Update Plan' : 'Create Plan'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && planToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Delete Plan</h3>
                    <p className="text-gray-400">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-gray-300 mb-6">
                  Are you sure you want to delete <strong>{planToDelete.name}</strong>? 
                  This will affect all users currently subscribed to this plan.
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setPlanToDelete(null);
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeletePlan(planToDelete.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}