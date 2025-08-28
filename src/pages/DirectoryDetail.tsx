import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  MapPin, Globe, Phone, Mail, Clock, Package, 
  ArrowLeft, ExternalLink, Star, Building,
  DollarSign, Wrench, Image, Calendar
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';

interface DirectoryListing {
  id: string;
  business_name: string;
  listing_type: 'retailer' | 'manufacturer' | 'used_equipment';
  description: string;
  contact_name?: string;
  default_image_url?: string;
  listing_images?: Array<{url: string; type: string}>;
  banner_url?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  business_hours?: {
    monday?: { open: string; close: string; closed?: boolean };
    tuesday?: { open: string; close: string; closed?: boolean };
    wednesday?: { open: string; close: string; closed?: boolean };
    thursday?: { open: string; close: string; closed?: boolean };
    friday?: { open: string; close: string; closed?: boolean };
    saturday?: { open: string; close: string; closed?: boolean };
    sunday?: { open: string; close: string; closed?: boolean };
  };
  services_offered?: string[];
  installation_services?: boolean;
  custom_fabrication?: boolean;
  sound_deadening?: boolean;
  tuning_services?: boolean;
  brands_carried?: string[];
  featured?: boolean;
  verified?: boolean;
  latitude?: string;
  longitude?: string;
  products?: Array<{
    name: string;
    description: string;
    price: number;
    images: string[];
    category: string;
  }>;
  social_media?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    twitter?: string;
  };
  views_count: number;
  rating: string;
  review_count: number;
  created_at: string;
  updated_at: string;
  item_title?: string;
  item_price?: number;
  item_condition?: string;
}

