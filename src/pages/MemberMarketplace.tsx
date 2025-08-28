import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, DollarSign, Calendar, User, Heart, Eye, Package, ShoppingCart, Tag, Clock, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PageHeader from '../components/PageHeader';
import SEO from '../components/SEO';

interface MarketplaceListing {
  id: string;
  user_id: string;
  item_title: string;
  item_description: string;
  item_condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  item_price: number;
  is_negotiable: boolean;
  item_category_id: string;
  city: string;
  state: string;
  default_image_url: string;
  views_count: number;
  created_at: string;
  updated_at: string;
  status: string;
  user?: {
    name: string;
    membership_type: string;
    avatar_url?: string;
  };
  category?: {
    name: string;
    slug: string;
  };
  images?: string[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  item_count?: number;
}

export default function MemberMarketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<MarketplaceListing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadMarketplaceData();
  }, []);

  useEffect(() => {
    filterAndSortListings();
  }, [listings, searchTerm, selectedCategory, selectedCondition, priceRange, sortBy]);

  const loadMarketplaceData = async () => {
    try {
      setIsLoading(true);

      // Load categories
      const { data: categoriesData } = await supabase
        .from('directory_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Load marketplace listings (used equipment only)
      const { data: listingsData, error: listingsError } = await supabase
        .from('directory_listings')
        .select(`
          *,
          user:users!user_id (
            id,
            name,
            membership_type,
            profile_image
          ),
          category:directory_categories!item_category_id (
            name,
            slug
          )
        `)
        .eq('listing_type', 'used_equipment')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (listingsError) {
        console.error('Error loading marketplace listings:', listingsError);
      } else {
        // Map profile_image to avatar_url for consistency
        const mappedListings = (listingsData || []).map(listing => ({
          ...listing,
          user: listing.user ? {
            ...listing.user,
            avatar_url: listing.user.profile_image
          } : undefined
        }));
        setListings(mappedListings);
        setFilteredListings(mappedListings);
      }
    } catch (error) {
      console.error('Error loading marketplace data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortListings = () => {
    let filtered = [...listings];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(listing =>
        listing.item_title.toLowerCase().includes(search) ||
        listing.item_description?.toLowerCase().includes(search) ||
        listing.category?.name.toLowerCase().includes(search)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(listing => listing.item_category_id === selectedCategory);
    }

    // Condition filter
    if (selectedCondition !== 'all') {
      filtered = filtered.filter(listing => listing.item_condition === selectedCondition);
    }

    // Price range filter
    if (priceRange.min) {
      filtered = filtered.filter(listing => listing.item_price >= parseFloat(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter(listing => listing.item_price <= parseFloat(priceRange.max));
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.item_price - b.item_price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.item_price - a.item_price);
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFilteredListings(filtered);
  };

  const getConditionBadge = (condition: string) => {
    const badges = {
      new: { color: 'bg-green-500', text: 'New' },
      like_new: { color: 'bg-blue-500', text: 'Like New' },
      good: { color: 'bg-yellow-500', text: 'Good' },
      fair: { color: 'bg-orange-500', text: 'Fair' },
      poor: { color: 'bg-red-500', text: 'Poor' }
    };
    return badges[condition] || badges.good;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const posted = new Date(date);
    const diffInDays = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${Math.floor(diffInDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInDays / 30)} month${Math.floor(diffInDays / 30) > 1 ? 's' : ''} ago`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEO 
        title="Member Marketplace - Car Audio Equipment For Sale"
        description="Buy and sell used car audio equipment from fellow enthusiasts. Find amplifiers, speakers, subwoofers, and more at great prices."
        keywords="used car audio, car audio marketplace, sell car audio equipment, buy used amplifiers, used subwoofers"
      />
      
      <PageHeader
        title="Member Marketplace"
        subtitle="Buy and sell car audio equipment with the community"
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Bar */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{listings.length}</p>
              <p className="text-gray-400 text-sm">Active Listings</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-electric-400">{categories.length}</p>
              <p className="text-gray-400 text-sm">Categories</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">
                {listings.filter(l => l.created_at > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).length}
              </p>
              <p className="text-gray-400 text-sm">New This Week</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-400">
                {listings.filter(l => l.is_negotiable).length}
              </p>
              <p className="text-gray-400 text-sm">Negotiable</p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
              />
            </div>
          </div>
          
          {user && (
            <Link
              to="/directory/create"
              className="bg-electric-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-electric-600 transition-colors flex items-center space-x-2"
            >
              <Package className="h-5 w-5" />
              <span>List Item for Sale</span>
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Condition</label>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
              >
                <option value="all">Any Condition</option>
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Price Range</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                  className="w-1/2 p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                  className="w-1/2 p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {filteredListings.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No items found</h3>
            <p className="text-gray-400">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map(listing => (
              <Link
                key={listing.id}
                to={`/marketplace/${listing.id}`}
                className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden hover:border-electric-500/50 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative h-64 bg-gray-900 overflow-hidden">
                  {listing.default_image_url ? (
                    <img
                      src={listing.default_image_url}
                      alt={listing.item_title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-20 w-20 text-gray-700" />
                    </div>
                  )}
                  
                  {/* Condition Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`${getConditionBadge(listing.item_condition).color} px-3 py-1 rounded-full text-white text-xs font-medium`}>
                      {getConditionBadge(listing.item_condition).text}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg">
                    <p className="text-2xl font-bold text-white">
                      {formatPrice(listing.item_price)}
                    </p>
                    {listing.is_negotiable && (
                      <p className="text-xs text-green-400">Negotiable</p>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-electric-400 transition-colors">
                    {listing.item_title}
                  </h3>
                  
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                    {listing.item_description}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <MapPin className="h-4 w-4" />
                      <span>{listing.city}, {listing.state}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>{getTimeAgo(listing.created_at)}</span>
                    </div>
                  </div>

                  {listing.user && (
                    <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {listing.user.avatar_url ? (
                          <img
                            src={listing.user.avatar_url}
                            alt={listing.user.name}
                            className="h-6 w-6 rounded-full"
                          />
                        ) : (
                          <User className="h-6 w-6 text-gray-500" />
                        )}
                        <span className="text-sm text-gray-400">{listing.user.name}</span>
                      </div>
                      {listing.user.membership_type === 'pro_competitor' && (
                        <span title="Pro Member">
                          <CheckCircle className="h-4 w-4 text-electric-400" />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}