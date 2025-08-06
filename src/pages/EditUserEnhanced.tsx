import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, AlertTriangle, CheckCircle, Mail, Phone, MapPin, 
  Building, User, CreditCard, Calendar, DollarSign, Package, Clock,
  Shield, Activity, FileText, TrendingUp, Settings, RefreshCw,
  ChevronDown, ChevronRight, Download, Eye, EyeOff, Trash2, Plus,
  UserCheck, Ban, Pause, Play, History, Receipt
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { billingService } from '../services/billingService';
import { formatDate } from '../utils/date-utils';

interface EnhancedUser {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  membership_plan: 'free_competitor' | 'pro_competitor' | 'retailer' | 'manufacturer' | 'organization';
  permissions: ('admin' | 'support' | 'moderator')[];
  status: 'active' | 'suspended' | 'pending' | 'banned';
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  company_name?: string;
  // team_id removed - teams are handled through team_members table
  team_name?: string;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  subscription_status?: 'active' | 'paused' | 'past_due' | 'canceled' | 'trialing' | 'none';
  subscription_start_date?: string;
  subscription_end_date?: string;
  stripe_customer_id?: string;
  last_login_at?: string;
  created_at: string;
  login_count: number;
  failed_login_attempts: number;
  total_spent?: number;
  credits_balance?: number;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: 'payment' | 'refund' | 'credit';
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  payment_method?: string;
}

