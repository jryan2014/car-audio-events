import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, MapPin, Building, Package, 
  Eye, Edit, Trash2, Check, X, Star, AlertCircle,
  User, Phone, Globe, Mail, Calendar, TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ActivityLogger, logActivity } from '../utils/activityLogger';

interface DirectoryListing {
  id: string;
  user_id: string;
  business_name: string;
  listing_type: 'retailer' | 'manufacturer' | 'used_equipment';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  state: string;
  country: string;
  description: string;
  rating: number;
  review_count: number;
  views_count: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    email: string;
    membership_type: string;
  };
  reviewer?: {
    name: string;
    email: string;
    membership_type: string;
  };
}

interface DirectoryStats {
  total_listings: number;
  pending_listings: number;
  approved_listings: number;
  retailer_listings: number;
  manufacturer_listings: number;
  used_equipment_listings: number;
  total_reviews: number;
  average_rating: number;
}

export default function DirectoryManager() {
  const { user } = useAuth();
  const [listings, setListings] = useState<DirectoryListing[]>([]);
  const [stats, setStats] = useState<DirectoryStats>({
    total_listings: 0,
    pending_listings: 0,
    approved_listings: 0,
    retailer_listings: 0,
    manufacturer_listings: 0,
    used_equipment_listings: 0,
    total_reviews: 0,
    average_rating: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedListing, setSelectedListing] = useState<DirectoryListing | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');

  useEffect(() => {
    loadDirectoryData();
    ActivityLogger.directoryManagementAccess();
  }, []);

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const loadDirectoryData = async () => {
    try {
      setIsLoading(true);
      
      // Load directory statistics
      const { data: statsData } = await supabase.rpc('get_directory_stats');
      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // Load directory listings with user information
      const { data: listingsData, error: listingsError } = await supabase
        .from('directory_listings')
        .select(`
          *,
          user:users!user_id(name, email, membership_type),
          reviewer:users!reviewed_by(name, email, membership_type)
        `)
        .order('created_at', { ascending: false });

      if (listingsError) {
        console.error('Error loading listings:', listingsError);
      } else {
        setListings(listingsData || []);
      }

    } catch (error) {
      console.error('Error loading directory data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = 
      listing.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.state.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || listing.status === statusFilter;
    const matchesType = typeFilter === 'all' || listing.listing_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleApprovalAction = async (listing: DirectoryListing, action: 'approve' | 'reject') => {
    setSelectedListing(listing);
    setApprovalAction(action);
    setShowApprovalModal(true);
  };

  const submitApproval = async () => {
    if (!selectedListing) return;

    try {
      const newStatus = approvalAction === 'approve' ? 'approved' : 'rejected';
      
      const { error } = await supabase
        .from('directory_listings')
        .update({
          status: newStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: approvalNotes || null,
          rejection_reason: approvalAction === 'reject' ? approvalNotes : null
        })
        .eq('id', selectedListing.id);

      if (error) {
        console.error('Error updating listing:', error);
        alert('Failed to update listing status');
        return;
      }

      // Log the activity
      logActivity({
        activityType: 'admin_action',
        description: `Directory listing ${approvalAction}d: ${selectedListing.business_name}`,
        metadata: {
          listing_id: selectedListing.id,
          listing_name: selectedListing.business_name,
          action: approvalAction,
          notes: approvalNotes
        }
      });

      // Refresh data
      await loadDirectoryData();
      
      // Close modal
      setShowApprovalModal(false);
      setSelectedListing(null);
      setApprovalNotes('');

      alert(`Listing ${approvalAction}d successfully!`);

    } catch (error) {
      console.error('Error submitting approval:', error);
      alert('Failed to update listing status');
    }
  };

  const toggleFeatured = async (listing: DirectoryListing) => {
    try {
      const { error } = await supabase
        .from('directory_listings')
        .update({
          featured: !listing.featured,
          featured_until: !listing.featured ? 
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : // 30 days from now
            null
        })
        .eq('id', listing.id);

      if (error) {
        console.error('Error toggling featured status:', error);
        return;
      }

      logActivity({
        activityType: 'admin_action',
        description: `Directory listing ${!listing.featured ? 'featured' : 'unfeatured'}: ${listing.business_name}`,
        metadata: {
          listing_id: listing.id,
          listing_name: listing.business_name,
          featured: !listing.featured
        }
      });

      await loadDirectoryData();
    } catch (error) {
      console.error('Error toggling featured status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
      suspended: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getTypeBadge = (type: string) => {
    const badges = {
      retailer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      manufacturer: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      used_equipment: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    };
    return badges[type as keyof typeof badges] || badges.retailer;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
              <Building className="h-8 w-8 text-electric-500" />
              <span>Directory Manager</span>
            </h1>
            <p className="text-gray-400 mt-2">Manage business listings and directory content</p>
          </div>
          
          <Link
            to="/directory/create"
            className="bg-electric-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Listing</span>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Listings</p>
                <p className="text-2xl font-bold text-white">{stats.total_listings}</p>
              </div>
              <Building className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Approval</p>
                <p className="text-2xl font-bold text-white">{stats.pending_listings}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Average Rating</p>
                <p className="text-2xl font-bold text-white">{stats.average_rating.toFixed(1)}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Reviews</p>
                <p className="text-2xl font-bold text-white">{stats.total_reviews}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search listings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 transition-colors"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                <option value="all">All Types</option>
                <option value="retailer">Retailers</option>
                <option value="manufacturer">Manufacturers</option>
                <option value="used_equipment">Used Equipment</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Business</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Location</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Rating</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Created</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500 mx-auto mb-4"></div>
                      <p className="text-gray-400">Loading listings...</p>
                    </td>
                  </tr>
                ) : filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Building className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg mb-2">No listings found</p>
                      <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-white font-medium">{listing.business_name}</h3>
                              {listing.featured && (
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              )}
                            </div>
                            <div className="text-sm text-gray-400 flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{listing.contact_name}</span>
                            </div>
                            <div className="text-sm text-gray-400 flex items-center space-x-1">
                              <span>by {listing.user?.name}</span>
                              <span className="text-gray-600">({listing.user?.membership_type})</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeBadge(listing.listing_type)}`}>
                          {listing.listing_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(listing.status)}`}>
                          {listing.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1 text-gray-400">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">{listing.city}, {listing.state}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-white">{listing.rating.toFixed(1)}</span>
                          <span className="text-gray-400 text-sm">({listing.review_count})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {formatDate(listing.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/directory/${listing.id}`}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          
                          <button
                            onClick={() => toggleFeatured(listing)}
                            className={`transition-colors ${listing.featured ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-400'}`}
                            title={listing.featured ? 'Remove Featured' : 'Make Featured'}
                          >
                            <Star className={`h-4 w-4 ${listing.featured ? 'fill-current' : ''}`} />
                          </button>

                          {listing.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprovalAction(listing, 'approve')}
                                className="text-green-400 hover:text-green-300 transition-colors"
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleApprovalAction(listing, 'reject')}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title="Reject"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approval Modal */}
        {showApprovalModal && selectedListing && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">
                {approvalAction === 'approve' ? 'Approve' : 'Reject'} Listing
              </h3>
              
              <p className="text-gray-400 mb-4">
                {approvalAction === 'approve' 
                  ? 'Are you sure you want to approve this listing?'
                  : 'Please provide a reason for rejecting this listing:'
                }
              </p>
              
              <div className="bg-gray-700/50 p-4 rounded-lg mb-4">
                <h4 className="text-white font-medium">{selectedListing.business_name}</h4>
                <p className="text-gray-400 text-sm">{selectedListing.listing_type.replace('_', ' ')}</p>
                <p className="text-gray-400 text-sm">{selectedListing.city}, {selectedListing.state}</p>
              </div>

              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-2">
                  {approvalAction === 'approve' ? 'Admin Notes (Optional)' : 'Rejection Reason (Required)'}
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder={approvalAction === 'approve' 
                    ? 'Add any notes about this approval...'
                    : 'Please explain why this listing is being rejected...'
                  }
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="flex-1 py-2 px-4 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitApproval}
                  disabled={approvalAction === 'reject' && !approvalNotes.trim()}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    approvalAction === 'approve'
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {approvalAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 