export default function DirectoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchListing();
      recordView();
    }
  }, [id]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('directory_listings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Validate and sanitize data before setting
      if (data) {
        setListing(data);
      } else {
        throw new Error('No data received');
      }
    } catch (error: any) {
      console.error('Error fetching listing:', error);
      toast.error('Failed to load listing');
    } finally {
      setLoading(false);
    }
  };

  const recordView = async () => {
    try {
      await supabase.rpc('increment_directory_view', { listing_id: id });
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const formatBusinessHours = (hours: any) => {
    if (!hours || typeof hours !== 'object') return null;
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return days.map((day, index) => {
      const dayHours = hours[day];
      if (!dayHours || typeof dayHours !== 'object') return null;
      
      return (
        <div key={day} className="flex justify-between py-2 border-b border-gray-700/50">
          <span className="font-medium text-gray-300">{dayLabels[index]}</span>
          <span className="text-gray-400">
            {dayHours.closed ? 'Closed' : `${dayHours.open || 'N/A'} - ${dayHours.close || 'N/A'}`}
          </span>
        </div>
      );
    }).filter(Boolean);
  };

  const getServiceIcon = (service: string) => {
    const icons: { [key: string]: any } = {
      'installation': Wrench,
      'fabrication': Wrench,
      'sound_deadening': Wrench,
      'tuning': Wrench,
      'design': Wrench,
      'repair': Wrench
    };
    const Icon = icons[service] || Wrench;
    return <Icon className="h-5 w-5" />;
  };

  const getServiceLabel = (service: string) => {
    if (!service || typeof service !== 'string') return 'Unknown Service';
    
    const labels: { [key: string]: string } = {
      'installation': 'Installation Services',
      'fabrication': 'Custom Fabrication',
      'sound_deadening': 'Sound Deadening',
      'tuning': 'System Tuning',
      'design': 'System Design',
      'repair': 'Repair Services'
    };
    return labels[service] || service.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-900 pt-32">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Listing Not Found</h2>
            <Link
              to="/directory"
              className="text-electric-500 hover:text-electric-400"
            >
              Back to Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-32">
      {/* Banner Image */}
      {listing.banner_url && (
        <div className="h-64 w-full relative">
          <img
            src={listing.banner_url}
            alt={`${listing.business_name || 'Business'} banner`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          to="/directory"
          className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Directory
        </Link>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                {listing.listing_images && listing.listing_images.length > 0 && listing.listing_images[0].url && !listing.listing_images[0].url.startsWith('blob:') && (
                  <img
                    src={listing.listing_images[0].url}
                    alt={listing.business_name || 'Business Logo'}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h1 className="text-3xl font-bold text-white">{listing.business_name || 'Unnamed Business'}</h1>
                    {listing.verified && (
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                        Verified
                      </span>
                    )}
                    {listing.featured && (
                      <span className="bg-electric-500/20 text-electric-400 px-2 py-1 rounded-full text-xs font-medium">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 capitalize">{listing.listing_type?.replace(/_/g, ' ') || 'Business'}</p>
                  <div className="flex items-center text-gray-500 text-sm mt-2">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Member since {listing.created_at ? new Date(listing.created_at).toLocaleDateString() : 'Unknown'}</span>
                    <span className="mx-2">•</span>
                    <span>{listing.views_count || 0} views</span>
                  </div>
                </div>
              </div>
              
              {listing.description && (
                <p className="text-gray-300 mt-4 leading-relaxed">
                  {listing.description}
                </p>
              )}
            </div>

            {/* Image Gallery */}
            {listing.listing_images && listing.listing_images.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Image className="h-5 w-5 mr-2 text-electric-500" />
                  Gallery
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listing.listing_images.filter(img => img.url && !img.url.startsWith('blob:')).map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.url}
                        alt={`${listing.business_name || 'Listing'} image ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(image.url, '_blank')}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services */}
            {(listing.installation_services || listing.custom_fabrication || listing.sound_deadening || listing.tuning_services || (listing.services_offered && listing.services_offered.length > 0)) && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Wrench className="h-5 w-5 mr-2 text-electric-500" />
                  Services Offered
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {listing.installation_services && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Wrench className="h-5 w-5" />
                      <span>Installation Services</span>
                    </div>
                  )}
                  {listing.custom_fabrication && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Wrench className="h-5 w-5" />
                      <span>Custom Fabrication</span>
                    </div>
                  )}
                  {listing.sound_deadening && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Wrench className="h-5 w-5" />
                      <span>Sound Deadening</span>
                    </div>
                  )}
                  {listing.tuning_services && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Wrench className="h-5 w-5" />
                      <span>System Tuning</span>
                    </div>
                  )}
                  {listing.services_offered && listing.services_offered.map((service) => (
                    <div key={service} className="flex items-center space-x-2 text-gray-300">
                      {getServiceIcon(service)}
                      <span>{getServiceLabel(service)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Products Showcase */}
            {listing.products && listing.products.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-electric-500" />
                  Featured Products
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {listing.products.map((product, index) => (
                    <div key={index} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30">
                      {product.images && product.images.length > 0 && (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-48 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h3 className="font-semibold text-white mb-1">{product.name}</h3>
                      <p className="text-gray-400 text-sm mb-2">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-electric-500 font-bold">${product.price}</span>
                        <span className="text-gray-500 text-sm capitalize">{product.category?.replace(/_/g, ' ') || 'Product'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            {listing.latitude && listing.longitude && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-electric-500" />
                  Location
                </h2>
                <div className="h-96 bg-gray-700 rounded-lg overflow-hidden">
                  <iframe
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(listing.longitude) - 0.01},${parseFloat(listing.latitude) - 0.01},${parseFloat(listing.longitude) + 0.01},${parseFloat(listing.latitude) + 0.01}&layer=mapnik&marker=${listing.latitude},${listing.longitude}`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Contact & Hours */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Contact Information</h2>
              <div className="space-y-3">
                {listing.address_line1 && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="text-gray-300">
                      <p>{listing.address_line1}</p>
                      {listing.address_line2 && <p>{listing.address_line2}</p>}
                      {(listing.city || listing.state || listing.postal_code) && (
                        <p>
                          {listing.city && `${listing.city}, `}
                          {listing.state} {listing.postal_code}
                        </p>
                      )}
                      {listing.country && <p>{listing.country}</p>}
                    </div>
                  </div>
                )}
                
                {listing.phone && (
                  <a href={`tel:${listing.phone}`} className="flex items-center space-x-3 text-gray-300 hover:text-electric-500 transition-colors">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span>{listing.phone}</span>
                  </a>
                )}
                
                {listing.email && (
                  <a href={`mailto:${listing.email}`} className="flex items-center space-x-3 text-gray-300 hover:text-electric-500 transition-colors">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <span>{listing.email}</span>
                  </a>
                )}
                
                {listing.website && (
                  <a 
                    href={listing.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 text-gray-300 hover:text-electric-500 transition-colors"
                  >
                    <Globe className="h-5 w-5 text-gray-400" />
                    <span className="flex items-center">
                      Visit Website
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </span>
                  </a>
                )}
              </div>
            </div>

            {/* Business Hours */}
            {listing.business_hours && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-electric-500" />
                  Business Hours
                </h2>
                <div className="space-y-1">
                  {formatBusinessHours(listing.business_hours)}
                </div>
              </div>
            )}

            {/* Social Media */}
            {listing.social_media && Object.keys(listing.social_media).length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Follow Us</h2>
                <div className="flex space-x-3">
                  {listing.social_media.facebook && (
                    <a
                      href={listing.social_media.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-electric-500 transition-colors"
                    >
                      <span className="sr-only">Facebook</span>
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                      </svg>
                    </a>
                  )}
                  {listing.social_media.instagram && (
                    <a
                      href={listing.social_media.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-electric-500 transition-colors"
                    >
                      <span className="sr-only">Instagram</span>
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                      </svg>
                    </a>
                  )}
                  {listing.social_media.youtube && (
                    <a
                      href={listing.social_media.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-electric-500 transition-colors"
                    >
                      <span className="sr-only">YouTube</span>
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
  );
}