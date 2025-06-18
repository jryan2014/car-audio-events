import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Upload, MapPin, Phone, Mail, Globe, 
  Building, Package, DollarSign, Info, CheckCircle, AlertCircle,
  Star, Clock, Users
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface DirectoryCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface ListingFormData {
  listing_type: 'retailer' | 'manufacturer' | 'used_equipment';
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  
  // Location
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  
  // Business Info
  description: string;
  established_year: number | null;
  employee_count: string;
  
  // Retailer specific
  services_offered: string[];
  installation_services: boolean;
  custom_fabrication: boolean;
  sound_deadening: boolean;
  tuning_services: boolean;
  
  // Manufacturer specific
  brands_carried: string[];
  preferred_dealers: string[];
  product_categories: string[];
  warranty_info: string;
  
  // Used Equipment specific
  item_title: string;
  item_description: string;
  item_condition: string;
  item_price: number | null;
  item_category_id: string;
  is_negotiable: boolean;
}

export default function CreateDirectoryListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<DirectoryCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  
  const [formData, setFormData] = useState<ListingFormData>({
    listing_type: 'retailer',
    business_name: '',
    contact_name: user?.name || '',
    email: user?.email || '',
    phone: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: 'United States',
    postal_code: '',
    description: '',
    established_year: null,
    employee_count: '',
    services_offered: [],
    installation_services: false,
    custom_fabrication: false,
    sound_deadening: false,
    tuning_services: false,
    brands_carried: [],
    preferred_dealers: [],
    product_categories: [],
    warranty_info: '',
    item_title: '',
    item_description: '',
    item_condition: 'good',
    item_price: null,
    item_category_id: '',
    is_negotiable: true
  });

  // Check if user is authenticated and eligible
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check membership eligibility
  const isEligibleForDirectory = ['retailer', 'manufacturer', 'organization', 'admin'].includes(user.membershipType);
  const canCreateUsedListing = ['competitor', 'retailer', 'manufacturer', 'organization', 'admin'].includes(user.membershipType);

  useEffect(() => {
    loadCategories();
    
    // Set default listing type based on membership
    if (user.membershipType === 'retailer') {
      setFormData(prev => ({ ...prev, listing_type: 'retailer' }));
    } else if (user.membershipType === 'manufacturer') {
      setFormData(prev => ({ ...prev, listing_type: 'manufacturer' }));
    } else if (user.membershipType === 'competitor') {
      setFormData(prev => ({ ...prev, listing_type: 'used_equipment' }));
    }
  }, [user.membershipType]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('directory_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Error loading categories:', error);
      } else {
        setCategories(data || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleArrayInput = (field: keyof ListingFormData, value: string) => {
    if (value.trim()) {
      const items = value.split(',').map(item => item.trim()).filter(item => item);
      setFormData(prev => ({ ...prev, [field]: items }));
    }
  };

  const getAvailableListingTypes = () => {
    const types = [];
    
    if (isEligibleForDirectory) {
      if (user.membershipType === 'retailer' || user.membershipType === 'admin') {
        types.push({ value: 'retailer', label: 'Retailer Business' });
      }
      if (user.membershipType === 'manufacturer' || user.membershipType === 'admin') {
        types.push({ value: 'manufacturer', label: 'Manufacturer' });
      }
    }
    
    if (canCreateUsedListing) {
      types.push({ value: 'used_equipment', label: 'Used Equipment' });
    }
    
    return types;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if competitor is trying to create business listing
    if (user.membershipType === 'competitor' && formData.listing_type !== 'used_equipment') {
      setShowMembershipModal(true);
      return;
    }

    setIsLoading(true);

    try {
      const listingData = {
        user_id: user.id,
        ...formData,
        status: 'pending' // All listings need admin approval
      };

      const { data, error } = await supabase
        .from('directory_listings')
        .insert([listingData])
        .select()
        .single();

      if (error) {
        console.error('Error creating listing:', error);
        alert('Failed to create listing. Please try again.');
        return;
      }

      // Success! Redirect to pending confirmation
      navigate('/directory/pending', { 
        state: { 
          listingId: data.id,
          listingType: formData.listing_type,
          businessName: formData.business_name || formData.item_title
        }
      });

    } catch (error) {
      console.error('Error creating listing:', error);
      alert('Failed to create listing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderRetailerForm = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-400 text-sm mb-2">Services Offered *</label>
          <textarea
            placeholder="Installation, Custom Builds, Sound Quality, SPL Systems (comma separated)"
            onChange={(e) => handleArrayInput('services_offered', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
            rows={3}
            required
          />
          <p className="text-xs text-gray-500 mt-1">Separate multiple services with commas</p>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2">Brands You Carry</label>
          <textarea
            placeholder="JL Audio, Rockford Fosgate, Alpine, Pioneer (comma separated)"
            onChange={(e) => handleArrayInput('brands_carried', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
            rows={3}
          />
        </div>
      </div>

      <div>
        <label className="block text-gray-400 text-sm mb-3">Additional Services</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'installation_services', label: 'Installation Services' },
            { key: 'custom_fabrication', label: 'Custom Fabrication' },
            { key: 'sound_deadening', label: 'Sound Deadening' },
            { key: 'tuning_services', label: 'Tuning Services' }
          ].map(service => (
            <label key={service.key} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData[service.key as keyof ListingFormData] as boolean}
                onChange={(e) => setFormData(prev => ({ ...prev, [service.key]: e.target.checked }))}
                className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
              />
              <span className="text-gray-300 text-sm">{service.label}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );

  const renderManufacturerForm = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-400 text-sm mb-2">Your Brands *</label>
          <textarea
            placeholder="Your brand names (comma separated)"
            onChange={(e) => handleArrayInput('brands_carried', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
            rows={3}
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2">Product Categories</label>
          <textarea
            placeholder="Amplifiers, Speakers, Subwoofers, Head Units (comma separated)"
            onChange={(e) => handleArrayInput('product_categories', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
            rows={3}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-400 text-sm mb-2">Preferred Dealers</label>
          <textarea
            placeholder="Authorized dealer names or where products can be purchased (comma separated)"
            onChange={(e) => handleArrayInput('preferred_dealers', e.target.value)}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2">Warranty Information</label>
          <textarea
            value={formData.warranty_info}
            onChange={(e) => setFormData(prev => ({ ...prev, warranty_info: e.target.value }))}
            placeholder="Warranty terms and coverage details..."
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
            rows={3}
          />
        </div>
      </div>
    </>
  );

  const renderUsedEquipmentForm = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-400 text-sm mb-2">Item Title *</label>
          <input
            type="text"
            value={formData.item_title}
            onChange={(e) => setFormData(prev => ({ ...prev, item_title: e.target.value }))}
            placeholder="e.g., JL Audio 12W7 Subwoofer"
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2">Category</label>
          <select
            value={formData.item_category_id}
            onChange={(e) => setFormData(prev => ({ ...prev, item_category_id: e.target.value }))}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          >
            <option value="">Select Category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-gray-400 text-sm mb-2">Condition *</label>
          <select
            value={formData.item_condition}
            onChange={(e) => setFormData(prev => ({ ...prev, item_condition: e.target.value }))}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            required
          >
            <option value="new">New</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2">Price</label>
          <input
            type="number"
            value={formData.item_price || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, item_price: e.target.value ? Number(e.target.value) : null }))}
            placeholder="0"
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
          />
        </div>

        <div className="flex items-center space-x-2 pt-8">
          <input
            type="checkbox"
            id="negotiable"
            checked={formData.is_negotiable}
            onChange={(e) => setFormData(prev => ({ ...prev, is_negotiable: e.target.checked }))}
            className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
          />
          <label htmlFor="negotiable" className="text-gray-300">Price is negotiable</label>
        </div>
      </div>

      <div>
        <label className="block text-gray-400 text-sm mb-2">Item Description *</label>
        <textarea
          value={formData.item_description}
          onChange={(e) => setFormData(prev => ({ ...prev, item_description: e.target.value }))}
          placeholder="Detailed description of the item, its condition, any modifications, etc..."
          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
          rows={4}
          required
        />
      </div>
    </>
  );

  const availableTypes = getAvailableListingTypes();

  if (availableTypes.length === 0) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Upgrade Required</h2>
            <p className="text-gray-400 mb-6">
              Your current membership doesn't include directory access. 
              Upgrade to a business membership to add your listing to our directory.
            </p>
            <Link
              to="/pricing"
              className="bg-electric-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 inline-flex items-center space-x-2"
            >
              <Star className="h-5 w-5" />
              <span>Upgrade Membership</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              to="/directory"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Add Directory Listing</h1>
              <p className="text-gray-400 mt-1">Share your business or equipment with the community</p>
            </div>
          </div>
        </div>

        {/* Membership Info Card */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-8">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-blue-400 font-medium mb-1">Listing Review Process</h3>
              <p className="text-blue-300 text-sm">
                All directory listings are reviewed by our administrators before going live. 
                You'll receive an email notification once your listing is approved.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Listing Type Selection */}
          {availableTypes.length > 1 && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Listing Type</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availableTypes.map(type => (
                  <label
                    key={type.value}
                    className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                      formData.listing_type === type.value
                        ? 'border-electric-500 bg-electric-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="listing_type"
                      value={type.value}
                      checked={formData.listing_type === type.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, listing_type: e.target.value as any }))}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-white font-medium">{type.label}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">
              {formData.listing_type === 'used_equipment' ? 'Contact Information' : 'Business Information'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  {formData.listing_type === 'used_equipment' ? 'Your Name' : 'Business Name'} *
                </label>
                <input
                  type="text"
                  value={formData.listing_type === 'used_equipment' ? formData.contact_name : formData.business_name}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    [formData.listing_type === 'used_equipment' ? 'contact_name' : 'business_name']: e.target.value 
                  }))}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://..."
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-gray-400 text-sm mb-2">Description *</label>
              <textarea
                value={formData.listing_type === 'used_equipment' ? formData.item_description : formData.description}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  [formData.listing_type === 'used_equipment' ? 'item_description' : 'description']: e.target.value 
                }))}
                placeholder={
                  formData.listing_type === 'used_equipment' 
                    ? "Describe the item you're selling..."
                    : "Tell us about your business, services, and what makes you unique..."
                }
                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                rows={4}
                required
              />
            </div>
          </div>

          {/* Location Information */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Location</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-gray-400 text-sm mb-2">Address Line 1</label>
                <input
                  type="text"
                  value={formData.address_line1}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_line1: e.target.value }))}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-400 text-sm mb-2">Address Line 2</label>
                <input
                  type="text"
                  value={formData.address_line2}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_line2: e.target.value }))}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">City *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">State/Province *</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Postal Code</label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                />
              </div>
            </div>
          </div>

          {/* Type-specific forms */}
          {formData.listing_type !== 'used_equipment' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                {formData.listing_type === 'retailer' ? 'Services & Brands' : 'Products & Manufacturing'}
              </h2>
              {formData.listing_type === 'retailer' && renderRetailerForm()}
              {formData.listing_type === 'manufacturer' && renderManufacturerForm()}
            </div>
          )}

          {formData.listing_type === 'used_equipment' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Item Details</h2>
              {renderUsedEquipmentForm()}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              to="/directory"
              className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="h-5 w-5" />
              )}
              <span>{isLoading ? 'Submitting...' : 'Submit for Review'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Membership Upgrade Modal */}
      {showMembershipModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Membership Upgrade Required</h3>
            
            <p className="text-gray-400 mb-6">
              To create business listings, you need to upgrade to a Retailer or Manufacturer membership. 
              As a competitor, you can only create used equipment listings.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowMembershipModal(false)}
                className="flex-1 py-2 px-4 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Continue with Used Equipment
              </button>
              <Link
                to="/pricing"
                className="flex-1 py-2 px-4 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors text-center"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 