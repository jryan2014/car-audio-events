import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Upload, MapPin, Phone, Mail, Globe, 
  Building, Package, DollarSign, Info, CheckCircle, AlertCircle,
  Star, Clock, Users, Wrench, Volume2, Zap, Cpu, Battery,
  Cable, Box, Tag, Image, X, Loader2, Plus, Trash2, Package2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';

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

const SERVICES_OPTIONS = [
  { value: 'installation', label: 'Installation Services' },
  { value: 'fabrication', label: 'Custom Fabrication' },
  { value: 'sound_deadening', label: 'Sound Deadening' },
  { value: 'tuning', label: 'System Tuning' },
  { value: 'design', label: 'System Design' },
  { value: 'repair', label: 'Repair Services' }
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface ListingUsage {
  current_listings: number;
  max_listings: number | null;
}

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
}

export default function CreateDirectoryListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [listingUsage, setListingUsage] = useState<ListingUsage | null>(null);
  const [showLimitExceeded, setShowLimitExceeded] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageMode, setImageMode] = useState<'upload' | 'urls'>('upload');
  const [imageUrls, setImageUrls] = useState<string[]>(['', '', '']);
  const [products, setProducts] = useState<Product[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [mapUrl, setMapUrl] = useState('');
  
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
      status: 'active'
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
      // Business listing (retailer/manufacturer)
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
        latitude: null,
        longitude: null,
        hours: {
          Monday: { open: '9:00 AM', close: '6:00 PM', closed: false },
          Tuesday: { open: '9:00 AM', close: '6:00 PM', closed: false },
          Wednesday: { open: '9:00 AM', close: '6:00 PM', closed: false },
          Thursday: { open: '9:00 AM', close: '6:00 PM', closed: false },
          Friday: { open: '9:00 AM', close: '6:00 PM', closed: false },
          Saturday: { open: '10:00 AM', close: '4:00 PM', closed: false },
          Sunday: { open: '', close: '', closed: true }
        },
        services: [],
        brands_carried: [],
        specialties: [],
        certifications: [],
        established_year: '',
        social_media: {},
        products: []
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

  const geocodeAddress = async () => {
    if (!formData.address || !formData.city || !formData.state) {
      toast.error('Please enter address, city, and state first');
      return;
    }

    setGeocoding(true);
    try {
      const query = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        
        setFormData((prev: any) => ({
          ...prev,
          latitude: lat,
          longitude: lon
        }));

        // Generate map URL
        const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01},${lat-0.01},${lon+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lon}`;
        setMapUrl(mapEmbedUrl);
        
        toast.success('Location found and mapped!');
      } else {
        toast.error('Could not find location. Please check the address.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Failed to geocode address');
    } finally {
      setGeocoding(false);
    }
  };

  const addProduct = () => {
    if (products.length >= 6) {
      toast.error('Maximum 6 products allowed');
      return;
    }
    
    setProducts([...products, {
      name: '',
      description: '',
      price: 0,
      images: [],
      category: ''
    }]);
  };

  const updateProduct = (index: number, field: string, value: any) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setProducts(newProducts);
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showLimitExceeded) {
      toast.error('You have reached your listing limit. Please upgrade to create more listings.');
      return;
    }

    // Validate phone or email requirement
    if (listingType === 'used_equipment' && !formData.phone && !formData.email) {
      toast.error('Please provide at least one contact method (phone or email)');
      return;
    }

    setIsLoading(true);

    try {
      const listingData: any = {
        user_id: user?.id,
        listing_type: listingType,
        listing_category: listingType === 'used_equipment' ? 'product' : 'business',
        status: 'active',
        ...formData
      };

      // Add images based on mode
      if (imageMode === 'urls') {
        const validUrls = imageUrls.filter(url => url.trim() !== '');
        if (validUrls.length > 0) {
          listingData.listing_images = validUrls.map(url => ({ url, type: 'external' }));
        }
      } else if (uploadedImages.length > 0) {
        listingData.listing_images = uploadedImages.map(url => ({ url, type: 'uploaded' }));
      }

      // Convert price to number if it's for equipment
      if (listingType === 'used_equipment' && formData.price) {
        listingData.price = parseFloat(formData.price);
      }

      // Add products for business listings
      if ((listingType === 'retailer' || listingType === 'manufacturer') && products.length > 0) {
        listingData.products = products;
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
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
        <PageHeader 
          title="Create Directory Listing"
          subtitle="Share your products and services with the community"
        />
        <div className="container mx-auto px-4 py-8 pt-32">
          <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6">
            <h3 className="text-red-400 font-bold mb-2">Access Denied</h3>
            <p className="text-gray-400">
              Your membership type does not allow creating directory listings. 
              Please upgrade to a Pro Competitor, Retailer, or Manufacturer membership.
            </p>
            <Link to="/pricing" className="text-electric-500 hover:text-electric-400 mt-4 inline-block">
              View Membership Options →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check if limit exceeded for pro competitors
  if (showLimitExceeded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
        <PageHeader 
          title="Listing Limit Reached"
          subtitle="Upgrade to create more listings"
        />
        <div className="container mx-auto px-4 py-8 pt-32">
          <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-xl p-6">
            <h3 className="text-yellow-400 font-bold mb-2">Listing Limit Reached</h3>
            <p className="text-gray-400">
              You have reached your maximum of {listingUsage?.max_listings} listings. 
              To create more listings, please upgrade your membership or remove an existing listing.
            </p>
            <div className="mt-4 space-x-4">
              <Link to="/my-listings" className="text-electric-500 hover:text-electric-400">
                Manage Listings →
              </Link>
              <Link to="/pricing" className="text-electric-500 hover:text-electric-400">
                Upgrade Membership →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isEquipmentListing = listingType === 'used_equipment';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
      <PageHeader 
        title="Create Directory Listing"
        subtitle={isEquipmentListing ? "List your equipment for sale" : "Add your business to the directory"}
      />

      <div className="container mx-auto px-4 py-8 pt-32">
        <button
          onClick={() => navigate('/directory')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Directory</span>
        </button>

        {/* Usage Info for Pro Competitors */}
        {listingUsage && user?.membershipType === 'pro_competitor' && (
          <div className="bg-blue-900/20 border border-blue-500/50 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-blue-400" />
              <span className="text-gray-300">
                You have {listingUsage.current_listings} of {listingUsage.max_listings} listings
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isEquipmentListing ? (
            <>
              {/* Equipment Listing Form */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Equipment Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Category *</label>
                    <select
                      value={formData.equipment_category}
                      onChange={(e) => setFormData(prev => ({ ...prev, equipment_category: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    >
                      <option value="">Select Category</option>
                      {EQUIPMENT_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
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

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Brand *</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
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
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Year</label>
                    <input
                      type="text"
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      placeholder="2024"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Price *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full pl-10 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                        placeholder="500"
                        required
                      />
                    </div>
                  </div>

                  {/* Specifications */}
                  {(formData.equipment_category === 'amplifier' || formData.equipment_category === 'subwoofer') && (
                    <>
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Wattage</label>
                        <input
                          type="text"
                          value={formData.wattage}
                          onChange={(e) => setFormData(prev => ({ ...prev, wattage: e.target.value }))}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                          placeholder="1000W RMS"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Impedance (Ohms)</label>
                        <input
                          type="text"
                          value={formData.ohms}
                          onChange={(e) => setFormData(prev => ({ ...prev, ohms: e.target.value }))}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                          placeholder="2 Ohm"
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
                        placeholder='12"'
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
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">External Listing URL</label>
                    <input
                      type="url"
                      value={formData.external_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, external_url: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      placeholder="eBay, Facebook Marketplace, PayPal, etc."
                    />
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.is_negotiable}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_negotiable: e.target.checked }))}
                        className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                      />
                      <span className="text-gray-300">Price is negotiable</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.shipping_available}
                        onChange={(e) => setFormData(prev => ({ ...prev, shipping_available: e.target.checked }))}
                        className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                      />
                      <span className="text-gray-300">Shipping available</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.local_pickup_only}
                        onChange={(e) => setFormData(prev => ({ ...prev, local_pickup_only: e.target.checked }))}
                        className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                      />
                      <span className="text-gray-300">Local pickup only</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Contact Information</h2>
                <p className="text-gray-400 text-sm mb-4">At least one contact method is required (phone or email)</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Contact Name *</label>
                    <input
                      type="text"
                      value={formData.contact_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Images Section */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Product Images (Max 3)</h2>

                {/* Image Mode Toggle */}
                <div className="flex space-x-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setImageMode('upload')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      imageMode === 'upload'
                        ? 'bg-electric-500 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    Upload Images
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode('urls')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      imageMode === 'urls'
                        ? 'bg-electric-500 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    External URLs
                  </button>
                </div>

                {imageMode === 'upload' ? (
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
                ) : (
                  <div className="space-y-4">
                    {[0, 1, 2].map((idx) => (
                      <div key={idx}>
                        <label className="block text-gray-400 text-sm mb-2">
                          Image URL {idx + 1}
                        </label>
                        <input
                          type="url"
                          value={imageUrls[idx]}
                          onChange={(e) => {
                            const newUrls = [...imageUrls];
                            newUrls[idx] = e.target.value;
                            setImageUrls(newUrls);
                          }}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    ))}
                  </div>
                )}
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
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Location</h2>
                
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

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={geocodeAddress}
                      disabled={geocoding}
                      className="flex items-center space-x-2 px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50"
                    >
                      {geocoding ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Locating...</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-5 w-5" />
                          <span>Find on Map</span>
                        </>
                      )}
                    </button>

                    {mapUrl && (
                      <div className="mt-4">
                        <iframe
                          src={mapUrl}
                          width="100%"
                          height="300"
                          className="rounded-lg border border-gray-700"
                          title="Business Location"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Business Hours</h2>
                
                <div className="space-y-4">
                  {DAYS_OF_WEEK.map(day => (
                    <div key={day} className="flex items-center space-x-4">
                      <div className="w-24">
                        <span className="text-gray-300">{day}</span>
                      </div>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.hours[day].closed}
                          onChange={(e) => {
                            const newHours = { ...formData.hours };
                            newHours[day].closed = e.target.checked;
                            setFormData(prev => ({ ...prev, hours: newHours }));
                          }}
                          className="rounded border-gray-600 text-electric-500"
                        />
                        <span className="text-gray-400 text-sm">Closed</span>
                      </label>

                      {!formData.hours[day].closed && (
                        <>
                          <input
                            type="text"
                            value={formData.hours[day].open}
                            onChange={(e) => {
                              const newHours = { ...formData.hours };
                              newHours[day].open = e.target.value;
                              setFormData(prev => ({ ...prev, hours: newHours }));
                            }}
                            placeholder="9:00 AM"
                            className="w-32 p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm"
                          />
                          <span className="text-gray-400">to</span>
                          <input
                            type="text"
                            value={formData.hours[day].close}
                            onChange={(e) => {
                              const newHours = { ...formData.hours };
                              newHours[day].close = e.target.value;
                              setFormData(prev => ({ ...prev, hours: newHours }));
                            }}
                            placeholder="6:00 PM"
                            className="w-32 p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Services Offered */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Services Offered</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SERVICES_OPTIONS.map(service => (
                    <label key={service.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.services.includes(service.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              services: [...prev.services, service.value] 
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              services: prev.services.filter(s => s !== service.value) 
                            }));
                          }
                        }}
                        className="rounded border-gray-600 text-electric-500"
                      />
                      <span className="text-gray-300">{service.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Product Showcase (Retailers only) */}
              {listingType === 'retailer' && (
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Product Showcase</h2>
                    <button
                      type="button"
                      onClick={addProduct}
                      disabled={products.length >= 6}
                      className="flex items-center space-x-2 px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50"
                    >
                      <Plus className="h-5 w-5" />
                      <span>Add Product</span>
                    </button>
                  </div>

                  {products.length === 0 ? (
                    <p className="text-gray-400">Add up to 6 featured products to showcase</p>
                  ) : (
                    <div className="space-y-4">
                      {products.map((product, idx) => (
                        <div key={idx} className="border border-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-4">
                            <h3 className="text-white font-medium">Product {idx + 1}</h3>
                            <button
                              type="button"
                              onClick={() => removeProduct(idx)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                              type="text"
                              value={product.name}
                              onChange={(e) => updateProduct(idx, 'name', e.target.value)}
                              placeholder="Product Name"
                              className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                            />

                            <input
                              type="number"
                              value={product.price}
                              onChange={(e) => updateProduct(idx, 'price', e.target.value)}
                              placeholder="Price"
                              className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                            />

                            <div className="md:col-span-2">
                              <textarea
                                value={product.description}
                                onChange={(e) => updateProduct(idx, 'description', e.target.value)}
                                placeholder="Product Description"
                                className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Business Images */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Business Images (Max 3)</h2>

                {/* Image Mode Toggle */}
                <div className="flex space-x-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setImageMode('upload')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      imageMode === 'upload'
                        ? 'bg-electric-500 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    Upload Images
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode('urls')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      imageMode === 'urls'
                        ? 'bg-electric-500 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    External URLs
                  </button>
                </div>

                {imageMode === 'upload' ? (
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
                ) : (
                  <div className="space-y-4">
                    {[0, 1, 2].map((idx) => (
                      <div key={idx}>
                        <label className="block text-gray-400 text-sm mb-2">
                          Image URL {idx + 1}
                        </label>
                        <input
                          type="url"
                          value={imageUrls[idx]}
                          onChange={(e) => {
                            const newUrls = [...imageUrls];
                            newUrls[idx] = e.target.value;
                            setImageUrls(newUrls);
                          }}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/directory')}
              className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Create Listing</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}