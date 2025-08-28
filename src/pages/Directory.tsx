import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Phone, Globe, Star, Filter, Building, Wrench, Heart, Eye, Package, DollarSign } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PageHeader from '../components/PageHeader';
import { AdvancedSearch } from '../components/AdvancedSearch';
import { DirectoryListView } from '../components/DirectoryListView';
import { activityLogger } from '../services/activityLogger';
import SEO from '../components/SEO';

interface DirectoryListing {
  id: string;
  business_name: string;
  listing_type: 'retailer' | 'manufacturer' | 'used_equipment';
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  state: string;
  country: string;
  description: string;
  default_image_url: string;
  listing_images?: Array<{url: string; type: string}>;
  rating: number;
  review_count: number;
  views_count: number;
  featured: boolean;
  services_offered?: string[];
  brands_carried?: string[];
  preferred_dealers?: string[];
  product_categories?: string[];
  item_title?: string;
  item_condition?: string;
  item_price?: number;
  created_at: string;
}

export default function Directory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<DirectoryListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<DirectoryListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  
  // Advanced search data
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [currentFilters, setCurrentFilters] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadListings();
    loadSearchData();
    
    // Log page visit
    if (user) {
      activityLogger.log({
        userId: user.id,
        activityType: 'directory_view' as any,
        description: `User visited Directory page`,
        metadata: {
          page: 'directory',
          user_email: user.email,
          user_name: user.name
        }
      });
    }
  }, []);

  const loadListings = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('directory_listings')
        .select('*')
        .eq('status', 'approved')
        .eq('is_active', true)  // Must be approved by admin
        .eq('is_active', true)     // Must be active by user
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading listings:', error);
      } else {
        setListings(data || []);
        setFilteredListings(data || []);
      }
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSearchData = async () => {
    try {
      // Load unique services
      const servicesData = await supabase
        .from('directory_listings')
        .select('services_offered')
        .eq('status', 'approved')
        .eq('is_active', true)
        .not('services_offered', 'is', null);
      
      const allServices = servicesData.data?.flatMap(item => (item.services_offered as string[]) || []) || [];
      const uniqueServices = [...new Set(allServices)] as string[];
      setAvailableServices(uniqueServices.sort());

      // Load unique brands
      const brandsData = await supabase
        .from('directory_listings')
        .select('brands_carried')
        .eq('status', 'approved')
        .eq('is_active', true)
        .not('brands_carried', 'is', null);
      
      const allBrands = brandsData.data?.flatMap(item => (item.brands_carried as string[]) || []) || [];
      const uniqueBrands = [...new Set(allBrands)] as string[];
      setAvailableBrands(uniqueBrands.sort());

      // Load categories
      const { data: categoriesData } = await supabase
        .from('directory_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      setAvailableCategories(categoriesData || []);

      // Load unique states
      const statesData = await supabase
        .from('directory_listings')
        .select('state')
        .eq('status', 'approved')
        .eq('is_active', true)
        .not('state', 'is', null);
      
      const allStates = statesData.data?.map(item => item.state).filter(Boolean) || [];
      setAvailableStates([...new Set(allStates as string[])].sort());

    } catch (error) {
      console.error('Error loading search data:', error);
    }
  };

  const recordView = async (listingId: string) => {
    try {
      await supabase.rpc('record_listing_view', {
        p_listing_id: listingId,
        p_user_id: user?.id || null
      });
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const handleListingClick = (listing: DirectoryListing) => {
    recordView(listing.id);
    // Navigate to public detail view - everyone sees the same thing
    navigate(`/directory/${listing.id}`);
  };

  const handleAdvancedSearch = useCallback((filters: any) => {
    setCurrentFilters(filters);
    setViewMode(filters.viewMode);
    let filtered = [...listings];

    // Apply text search with null safety
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(listing => {
        const safeCheck = (str: any) => str && typeof str === 'string' ? str.toLowerCase().includes(query) : false;
        const arrayCheck = (arr: any[], field?: string) => Array.isArray(arr) ? arr.some((item: any) => {
          const value = field ? item[field] : item;
          return value && typeof value === 'string' && value.toLowerCase().includes(query);
        }) : false;

        return safeCheck(listing.business_name) ||
               safeCheck(listing.description) ||
               safeCheck(listing.city) ||
               safeCheck(listing.state) ||
               arrayCheck(listing.brands_carried) ||
               arrayCheck(listing.services_offered) ||
               safeCheck(listing.item_title) ||
               safeCheck(listing.contact_name);
      });
    }

    // Apply type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(listing => listing.listing_type === filters.type);
    }

    // Apply state filter
    if (filters.state !== 'all') {
      filtered = filtered.filter(listing => listing.state === filters.state);
    }

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(listing => 
        listing.product_categories?.includes(filters.category)
      );
    }

    // Apply services filter
    if (filters.services.length > 0) {
      filtered = filtered.filter(listing =>
        filters.services.some((service: string) =>
          listing.services_offered?.includes(service)
        )
      );
    }

    // Apply brands filter
    if (filters.brands.length > 0) {
      filtered = filtered.filter(listing =>
        filters.brands.some((brand: string) =>
          listing.brands_carried?.includes(brand)
        )
      );
    }

    // Apply rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter(listing => listing.rating >= filters.minRating);
    }

    // Apply price filter
    if (filters.minPrice !== null || filters.maxPrice !== null) {
      filtered = filtered.filter(listing => {
        if (!listing.item_price) return filters.minPrice === null && filters.maxPrice === null;
        
        const price = listing.item_price;
        const minOk = filters.minPrice === null || price >= filters.minPrice;
        const maxOk = filters.maxPrice === null || price <= filters.maxPrice;
        return minOk && maxOk;
      });
    }

    // Apply condition filter
    if (filters.condition.length > 0) {
      filtered = filtered.filter(listing =>
        filters.condition.includes(listing.item_condition)
      );
    }

    // Apply featured filter
    if (filters.featured) {
      filtered = filtered.filter(listing => listing.featured);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'rating':
          comparison = b.rating - a.rating;
          break;
        case 'price':
          comparison = (a.item_price || 0) - (b.item_price || 0);
          break;
        case 'date':
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
        case 'name':
          comparison = a.business_name.localeCompare(b.business_name);
          break;
        case 'views':
          comparison = b.views_count - a.views_count;
          break;
        default: // relevance
          // Featured items first, then by date
          if (a.featured !== b.featured) {
            return b.featured ? 1 : -1;
          }
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      
      return filters.sortOrder === 'asc' ? -comparison : comparison;
    });

    setFilteredListings(filtered);
  }, [listings]);

  const handleSearchReset = useCallback(() => {
    setCurrentFilters(null);
    setFilteredListings(listings);
  }, [listings]);

  // Get unique locations and types for filters
  const locations = [...new Set(listings.map(listing => `${listing.city}, ${listing.state}`))];
  const types = ['all', 'retailer', 'manufacturer', 'used_equipment'];

  const getDisplaySpecialties = (listing: DirectoryListing): string[] => {
    if (!listing || !listing.listing_type) return [];
    
    if (listing.listing_type === 'retailer') {
      return Array.isArray(listing.services_offered) ? listing.services_offered : [];
    } else if (listing.listing_type === 'manufacturer') {
      return Array.isArray(listing.brands_carried) ? listing.brands_carried : [];
    } else {
      return Array.isArray(listing.product_categories) ? listing.product_categories : [];
    }
  };

  const getListingTitle = (listing: DirectoryListing): string => {
    if (!listing) return 'Unknown Listing';
    
    if (listing.listing_type === 'used_equipment') {
      return listing.item_title || listing.business_name || 'Untitled Item';
    }
    return listing.business_name || 'Unknown Business';
  };

  const getDefaultImage = (listing: DirectoryListing): string => {
    if (!listing) return "https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2";
    
    // Check for default image URL first
    if (listing.default_image_url) return listing.default_image_url;
    
    // Check for listing images array
    if (listing.listing_images && Array.isArray(listing.listing_images) && listing.listing_images.length > 0) {
      const firstImage = listing.listing_images[0];
      if (firstImage && firstImage.url && !firstImage.url.startsWith('blob:')) {
        return firstImage.url;
      }
    }
    
    // Return default fallback image
    return "https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2";
  };

  return (
    <div className="min-h-screen py-8">
      <SEO 
        title="Car Audio Business Directory"
        description="Find car audio retailers, manufacturers, and installers near you. Browse reviews, contact information, and services offered by trusted car audio businesses nationwide."
        keywords="car audio shops, car stereo installers, audio retailers, car audio manufacturers, installation services, car audio dealers, audio equipment suppliers"
        url="https://caraudioevents.com/directory"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          title={<>Business <span className="text-electric-400">Directory</span></>}
          subtitle="Connect with trusted retailers, manufacturers, and find quality used car audio equipment"
        >
          {/* Add Listing CTA for eligible users */}
          {user && ['retailer', 'manufacturer', 'competitor', 'organization', 'admin'].includes(user.membershipType) && (
            <Link
              to="/directory/create"
              className="bg-electric-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 inline-flex items-center space-x-2"
            >
              <Package className="h-5 w-5" />
              <span>Add Your Listing</span>
            </Link>
          )}
        </PageHeader>

        {/* Advanced Search */}
        <AdvancedSearch
          onSearch={handleAdvancedSearch}
          onReset={handleSearchReset}
          totalResults={filteredListings.length}
          isLoading={isLoading}
          availableServices={availableServices}
          availableBrands={availableBrands}
          availableCategories={availableCategories}
          availableStates={availableStates}
        />

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gray-800/50 rounded-xl p-6 animate-pulse">
                <div className="w-full h-48 bg-gray-700 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-16">
            <Building className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No listings found</h3>
            <p className="text-gray-400 mb-6">
              {listings.length === 0 
                ? "Be the first to add a business listing to our directory!"
                : "Try adjusting your search criteria or filters."
              }
            </p>
            {user && ['retailer', 'manufacturer', 'competitor', 'organization', 'admin'].includes(user.membershipType) && (
              <Link
                to="/directory/create"
                className="bg-electric-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 inline-flex items-center space-x-2"
              >
                <Package className="h-5 w-5" />
                <span>Add Your Listing</span>
              </Link>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <DirectoryListView 
            listings={filteredListings}
            onRecordView={(listingId) => {
              const listing = filteredListings.find(l => l.id === listingId);
              if (listing) handleListingClick(listing);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <div
                key={listing.id}
                  className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden hover:border-electric-500/50 transition-all duration-300 group cursor-pointer"
                  onClick={() => {
                    try {
                      handleListingClick(listing);
                    } catch (error) {
                      console.error('Error handling listing click:', error);
                    }
                  }}
                >
                {/* Listing Image */}
                <div className="relative">
                  <img
                    src={getDefaultImage(listing)}
                    alt={getListingTitle(listing)}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2";
                    }}
                  />
                  
                  {/* Featured Badge */}
                  {listing.featured && (
                    <div className="absolute top-3 left-3 bg-electric-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      Featured
                    </div>
                  )}
                  
                  {/* Listing Type Badge */}
                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-medium capitalize">
                    {listing.listing_type?.replace(/_/g, ' ') || 'Business'}
                  </div>
                  
                  {/* Price for used equipment */}
                  {listing.listing_type === 'used_equipment' && listing.item_price && (
                    <div className="absolute bottom-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                      ${listing.item_price.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Listing Content */}
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-electric-400 transition-colors line-clamp-1">
                        {getListingTitle(listing)}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {listing.contact_name}
                      </p>
                    </div>
                    
                    {/* Rating */}
                    {listing.rating > 0 && (
                      <div className="flex items-center space-x-1 bg-yellow-500/20 px-2 py-1 rounded-full">
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-yellow-400 font-medium">
                          {listing.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {listing.description}
                  </p>

                  {/* Location */}
                  <div className="flex items-center text-gray-300 text-sm mb-3">
                    <MapPin className="h-4 w-4 mr-2 text-electric-500 flex-shrink-0" />
                    <span className="line-clamp-1">
                      {listing.city}, {listing.state}
                    </span>
                  </div>

                  {/* Specialties/Brands */}
                  {getDisplaySpecialties(listing).length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {getDisplaySpecialties(listing).slice(0, 3).map((specialty, index) => (
                          <span
                            key={index}
                            className="bg-electric-500/20 text-electric-400 px-2 py-1 rounded-full text-xs font-medium"
                          >
                            {specialty}
                          </span>
                        ))}
                        {getDisplaySpecialties(listing).length > 3 && (
                          <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs font-medium">
                            +{getDisplaySpecialties(listing).length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    {/* Contact Options */}
                    <div className="flex items-center space-x-3">
                      {listing.phone && (
                        <a
                          href={`tel:${listing.phone}`}
                          className="text-gray-400 hover:text-electric-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      {listing.website && (
                        <a
                          href={listing.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-electric-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      {listing.views_count > 0 && (
                        <div className="flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span>{listing.views_count}</span>
                        </div>
                      )}
                      {listing.review_count > 0 && (
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3" />
                          <span>{listing.review_count}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}