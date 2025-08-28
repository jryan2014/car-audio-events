import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, MapPin, Building, Package, 
  Eye, Edit, Trash2, Check, X, Star, AlertCircle,
  User, Phone, Globe, Mail, Calendar, TrendingUp,
  ChevronDown, ChevronUp, Image, Clock, Shield,
  CheckCircle, XCircle, MessageSquare, UserCheck
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
  address?: string;
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
  is_active: boolean;
  listing_images?: string[];
  product_categories?: string[];
  rejection_reason?: string;
  rejected_at?: string;
  rejected_by?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    membership_type: string;
    auto_approve_directory?: boolean;
    auto_approve_used_equipment?: boolean;
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
  const [autoApproveFilter, setAutoApproveFilter] = useState('all');
  const [expandedListings, setExpandedListings] = useState<Set<string>>(new Set());
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<DirectoryListing | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          user:users!user_id(
            id,
            name, 
            email, 
            membership_type,
            auto_approve_directory,
            auto_approve_used_equipment
          ),
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
    
    let matchesAutoApprove = true;
    if (autoApproveFilter === 'auto') {
      matchesAutoApprove = listing.listing_type === 'used_equipment' 
        ? listing.user?.auto_approve_used_equipment === true
        : listing.user?.auto_approve_directory === true;
    } else if (autoApproveFilter === 'manual') {
      matchesAutoApprove = listing.listing_type === 'used_equipment' 
        ? listing.user?.auto_approve_used_equipment !== true
        : listing.user?.auto_approve_directory !== true;
    }
    
    return matchesSearch && matchesStatus && matchesType && matchesAutoApprove;
  });

  const toggleExpanded = (listingId: string) => {
    setExpandedListings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        newSet.delete(listingId);
      } else {
        newSet.add(listingId);
      }
      return newSet;
    });
  };

  const handleApprove = async (listing: DirectoryListing) => {
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('directory_listings')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null
        })
        .eq('id', listing.id);

      if (error) throw error;

      // Create notification for user
      await supabase
        .from('notifications')
        .insert({
          user_id: listing.user_id,
          title: 'Directory Listing Approved',
          message: `Your ${listing.listing_type} listing "${listing.business_name}" has been approved and is now live.`,
          type: 'success',
          link: `/directory/${listing.id}`
        });

      // Log the activity
      logActivity({
        activityType: 'admin_action',
        description: `Directory listing approved: ${listing.business_name}`,
        metadata: {
          listing_id: listing.id,
          listing_name: listing.business_name,
          action: 'approve'
        }
      });

      await loadDirectoryData();
      alert('Listing approved successfully!');

    } catch (error) {
      console.error('Error approving listing:', error);
      alert('Failed to approve listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = (listing: DirectoryListing) => {
    setSelectedListing(listing);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const submitRejection = async () => {
    if (!selectedListing || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('directory_listings')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          rejected_at: new Date().toISOString(),
          rejected_by: user.id
        })
        .eq('id', selectedListing.id);

      if (error) throw error;

      // Create notification for user
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedListing.user_id,
          title: 'Directory Listing Rejected',
          message: `Your ${selectedListing.listing_type} listing "${selectedListing.business_name}" has been rejected. Reason: ${rejectionReason}`,
          type: 'warning',
          link: `/directory/edit/${selectedListing.id}`
        });

      // Log the activity
      logActivity({
        activityType: 'admin_action',
        description: `Directory listing rejected: ${selectedListing.business_name}`,
        metadata: {
          listing_id: selectedListing.id,
          listing_name: selectedListing.business_name,
          action: 'reject',
          reason: rejectionReason
        }
      });

      await loadDirectoryData();
      setShowRejectionModal(false);
      setSelectedListing(null);
      setRejectionReason('');
      alert('Listing rejected successfully!');

    } catch (error) {
      console.error('Error rejecting listing:', error);
      alert('Failed to reject listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAutoApprove = async (listing: DirectoryListing) => {
    if (!listing.user) return;

    const fieldName = listing.listing_type === 'used_equipment' 
      ? 'auto_approve_used_equipment' 
      : 'auto_approve_directory';
    
    const currentValue = listing.listing_type === 'used_equipment' 
      ? listing.user.auto_approve_used_equipment 
      : listing.user.auto_approve_directory;

    try {
      const { error } = await supabase
        .from('users')
        .update({ [fieldName]: !currentValue })
        .eq('id', listing.user.id);

      if (error) throw error;

      logActivity({
        activityType: 'admin_action',
        description: `Auto-approve ${!currentValue ? 'enabled' : 'disabled'} for ${listing.user.name}`,
        metadata: {
          user_id: listing.user.id,
          user_name: listing.user.name,
          field: fieldName,
          value: !currentValue
        }
      });

      await loadDirectoryData();
      alert(`Auto-approve ${!currentValue ? 'enabled' : 'disabled'} for ${listing.user.name}`);

    } catch (error) {
      console.error('Error toggling auto-approve:', error);
      alert('Failed to update auto-approve setting');
    }
  };

  const deleteListing = async (listing: DirectoryListing) => {
    if (!confirm(`Are you sure you want to delete the listing for "${listing.business_name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('directory_listings')
        .delete()
        .eq('id', listing.id);

      if (error) throw error;

      logActivity({
        activityType: 'admin_action',
        description: `Directory listing deleted: ${listing.business_name}`,
        metadata: {
          listing_id: listing.id,
          listing_name: listing.business_name,
          action: 'delete'
        }
      });

      await loadDirectoryData();
      alert('Listing deleted successfully!');

    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing');
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
      day: 'numeric'
    });
  };

  const getDaysSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
                <p className="text-2xl font-bold text-white">
                  {stats.average_rating ? stats.average_rating.toFixed(1) : '0.0'}
                </p>
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
              <MessageSquare className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search listings..."
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-electric-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-electric-500"
              >
                <option value="all">All Types</option>
                <option value="retailer">Retailer</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="used_equipment">Used Equipment</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Approval Mode</label>
              <select
                value={autoApproveFilter}
                onChange={(e) => setAutoApproveFilter(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-electric-500"
              >
                <option value="all">All Users</option>
                <option value="auto">Auto-Approved Users</option>
                <option value="manual">Manual Approval Users</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading listings...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-12 text-center">
              <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No listings found matching your criteria</p>
            </div>
          ) : (
            filteredListings.map((listing) => (
              <div key={listing.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">{listing.business_name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs border ${getStatusBadge(listing.status)}`}>
                          {listing.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs border ${getTypeBadge(listing.listing_type)}`}>
                          {listing.listing_type.replace('_', ' ')}
                        </span>
                        {listing.featured && (
                          <Star className="h-5 w-5 text-yellow-500" />
                        )}
                        {(listing.listing_type === 'used_equipment' ? 
                          listing.user?.auto_approve_used_equipment : 
                          listing.user?.auto_approve_directory) && (
                          <Shield className="h-5 w-5 text-green-500" />
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2 text-gray-400">
                          <User className="h-4 w-4" />
                          <span>{listing.contact_name || listing.user?.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-400">
                          <Mail className="h-4 w-4" />
                          <span>{listing.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-400">
                          <MapPin className="h-4 w-4" />
                          <span>{listing.city}, {listing.state}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-400">
                          <Phone className="h-4 w-4" />
                          <span>{listing.phone || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mt-3">
                        <div className="flex items-center space-x-2 text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span>Listed: {formatDate(listing.created_at)}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>{getDaysSince(listing.created_at)} days ago</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-400">
                          <Image className="h-4 w-4" />
                          <span>{listing.listing_images?.length || 0} images</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-400">
                          <Package className="h-4 w-4" />
                          <span>{listing.product_categories?.length || 0} categories</span>
                        </div>
                      </div>

                      {listing.status === 'rejected' && listing.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-red-400 text-sm">
                            <strong>Rejection Reason:</strong> {listing.rejection_reason}
                          </p>
                          {listing.rejected_at && (
                            <p className="text-red-400 text-xs mt-1">
                              Rejected on {formatDate(listing.rejected_at)}
                            </p>
                          )}
                        </div>
                      )}

                      {expandedListings.has(listing.id) && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <h4 className="text-gray-400 text-sm mb-2">Description</h4>
                            <p className="text-white text-sm">{listing.description || 'No description provided'}</p>
                          </div>

                          {listing.website && (
                            <div>
                              <h4 className="text-gray-400 text-sm mb-2">Website</h4>
                              <a href={listing.website} target="_blank" rel="noopener noreferrer" 
                                 className="text-electric-400 hover:text-electric-300 text-sm flex items-center space-x-1">
                                <Globe className="h-4 w-4" />
                                <span>{listing.website}</span>
                              </a>
                            </div>
                          )}

                          {listing.address && (
                            <div>
                              <h4 className="text-gray-400 text-sm mb-2">Full Address</h4>
                              <p className="text-white text-sm">{listing.address}, {listing.city}, {listing.state} {listing.country}</p>
                            </div>
                          )}

                          {listing.product_categories && listing.product_categories.length > 0 && (
                            <div>
                              <h4 className="text-gray-400 text-sm mb-2">Product Categories</h4>
                              <div className="flex flex-wrap gap-2">
                                {listing.product_categories.map((cat, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-gray-700 rounded text-xs text-white">
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {listing.listing_images && listing.listing_images.length > 0 && (
                            <div>
                              <h4 className="text-gray-400 text-sm mb-2">Images</h4>
                              <div className="grid grid-cols-4 gap-2">
                                {listing.listing_images.map((image, idx) => (
                                  <img 
                                    key={idx} 
                                    src={image} 
                                    alt={`${listing.business_name} ${idx + 1}`}
                                    className="w-full h-24 object-cover rounded"
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <h4 className="text-gray-400 mb-1">Statistics</h4>
                              <p className="text-white">Views: {listing.views_count || 0}</p>
                              <p className="text-white">Reviews: {listing.review_count || 0}</p>
                              <p className="text-white">Rating: {listing.rating ? `${listing.rating}/5` : 'N/A'}</p>
                            </div>
                            <div>
                              <h4 className="text-gray-400 mb-1">User Info</h4>
                              <p className="text-white">Name: {listing.user?.name || 'N/A'}</p>
                              <p className="text-white">Email: {listing.user?.email || 'N/A'}</p>
                              <p className="text-white">Type: {listing.user?.membership_type || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => toggleExpanded(listing.id)}
                      className="ml-4 text-gray-400 hover:text-white transition-colors"
                    >
                      {expandedListings.has(listing.id) ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-gray-700">
                    {listing.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(listing)}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleReject(listing)}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {listing.user && (
                      <button
                        onClick={() => toggleAutoApprove(listing)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>
                          {listing.listing_type === 'used_equipment' 
                            ? listing.user.auto_approve_used_equipment ? 'Disable' : 'Enable'
                            : listing.user.auto_approve_directory ? 'Disable' : 'Enable'
                          } Auto-Approve
                        </span>
                      </button>
                    )}

                    <Link
                      to={`/directory/${listing.id}`}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Public</span>
                    </Link>

                    <Link
                      to={`/directory/edit/${listing.id}`}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </Link>

                    <button
                      onClick={() => deleteListing(listing)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && selectedListing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Reject Listing</h2>
            <p className="text-gray-400 mb-4">
              Provide a reason for rejecting "{selectedListing.business_name}"
            </p>
            
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 resize-none"
              rows={4}
              autoFocus
            />
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setSelectedListing(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitRejection}
                disabled={!rejectionReason.trim() || isSubmitting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Rejecting...' : 'Reject Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}