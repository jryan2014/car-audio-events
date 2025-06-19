import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Target, DollarSign, Calendar, MapPin, Tag, BarChart3, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Advertisement {
  id: string;
  title: string;
  description: string;
  image_url: string;
  click_url: string;
  advertiser_name: string;
  advertiser_email: string;
  placement_type: 'header' | 'sidebar' | 'event_page' | 'mobile_banner' | 'footer';
  size: 'small' | 'medium' | 'large' | 'banner' | 'square';
  target_pages: string[];
  target_keywords: string[];
  target_categories: string[];
  budget: number;
  cost_per_click: number;
  cost_per_impression: number;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected';
  clicks: number;
  impressions: number;
  spent: number;
  created_at: string;
  updated_at: string;
}

interface AdFormData {
  title: string;
  description: string;
  image_url: string;
  click_url: string;
  advertiser_name: string;
  advertiser_email: string;
  placement_type: 'header' | 'sidebar' | 'event_page' | 'mobile_banner' | 'footer';
  size: 'small' | 'medium' | 'large' | 'banner' | 'square';
  target_pages: string[];
  target_keywords: string[];
  target_categories: string[];
  budget: number;
  cost_per_click: number;
  cost_per_impression: number;
  start_date: string;
  end_date: string;
  pricing_model: 'cpc' | 'cpm' | 'fixed';
}

