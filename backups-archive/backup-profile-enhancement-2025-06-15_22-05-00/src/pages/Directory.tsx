import React, { useState, useEffect } from 'react';
import { Search, MapPin, Phone, Globe, Star, Filter, Building, Wrench, Heart, Eye, Package, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

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
                - <Link to="/directory/create" className="underline hover:text-electric-300">Add the first listing</Link>
              </span>
            )}
          </p>
        </div>

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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden hover:border-electric-500/50 transition-all duration-300 group cursor-pointer"
                onClick={() => recordView(listing.id)}
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
                    {listing.listing_type.replace('_', ' ')}
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