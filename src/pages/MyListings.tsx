import React, { useState, useEffect } from 'react';
import { 
  Plus, Package, Edit, Trash2, Eye, Clock, CheckCircle, 
  XCircle, AlertCircle, DollarSign, MapPin, Building,
  ShoppingCart, MoreVertical, Search
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PageHeader from '../components/PageHeader';
import { formatDistanceToNow } from 'date-fns';

interface Listing {
  id: string;
  listing_type: 'retailer' | 'manufacturer' | 'used_equipment';
  business_name?: string;
  item_title?: string;
  item_description?: string;
  item_price?: number;
  item_condition?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  city: string;
  state: string;
  views_count: number;
  created_at: string;
  updated_at: string;
  default_image_url?: string;
  rejection_reason?: string;
  admin_notes?: string;
}

interface ListingUsage {
  current_listings: number;
  max_listings: number | null;
}

export default function MyListings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [listingUsage, setListingUsage] = useState<ListingUsage | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadMyListings();
      checkListingUsage();
    }
  }, [user]);

  useEffect(() => {
    filterListings();
  }, [listings, searchTerm, statusFilter, typeFilter]);

  const loadMyListings = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('directory_listings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading listings:', error);
      } else {
        setListings(data || []);
      }
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkListingUsage = async () => {
    if (!user) return;
    
    // Skip limits for retailers and manufacturers
    if (user.membershipType === 'retailer' || user.membershipType === 'manufacturer' || user.membershipType === 'admin') {
      return;
    }
    
    try {
      // For now, just use the current listings count
      const activeListing = listings.filter(l => l.status !== 'rejected' && l.status !== 'suspended').length;
      
      // Default limit for pro_competitor
      if (user.membershipType === 'pro_competitor' || user.membershipType === 'competitor') {
        setListingUsage({
          current_listings: activeListing,
          max_listings: 2 // Default limit for pro_competitors
        });
      }
    } catch (error) {
      console.error('Error checking usage:', error);
    }
  };

  const filterListings = () => {
    let filtered = [...listings];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(listing => {
        const title = listing.business_name || listing.item_title || '';
        const description = listing.item_description || '';
        return title.toLowerCase().includes(search) || 
               description.toLowerCase().includes(search);
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(listing => listing.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(listing => listing.listing_type === typeFilter);
    }

    setFilteredListings(filtered);
  };

  const handleDelete = async (listing: Listing) => {
    setListingToDelete(listing);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!listingToDelete) return;

    try {
      const { error } = await supabase
        .from('directory_listings')
        .delete()
        .eq('id', listingToDelete.id)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error deleting listing:', error);
        alert('Failed to delete listing');
      } else {
        setListings(prev => prev.filter(l => l.id !== listingToDelete.id));
        setShowDeleteModal(false);
        setListingToDelete(null);
        checkListingUsage();
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="flex items-center space-x-1 text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span>Approved</span>
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center space-x-1 text-yellow-400">
            <Clock className="h-4 w-4" />
            <span>Pending Review</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center space-x-1 text-red-400">
            <XCircle className="h-4 w-4" />
            <span>Rejected</span>
          </span>
        );
      case 'suspended':
        return (
          <span className="flex items-center space-x-1 text-orange-400">
            <AlertCircle className="h-4 w-4" />
            <span>Suspended</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getListingTitle = (listing: Listing) => {
    if (listing.listing_type === 'used_equipment') {
      return listing.item_title || 'Untitled Item';
    }
    return listing.business_name || 'Untitled Business';
  };

  const getListingIcon = (type: string) => {
    switch (type) {
      case 'retailer':
        return <Building className="h-5 w-5 text-blue-400" />;
      case 'manufacturer':
        return <Package className="h-5 w-5 text-purple-400" />;
      case 'used_equipment':
        return <ShoppingCart className="h-5 w-5 text-green-400" />;
      default:
        return <Package className="h-5 w-5 text-gray-400" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please log in to manage your listings</p>
          <Link to="/login" className="text-electric-400 hover:text-electric-300">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader 
        title="My Listings"
        subtitle="Manage your directory and marketplace listings"
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Usage Stats */}
        {listingUsage && listingUsage.max_listings && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Listing Usage</h3>
                <div className="flex items-center space-x-6">
                  <div>
                    <p className="text-3xl font-bold text-electric-400">
                      {listingUsage.current_listings} / {listingUsage.max_listings}
                    </p>
                    <p className="text-gray-400 text-sm">Active Listings</p>
                  </div>
                  <div className="h-12 w-px bg-gray-700"></div>
                  <div>
                    <p className="text-lg font-medium text-white">
                      {listingUsage.max_listings - listingUsage.current_listings} remaining
                    </p>
                    <p className="text-gray-400 text-sm">Available slots</p>
                  </div>
                </div>
              </div>
              
              {listingUsage.current_listings < listingUsage.max_listings ? (
                <Link
                  to="/directory/create"
                  className="bg-electric-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-electric-600 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create New Listing</span>
                </Link>
              ) : (
                <div className="text-right">
                  <p className="text-red-400 text-sm mb-2">Listing limit reached</p>
                  <Link
                    to="/pricing"
                    className="text-electric-400 hover:text-electric-300 text-sm font-medium"
                  >
                    Upgrade for more listings →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* If no usage limits, show simple create button */}
        {(!listingUsage || !listingUsage.max_listings) && (
          <div className="flex justify-end mb-6">
            <Link
              to="/directory/create"
              className="bg-electric-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-electric-600 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create New Listing</span>
            </Link>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your listings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                />
              </div>
            </div>
            
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
              >
                <option value="all">All Types</option>
                <option value="retailer">Retailer</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="used_equipment">Used Equipment</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings */}
        {filteredListings.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-12 text-center">
            <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">
              {listings.length === 0 ? 'No listings yet' : 'No matching listings'}
            </h3>
            <p className="text-gray-400 mb-6">
              {listings.length === 0 
                ? 'Create your first listing to get started'
                : 'Try adjusting your search filters'}
            </p>
            {listings.length === 0 && (
              <Link
                to="/directory/create"
                className="inline-flex items-center space-x-2 bg-electric-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-electric-600 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Create Your First Listing</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredListings.map(listing => (
              <div
                key={listing.id}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Image or Icon */}
                    <div className="flex-shrink-0">
                      {listing.default_image_url ? (
                        <img
                          src={listing.default_image_url}
                          alt={getListingTitle(listing)}
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-20 w-20 bg-gray-700 rounded-lg flex items-center justify-center">
                          {getListingIcon(listing.listing_type)}
                        </div>
                      )}
                    </div>

                    {/* Listing Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {getListingTitle(listing)}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <span className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{listing.city}, {listing.state}</span>
                            </span>
                            {listing.item_price && (
                              <span className="flex items-center space-x-1">
                                <DollarSign className="h-4 w-4" />
                                <span>${listing.item_price.toLocaleString()}</span>
                              </span>
                            )}
                            <span className="flex items-center space-x-1">
                              <Eye className="h-4 w-4" />
                              <span>{listing.views_count} views</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {getStatusBadge(listing.status)}
                          <span className="text-gray-400 text-sm">
                            Created {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {listing.status === 'rejected' && listing.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                          <p className="text-red-400 text-sm">
                            <strong>Rejection reason:</strong> {listing.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="relative ml-4">
                    <button
                      onClick={() => setShowActionMenu(showActionMenu === listing.id ? null : listing.id)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    
                    {showActionMenu === listing.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
                        <Link
                          to={listing.listing_type === 'used_equipment' 
                            ? `/marketplace/${listing.id}` 
                            : `/directory/${listing.id}`}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View Listing</span>
                        </Link>
                        
                        {listing.status !== 'rejected' && (
                          <Link
                            to={`/directory/edit/${listing.id}`}
                            className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit Listing</span>
                          </Link>
                        )}
                        
                        <button
                          onClick={() => {
                            handleDelete(listing);
                            setShowActionMenu(null);
                          }}
                          className="flex items-center space-x-2 px-4 py-2 text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors w-full text-left"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Listing</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && listingToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Delete Listing?</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete "{getListingTitle(listingToDelete)}"? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setListingToDelete(null);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}