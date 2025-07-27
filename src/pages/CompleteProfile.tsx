import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Phone, Building, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { COUNTRIES, getCountryByCode, getStatesForCountry, getPostalCodeLabel, getStateLabel, validatePostalCode } from '../data/countries';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  // Business fields
  company_name?: string;
  company_website?: string;
  tax_id?: string;
}

export default function CompleteProfile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    company_name: '',
    company_website: '',
    tax_id: ''
  });

  const isBusinessAccount = user?.membershipType && ['retailer', 'manufacturer', 'organization'].includes(user.membershipType);

  useEffect(() => {
    // Pre-fill any existing data
    if (user) {
      setFormData(prev => ({
        ...prev,
        first_name: user.firstName || prev.first_name,
        last_name: user.lastName || prev.last_name,
        phone: user.phone || prev.phone,
        address: user.address || prev.address,
        city: user.city || prev.city,
        state: user.state || prev.state,
        zip: user.zip || prev.zip,
        country: user.country || 'US',
        company_name: user.companyName || prev.company_name,
        company_website: user.website || prev.company_website,
        tax_id: user.taxId || prev.tax_id
      }));

      // If profile is already complete, redirect to dashboard
      if (user.registrationCompleted) {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If country changes, reset state field
    if (name === 'country' && value !== formData.country) {
      setFormData(prev => ({ ...prev, [name]: value, state: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = (): boolean => {
    // Required fields for all users
    const states = getStatesForCountry(formData.country);
    const stateRequired = states && states.length > 0;
    
    if (!formData.first_name || !formData.last_name || !formData.phone || 
        !formData.address || !formData.city || !formData.zip || 
        (stateRequired && !formData.state)) {
      setError('Please fill in all required fields');
      return false;
    }

    // Additional required fields for business accounts
    if (isBusinessAccount && (!formData.company_name || !formData.tax_id)) {
      setError('Business accounts must provide company name and tax ID');
      return false;
    }

    // Basic phone validation
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Please enter a valid phone number');
      return false;
    }

    // Postal code validation
    if (!validatePostalCode(formData.zip, formData.country)) {
      const postalLabel = getPostalCodeLabel(formData.country);
      setError(`Please enter a valid ${postalLabel}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError('');

    try {
      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state,
          zip: formData.zip.trim(),
          country: formData.country,
          company_name: isBusinessAccount ? formData.company_name?.trim() : null,
          website: isBusinessAccount ? formData.company_website?.trim() : null,
          tax_id: isBusinessAccount ? formData.tax_id?.trim() : null,
          registration_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user!.id);

      if (updateError) throw updateError;

      // Log activity
      try {
        await supabase.functions.invoke('log-activity', {
          body: {
            user_id: user!.id,
            activity_type: 'profile_completed',
            description: 'User completed profile registration',
            metadata: {
              registration_provider: user?.registrationProvider || 'unknown'
            }
          }
        });
      } catch (logError) {
        console.warn('Failed to log activity:', logError);
      }

      setSuccess(true);
      
      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-electric-500" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-electric-500 rounded-full mb-4">
              <User className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
            <p className="text-gray-400">
              {user.registrationProvider === 'google' 
                ? "Thanks for signing in with Google! We just need a few more details to complete your registration."
                : "Please provide the following information to complete your registration."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center text-red-400">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500 rounded-lg flex items-center text-green-400">
              <CheckCircle className="h-5 w-5 mr-2" />
              Profile updated successfully! Redirecting to dashboard...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-electric-400" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Phone className="inline h-4 w-4 mr-1" />
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-electric-400" />
                Address Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Street Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    placeholder="123 Main Street"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Country <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                  >
                    {COUNTRIES.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      City <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                    />
                  </div>

                  {(() => {
                    const states = getStatesForCountry(formData.country);
                    const stateLabel = getStateLabel(formData.country);
                    
                    return states ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {stateLabel} <span className="text-red-400">*</span>
                        </label>
                        <select
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                        >
                          <option value="">Select {stateLabel}</option>
                          {states.map(state => (
                            <option key={state.code} value={state.code}>
                              {state.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {stateLabel}
                        </label>
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          placeholder={`Enter ${stateLabel}`}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                        />
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {getPostalCodeLabel(formData.country)} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="zip"
                      value={formData.zip}
                      onChange={handleChange}
                      required
                      placeholder={getCountryByCode(formData.country)?.postalCodeFormat?.replace(/#/g, '0').replace(/A/g, 'A') || ''}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Business Information (for business accounts) */}
            {isBusinessAccount && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Building className="h-5 w-5 mr-2 text-electric-400" />
                  Business Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Company Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      required={isBusinessAccount}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Company Website
                    </label>
                    <input
                      type="url"
                      name="company_website"
                      value={formData.company_website}
                      onChange={handleChange}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tax ID / EIN <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="tax_id"
                      value={formData.tax_id}
                      onChange={handleChange}
                      required={isBusinessAccount}
                      placeholder="12-3456789"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3 bg-electric-600 text-white rounded-lg hover:bg-electric-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader className="animate-spin h-5 w-5 mr-2" />
                    Saving...
                  </>
                ) : (
                  'Complete Registration'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}