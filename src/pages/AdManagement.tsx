import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Play, Pause, BarChart3, DollarSign, Target, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface AdPlacement {
  id: string;
  name: string;
  description: string;
  location: string;
  dimensions: string;
  is_active: boolean;
}

interface Advertisement {
  id: string;
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'active' | 'paused' | 'expired' | 'rejected';
  priority: number;
  click_count: number;
  impression_count: number;
  budget_amount: number;
  cost_per_click: number;
  cost_per_impression: number;
  placement: AdPlacement;
}

interface AdFormData {
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  start_date: string;
  end_date: string;
  placement_id: string;
  budget_amount: number;
  cost_per_click: number;
  cost_per_impression: number;
}

export default function AdManagement() {
  const { user } = useAuth();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [placements, setPlacements] = useState<AdPlacement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [formData, setFormData] = useState<AdFormData>({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    start_date: '',
    end_date: '',
    placement_id: '',
    budget_amount: 0,
    cost_per_click: 0,
    cost_per_impression: 0
  });

  // Check if user can manage ads (retailers, manufacturers, organizations)
  if (!user || !['retailer', 'manufacturer', 'organization', 'admin'].includes(user.membershipType)) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load ad placements
      const { data: placementsData } = await supabase
        .from('ad_placements')
        .select('*')
        .eq('is_active', true)
        .order('name');

      // Load user's advertisements
      const { data: adsData } = await supabase
        .from('advertisements')
        .select(`
          *,
          placement:ad_placements(*)
        `)
        .eq('advertiser_id', user.id)
        .order('created_at', { ascending: false });

      setPlacements(placementsData || []);
      setAds(adsData || []);
    } catch (error) {
      console.error('Error loading ad data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const adData = {
        ...formData,
        advertiser_id: user.id,
        status: 'pending' // All ads start as pending approval
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

      // Reset form and reload data
      setFormData({
        title: '',
        description: '',
        image_url: '',
        link_url: '',
        start_date: '',
        end_date: '',
        placement_id: '',
        budget_amount: 0,
        cost_per_click: 0,
        cost_per_impression: 0
      });
      setShowCreateForm(false);
      setEditingAd(null);
      loadData();
      
    } catch (error) {
      console.error('Error saving advertisement:', error);
      alert('Failed to save advertisement. Please try again.');
    }
  };

  const handleEdit = (ad: Advertisement) => {
    setFormData({
      title: ad.title,
      description: ad.description,
      image_url: ad.image_url,
      link_url: ad.link_url,
      start_date: ad.start_date.slice(0, 16),
      end_date: ad.end_date.slice(0, 16),
      placement_id: ad.placement.id,
      budget_amount: ad.budget_amount,
      cost_per_click: ad.cost_per_click,
      cost_per_impression: ad.cost_per_impression
    });
    setEditingAd(ad);
    setShowCreateForm(true);
  };

  const handleDelete = async (adId: string) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) return;
    
    try {
      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', adId);
      
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting advertisement:', error);
      alert('Failed to delete advertisement. Please try again.');
    }
  };

  const toggleAdStatus = async (ad: Advertisement) => {
    const newStatus = ad.status === 'active' ? 'paused' : 'active';
    
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({ status: newStatus })
        .eq('id', ad.id);
      
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error updating ad status:', error);
      alert('Failed to update advertisement status. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      case 'approved': return 'text-blue-400 bg-blue-400/10';
      case 'paused': return 'text-gray-400 bg-gray-400/10';
      case 'expired': return 'text-red-400 bg-red-400/10';
      case 'rejected': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const calculateROI = (ad: Advertisement) => {
    const totalSpent = (ad.click_count * ad.cost_per_click) + (ad.impression_count * ad.cost_per_impression);
    if (totalSpent === 0) return 0;
    return ((ad.budget_amount - totalSpent) / totalSpent * 100);
  };

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
            <p className="text-gray-400">Create and manage your advertising campaigns</p>
          </div>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create Ad</span>
          </button>
        </div>

        {/* Stats Overview */}
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
                <p className="text-2xl font-bold text-white">
                  {ads.filter(ad => ad.status === 'active').length}
                </p>
              </div>
              <Play className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Clicks</p>
                <p className="text-2xl font-bold text-white">
                  {ads.reduce((sum, ad) => sum + ad.click_count, 0)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Budget</p>
                <p className="text-2xl font-bold text-white">
                  ${ads.reduce((sum, ad) => sum + ad.budget_amount, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">
              {editingAd ? 'Edit Advertisement' : 'Create New Advertisement'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Ad Title *</label>
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
                  <label className="block text-gray-400 text-sm mb-2">Placement *</label>
                  <select
                    required
                    value={formData.placement_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, placement_id: e.target.value }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  >
                    <option value="">Select ad placement</option>
                    {placements.map(placement => (
                      <option key={placement.id} value={placement.id}>
                        {placement.name} ({placement.dimensions})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Describe your advertisement"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Image URL *</label>
                  <input
                    type="url"
                    required
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="https://example.com/ad-image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Link URL *</label>
                  <input
                    type="url"
                    required
                    value={formData.link_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="https://your-website.com"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Start Date *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">End Date *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Total Budget ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.budget_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Cost Per Click ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_per_click}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost_per_click: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Cost Per Impression ($)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={formData.cost_per_impression}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost_per_impression: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="0.000"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  type="submit"
                  className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors"
                >
                  {editingAd ? 'Update Advertisement' : 'Create Advertisement'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingAd(null);
                    setFormData({
                      title: '',
                      description: '',
                      image_url: '',
                      link_url: '',
                      start_date: '',
                      end_date: '',
                      placement_id: '',
                      budget_amount: 0,
                      cost_per_click: 0,
                      cost_per_impression: 0
                    });
                  }}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Advertisements List */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Your Advertisements</h2>
          
          {ads.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">No advertisements yet</p>
              <p className="text-gray-500">Create your first ad to start promoting your business</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ads.map((ad) => (
                <div key={ad.id} className="bg-gray-700/30 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-white font-medium">{ad.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ad.status)}`}>
                          {ad.status.charAt(0).toUpperCase() + ad.status.slice(1)}
                        </span>
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-3">{ad.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Placement</p>
                          <p className="text-white">{ad.placement.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Clicks</p>
                          <p className="text-white">{ad.click_count}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Impressions</p>
                          <p className="text-white">{ad.impression_count}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Budget</p>
                          <p className="text-white">${ad.budget_amount.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                        <span>Start: {new Date(ad.start_date).toLocaleDateString()}</span>
                        <span>End: {new Date(ad.end_date).toLocaleDateString()}</span>
                        <span>ROI: {calculateROI(ad).toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {ad.status === 'approved' && (
                        <button
                          onClick={() => toggleAdStatus(ad)}
                          className={`p-2 rounded-lg transition-colors ${
                            ad.status === 'active' 
                              ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          }`}
                          title={ad.status === 'active' ? 'Pause Ad' : 'Activate Ad'}
                        >
                          {ad.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleEdit(ad)}
                        className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                        title="Edit Ad"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(ad.id)}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                        title="Delete Ad"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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