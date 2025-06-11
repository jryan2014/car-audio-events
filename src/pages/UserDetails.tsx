import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Ban, UserCheck, Trash2, Check, X, AlertTriangle, CheckCircle, Mail, Phone, MapPin, Building, Calendar, Activity, Shield, Users } from 'lucide-react';
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

export default function UserDetails() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Check if current user is admin
  if (!currentUser || currentUser.membershipType !== 'admin') {
    navigate('/');
    return null;
  }

  useEffect(() => {
    if (userId) {
      loadUser();
    }
  }, [userId]);

  const loadUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let userData;
      try {
        // Try to fetch with new fields first
        const { data, error: fetchError } = await supabase
          .from('users')
          .select(`
            *,
            teams(name)
          `)
          .eq('id', userId)
          .single();

        if (fetchError) throw fetchError;
        userData = data;
      } catch (error) {
        console.log('New fields not available, falling back to basic fields:', error);
        // Fallback to basic fields if new fields don't exist
        const { data, error: basicError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (basicError) throw basicError;
        userData = data;
      }

      setUser(userData);
    } catch (err) {
      console.error('Failed to load user:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserAction = async (action: string) => {
    if (!user) return;

    try {
      let updateData: any = { updated_at: new Date().toISOString() };

      switch (action) {
        case 'activate':
          updateData.status = 'active';
          break;
        case 'approve':
          updateData.status = 'active';
          updateData.verification_status = 'verified';
          break;
        case 'suspend':
          updateData.status = 'suspended';
          break;
        case 'ban':
          updateData.status = 'banned';
          break;
        case 'delete':
          updateData.status = 'banned';
          break;
        default:
          throw new Error('Invalid action');
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSuccessMessage(`User ${action} successful`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reload user data
      await loadUser();
    } catch (err) {
      console.error('Failed to perform user action:', err);
      setError(err instanceof Error ? err.message : 'Failed to perform user action');
      setTimeout(() => setError(null), 5000);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      suspended: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      pending: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      banned: 'bg-red-500/20 text-red-400 border-red-500/30'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getVerificationBadge = (verification: string) => {
    const styles = {
      verified: 'bg-green-500/20 text-green-400',
      pending: 'bg-yellow-500/20 text-yellow-400',
      unverified: 'bg-gray-500/20 text-gray-400',
      rejected: 'bg-red-500/20 text-red-400'
    };

    const icons = {
      verified: CheckCircle,
      pending: AlertTriangle,
      unverified: X,
      rejected: X
    };

    const Icon = icons[verification as keyof typeof icons];

    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${styles[verification as keyof typeof styles]}`}>
        <Icon className="h-3 w-3" />
        <span>{verification.charAt(0).toUpperCase() + verification.slice(1)}</span>
      </span>
    );
  };

  const getMembershipTypeBadge = (type: string) => {
    const styles = {
      competitor: 'bg-blue-500/20 text-blue-400',
      retailer: 'bg-purple-500/20 text-purple-400',
      manufacturer: 'bg-orange-500/20 text-orange-400',
      organization: 'bg-green-500/20 text-green-400',
      admin: 'bg-red-500/20 text-red-400'
    };

    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${styles[type as keyof typeof styles]}`}>
        <Users className="h-3 w-3" />
        <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading user details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-3xl font-bold text-white">User Details</h1>
              <p className="text-gray-400">Manage user account and permissions</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(`/admin/users/${user.id}/edit`)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit User</span>
            </button>
            
            {user.status === 'active' ? (
              <button
                onClick={() => handleUserAction('suspend')}
                className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center space-x-2"
              >
                <Ban className="h-4 w-4" />
                <span>Suspend</span>
              </button>
            ) : (
              <button
                onClick={() => handleUserAction('activate')}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
              >
                <UserCheck className="h-4 w-4" />
                <span>Activate</span>
              </button>
            )}
            
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* User Information Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-electric-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                <p className="text-gray-400">{user.email}</p>
                <div className="flex items-center space-x-3 mt-2">
                  {getMembershipTypeBadge(user.membership_type)}
                  {getStatusBadge(user.status)}
                  {getVerificationBadge(user.verification_status)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Mail className="h-5 w-5 text-electric-400" />
                <span>Contact Information</span>
              </h3>
              
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">First Name</label>
                    <p className="text-white">{user.first_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Last Name</label>
                    <p className="text-white">{user.last_name || 'Not provided'}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Email</label>
                  <p className="text-white">{user.email}</p>
                </div>
                
                {user.phone && (
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Phone</label>
                    <p className="text-white">{user.phone}</p>
                  </div>
                )}
                
                {user.address && (
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Address</label>
                    <div className="text-white">
                      <p>{user.address}</p>
                      {(user.city || user.state || user.zip) && (
                        <p>{user.city}{user.city && (user.state || user.zip) ? ', ' : ''}{user.state} {user.zip}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {user.location && (
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Location</label>
                    <div className="flex items-center space-x-2 text-white">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{user.location}</span>
                    </div>
                  </div>
                )}
                
                {user.company_name && (
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Company</label>
                    <div className="flex items-center space-x-2 text-white">
                      <Building className="h-4 w-4 text-gray-400" />
                      <span>{user.company_name}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Shield className="h-5 w-5 text-electric-400" />
                <span>Account Status</span>
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Account Status</label>
                  {getStatusBadge(user.status)}
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Verification Status</label>
                  {getVerificationBadge(user.verification_status)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Activity className="h-5 w-5 text-electric-400" />
                <span>Competition & Team</span>
              </h3>
              
              <div className="space-y-3">
                {user.competition_type && (
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Competition Type</label>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400">
                      {user.competition_type === 'both' ? 'SPL & SQL' : user.competition_type}
                    </span>
                  </div>
                )}
                
                {user.team_name && (
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Team</label>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-400">
                      {user.team_name}
                    </span>
                  </div>
                )}
                
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Membership Type</label>
                  {getMembershipTypeBadge(user.membership_type)}
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Subscription Plan</label>
                  <p className="text-white capitalize">{user.subscription_plan}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Activity className="h-5 w-5 text-electric-400" />
                <span>Activity</span>
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Account Created</label>
                  <div className="flex items-center space-x-2 text-white">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(user.created_at)}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Last Login</label>
                  <p className="text-white">
                    {user.last_login_at ? formatDate(user.last_login_at) : 'Never'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Total Logins</label>
                  <p className="text-white">{user.login_count}</p>
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Failed Login Attempts</label>
                  <p className={`${user.failed_login_attempts > 0 ? 'text-red-400' : 'text-white'}`}>
                    {user.failed_login_attempts}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {user.status === 'pending' && (
              <button
                onClick={() => handleUserAction('approve')}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Check className="h-4 w-4" />
                <span>Approve User</span>
              </button>
            )}
            
            {user.verification_status === 'pending' && (
              <button
                onClick={() => handleUserAction('approve')}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Verify User</span>
              </button>
            )}
            
            {user.status === 'active' ? (
              <button
                onClick={() => handleUserAction('suspend')}
                className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Ban className="h-4 w-4" />
                <span>Suspend User</span>
              </button>
            ) : user.status === 'suspended' ? (
              <button
                onClick={() => handleUserAction('activate')}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
              >
                <UserCheck className="h-4 w-4" />
                <span>Activate User</span>
              </button>
            ) : null}
            
            <button
              onClick={() => navigate(`/admin/users/${user.id}/edit`)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Details</span>
            </button>
            
            {user.status !== 'banned' && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete User</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Delete User</h3>
                  <p className="text-gray-400">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete <strong>{user.name}</strong>? 
                This will permanently ban their account to preserve data integrity.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleUserAction('delete');
                    setShowDeleteConfirm(false);
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500/20 border border-green-500/30 text-green-400 px-6 py-3 rounded-lg z-50 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500/20 border border-red-500/30 text-red-400 px-6 py-3 rounded-lg z-50 flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
} 