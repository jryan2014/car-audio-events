import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Mail, User, Phone, MapPin, Building, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ClaimOrganization() {
  const navigate = useNavigate();
  const { organizationId } = useParams();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    organizationName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [organizationDomain, setOrganizationDomain] = useState('');

  // Load organization details
  React.useEffect(() => {
    if (organizationId) {
      loadOrganizationDetails();
    }
  }, [organizationId]);

  const loadOrganizationDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('name, website')
        .eq('id', organizationId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData(prev => ({ ...prev, organizationName: data.name }));
        // Extract domain from website URL
        if (data.website) {
          const domain = new URL(data.website).hostname.replace('www.', '');
          setOrganizationDomain(domain);
        }
      }
    } catch (error) {
      console.error('Error loading organization:', error);
      setError('Organization not found');
    }
  };

  const validateEmailDomain = (email: string) => {
    if (!organizationDomain) return false;
    const emailDomain = email.split('@')[1]?.toLowerCase();
    return emailDomain === organizationDomain.toLowerCase();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Real-time email validation
    if (name === 'email') {
      if (value && !validateEmailDomain(value)) {
        setError(`Email must be from ${organizationDomain} domain`);
      } else {
        setError('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email domain
    if (!validateEmailDomain(formData.email)) {
      setError(`Email must be from the organization's domain: ${organizationDomain}`);
      return;
    }

    setIsLoading(true);

    try {
      // Create organization claim request
      const { error: claimError } = await supabase
        .from('organization_claims')
        .insert({
          organization_id: organizationId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          status: 'pending_verification',
          created_at: new Date().toISOString()
        });

      if (claimError) throw claimError;

      // TODO: Send verification email
      // This would trigger an edge function to send verification email

      setSuccess(true);
    } catch (error: any) {
      console.error('Organization claim failed:', error);
      setError(error.message || 'Failed to submit claim request');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-black text-white">Claim Request Submitted!</h2>
          <div className="space-y-4">
            <p className="text-xl text-gray-400">
              Your organization claim has been submitted successfully.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="text-blue-400 font-semibold mb-2">Next Steps:</h3>
              <div className="text-left text-sm text-blue-300 space-y-2">
                <p>1. ✉️ Check your email for verification link</p>
                <p>2. 💳 Payment link will be sent after email verification</p>
                <p>3. 👤 Account will be reviewed by our admin team</p>
                <p>4. 🎉 Welcome email sent once approved</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm">
              We'll email you at <strong>{formData.email}</strong> with further instructions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Link 
          to="/"
          className="inline-flex items-center space-x-2 text-electric-400 hover:text-electric-300 font-semibold mb-8 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <Building className="h-16 w-16 text-electric-500 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-white mb-4">
            Claim <span className="text-electric-400">Organization Account</span>
          </h1>
          <p className="text-gray-400">
            {formData.organizationName && (
              <>Claiming account for: <strong className="text-white">{formData.organizationName}</strong><br/></>
            )}
            Verify your association with this organization to create your account.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-400">Claim Failed</h3>
                <p className="text-sm text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Domain Validation Info */}
        {organizationDomain && (
          <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-400">Email Verification Required</h3>
                <p className="text-sm text-blue-300 mt-1">
                  Your email must be from the organization's domain: <strong>@{organizationDomain}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Claim Form */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                    placeholder="Enter your first name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                  Last Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Organization Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                    formData.email && !validateEmailDomain(formData.email)
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-gray-600 focus:border-electric-500 focus:ring-electric-500/20'
                  }`}
                  placeholder={organizationDomain ? `name@${organizationDomain}` : "Enter your work email"}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-2">
                Business Address *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="address"
                  name="address"
                  type="text"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                  placeholder="123 Business St, City, State 12345"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || (!!formData.email && !validateEmailDomain(formData.email))}
              className="w-full bg-electric-500 text-white py-3 px-4 rounded-lg font-bold text-lg hover:bg-electric-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Submitting Claim...' : 'Submit Organization Claim'}
            </button>

            <p className="text-center text-sm text-gray-400">
              By submitting this claim, you confirm that you are authorized to represent this organization.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
} 