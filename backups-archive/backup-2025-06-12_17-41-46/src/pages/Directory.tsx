import React, { useState, useEffect } from 'react';
import { Search, MapPin, Phone, Globe, Star, Filter, Building, Wrench, Heart, Eye, Package, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
  const [listings, setListings] = useState<DirectoryListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('directory_listings')
        .select('*')
        .eq('status', 'approved')
        .order('featured', { ascending: false })
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

  // Get unique locations and types for filters
  const locations = [...new Set(listings.map(listing => `${listing.city}, ${listing.state}`))];
  const types = ['all', 'retailer', 'manufacturer', 'used_equipment'];

  const filteredListings = listings.filter(listing => {
    const matchesSearch = 
      listing.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.brands_carried?.some(brand => brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      listing.services_offered?.some(service => service.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedType === 'all' || listing.listing_type === selectedType;
    const matchesLocation = selectedLocation === 'all' || `${listing.city}, ${listing.state}` === selectedLocation;
    
    return matchesSearch && matchesType && matchesLocation;
  });

  const getDisplaySpecialties = (listing: DirectoryListing): string[] => {
    if (listing.listing_type === 'retailer') {
      return listing.services_offered || [];
    } else if (listing.listing_type === 'manufacturer') {
      return listing.brands_carried || [];
    } else {
      return listing.product_categories || [];
    }
  };

  const getListingTitle = (listing: DirectoryListing): string => {
    if (listing.listing_type === 'used_equipment') {
      return listing.item_title || listing.business_name;
    }
    return listing.business_name;
  };

  const getDefaultImage = (listing: DirectoryListing): string => {
    return listing.default_image_url || "https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2";
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-black text-white mb-6">
            Business <span className="text-electric-400">Directory</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Connect with trusted retailers, manufacturers, and find quality used car audio equipment
          </p>
          
          {/* Add Listing CTA for eligible users */}
          {user && ['retailer', 'manufacturer', 'competitor', 'organization', 'admin'].includes(user.membershipType) && (
            <div className="mt-6">
              <Link
                to="/directory/create"
                className="bg-electric-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 inline-flex items-center space-x-2"
              >
                <Package className="h-5 w-5" />
                <span>Add Your Listing</span>
              </Link>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search businesses, brands, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 transition-colors"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                <option value="all">All Types</option>
                <option value="retailer">Retailers</option>
                <option value="manufacturer">Manufacturers</option>
                <option value="used_equipment">Used Equipment</option>
              </select>
            </div>

            {/* Location Filter */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                <option value="all">All Locations</option>
                {locations.map(location => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-400">
            Showing <span className="text-white font-semibold">{filteredListings.length}</span> listings
            {listings.length === 0 && !isLoading && (
              <span className="ml-2 text-electric-400">
                - Be the first to add a listing!
              </span>
            )}
          </p>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-gray-800/50 rounded-xl overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-700"></div>
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-16 bg-gray-700 rounded"></div>
                </div>
              </div>
            ))
          ) : filteredListings.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Building className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No listings found</h3>
              <p className="text-gray-500 mb-6">
                {listings.length === 0 
                  ? "No businesses have been listed yet. Be the first to add your business to our directory!"
                  : "Try adjusting your search or filter criteria to find what you're looking for."
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
          ) : (
            filteredListings.map((listing, index) => (
              <div 
                key={listing.id}
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-2xl hover:shadow-electric-500/10 transition-all duration-300 hover:scale-105 border border-gray-700/50 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative">
                  <img 
                    src={getDefaultImage(listing)} 
                    alt={getListingTitle(listing)}
                    className="w-full h-48 object-cover"
                  />
                  {listing.featured && (
                    <div className="absolute top-4 left-4 bg-electric-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center space-x-1">
                      <Star className="h-3 w-3" />
                      <span>Featured</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                    {listing.listing_type === 'retailer' ? <Building className="h-3 w-3" /> : 
                     listing.listing_type === 'manufacturer' ? <Wrench className="h-3 w-3" /> :
                     <Package className="h-3 w-3" />}
                    <span>{listing.listing_type.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  
                  {listing.listing_type === 'used_equipment' && listing.item_price && (
                    <div className="absolute bottom-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center space-x-1">
                      <DollarSign className="h-3 w-3" />
                      <span>${listing.item_price.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                    {getListingTitle(listing)}
                  </h3>
                  
                  {listing.rating > 0 && (
                    <div className="flex items-center space-x-1 mb-3">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-4 w-4 ${i < Math.floor(listing.rating) ? 'text-yellow-500 fill-current' : 'text-gray-600'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-yellow-500 font-semibold text-sm">{listing.rating.toFixed(1)}</span>
                      <span className="text-gray-400 text-sm">({listing.review_count} reviews)</span>
                    </div>
                  )}

                  <p className="text-gray-400 text-sm mb-4 leading-relaxed line-clamp-3">
                    {listing.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-400 text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-electric-500" />
                      {listing.city}, {listing.state}
                    </div>
                    {listing.phone && (
                      <div className="flex items-center text-gray-400 text-sm">
                        <Phone className="h-4 w-4 mr-2 text-electric-500" />
                        {listing.phone}
                      </div>
                    )}
                    {listing.website && (
                      <div className="flex items-center text-gray-400 text-sm">
                        <Globe className="h-4 w-4 mr-2 text-electric-500" />
                        <a 
                          href={listing.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-electric-400 hover:text-electric-300 transition-colors"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}
                  </div>

                  {getDisplaySpecialties(listing).length > 0 && (
                    <div className="mb-4">
                      <div className="text-white font-medium text-sm mb-2">
                        {listing.listing_type === 'retailer' ? 'Services:' :
                         listing.listing_type === 'manufacturer' ? 'Brands:' : 'Categories:'}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {getDisplaySpecialties(listing).slice(0, 3).map((item, index) => (
                          <span 
                            key={index}
                            className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded text-xs"
                          >
                            {item}
                          </span>
                        ))}
                        {getDisplaySpecialties(listing).length > 3 && (
                          <span className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded text-xs">
                            +{getDisplaySpecialties(listing).length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/directory/${listing.id}`}
                      onClick={() => recordView(listing.id)}
                      className="flex-1 bg-electric-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-electric-600 transition-all duration-200 text-sm text-center"
                    >
                      View Details
                    </Link>
                    <button className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                      <Heart className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load More Button - Future Implementation */}
        {!isLoading && filteredListings.length > 0 && filteredListings.length >= 50 && (
          <div className="text-center mt-12">
            <button className="bg-gray-700 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-600 transition-all duration-200">
              Load More Listings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}