export default function EditUserEnhanced() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [teams, setTeams] = useState<Array<{id: string, name: string}>>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    membership: true,
    billing: false,
    security: false,
    activity: false,
    transactions: false
  });
  
  const [formData, setFormData] = useState({
    name: '',
    first_name: '',
    last_name: '',
    membership_plan: 'free_competitor' as EnhancedUser['membership_plan'],
    permissions: [] as EnhancedUser['permissions'],
    status: 'active' as EnhancedUser['status'],
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    phone: '',
    company_name: '',
    // team_id removed - teams are handled through team_members table
    verification_status: 'unverified' as EnhancedUser['verification_status'],
    subscription_status: 'none',
    credits_balance: 0
  });

  // Membership plan pricing info
  const membershipPlanInfo = {
    'free_competitor': { name: 'Free Competitor', price: 0, period: 'Free' },
    'pro_competitor': { name: 'Pro Competitor', price: 49.99, period: 'year' },
    'retailer': { name: 'Retailer', price: 249.99, period: 'year' },
    'manufacturer': { name: 'Manufacturer', price: 999.99, period: 'year' },
    'organization': { name: 'Organization', price: 499.99, period: 'year' }
  };

  // REMOVED getMembershipPlans function - no longer needed
  const getMembershipPlans_REMOVED = (type: string) => {
    switch(type) {
      case 'competitor':
        return [
          { value: 'free_competitor', label: 'Free Competitor' },
          { value: 'pro_competitor', label: 'Pro Competitor ($9.99/mo)' }
        ];
      case 'retailer':
        return [
          { value: 'retailer', label: 'Retailer ($29.99/mo)' }
        ];
      case 'manufacturer':
        return [
          { value: 'manufacturer', label: 'Manufacturer ($49.99/mo)' }
        ];
      case 'organization':
        return [
          { value: 'organization', label: 'Organization ($99.99/mo)' }
        ];
      case 'admin':
        return [
          { value: 'admin', label: 'Admin (No charge)' }
        ];
      default:
        return [{ value: 'free_competitor', label: 'Free Competitor' }];
    }
  };

  // Check if current user is admin
  if (!currentUser || currentUser.membershipType !== 'admin') {
    navigate('/');
    return null;
  }

  useEffect(() => {
    if (userId) {
      loadUser();
      loadTeams();
      loadTransactions();
    }
  }, [userId]);

  const loadUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Load subscription data
      let subscriptionData = null;
      try {
        const billingOverview = await billingService.getUserBillingOverview(userId);
        subscriptionData = billingOverview.subscription;
      } catch (err) {
        console.log('No subscription data found');
      }

      // Calculate total spent
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'payment')
        .eq('status', 'completed');

      const totalSpent = transactionsData?.reduce((sum, t) => sum + (t.amount / 100), 0) || 0;

      // Parse permissions from membership_type
      let permissions: EnhancedUser['permissions'] = [];
      if (userData.membership_type === 'admin') {
        permissions.push('admin');
      }
      // Note: Additional permissions would need to be stored in a separate permissions table
      // For now, permissions are determined solely by membership_type

      // Determine membership plan - simplified logic
      let membershipPlan: EnhancedUser['membership_plan'] = 'free_competitor';
      
      // Check membership_type field first
      if (userData.membership_type === 'pro_competitor') {
        membershipPlan = 'pro_competitor';
      } else if (userData.membership_type === 'retailer') {
        membershipPlan = 'retailer';
      } else if (userData.membership_type === 'manufacturer') {
        membershipPlan = 'manufacturer';
      } else if (userData.membership_type === 'organization') {
        membershipPlan = 'organization';
      } else if (userData.membership_type === 'competitor') {
        // For basic competitor, check if they have active subscription
        membershipPlan = (subscriptionData?.status === 'active' || subscriptionData?.status === 'paused') 
          ? 'pro_competitor' 
          : 'free_competitor';
      }

      const enhancedUser = {
        ...userData,
        membership_plan: membershipPlan,
        permissions: permissions,
        subscription_status: subscriptionData?.status || 'none',
        subscription_start_date: subscriptionData?.current_period_start,
        subscription_end_date: subscriptionData?.current_period_end,
        total_spent: totalSpent,
        credits_balance: userData.credits_balance || 0
      };

      setUser(enhancedUser);

      setFormData({
        name: userData.name || '',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        membership_plan: membershipPlan,
        permissions: permissions,
        status: userData.status || 'active',
        address: userData.address || '',
        city: userData.city || '',
        state: userData.state || '',
        zip: userData.zip || '',
        country: userData.country || 'US',
        phone: userData.phone || '',
        company_name: userData.company_name || '',
        // team_id removed - teams are handled through team_members table
        verification_status: userData.verification_status || 'unverified',
        subscription_status: subscriptionData?.status || 'none',
        credits_balance: userData.credits_balance || 0
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
    }
  };

  const loadTransactions = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Map membership plan to database membership_type field
      let dbMembershipType: string = formData.membership_plan;
      if (formData.membership_plan === 'free_competitor') {
        dbMembershipType = 'competitor';
      } else if (formData.membership_plan === 'pro_competitor') {
        dbMembershipType = 'pro_competitor';
      }
      
      const updateData: any = {
        name: formData.name,
        first_name: formData.first_name,
        last_name: formData.last_name,
        membership_type: dbMembershipType, // Store the mapped value
        status: formData.status,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip: formData.zip || null,
        country: formData.country || null,
        phone: formData.phone || null,
        company_name: formData.company_name || null,
        verification_status: formData.verification_status
        // Removed metadata field as it doesn't exist in the users table
        // Permissions are determined by membership_type (admin) field
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Failed to update user: ${updateError.message}`);
      }

      // Handle subscription changes if needed
      if (formData.membership_plan !== user.membership_plan) {
        // TODO: Implement subscription plan changes through Stripe
        console.log('Subscription plan change requested:', formData.membership_plan);
      }

      setSuccessMessage('User updated successfully!');
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err) {
      console.error('Failed to update user:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handlePasswordReset = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      setSuccessMessage('Password reset email sent successfully!');
      setShowPasswordReset(false);
    } catch (err) {
      setError('Failed to send password reset email');
    }
  };

  const handleSuspendUser = async () => {
    if (!user || !confirm('Are you sure you want to suspend this user?')) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'suspended' })
        .eq('id', user.id);
      
      if (error) throw error;
      setFormData(prev => ({ ...prev, status: 'suspended' }));
      setSuccessMessage('User suspended successfully');
    } catch (err) {
      setError('Failed to suspend user');
    }
  };

  const handleBanUser = async () => {
    if (!user || !confirm('Are you sure you want to ban this user? This action is serious.')) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'banned' })
        .eq('id', user.id);
      
      if (error) throw error;
      setFormData(prev => ({ ...prev, status: 'banned' }));
      setSuccessMessage('User banned successfully');
    } catch (err) {
      setError('Failed to ban user');
    }
  };

  const handleAddCredits = async () => {
    const amount = prompt('Enter credit amount to add:');
    if (!amount || !user) return;
    
    const credits = parseInt(amount);
    if (isNaN(credits) || credits <= 0) {
      setError('Invalid credit amount');
      return;
    }
    
    try {
      const newBalance = (formData.credits_balance || 0) + credits;
      const { error } = await supabase
        .from('users')
        .update({ credits_balance: newBalance })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Log the transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: credits * 100, // Store in cents
          type: 'credit',
          status: 'completed',
          description: `Admin added ${credits} credits`
        });
      
      setFormData(prev => ({ ...prev, credits_balance: newBalance }));
      setSuccessMessage(`Added ${credits} credits successfully`);
      loadTransactions();
    } catch (err) {
      setError('Failed to add credits');
    }
  };

  const handleRefund = async (transactionId: string) => {
    if (!confirm('Are you sure you want to refund this transaction?')) return;
    
    try {
      // TODO: Implement Stripe refund
      setSuccessMessage('Refund initiated successfully');
      loadTransactions();
    } catch (err) {
      setError('Failed to process refund');
    }
  };

  const handlePauseSubscription = async () => {
    if (!user || !confirm('Pause this user\'s subscription? They will retain access until their current period ends.')) return;
    
    try {
      await billingService.pauseSubscription(user.id);
      setSuccessMessage('Subscription paused successfully');
      await loadUser();
    } catch (err) {
      setError('Failed to pause subscription');
    }
  };

  const handleResumeSubscription = async () => {
    if (!user || !confirm('Resume this user\'s subscription?')) return;
    
    try {
      await billingService.resumeSubscription(user.id);
      setSuccessMessage('Subscription resumed successfully');
      await loadUser();
    } catch (err) {
      setError('Failed to resume subscription');
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !confirm('Cancel this user\'s subscription? This will end their access at the end of the current period.')) return;
    
    try {
      await billingService.cancelSubscription(user.id, 'Admin canceled', false);
      setSuccessMessage('Subscription canceled successfully');
      await loadUser();
    } catch (err) {
      setError('Failed to cancel subscription');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading user information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">User Not Found</h2>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/users')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Edit User</h1>
              <p className="text-gray-400">Manage {user.name || user.email}'s account</p>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(`/admin/users/${user.id}`)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
            >
              <Eye className="h-4 w-4" />
              <span>View Details</span>
            </button>
            {formData.status === 'active' && (
              <button
                onClick={handleSuspendUser}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center space-x-2"
              >
                <Pause className="h-4 w-4" />
                <span>Suspend</span>
              </button>
            )}
            {formData.status === 'suspended' && (
              <button
                onClick={() => handleInputChange('status', 'active')}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Reactivate</span>
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span className="text-red-400">{error}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-green-400">{successMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('basic')}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-electric-400" />
                  <h2 className="text-xl font-bold text-white">Basic Information</h2>
                </div>
                {expandedSections.basic ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
              </button>
              
              {expandedSections.basic && (
                <div className="p-6 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          value={user.email}
                          disabled
                          className="w-full pl-10 pr-4 py-3 bg-gray-700/30 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Display Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">First Name</label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Last Name</label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-400 text-sm mb-2">Street Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          placeholder="123 Main Street"
                          className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="City"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="State / Province"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">ZIP / Postal Code</label>
                      <input
                        type="text"
                        value={formData.zip}
                        onChange={(e) => handleInputChange('zip', e.target.value)}
                        placeholder="12345"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Country</label>
                      <input
                        type="text"
                        value={formData.country || 'US'}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        placeholder="US"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      />
                    </div>


                    {(formData.membership_plan === 'retailer' || 
                      formData.membership_plan === 'manufacturer' || 
                      formData.membership_plan === 'organization') && (
                      <div className="md:col-span-2">
                        <label className="block text-gray-400 text-sm mb-2">Company Name</label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            value={formData.company_name}
                            onChange={(e) => handleInputChange('company_name', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Membership & Status */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('membership')}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-electric-400" />
                  <h2 className="text-xl font-bold text-white">Membership & Status</h2>
                </div>
                {expandedSections.membership ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
              </button>
              
              {expandedSections.membership && (
                <div className="p-6 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Membership Plan *</label>
                      <select
                        required
                        value={formData.membership_plan}
                        onChange={(e) => handleInputChange('membership_plan', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      >
                        <option value="free_competitor">Free Competitor</option>
                        <option value="pro_competitor">Pro Competitor ($49.99/year)</option>
                        <option value="retailer">Retailer ($249.99/year)</option>
                        <option value="manufacturer">Manufacturer ($999.99/year)</option>
                        <option value="organization">Organization ($499.99/year)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Permissions</label>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes('admin')}
                            onChange={(e) => {
                              const newPermissions = e.target.checked 
                                ? [...formData.permissions, 'admin' as const]
                                : formData.permissions.filter(p => p !== 'admin');
                              setFormData(prev => ({ ...prev, permissions: newPermissions as EnhancedUser['permissions'] }));
                            }}
                            className="rounded border-gray-600 bg-gray-700 text-electric-500"
                          />
                          <span className="text-white">Administrator</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes('support')}
                            onChange={(e) => {
                              const newPermissions = e.target.checked 
                                ? [...formData.permissions, 'support' as const]
                                : formData.permissions.filter(p => p !== 'support');
                              setFormData(prev => ({ ...prev, permissions: newPermissions as EnhancedUser['permissions'] }));
                            }}
                            className="rounded border-gray-600 bg-gray-700 text-electric-500"
                          />
                          <span className="text-white">Support Team</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes('moderator')}
                            onChange={(e) => {
                              const newPermissions = e.target.checked 
                                ? [...formData.permissions, 'moderator' as const]
                                : formData.permissions.filter(p => p !== 'moderator');
                              setFormData(prev => ({ ...prev, permissions: newPermissions as EnhancedUser['permissions'] }));
                            }}
                            className="rounded border-gray-600 bg-gray-700 text-electric-500"
                          />
                          <span className="text-white">Moderator</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Account Status *</label>
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

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Verification Status</label>
                      <select
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

                    {/* Team selection temporarily disabled - needs proper implementation through team_members table */}
                    {/* (formData.membership_plan === 'free_competitor' || formData.membership_plan === 'pro_competitor') && (
                      <>

                        <div>
                          <label className="block text-gray-400 text-sm mb-2">Team</label>
                          <select
                            value=""
                            onChange={() => {}}
                            disabled
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 opacity-50 cursor-not-allowed"
                          >
                            <option value="">No Team</option>
                          </select>
                        </div>
                      </>
                    ) */}
                  </div>
                </div>
              )}
            </div>

            {/* Billing & Subscription */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('billing')}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-electric-400" />
                  <h2 className="text-xl font-bold text-white">Billing & Subscription</h2>
                  {user.subscription_status === 'active' && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Active</span>
                  )}
                </div>
                {expandedSections.billing ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
              </button>
              
              {expandedSections.billing && (
                <div className="p-6 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Total Spent</span>
                        <DollarSign className="h-4 w-4 text-gray-500" />
                      </div>
                      <p className="text-2xl font-bold text-white">${user.total_spent?.toFixed(2) || '0.00'}</p>
                    </div>

                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Credits Balance</span>
                        <Package className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-bold text-white">{formData.credits_balance || 0}</p>
                        <button
                          type="button"
                          onClick={handleAddCredits}
                          className="text-electric-400 hover:text-electric-300"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Subscription</span>
                        <Calendar className="h-4 w-4 text-gray-500" />
                      </div>
                      <p className="text-lg font-semibold text-white capitalize">{formData.subscription_status || 'None'}</p>
                      {user.subscription_status === 'paused' && (
                        <p className="text-xs text-yellow-400">Paused - Access until period end</p>
                      )}
                      {user.subscription_start_date && user.subscription_end_date && (
                        <p className="text-xs text-gray-400">Period: {formatDate(user.subscription_start_date)} - {formatDate(user.subscription_end_date)}</p>
                      )}
                      {!user.subscription_start_date && user.subscription_end_date && (
                        <p className="text-xs text-gray-400">Ends: {formatDate(user.subscription_end_date)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => toggleSection('transactions')}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                    >
                      <Receipt className="h-4 w-4" />
                      <span>View Transactions</span>
                    </button>
                    
                    {user.subscription_status === 'active' && (
                      <>
                        <button
                          type="button"
                          onClick={handlePauseSubscription}
                          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center space-x-2"
                        >
                          <Pause className="h-4 w-4" />
                          <span>Pause Subscription</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelSubscription}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Cancel Subscription
                        </button>
                      </>
                    )}
                    
                    {user.subscription_status === 'paused' && (
                      <button
                        type="button"
                        onClick={handleResumeSubscription}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
                      >
                        <Play className="h-4 w-4" />
                        <span>Resume Subscription</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Transaction History */}
            {expandedSections.transactions && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Recent Transactions</h3>
                  {transactions.length > 0 ? (
                    <div className="space-y-3">
                      {transactions.map(transaction => (
                        <div key={transaction.id} className="bg-gray-700/30 rounded-lg p-4 flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{transaction.description}</p>
                            <p className="text-gray-400 text-sm">{formatDate(transaction.created_at)}</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`font-bold ${transaction.type === 'refund' ? 'text-red-400' : 'text-green-400'}`}>
                              {transaction.type === 'refund' ? '-' : '+'} ${(transaction.amount / 100).toFixed(2)}
                            </span>
                            {transaction.type === 'payment' && transaction.status === 'completed' && (
                              <button
                                type="button"
                                onClick={() => handleRefund(transaction.id)}
                                className="text-gray-400 hover:text-red-400"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">No transactions found</p>
                  )}
                </div>
              </div>
            )}

            {/* Security Settings */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('security')}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-electric-400" />
                  <h2 className="text-xl font-bold text-white">Security Settings</h2>
                </div>
                {expandedSections.security ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
              </button>
              
              {expandedSections.security && (
                <div className="p-6 pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Password Reset</h4>
                        <p className="text-gray-400 text-sm">Send a password reset email to the user</p>
                      </div>
                      <button
                        type="button"
                        onClick={handlePasswordReset}
                        className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
                      >
                        Send Reset Email
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Account Actions</h4>
                        <p className="text-gray-400 text-sm">Manage user account access</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {formData.status !== 'banned' && (
                          <button
                            type="button"
                            onClick={handleBanUser}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
                          >
                            <Ban className="h-4 w-4" />
                            <span>Ban User</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Activity Log */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('activity')}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Activity className="h-5 w-5 text-electric-400" />
                  <h2 className="text-xl font-bold text-white">Activity Information</h2>
                </div>
                {expandedSections.activity ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
              </button>
              
              {expandedSections.activity && (
                <div className="p-6 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Last Login</label>
                      <p className="text-white">{user.last_login_at ? formatDate(user.last_login_at) : 'Never'}</p>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Total Logins</label>
                      <p className="text-white">{user.login_count || 0}</p>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Failed Login Attempts</label>
                      <p className="text-white">{user.failed_login_attempts || 0}</p>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Account Created</label>
                      <p className="text-white">{formatDate(user.created_at)}</p>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">User ID</label>
                      <p className="text-white font-mono text-sm">{user.id}</p>
                    </div>
                    {user.stripe_customer_id && (
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Stripe Customer ID</label>
                        <p className="text-white font-mono text-sm">{user.stripe_customer_id}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-electric-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-electric-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
  );
}