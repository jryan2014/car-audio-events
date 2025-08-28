import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, Save, Loader2, MapPin, Globe, Phone, Mail, DollarSign, 
  Volume2, Zap, Cpu, Battery, Cable, Box, Tag, Package, Image, X, Wrench
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
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

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listingType, setListingType] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  
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
    services: [],
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
      const { data, error } = await supabase
        .from('directory_listings')
        .select('*')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error('Listing not found');
        navigate('/my-listings');
        return;
      }

      setListingType(data.listing_type || data.listing_category);
      
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
        services: data.services || data.services_offered || [],
      });
    } catch (error) {
      console.error('Error loading listing:', error);
      toast.error('Failed to load listing');
      navigate('/my-listings');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxImages = listingType === 'used_equipment' || listingType === 'product' ? 3 : 5;
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
    
    if (!id || !user) return;

    setSaving(true);
    try {
      const updateData: any = {
        email: formData.email,
        phone: formData.phone,
        description: formData.description,
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
      } else {
        updateData.business_name = formData.business_name;
        updateData.website = formData.website;
        updateData.address = formData.address;
        updateData.city = formData.city;
        updateData.state = formData.state;
        updateData.zip_code = formData.zip_code;
        updateData.country = formData.country;
        updateData.services = formData.services;
      }

      const { error } = await supabase
        .from('directory_listings')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Listing updated successfully');
      navigate('/my-listings');
    } catch (error) {
      console.error('Error updating listing:', error);
      toast.error('Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const isEquipmentListing = listingType === 'used_equipment' || listingType === 'product';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <PageHeader
        title="Edit Listing"
        subtitle="Update your listing details"
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/my-listings')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to My Listings</span>
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isEquipmentListing ? (
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
                          onClick={() => setFormData((prev: any) => ({ ...prev, equipment_category: cat.value }))}
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
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, brand: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Model *</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, model: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Condition *</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, condition: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      required
                    >
                      {CONDITION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Price (USD) *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, price: e.target.value }))}
                        className="w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      rows={4}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Contact & Shipping */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Contact & Shipping</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      <Phone className="inline h-4 w-4 mr-1" />
                      Phone (optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      <Mail className="inline h-4 w-4 mr-1" />
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, email: e.target.value }))}
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
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, external_url: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      placeholder="eBay, Reverb, Facebook Marketplace URL..."
                    />
                  </div>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.shipping_available}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, shipping_available: e.target.checked }))}
                        className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded"
                      />
                      <span className="text-gray-300">Shipping available</span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_negotiable}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, is_negotiable: e.target.checked }))}
                        className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded"
                      />
                      <span className="text-gray-300">Price is negotiable</span>
                    </label>
                  </div>
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
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
                      rows={4}
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
                </div>
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