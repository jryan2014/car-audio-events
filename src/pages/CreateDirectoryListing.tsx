import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Upload, MapPin, Phone, Mail, Globe, 
  Building, Package, DollarSign, Info, CheckCircle, AlertCircle,
  Star, Clock, Users, Wrench, Volume2, Zap, Cpu, Battery,
  Cable, Box, Tag, Image, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';

// Equipment categories for pro-competitors
const EQUIPMENT_CATEGORIES = [
  { value: 'subwoofer', label: 'Subwoofers', icon: Volume2 },
  { value: 'amplifier', label: 'Amplifiers', icon: Zap },
  { value: 'head_unit', label: 'Head Units', icon: Cpu },
  { value: 'speakers', label: 'Speakers', icon: Volume2 },
  { value: 'dsp', label: 'DSP Units', icon: Cpu },
  { value: 'battery', label: 'Batteries', icon: Battery },
  { value: 'wiring', label: 'Wiring & Cables', icon: Cable },
  { value: 'box', label: 'Subwoofer Boxes', icon: Box },
  { value: 'accessories', label: 'Accessories', icon: Package },
  { value: 'other', label: 'Other', icon: Tag }
];

const CONDITION_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'For Parts' }
];

interface ListingUsage {
  current_listings: number;
  max_listings: number | null;
}