export default function AdManagement() {
  const { user } = useAuth();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState<AdFormData>({
    title: '',
    description: '',
    image_url: '',
    click_url: '',
    advertiser_name: '',
    advertiser_email: '',
    placement_type: 'sidebar',
    size: 'medium',
    target_pages: [],
    target_keywords: [],
    target_categories: [],
    budget: 100,
    cost_per_click: 0.50,
    cost_per_impression: 0.01,
    start_date: '',
    end_date: '',
    pricing_model: 'cpc'
  });

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error loading ads:', error);
      // Set empty array instead of mock data
      setAds([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const adData = {
        ...formData,
        status: 'pending' as const,
        clicks: 0,
        impressions: 0,
        spent: 0
      };

      if (editingAd) {
        const { error } = await supabase
          .from('advertisements')
          .update(adData)
          .eq('id', editingAd.id);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('advertisements')
          .insert([adData]);
          
        if (error) throw error;
      }

      setShowCreateForm(false);
      setEditingAd(null);
      resetForm();
      loadAds();
    } catch (error) {
      console.error('Error saving ad:', error);
      alert('Failed to save advertisement. Please try again.');
    }
  };

  const handleEdit = (ad: Advertisement) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      description: ad.description,
      image_url: ad.image_url,
      click_url: ad.click_url,
      advertiser_name: ad.advertiser_name,
      advertiser_email: ad.advertiser_email,
      placement_type: ad.placement_type,
      size: ad.size,
      target_pages: ad.target_pages,
      target_keywords: ad.target_keywords,
      target_categories: ad.target_categories,
      budget: ad.budget,
      cost_per_click: ad.cost_per_click,
      cost_per_impression: ad.cost_per_impression,
      start_date: ad.start_date,
      end_date: ad.end_date,
      pricing_model: ad.cost_per_click > 0 ? 'cpc' : 'cpm'
    });
    setShowCreateForm(true);
  };

  const handleStatusChange = async (adId: string, newStatus: Advertisement['status']) => {
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({ status: newStatus })
        .eq('id', adId);
        
      if (error) throw error;
      loadAds();
    } catch (error) {
      console.error('Error updating ad status:', error);
      alert('Failed to update advertisement status.');
    }
  };

  const handleDelete = async (adId: string) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) return;
    
    try {
      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', adId);
        
      if (error) throw error;
      loadAds();
    } catch (error) {
      console.error('Error deleting ad:', error);
      alert('Failed to delete advertisement.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      click_url: '',
      advertiser_name: '',
      advertiser_email: '',
      placement_type: 'sidebar',
      size: 'medium',
      target_pages: [],
      target_keywords: [],
      target_categories: [],
      budget: 100,
      cost_per_click: 0.50,
      cost_per_impression: 0.01,
      start_date: '',
      end_date: '',
      pricing_model: 'cpc'
    });
  };

  const addTargetItem = (type: 'pages' | 'keywords' | 'categories', value: string) => {
    if (!value.trim()) return;
    
    const field = `target_${type}` as keyof AdFormData;
    const currentArray = formData[field] as string[];
    
    if (!currentArray.includes(value)) {
      setFormData(prev => ({
        ...prev,
        [field]: [...currentArray, value]
      }));
    }
  };

  const removeTargetItem = (type: 'pages' | 'keywords' | 'categories', index: number) => {
    const field = `target_${type}` as keyof AdFormData;
    const currentArray = formData[field] as string[];
    
    setFormData(prev => ({
      ...prev,
      [field]: currentArray.filter((_, i) => i !== index)
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      case 'approved': return 'text-blue-400 bg-blue-400/10';
      case 'paused': return 'text-orange-400 bg-orange-400/10';
      case 'completed': return 'text-gray-400 bg-gray-400/10';
      case 'rejected': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getPlacementInfo = (placement: string, size: string) => {
    const placements = {
      header: { name: 'Header Banner', icon: '🔝' },
      sidebar: { name: 'Sidebar', icon: '📱' },
      event_page: { name: 'Event Pages', icon: '📅' },
      mobile_banner: { name: 'Mobile Banner', icon: '📱' },
      footer: { name: 'Footer', icon: '🔻' }
    };
    
    const sizes = {
      small: '300x150',
      medium: '300x250',
      large: '728x90',
      banner: '970x250',
      square: '250x250'
    };
    
    return {
      ...placements[placement as keyof typeof placements],
      dimensions: sizes[size as keyof typeof sizes]
    };
  };

  const calculateROI = (ad: Advertisement) => {
    if (ad.spent === 0) return 0;
    const estimatedRevenue = ad.clicks * 2.5; // Assume $2.50 average value per click
    return ((estimatedRevenue - ad.spent) / ad.spent * 100);
  };

  const filteredAds = ads.filter(ad => {
    const matchesSearch = ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ad.advertiser_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ad.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading advertisements...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Advertisement Management</h1>
            <p className="text-gray-400">Create and manage advertising campaigns</p>
          </div>
          
          <button
            onClick={() => {
              setShowCreateForm(true);
              setEditingAd(null);
              resetForm();
            }}
            className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create Advertisement</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Ads</p>
                <p className="text-2xl font-bold text-white">{ads.length}</p>
              </div>
              <Target className="h-8 w-8 text-electric-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Campaigns</p>
                <p className="text-2xl font-bold text-white">{ads.filter(ad => ad.status === 'active').length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-white">
                  ${ads.reduce((sum, ad) => sum + ad.spent, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-electric-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Approval</p>
                <p className="text-2xl font-bold text-white">{ads.filter(ad => ad.status === 'pending').length}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search advertisements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">
              {editingAd ? 'Edit Advertisement' : 'Create New Advertisement'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Advertisement Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Enter ad title"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Advertiser Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.advertiser_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, advertiser_name: e.target.value }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Company or person name"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Advertiser Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.advertiser_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, advertiser_email: e.target.value }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="contact@company.com"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Click URL *</label>
                  <input
                    type="url"
                    required
                    value={formData.click_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, click_url: e.target.value }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Brief description of the advertisement"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="https://example.com/ad-image.jpg"
                />
              </div>

              {/* Placement & Targeting */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">Placement & Targeting</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Placement Type *</label>
                    <select
                      value={formData.placement_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, placement_type: e.target.value as any }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="header">Header Banner</option>
                      <option value="sidebar">Sidebar</option>
                      <option value="event_page">Event Pages</option>
                      <option value="mobile_banner">Mobile Banner</option>
                      <option value="footer">Footer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Ad Size *</label>
                    <select
                      value={formData.size}
                      onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value as any }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="small">Small (300x150)</option>
                      <option value="medium">Medium (300x250)</option>
                      <option value="large">Large (728x90)</option>
                      <option value="banner">Banner (970x250)</option>
                      <option value="square">Square (250x250)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Pricing Model *</label>
                    <select
                      value={formData.pricing_model}
                      onChange={(e) => setFormData(prev => ({ ...prev, pricing_model: e.target.value as any }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="cpc">Cost Per Click (CPC)</option>
                      <option value="cpm">Cost Per 1000 Impressions (CPM)</option>
                      <option value="fixed">Fixed Rate</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Budget & Pricing */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">Budget & Pricing</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Total Budget ($) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={formData.budget}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    />
                  </div>

                  {formData.pricing_model === 'cpc' && (
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Cost Per Click ($)</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formData.cost_per_click}
                        onChange={(e) => setFormData(prev => ({ ...prev, cost_per_click: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      />
                    </div>
                  )}

                  {formData.pricing_model === 'cpm' && (
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Cost Per 1000 Impressions ($)</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formData.cost_per_impression}
                        onChange={(e) => setFormData(prev => ({ ...prev, cost_per_impression: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">End Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingAd(null);
                    resetForm();
                  }}
                  className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                >
                  {editingAd ? 'Update Advertisement' : 'Create Advertisement'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Advertisements List */}
        <div className="space-y-6">
          {filteredAds.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">No advertisements found</h3>
              <p className="text-gray-500">Create your first advertisement to get started.</p>
            </div>
          ) : (
            filteredAds.map((ad) => {
              const placementInfo = getPlacementInfo(ad.placement_type, ad.size);
              const roi = calculateROI(ad);
              
              return (
                <div key={ad.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">{ad.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ad.status)}`}>
                          {ad.status.charAt(0).toUpperCase() + ad.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                        <span className="flex items-center space-x-1">
                          <span>{placementInfo.icon}</span>
                          <span>{placementInfo.name}</span>
                        </span>
                        <span>{placementInfo.dimensions}</span>
                        <span>{ad.advertiser_name}</span>
                      </div>
                      
                      {ad.description && (
                        <p className="text-gray-300 mb-3">{ad.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">Budget</p>
                          <p className="text-white font-medium">${ad.budget.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Spent</p>
                          <p className="text-white font-medium">${ad.spent.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Clicks</p>
                          <p className="text-white font-medium">{ad.clicks.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Impressions</p>
                          <p className="text-white font-medium">{ad.impressions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">ROI</p>
                          <p className={`font-medium ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {roi.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(ad)}
                        className="p-2 text-gray-400 hover:text-electric-400 transition-colors"
                        title="Edit advertisement"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      {ad.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(ad.id, 'approved')}
                            className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusChange(ad.id, 'rejected')}
                            className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      
                      {ad.status === 'active' && (
                        <button
                          onClick={() => handleStatusChange(ad.id, 'paused')}
                          className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded text-sm hover:bg-orange-500/30 transition-colors"
                        >
                          Pause
                        </button>
                      )}
                      
                      {ad.status === 'paused' && (
                        <button
                          onClick={() => handleStatusChange(ad.id, 'active')}
                          className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30 transition-colors"
                        >
                          Resume
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(ad.id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete advertisement"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-700">
                    <span>Campaign: {ad.start_date} to {ad.end_date}</span>
                    <span>Created: {new Date(ad.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
} 