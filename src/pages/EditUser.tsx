import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle, CheckCircle, Mail, Phone, MapPin, Building, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  membership_type: 'competitor' | 'retailer' | 'manufacturer' | 'organization' | 'admin';
  status: 'active' | 'suspended' | 'pending' | 'banned';
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  company_name?: string;
  competition_type?: 'SPL' | 'SQL' | 'both' | 'none';
  team_id?: string;
  team_name?: string;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  subscription_plan: 'free' | 'pro' | 'business' | 'enterprise';
  last_login_at?: string;
  created_at: string;
  login_count: number;
  failed_login_attempts: number;
}

export default function EditUser() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [teams, setTeams] = useState<Array<{id: string, name: string}>>([]);
  const [hasNewFields, setHasNewFields] = useState<boolean>(false);
  const [isCheckingFields, setIsCheckingFields] = useState<boolean>(true);
  const [formData, setFormData] = useState({
    name: '',
    first_name: '',
    last_name: '',
    membership_type: 'competitor' as User['membership_type'],
    status: 'active' as User['status'],
    location: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    company_name: '',
    competition_type: 'none' as User['competition_type'],
    team_id: '',
    verification_status: 'unverified' as User['verification_status'],
    subscription_plan: 'free' as User['subscription_plan']
  });

  // Check if current user is admin
  if (!currentUser || currentUser.membershipType !== 'admin') {
    navigate('/');
    return null;
  }

  useEffect(() => {
    if (userId) {
      loadUser();
      loadTeams();
      checkAvailableFields();
    }
  }, [userId]);

  const loadUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Only select fields that exist in the current database schema
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          membership_type,
          status,
          location,
          phone,
          company_name,
          verification_status,
          subscription_plan,
          last_login_at,
          created_at,
          login_count,
          failed_login_attempts
        `)
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      setUser(userData);
      setFormData({
        name: userData.name || '',
        first_name: '', // Not available in current schema
        last_name: '', // Not available in current schema
        membership_type: userData.membership_type || 'competitor',
        status: userData.status || 'active',
        location: userData.location || '',
        address: '', // Not available in current schema
        city: '', // Not available in current schema
        state: '', // Not available in current schema
        zip: '', // Not available in current schema
        phone: userData.phone || '',
        company_name: userData.company_name || '',
        competition_type: 'none', // Not available in current schema
        team_id: '', // Not available in current schema
        verification_status: userData.verification_status || 'unverified',
        subscription_plan: userData.subscription_plan || 'free'
      });
    } catch (err) {
      console.error('Failed to load user:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error('Failed to load teams:', err);
      // Don't set error state for teams loading failure
    }
  };

  const checkAvailableFields = async () => {
    // Skip field checking - use only basic fields that exist in current schema
    setHasNewFields(false);
    setIsCheckingFields(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // For now, only update basic fields that we know exist
      // This ensures compatibility with the current database schema
      const updateData: any = {
        name: formData.name,
        membership_type: formData.membership_type,
        status: formData.status,
        location: formData.location || null,
        phone: formData.phone || null,
        company_name: formData.company_name || null,
        verification_status: formData.verification_status,
        subscription_plan: formData.subscription_plan
      };

      // Update user directly in the database with only safe fields
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Failed to update user: ${updateError.message}`);
      }

      setSuccessMessage('User updated successfully (basic fields only - run database migration for enhanced functionality)');
      
      setTimeout(() => {
        navigate(`/admin/users/${user.id}`);
      }, 1500);
      
    } catch (err) {
      console.error('Failed to update user:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading user information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Error Loading User</h2>
            <p className="text-gray-400 mb-4">{error || 'User not found'}</p>
            <button
              onClick={() => navigate('/admin/users')}
              className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors"
            >
              Back to Users
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate(`/admin/users/${user.id}`)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Edit User</h1>
            <p className="text-gray-400">Update user information and settings</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">User Information</h2>
            <p className="text-gray-400">Update the user's profile and account settings</p>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <span className="text-red-400 font-medium">{error}</span>
                  </div>
                </div>
              )}

              {!isCheckingFields && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    <div className="text-yellow-400">
                      <p className="font-medium">Basic Fields Only</p>
                      <p className="text-sm mt-1">
                        Currently saving basic fields only (name, membership type, status, etc.). 
                        Enhanced fields like address and competition details require database migration.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full pl-10 pr-4 py-3 bg-gray-700/30 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Display Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                      placeholder="Display Name"
                    />
                  </div>
                </div>

                {/* Remove hasNewFields condition - these fields will be added back after migration */}
                {false && (
                  <>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="First Name"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="Last Name"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Membership Type *
                  </label>
                  <select
                    required
                    value={formData.membership_type}
                    onChange={(e) => handleInputChange('membership_type', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  >
                    <option value="competitor">Competitor</option>
                    <option value="retailer">Retailer</option>
                    <option value="manufacturer">Manufacturer</option>
                    <option value="organization">Organization</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Account Status *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>

                {/* Remove hasNewFields condition - these fields will be added back after migration */}
                {false && (
                  <>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        Competition Type
                      </label>
                      <select
                        value={formData.competition_type}
                        onChange={(e) => handleInputChange('competition_type', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      >
                        <option value="none">None Selected</option>
                        <option value="SPL">SPL (Sound Pressure Level)</option>
                        <option value="SQL">SQL (Sound Quality Level)</option>
                        <option value="both">Both SPL & SQL</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        Team
                      </label>
                      <select
                        value={formData.team_id}
                        onChange={(e) => handleInputChange('team_id', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      >
                        <option value="">No Team</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Remove hasNewFields condition - these fields will be added back after migration */}
                {false && (
                  <>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="Street Address"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="State"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={formData.zip}
                        onChange={(e) => handleInputChange('zip', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="ZIP Code"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                      placeholder="General Location"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Verification Status *
                  </label>
                  <select
                    required
                    value={formData.verification_status}
                    onChange={(e) => handleInputChange('verification_status', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  >
                    <option value="unverified">Unverified</option>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Subscription Plan *
                  </label>
                  <select
                    required
                    value={formData.subscription_plan}
                    onChange={(e) => handleInputChange('subscription_plan', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="business">Business</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                {(formData.membership_type === 'retailer' || 
                  formData.membership_type === 'manufacturer' || 
                  formData.membership_type === 'organization') && (
                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2">
                      Company Name
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) => handleInputChange('company_name', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="Company Name"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                  className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-electric-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-electric-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500/20 border border-green-500/30 text-green-400 px-6 py-3 rounded-lg z-50 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
} 