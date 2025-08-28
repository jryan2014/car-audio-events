import React from 'react';
import { MapPin, Phone, Globe, Star, Eye, DollarSign } from 'lucide-react';

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

interface DirectoryListViewProps {
  listings: DirectoryListing[];
  onRecordView: (listingId: string) => void;
}

export const DirectoryListView: React.FC<DirectoryListViewProps> = ({
  listings,
  onRecordView
}) => {
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
    <div className="space-y-4">
      {listings.map((listing) => (
        <div
          key={listing.id}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden hover:border-electric-500/50 transition-all duration-300 group cursor-pointer"
          onClick={() => onRecordView(listing.id)}
        >
          <div className="flex">
            {/* Image */}
            <div className="relative w-48 h-32 flex-shrink-0">
              <img
                src={getDefaultImage(listing)}
                alt={getListingTitle(listing)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2";
                }}
              />
              
              {/* Featured Badge */}
              {listing.featured && (
                <div className="absolute top-2 left-2 bg-electric-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  Featured
                </div>
              )}
              
              {/* Listing Type Badge */}
              <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-medium capitalize">
                {listing.listing_type ? listing.listing_type.replace('_', ' ') : 'Unknown'}
              </div>
              
              {/* Price for used equipment */}
              {listing.listing_type === 'used_equipment' && listing.item_price && (
                <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                  ${listing.item_price.toLocaleString()}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white group-hover:text-electric-400 transition-colors mb-1">
                    {getListingTitle(listing)}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {listing.contact_name}
                  </p>
                </div>
                
                {/* Rating */}
                {listing.rating > 0 && (
                  <div className="flex items-center space-x-1 bg-yellow-500/20 px-3 py-1 rounded-full">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-yellow-400 font-medium">
                      {listing.rating.toFixed(1)}
                    </span>
                    {listing.review_count > 0 && (
                      <span className="text-xs text-yellow-300">
                        ({listing.review_count})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                {listing.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  {/* Location */}
                  <div className="flex items-center text-gray-300 text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-electric-500 flex-shrink-0" />
                    <span>
                      {listing.city}, {listing.state}
                    </span>
                  </div>

                  {/* Contact Options */}
                  <div className="flex items-center space-x-3">
                    {listing.phone && (
                      <a
                        href={`tel:${listing.phone}`}
                        className="text-gray-400 hover:text-electric-400 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                        title="Call"
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
                        title="Website"
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Stats and Specialties */}
                <div className="flex items-center space-x-4">
                  {/* Specialties */}
                  {getDisplaySpecialties(listing).length > 0 && (
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
                          +{getDisplaySpecialties(listing).length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* View Count */}
                  {listing.views_count > 0 && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Eye className="h-3 w-3" />
                      <span>{listing.views_count}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}; 