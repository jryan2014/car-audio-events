import React, { useState, useEffect } from 'react';
import { Plus, BarChart3, DollarSign, Eye, Target, TrendingUp, Calendar, Settings, HelpCircle, Sparkles, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdDisplay from '../components/AdDisplay';
import { ActivityLogger } from '../utils/activityLogger';

interface Advertisement {
  id: string;
  title: string;
  description: string;
  placement_type: string;
  size: string;
  budget: number;
  spent: number;
  clicks: number;
  impressions: number;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
  advertiser_name: string;
  image_url: string;
  click_url: string;
}

interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  total_spent: number;
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_cpc: number;
}

export default function MemberAdDashboard() {
  const { user } = useAuth();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [stats, setStats] = useState<CampaignStats>({
    total_campaigns: 0,
    active_campaigns: 0,
    total_spent: 0,
    total_clicks: 0,
    total_impressions: 0,
    avg_ctr: 0,
    avg_cpc: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  // Check if user has advertiser permissions
  if (!user || !['retailer', 'manufacturer', 'organization', 'admin'].includes(user.membershipType || '')) {
    return <Navigate to="/pricing" replace />;
  }

  useEffect(() => {
    loadAdvertisements();
    // Log advertising dashboard access
    if (user) {
      ActivityLogger.advertisingDashboardAccess(user.membershipType || 'unknown');
    }
  }, [user, timeRange]);

  const loadAdvertisements = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Load user's advertisements
      const { data: adsData, error: adsError } = await supabase
        .from('advertisements')
        .select('*')
        .eq('advertiser_email', user.email)
        .order('created_at', { ascending: false });

      if (adsError) throw adsError;

      setAds(adsData || []);

      // Calculate stats
      const totalCampaigns = adsData?.length || 0;
      const activeCampaigns = adsData?.filter(ad => ad.status === 'active').length || 0;
      const totalSpent = adsData?.reduce((sum, ad) => sum + (ad.spent || 0), 0) || 0;
      const totalClicks = adsData?.reduce((sum, ad) => sum + (ad.clicks || 0), 0) || 0;
      const totalImpressions = adsData?.reduce((sum, ad) => sum + (ad.impressions || 0), 0) || 0;
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgCpc = totalClicks > 0 ? totalSpent / totalClicks : 0;

      setStats({
        total_campaigns: totalCampaigns,
        active_campaigns: activeCampaigns,
        total_spent: totalSpent,
        total_clicks: totalClicks,
        total_impressions: totalImpressions,
        avg_ctr: avgCtr,
        avg_cpc: avgCpc
      });

    } catch (error) {
      console.error('Error loading advertisements:', error);
    } finally {
      setIsLoading(false);
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your advertising dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Advertisements</h1>
            <p className="text-gray-400">Manage your advertising campaigns and track performance</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              to="/advertise"
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
            >
              <HelpCircle className="h-5 w-5" />
              <span>Advertising Info</span>
            </Link>
            
            <Link
              to="/admin/ads"
              className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create New Ad</span>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Campaigns</p>
                <p className="text-2xl font-bold text-white">{stats.total_campaigns}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.active_campaigns} active</p>
              </div>
              <Target className="h-8 w-8 text-electric-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Spent</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.total_spent)}</p>
                <p className="text-xs text-gray-500 mt-1">Avg CPC: {formatCurrency(stats.avg_cpc)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Clicks</p>
                <p className="text-2xl font-bold text-white">{formatNumber(stats.total_clicks)}</p>
                <p className="text-xs text-gray-500 mt-1">CTR: {stats.avg_ctr.toFixed(2)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Impressions</p>
                <p className="text-2xl font-bold text-white">{formatNumber(stats.total_impressions)}</p>
                <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
              </div>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/ad-management"
              className="bg-electric-500/10 border border-electric-500/20 rounded-lg p-4 hover:bg-electric-500/20 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Plus className="h-6 w-6 text-electric-400 group-hover:text-electric-300" />
                <div>
                  <h3 className="font-medium text-white">Create New Campaign</h3>
                  <p className="text-sm text-gray-400">Start advertising your products</p>
                </div>
              </div>
            </Link>

            <button className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 hover:bg-purple-500/20 transition-colors group">
              <div className="flex items-center space-x-3">
                <Sparkles className="h-6 w-6 text-purple-400 group-hover:text-purple-300" />
                <div>
                  <h3 className="font-medium text-white">AI Design Assistant</h3>
                  <p className="text-sm text-gray-400">Get help with banner design</p>
                </div>
              </div>
            </button>

            <Link
              to="/advertise"
              className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 hover:bg-blue-500/20 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-6 w-6 text-blue-400 group-hover:text-blue-300" />
                <div>
                  <h3 className="font-medium text-white">View Pricing</h3>
                  <p className="text-sm text-gray-400">Explore placement options</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Campaigns */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Your Campaigns</h2>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
              
              <Link
                to="/admin/ad-management"
                className="text-electric-400 hover:text-electric-300 text-sm font-medium"
              >
                View All →
              </Link>
            </div>
          </div>

          {ads.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">No campaigns yet</h3>
              <p className="text-gray-500 mb-6">Create your first advertising campaign to start reaching customers</p>
              <Link
                to="/admin/ad-management"
                className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors inline-flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Create Your First Campaign</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {ads.slice(0, 5).map((ad) => {
                const roi = ad.spent > 0 ? ((ad.clicks * 2.5 - ad.spent) / ad.spent * 100) : 0;
                const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions * 100) : 0;
                
                return (
                  <div key={ad.id} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-white">{ad.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ad.status)}`}>
                            {ad.status.charAt(0).toUpperCase() + ad.status.slice(1)}
                          </span>
                        </div>
                        
                        {/* Ad ID and Placement Info */}
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-2">
                          <span className="font-mono text-xs bg-gray-700/50 px-2 py-1 rounded">
                            ID: {ad.id.slice(0, 8)}
                          </span>
                          <span className="capitalize">{ad.placement_type.replace('_', ' ')}</span>
                          <span>•</span>
                          <span className="capitalize">{ad.size}</span>
                          <span>•</span>
                          <span>{ad.start_date} to {ad.end_date}</span>
                        </div>
                        
                        {ad.description && (
                          <p className="text-gray-300 text-sm mb-2">{ad.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/admin/ads?edit=${ad.id}`}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                          title="Edit Ad"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Budget</p>
                        <p className="text-white font-medium">{formatCurrency(ad.budget)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Spent</p>
                        <p className="text-white font-medium">{formatCurrency(ad.spent)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Clicks</p>
                        <p className="text-white font-medium">{formatNumber(ad.clicks)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Impressions</p>
                        <p className="text-white font-medium">{formatNumber(ad.impressions)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">CTR</p>
                        <p className="text-white font-medium">{ctr.toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500">ROI</p>
                        <p className={`font-medium ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {roi.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {ads.length > 5 && (
                <div className="text-center pt-4">
                  <Link
                    to="/admin/ad-management"
                    className="text-electric-400 hover:text-electric-300 font-medium"
                  >
                    View all {ads.length} campaigns →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upgrade Prompt for Non-Premium Users */}
        {user.membershipType !== 'admin' && (
          <div className="mt-8 bg-gradient-to-r from-electric-500/10 to-purple-500/10 border border-electric-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Unlock Advanced Advertising Features</h3>
                <p className="text-gray-400">Get access to premium placements, advanced targeting, and priority support</p>
              </div>
              <Link
                to="/pricing"
                className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
              >
                <TrendingUp className="h-5 w-5" />
                <span>Upgrade Now</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 