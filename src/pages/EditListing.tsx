import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { 
  ArrowLeft, Save, Loader2, MapPin, Globe, Phone, Mail, 
  Image, X, DollarSign, Plus, Trash2, Clock, Wrench,
  Package, CheckCircle, XCircle
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
}

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listingType, setListingType] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageMode, setImageMode] = useState<'upload' | 'urls'>('upload');
  const [imageUrls, setImageUrls] = useState<string[]>(['', '', '']);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductSection, setShowProductSection] = useState(false);
  const [showMap, setShowMap] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    contact_name: '',
    email: '',
    phone: '',
    description: '',
    // Equipment fields
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
    external_url: '',
    shipping_available: false,
    local_pickup_only: false,
    // Business fields
    business_name: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'USA',
    latitude: null,
    longitude: null,
    services_offered: [],
    installation_services: false,
    custom_fabrication: false,
    sound_deadening: false,
    tuning_services: false,
    business_hours: {
      monday: { open: '9:00 AM', close: '6:00 PM', closed: false },
      tuesday: { open: '9:00 AM', close: '6:00 PM', closed: false },
      wednesday: { open: '9:00 AM', close: '6:00 PM', closed: false },
      thursday: { open: '9:00 AM', close: '6:00 PM', closed: false },
      friday: { open: '9:00 AM', close: '6:00 PM', closed: false },
      saturday: { open: '10:00 AM', close: '4:00 PM', closed: false },
      sunday: { open: '', close: '', closed: true }
    },
    status: 'active',
  });

  useEffect(() => {
    if (!user || !id) {
      navigate('/my-listings');
      return;
    }
    loadListing();
  }, [user, id]);

  const loadListing = async () => {
    try {
      // Check if user is admin to allow editing any listing
      const isAdmin = user?.membershipType === 'admin';
      
      let query = supabase
        .from('directory_listings')
        .select('*')
        .eq('id', id);
      
      // Only filter by user_id if not admin
      if (!isAdmin) {
        query = query.eq('user_id', user!.id);
      }
      
      const { data, error } = await query.single();

      if (error) throw error;

      if (!data) {
        toast.error('Listing not found');
        navigate('/my-listings');
        return;
      }

      setListingType(data.listing_type || data.listing_category);
      
      // Load existing images if present
      if (data.listing_images && Array.isArray(data.listing_images)) {
        const images = data.listing_images.filter((img: any) => img.type === 'external');
        if (images.length > 0) {
          setImageMode('urls');
          setImageUrls(images.map((img: any) => img.url).concat(['', '', '']).slice(0, 3));
        }
      }
      
      // Load products if present
      if (data.products && Array.isArray(data.products)) {
        setProducts(data.products);
        setShowProductSection(data.products.length > 0);
      }
      
      // Map the data to form fields
      setFormData({
        contact_name: data.contact_name || user?.name || '',
        email: data.email || data.contact_email || user?.email || '',
        phone: data.phone || data.contact_phone || '',
        description: data.description || data.item_description || '',
        // Equipment fields
        equipment_category: data.equipment_category || data.category || '',
        brand: data.brand || '',
        model: data.model || '',
        year: data.year || '',
        condition: data.condition || 'good',
        price: data.price || data.item_price || '',
        is_negotiable: data.is_negotiable || false,
        wattage: data.wattage || '',
        ohms: data.ohms || '',
        size: data.size || '',
        external_url: data.external_url || data.website || '',
        shipping_available: data.shipping_available || false,
        local_pickup_only: data.local_pickup_only || false,
        // Business fields
        business_name: data.business_name || '',
        website: data.website || '',
        address: data.address || data.address_line1 || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || data.postal_code || '',
        country: data.country || 'USA',
        latitude: data.latitude,
        longitude: data.longitude,
        services_offered: data.services_offered || [],
        installation_services: data.installation_services || false,
        custom_fabrication: data.custom_fabrication || false,
        sound_deadening: data.sound_deadening || false,
        tuning_services: data.tuning_services || false,
        business_hours: data.business_hours || formData.business_hours,
        status: data.status || 'active',
      });

      // Show map if location data exists
      if (data.latitude && data.longitude) {
        setShowMap(true);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading listing:', error);
      toast.error('Failed to load listing');
      navigate('/my-listings');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxImages = 3;
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
    const updatedProducts = [...products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    setProducts(updatedProducts);
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const geocodeAddress = async () => {
    const address = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip_code}`;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        setFormData((prev: any) => ({
          ...prev,
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        }));
        setShowMap(true);
        toast.success('Location coordinates updated');
      } else {
        toast.error('Could not find location coordinates');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Failed to geocode address');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id || !user) return;
    
    // Validate phone or email requirement for equipment listings
    if ((listingType === 'used_equipment' || listingType === 'product') && !formData.phone && !formData.email) {
      toast.error('Please provide at least one contact method (phone or email)');
      return;
    }

    setSaving(true);

    try {
      const updateData: any = {
        contact_name: formData.contact_name,
        email: formData.email,
        phone: formData.phone,
        description: formData.description,
        status: formData.status,
        updated_at: new Date().toISOString()
      };

      // Add fields based on listing type
      if (listingType === 'used_equipment' || listingType === 'product') {
        updateData.equipment_category = formData.equipment_category;
        updateData.brand = formData.brand;
        updateData.model = formData.model;
        updateData.year = formData.year;
        updateData.condition = formData.condition;
        updateData.price = parseFloat(formData.price) || 0;
        updateData.is_negotiable = formData.is_negotiable;
        updateData.wattage = formData.wattage;
        updateData.ohms = formData.ohms;
        updateData.size = formData.size;
        updateData.external_url = formData.external_url;
        updateData.shipping_available = formData.shipping_available;
        updateData.local_pickup_only = formData.local_pickup_only;
        updateData.item_title = `${formData.brand} ${formData.model}`;
        updateData.item_description = formData.description;
        updateData.item_price = parseFloat(formData.price) || 0;
        
        // Add images based on mode
        if (imageMode === 'urls') {
          const validUrls = imageUrls.filter(url => url.trim() !== '');
          if (validUrls.length > 0) {
            updateData.listing_images = validUrls.map(url => ({ url, type: 'external' }));
          }
        } else if (uploadedImages.length > 0) {
          // TODO: Upload to Supabase storage and get URLs
          updateData.listing_images = uploadedImages.map(url => ({ url, type: 'uploaded' }));
        }
      } else {
        // Business listing
        updateData.business_name = formData.business_name;
        updateData.website = formData.website;
        updateData.address_line1 = formData.address;
        updateData.city = formData.city;
        updateData.state = formData.state;
        updateData.postal_code = formData.zip_code;
        updateData.country = formData.country;
        updateData.latitude = formData.latitude;
        updateData.longitude = formData.longitude;
        updateData.services_offered = formData.services_offered;
        updateData.installation_services = formData.installation_services;
        updateData.custom_fabrication = formData.custom_fabrication;
        updateData.sound_deadening = formData.sound_deadening;
        updateData.tuning_services = formData.tuning_services;
        updateData.business_hours = formData.business_hours;
        
        // Add products if any
        if (showProductSection && products.length > 0) {
          updateData.products = products.filter(p => p.name && p.price);
        }
        
        // Add business images
        if (imageMode === 'urls') {
          const validUrls = imageUrls.filter(url => url.trim() !== '');
          if (validUrls.length > 0) {
            updateData.listing_images = validUrls.map(url => ({ url, type: 'external' }));
          }
        } else if (uploadedImages.length > 0) {
          updateData.listing_images = uploadedImages.map(url => ({ url, type: 'uploaded' }));
        }
      }

      const { error } = await supabase
        .from('directory_listings')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Listing updated successfully');
      navigate('/my-listings');
    } catch (error: any) {
      console.error('Error updating listing:', error);
      toast.error(error.message || 'Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
        <PageHeader
          title="Edit Listing"
          subtitle="Loading..."
        />
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <Loader2 className="h-8 w-8 text-electric-500 animate-spin" />
        </div>
      </div>
    );
  }

  const isEquipmentListing = listingType === 'used_equipment' || listingType === 'product';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
      <PageHeader
        title="Edit Listing"
        subtitle="Update your listing details"
      />

      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/my-listings')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to My Listings</span>
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Active/Inactive Toggle */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Listing Status</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Control whether your listing is visible to the public
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData((prev: any) => ({ 
                  ...prev, 
                  status: prev.status === 'active' ? 'inactive' : 'active' 
                }))}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  formData.status === 'active'
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {formData.status === 'active' ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>Active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    <span>Inactive</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isEquipmentListing ? (
            <>
              {/* Equipment form fields - same as before */}
              {/* ... equipment fields ... */}
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
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, business_name: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Phone *</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, email: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, website: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      placeholder="https://www.example.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      rows={4}
                      placeholder="Tell customers about your business, specialties, and what sets you apart..."
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Services Offered */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">
                  <Wrench className="inline h-5 w-5 mr-2" />
                  Services Offered
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.installation_services}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, installation_services: e.target.checked }))}
                      className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded"
                    />
                    <span className="text-gray-300">Installation Services</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.custom_fabrication}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, custom_fabrication: e.target.checked }))}
                      className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded"
                    />
                    <span className="text-gray-300">Custom Fabrication</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sound_deadening}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, sound_deadening: e.target.checked }))}
                      className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded"
                    />
                    <span className="text-gray-300">Sound Deadening</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.tuning_services}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, tuning_services: e.target.checked }))}
                      className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded"
                    />
                    <span className="text-gray-300">Tuning Services</span>
                  </label>
                </div>
              </div>

              {/* Business Hours */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">
                  <Clock className="inline h-5 w-5 mr-2" />
                  Business Hours
                </h2>
                
                <div className="space-y-4">
                  {Object.entries(formData.business_hours).map(([day, hours]: [string, any]) => (
                    <div key={day} className="flex items-center space-x-4">
                      <span className="w-24 text-gray-400 capitalize">{day}:</span>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={!hours.closed}
                          onChange={(e) => {
                            const newHours = { ...formData.business_hours };
                            newHours[day].closed = !e.target.checked;
                            setFormData((prev: any) => ({ ...prev, business_hours: newHours }));
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-300">Open</span>
                      </label>
                      {!hours.closed && (
                        <>
                          <input
                            type="text"
                            value={hours.open}
                            onChange={(e) => {
                              const newHours = { ...formData.business_hours };
                              newHours[day].open = e.target.value;
                              setFormData((prev: any) => ({ ...prev, business_hours: newHours }));
                            }}
                            className="px-3 py-1 bg-gray-700/50 border border-gray-600 rounded text-white"
                            placeholder="9:00 AM"
                          />
                          <span className="text-gray-400">to</span>
                          <input
                            type="text"
                            value={hours.close}
                            onChange={(e) => {
                              const newHours = { ...formData.business_hours };
                              newHours[day].close = e.target.value;
                              setFormData((prev: any) => ({ ...prev, business_hours: newHours }));
                            }}
                            className="px-3 py-1 bg-gray-700/50 border border-gray-600 rounded text-white"
                            placeholder="6:00 PM"
                          />
                        </>
                      )}
                    </div>
                  ))}
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
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, address: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">City *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, city: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">State *</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, state: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">ZIP Code *</label>
                    <input
                      type="text"
                      value={formData.zip_code}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, zip_code: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={geocodeAddress}
                      className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
                    >
                      Update Map Location
                    </button>
                  </div>

                  {showMap && formData.latitude && formData.longitude && (
                    <div className="md:col-span-2 h-64 bg-gray-700 rounded-lg overflow-hidden">
                      <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${formData.longitude-0.01},${formData.latitude-0.01},${formData.longitude+0.01},${formData.latitude+0.01}&layer=mapnik&marker=${formData.latitude},${formData.longitude}`}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Business Images */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Business Images</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Add up to 3 images of your business
                </p>

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

              {/* Products Section */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      <Package className="inline h-5 w-5 mr-2" />
                      Featured Products
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                      Showcase up to 6 products or services
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProductSection(!showProductSection)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    {showProductSection ? 'Hide Products' : 'Show Products'}
                  </button>
                </div>

                {showProductSection && (
                  <div className="space-y-4">
                    {products.map((product, index) => (
                      <div key={index} className="p-4 bg-gray-700/30 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-white font-medium">Product {index + 1}</h3>
                          <button
                            type="button"
                            onClick={() => removeProduct(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-400 text-sm mb-2">Product Name</label>
                            <input
                              type="text"
                              value={product.name}
                              onChange={(e) => updateProduct(index, 'name', e.target.value)}
                              className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded text-white"
                              placeholder="e.g., JL Audio 12W7"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-gray-400 text-sm mb-2">Price</label>
                            <div className="relative">
                              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                type="number"
                                value={product.price}
                                onChange={(e) => updateProduct(index, 'price', parseFloat(e.target.value) || 0)}
                                className="w-full pl-8 pr-2 py-2 bg-gray-700/50 border border-gray-600 rounded text-white"
                                placeholder="500"
                              />
                            </div>
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-gray-400 text-sm mb-2">Description</label>
                            <textarea
                              value={product.description}
                              onChange={(e) => updateProduct(index, 'description', e.target.value)}
                              className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded text-white"
                              rows={2}
                              placeholder="Brief description of the product..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {products.length < 6 && (
                      <button
                        type="button"
                        onClick={addProduct}
                        className="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-electric-500 hover:text-electric-500 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Plus className="h-5 w-5" />
                        <span>Add Product</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/my-listings')}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-electric-600 to-purple-600 text-white rounded-lg hover:from-electric-500 hover:to-purple-500 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}