export default function CreateDirectoryListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [listingUsage, setListingUsage] = useState<ListingUsage | null>(null);
  const [showLimitExceeded, setShowLimitExceeded] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  
  // Auto-detect listing type based on membership
  const getListingType = () => {
    if (!user) return null;
    switch (user.membershipType) {
      case 'retailer':
        return 'retailer';
      case 'manufacturer':
        return 'manufacturer';
      case 'pro_competitor':
      case 'competitor':
        return 'used_equipment';
      case 'admin':
        return 'retailer'; // Admin can create any type but default to retailer
      default:
        return null;
    }
  };

  const listingType = getListingType();
  
  // Form data based on listing type
  const [formData, setFormData] = useState<any>(() => {
    const baseData = {
      contact_name: user?.name || '',
      email: user?.email || '',
      phone: '',
      description: '',
    };

    if (listingType === 'used_equipment') {
      return {
        ...baseData,
        listing_category: 'product',
        equipment_category: '',
        brand: '',
        model: '',
        year: '',
        condition: 'good',
        price: '',
        is_negotiable: false,
        wattage: '',
        ohms: '',
        size: '',
        external_url: '', // eBay, PayPal, etc
        shipping_available: false,
        local_pickup_only: false,
        images: [] as string[],
      };
    } else {
      return {
        ...baseData,
        listing_category: 'business',
        business_name: '',
        website: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        country: 'USA',
        hours: {},
        services: [],
        brands_carried: [],
        specialties: [],
        certifications: [],
        established_year: '',
        social_media: {},
      };
    }
  });

  useEffect(() => {
    if (user) {
      checkListingUsage();
    }
  }, [user]);

  const checkListingUsage = async () => {
    if (!user) return;
    
    // Skip limits for retailers and manufacturers
    if (user.membershipType === 'retailer' || user.membershipType === 'manufacturer' || user.membershipType === 'admin') {
      return;
    }

    try {
      // For now, just count existing listings until the quota tables are created
      const { data: existingListings, error: countError } = await supabase
        .from('directory_listings')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const currentCount = existingListings?.length || 0;
      const maxAllowed = 2; // Default limit for pro_competitors

      setListingUsage({
        current_listings: currentCount,
        max_listings: maxAllowed
      });

      if (currentCount >= maxAllowed) {
        setShowLimitExceeded(true);
      }
    } catch (error) {
      console.error('Error checking usage:', error);
      // Set default values on error
      setListingUsage({
        current_listings: 0,
        max_listings: 2
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxImages = listingType === 'used_equipment' ? 3 : 5;
    if (uploadedImages.length >= maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    // TODO: Implement actual image upload to Supabase storage
    const newImages = Array.from(files).map(file => URL.createObjectURL(file));
    setUploadedImages(prev => [...prev, ...newImages].slice(0, maxImages));
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showLimitExceeded) {
      toast.error('You have reached your listing limit. Please upgrade to create more listings.');
      return;
    }

    setIsLoading(true);

    try {
      const listingData: any = {
        user_id: user?.id,
        listing_type: listingType,
        listing_category: listingType === 'used_equipment' ? 'product' : 'business',
        status: 'active', // Auto-approve for now, can change to 'pending' for review
        ...formData
      };

      // Convert price to number if it's for equipment
      if (listingType === 'used_equipment' && formData.price) {
        listingData.price = parseFloat(formData.price);
      }

      const { data, error } = await supabase
        .from('directory_listings')
        .insert([listingData])
        .select()
        .single();

      if (error) {
        console.error('Error creating listing:', error);
        toast.error(error.message || 'Failed to create listing');
        return;
      }

      toast.success('Listing created successfully!');
      navigate('/my-listings');
    } catch (error) {
      console.error('Error creating listing:', error);
      toast.error('Failed to create listing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!listingType) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Membership Required</h2>
          <p className="text-gray-400 mb-6">
            Your membership type doesn't allow creating listings.
          </p>
          <Link
            to="/pricing"
            className="bg-electric-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-electric-600 transition-all"
          >
            View Membership Options
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/my-listings"
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to My Listings</span>
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">
          {listingType === 'used_equipment' ? 'List Equipment for Sale' : 'Create Business Listing'}
        </h1>
        <p className="text-gray-400 mb-8">
          {listingType === 'used_equipment' 
            ? 'List your used car audio equipment for sale to other members'
            : 'Add your business to our directory to reach car audio enthusiasts'
          }
        </p>

        {/* Usage Limit Card for Pro Competitors */}
        {listingUsage && listingUsage.max_listings && (
          <div className={`rounded-xl p-4 mb-6 ${
            showLimitExceeded 
              ? 'bg-red-500/10 border border-red-500/30' 
              : 'bg-gray-800/50 border border-gray-700/50'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${showLimitExceeded ? 'text-red-400' : 'text-white'}`}>
                  Listing Usage: {listingUsage.current_listings} / {listingUsage.max_listings}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {listingUsage.max_listings - listingUsage.current_listings} slots remaining
                </p>
              </div>
              {showLimitExceeded && (
                <Link
                  to="/pricing"
                  className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors text-sm"
                >
                  Get More Listings
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {listingType === 'used_equipment' ? (
            <>
              {/* Equipment Details */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Equipment Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">Equipment Type *</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {EQUIPMENT_CATEGORIES.map(cat => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, equipment_category: cat.value }))}
                          className={`p-3 rounded-lg border-2 transition-all flex items-center space-x-2 ${
                            formData.equipment_category === cat.value
                              ? 'border-electric-500 bg-electric-500/10 text-white'
                              : 'border-gray-600 hover:border-gray-500 text-gray-300'
                          }`}
                        >
                          <cat.icon className="h-5 w-5" />
                          <span className="text-sm">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Brand *</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      placeholder="e.g., JL Audio, Rockford Fosgate"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Model *</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      placeholder="e.g., 12W7AE-3"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Year (optional)</label>
                    <input
                      type="text"
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      placeholder="e.g., 2023"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Condition *</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    >
                      {CONDITION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Specifications based on equipment type */}
                  {(formData.equipment_category === 'subwoofer' || formData.equipment_category === 'amplifier') && (
                    <>
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">RMS Wattage</label>
                        <input
                          type="text"
                          value={formData.wattage}
                          onChange={(e) => setFormData(prev => ({ ...prev, wattage: e.target.value }))}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                          placeholder="e.g., 1000W RMS"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Impedance (Ohms)</label>
                        <input
                          type="text"
                          value={formData.ohms}
                          onChange={(e) => setFormData(prev => ({ ...prev, ohms: e.target.value }))}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                          placeholder="e.g., 2Ω, 4Ω"
                        />
                      </div>
                    </>
                  )}

                  {formData.equipment_category === 'subwoofer' && (
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Size</label>
                      <input
                        type="text"
                        value={formData.size}
                        onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                        placeholder='e.g., 12", 15"'
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      rows={4}
                      placeholder="Describe the item's condition, any modifications, reason for selling..."
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Shipping */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Pricing & Shipping</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Price (USD) *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                        placeholder="500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_negotiable}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_negotiable: e.target.checked }))}
                        className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded"
                      />
                      <span className="text-gray-300">Price is negotiable</span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.shipping_available}
                        onChange={(e) => setFormData(prev => ({ ...prev, shipping_available: e.target.checked }))}
                        className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded"
                      />
                      <span className="text-gray-300">Shipping available</span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.local_pickup_only}
                        onChange={(e) => setFormData(prev => ({ ...prev, local_pickup_only: e.target.checked }))}
                        className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded"
                      />
                      <span className="text-gray-300">Local pickup only</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Contact Information</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Choose how buyers can contact you. At least one method is required.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      <Phone className="inline h-4 w-4 mr-1" />
                      Phone (optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      <Mail className="inline h-4 w-4 mr-1" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">
                      <Globe className="inline h-4 w-4 mr-1" />
                      External Listing URL (optional)
                    </label>
                    <input
                      type="url"
                      value={formData.external_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, external_url: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      placeholder="eBay, Reverb, Facebook Marketplace URL..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Link to your listing on another platform if you prefer handling transactions there
                    </p>
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Product Images</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Add up to 3 images of your equipment
                </p>

                <div className="grid grid-cols-3 gap-4">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img src={img} alt="" className="w-full h-32 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  
                  {uploadedImages.length < 3 && (
                    <label className="border-2 border-dashed border-gray-600 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:border-electric-500 transition-colors">
                      <Image className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-400">Add Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Business Information */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Business Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">Business Name *</label>
                    <input
                      type="text"
                      value={formData.business_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Phone *</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      rows={4}
                      placeholder="Tell customers about your business, services, and specialties..."
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">
                  <MapPin className="inline h-5 w-5 mr-2" />
                  Location
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">Street Address *</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">City *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">State *</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">ZIP Code *</label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Services & Specialties */}
              {listingType === 'retailer' && (
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-6">
                    <Wrench className="inline h-5 w-5 mr-2" />
                    Services & Specialties
                  </h2>
                  
                  <div className="space-y-4">
                    <p className="text-gray-400 text-sm">
                      Select the services you offer (check all that apply)
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        'Installation',
                        'Custom Fabrication',
                        'Sound Deadening',
                        'System Design',
                        'Tuning & DSP',
                        'Remote Start',
                        'Window Tinting',
                        'Lighting',
                        'Security Systems'
                      ].map(service => (
                        <label key={service} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.services?.includes(service)}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                services: e.target.checked
                                  ? [...(prev.services || []), service]
                                  : (prev.services || []).filter(s => s !== service)
                              }));
                            }}
                            className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded"
                          />
                          <span className="text-gray-300">{service}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <Link
              to="/my-listings"
              className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading || showLimitExceeded}
              className="px-6 py-3 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="h-5 w-5" />
              )}
              <span>{isLoading ? 'Creating...' : 'Create Listing'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}