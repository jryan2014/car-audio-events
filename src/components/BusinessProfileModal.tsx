import React from 'react';
import { 
  X, MapPin, Phone, Globe, Mail, Star, Eye, Clock, 
  Building, ExternalLink, Heart, MessageCircle, Share
} from 'lucide-react';

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
  address_line1?: string;
  address_line2?: string;
  postal_code?: string;
  established_year?: number;
  employee_count?: string;
  warranty_info?: string;
}

interface BusinessProfileModalProps {
  listing: DirectoryListing;
  isOpen: boolean;
  onClose: () => void;
  onRecordView: (listingId: string) => void;
}

export const BusinessProfileModal: React.FC<BusinessProfileModalProps> = ({
  listing,
  isOpen,
  onClose,
  onRecordView
}) => {
  React.useEffect(() => {
    if (isOpen) {
      onRecordView(listing.id);
    }
  }, [isOpen, listing.id, onRecordView]);

  if (!isOpen) return null;

  const getListingTitle = () => {
    if (listing.listing_type === 'used_equipment') {
      return listing.item_title || listing.business_name;
    }
    return listing.business_name;
  };

  const getDefaultImage = () => {
    return listing.default_image_url || "https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&dpr=2";
  };

  const getSpecialties = () => {
    if (listing.listing_type === 'retailer') {
      return listing.services_offered || [];
    } else if (listing.listing_type === 'manufacturer') {
      return listing.brands_carried || [];
    } else {
      return listing.product_categories || [];
    }
  };

  const formatAddress = () => {
    const parts = [
      listing.address_line1,
      listing.address_line2,
      `${listing.city}, ${listing.state} ${listing.postal_code}`,
      listing.country
    ].filter(Boolean);
    return parts.join('\n');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-900 border border-gray-700 shadow-xl rounded-2xl">
          {/* Header Image */}
          <div className="relative h-64 bg-gradient-to-r from-electric-600 to-blue-600">
            <img
              src={getDefaultImage()}
              alt={getListingTitle()}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&dpr=2";
              }}
            />
            <div className="absolute inset-0 bg-black/40" />
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-white bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Badges */}
            <div className="absolute top-4 left-4 flex space-x-2">
              {listing.featured && (
                <span className="bg-electric-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  Featured
                </span>
              )}
              <span className="bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium capitalize">
                {listing.listing_type ? listing.listing_type.replace('_', ' ') : 'Unknown'}
              </span>
            </div>

            {/* Price for used equipment */}
            {listing.listing_type === 'used_equipment' && listing.item_price && (
              <div className="absolute bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full text-lg font-bold">
                ${listing.item_price.toLocaleString()}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {getListingTitle()}
                </h1>
                <p className="text-lg text-gray-400 mb-2">
                  {listing.contact_name}
                </p>
                
                {/* Rating */}
                {listing.rating > 0 && (
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= listing.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-400">
                      {listing.rating.toFixed(1)} ({listing.review_count} reviews)
                    </span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{listing.views_count} views</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Listed {new Date(listing.created_at).toLocaleDateString()}</span>
                  </div>
                  {listing.established_year && (
                    <div className="flex items-center space-x-1">
                      <Building className="h-4 w-4" />
                      <span>Est. {listing.established_year}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-2">
                <button className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                  <Heart className="h-4 w-4" />
                  <span>Save</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                  <Share className="h-4 w-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">About</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {listing.description}
                  </p>
                </div>

                {/* Specialties/Services */}
                {getSpecialties().length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3">
                      {listing.listing_type === 'retailer' ? 'Services Offered' : 
                       listing.listing_type === 'manufacturer' ? 'Brands' : 'Categories'}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {getSpecialties().map((item, index) => (
                        <span
                          key={index}
                          className="bg-electric-500/20 text-electric-400 px-3 py-2 rounded-full text-sm font-medium"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Item condition for used equipment */}
                {listing.listing_type === 'used_equipment' && listing.item_condition && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3">Condition</h3>
                    <span className="bg-blue-500/20 text-blue-400 px-3 py-2 rounded-full text-sm font-medium capitalize">
                      {listing.item_condition ? listing.item_condition.replace('_', ' ') : 'Unknown'}
                    </span>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Contact Information */}
                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    {/* Location */}
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-electric-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-300 whitespace-pre-line">
                          {formatAddress()}
                        </p>
                      </div>
                    </div>

                    {/* Phone */}
                    {listing.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-electric-500 flex-shrink-0" />
                        <a
                          href={`tel:${listing.phone}`}
                          className="text-gray-300 hover:text-electric-400 transition-colors"
                        >
                          {listing.phone}
                        </a>
                      </div>
                    )}

                    {/* Email */}
                    {listing.email && (
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-electric-500 flex-shrink-0" />
                        <a
                          href={`mailto:${listing.email}`}
                          className="text-gray-300 hover:text-electric-400 transition-colors"
                        >
                          {listing.email}
                        </a>
                      </div>
                    )}

                    {/* Website */}
                    {listing.website && (
                      <div className="flex items-center space-x-3">
                        <Globe className="h-5 w-5 text-electric-500 flex-shrink-0" />
                        <a
                          href={listing.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-300 hover:text-electric-400 transition-colors flex items-center space-x-1"
                        >
                          <span>Visit Website</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-electric-500 hover:bg-electric-600 text-white rounded-lg font-medium transition-colors">
                    <MessageCircle className="h-5 w-5" />
                    <span>Send Message</span>
                  </button>
                  
                  {listing.phone && (
                    <a
                      href={`tel:${listing.phone}`}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <Phone className="h-5 w-5" />
                      <span>Call Now</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
