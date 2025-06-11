import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Plus, Edit, Trash2, Shield, AlertTriangle, CheckCircle, X, Eye, Ban, UserCheck, UserPlus, Mail, Phone, Globe, MapPin, Building, Check, User, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  membership_type: 'competitor' | 'retailer' | 'manufacturer' | 'organization' | 'admin';
  status: 'active' | 'suspended' | 'pending' | 'banned';
  location?: string;
  phone?: string;
  company_name?: string;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  subscription_plan: 'free' | 'pro' | 'business' | 'enterprise';
  last_login_at?: string;
  created_at: string;
  login_count: number;
  failed_login_attempts: number;
}

interface NewUserFormData {
  email: string;
  name: string;
  password: string;
  membership_type: 'competitor' | 'retailer' | 'manufacturer' | 'organization' | 'admin';
  location?: string;
  phone?: string;
  company_name?: string;
  status: 'active' | 'pending';
  verification_status: 'unverified' | 'pending' | 'verified';
  subscription_plan: 'free' | 'pro' | 'business' | 'enterprise';
}
export default function AdminUsers() {
  const { user, session } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMembershipType, setSelectedMembershipType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedVerification, setSelectedVerification] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [newUserData, setNewUserData] = useState<NewUserFormData>({
    email: '',
    name: '',
    password: '',
    membership_type: 'competitor',
    location: '',
    phone: '',
    company_name: '',
    status: 'pending',
    verification_status: 'pending',
    subscription_plan: 'free'
  });
  
  const [editUserData, setEditUserData] = useState<Partial<User>>({});

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/\" replace />;
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, selectedMembershipType, selectedStatus, selectedVerification]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if we have a valid session
      if (!session?.access_token) {
        throw new Error('No valid session token available. Please log out and log back in.');
      }

      // First, verify current user is admin
      const { data: currentUser, error: currentUserError } = await supabase
        .from('users')
        .select('membership_type, status')
        .eq('id', user?.id)
        .single();

      if (currentUserError || !currentUser) {
        throw new Error('Unable to verify admin permissions. Please ensure your account is properly configured.');
      }

      if (currentUser.membership_type !== 'admin' || currentUser.status !== 'active') {
        throw new Error('Access denied. Your admin account may not be properly configured.');
      }

      // Fetch all users directly from the database
      const { data: usersData, error: usersError } = await supabase
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
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Database error:', usersError);
        throw new Error(`Failed to load users from database: ${usersError.message}`);
      }

      setUsers(usersData || []);
      setError(null);
      
    } catch (error) {
      console.error('Failed to load users:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Only show mock data in development if it's not a permission error
      if (!errorMessage.includes('Access denied') && import.meta.env.DEV) {
        console.log('Using mock data for development...');
        setMockUsers();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setMockUsers = () => {
    setUsers([
      {
        id: '1',
        email: 'john@example.com',
        name: 'John Doe',
        membership_type: 'competitor',
        status: 'active',
        location: 'Orlando, FL',
        verification_status: 'verified',
        subscription_plan: 'pro',
        last_login_at: '2025-01-07T10:30:00Z',
        created_at: '2024-12-01T00:00:00Z',
        login_count: 45,
        failed_login_attempts: 0
      },
      {
        id: '2',
        email: 'retailer@example.com',
        name: 'Audio Store Pro',
        membership_type: 'retailer',
        status: 'active',
        location: 'Phoenix, AZ',
        company_name: 'Pro Audio Solutions',
        verification_status: 'pending',
        subscription_plan: 'business',
        last_login_at: '2025-01-06T15:20:00Z',
        created_at: '2024-11-15T00:00:00Z',
        login_count: 23,
        failed_login_attempts: 1
      },
      {
        id: '3',
        email: 'manufacturer@example.com',
        name: 'Bass Systems Inc',
        membership_type: 'manufacturer',
        status: 'active',
        location: 'Atlanta, GA',
        company_name: 'Bass Systems Manufacturing',
        verification_status: 'verified',
        subscription_plan: 'enterprise',
        last_login_at: '2025-01-05T09:15:00Z',
        created_at: '2024-10-20T00:00:00Z',
        login_count: 67,
        failed_login_attempts: 0
      },
      {
        id: '4',
        email: 'suspended@example.com',
        name: 'Suspended User',
        membership_type: 'competitor',
        status: 'suspended',
        location: 'Dallas, TX',
        verification_status: 'rejected',
        subscription_plan: 'free',
        last_login_at: '2024-12-20T14:30:00Z',
        created_at: '2024-09-10T00:00:00Z',
        login_count: 12,
        failed_login_attempts: 5
      }
    ]);
  };

  const filterUsers = () => {
    let filtered = users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (user.company_name && user.company_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesMembershipType = selectedMembershipType === 'all' || user.membership_type === selectedMembershipType;
      const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
      const matchesVerification = selectedVerification === 'all' || user.verification_status === selectedVerification;
      
      return matchesSearch && matchesMembershipType && matchesStatus && matchesVerification;
    });

    setFilteredUsers(filtered);
  };

  const handleUserAction = async (userId: string, action: string) => {
    try {
      // Check if we have a valid session
      if (!session?.access_token) {
        throw new Error('No valid session token available');
      }

      // Prepare update data based on action
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
          // For delete, we'll actually just ban the user to preserve data integrity
          updateData.status = 'banned';
          break;
        default:
          throw new Error('Invalid action');
      }

      // Update the user directly in the database
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Failed to ${action} user: ${updateError.message}`);
      }

      // Reload users after action
      await loadUsers();
      setSuccessMessage(`User ${action} successful`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to perform user action:', error);
      setError(error instanceof Error ? error.message : 'Failed to perform user action');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleAddUser = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Validate form
      if (!newUserData.email || !newUserData.name || !newUserData.password) {
        throw new Error('Email, name, and password are required');
      }
      
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserData.email,
        password: newUserData.password,
        options: {
          data: {
            name: newUserData.name,
            membership_type: newUserData.membership_type
          }
        }
      });

      if (authError) {
        throw new Error(`Failed to create user account: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Create user profile in the users table
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: newUserData.email,
          name: newUserData.name,
          membership_type: newUserData.membership_type,
          status: newUserData.status,
          location: newUserData.location || null,
          phone: newUserData.phone || null,
          company_name: newUserData.company_name || null,
          verification_status: newUserData.verification_status,
          subscription_plan: newUserData.subscription_plan,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          login_count: 0,
          failed_login_attempts: 0
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }
      
      // Reset form and close modal
      setNewUserData({
        email: '',
        name: '',
        password: '',
        membership_type: 'competitor',
        location: '',
        phone: '',
        company_name: '',
        status: 'pending',
        verification_status: 'pending',
        subscription_plan: 'free'
      });
      
      setShowAddUserModal(false);
      setSuccessMessage('User created successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reload users
      await loadUsers();
    } catch (error) {
      console.error('Failed to add user:', error);
      setError(error instanceof Error ? error.message : 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditUser = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      if (!selectedUser || !editUserData) {
        throw new Error('No user selected for editing');
      }
      
      // Update user directly in the database
      const updateData = {
        ...editUserData,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', selectedUser.id);
      
      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Failed to update user: ${updateError.message}`);
      }
      
      // Reset form and close modal
      setEditUserData({});
      setShowEditUserModal(false);
      setSuccessMessage('User updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reload users
      await loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      setError(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleApproveUser = async (userId: string) => {
    try {
      await handleUserAction(userId, 'approve');
      setSuccessMessage('User approved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to approve user:', error);
      setError(error instanceof Error ? error.message : 'Failed to approve user');
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
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
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${styles[verification as keyof typeof styles]}`}>
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type as keyof typeof styles]}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
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

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-electric-500 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">User Management</h1>
              <p className="text-gray-400">Manage users, roles, and permissions</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAddUserModal(true)}
            className="bg-electric-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-8 flex items-start space-x-3 animate-fade-in">
            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-green-400 font-semibold">Success</h3>
              <p className="text-green-300">{successMessage}</p>
            </div>
          </div>
        )}
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-400 font-semibold mb-2">Error Loading Users</h3>
                <p className="text-red-300 mb-4">{error}</p>
                {error.includes('Access denied') && (
                  <div className="space-y-2">
                    <p className="text-red-200 text-sm">To fix this issue:</p>
                    <ol className="text-red-200 text-sm list-decimal list-inside space-y-1">
                      <li>Go to the <a href="/login" className="text-red-100 underline hover:text-white">login page</a></li>
                      <li>Click the "Create Admin User" button</li>
                      <li>Return to this page and refresh</li>
                    </ol>
                  </div>
                )}
                {error.includes('Missing Supabase') && (
                  <div className="space-y-2">
                    <p className="text-red-200 text-sm">To fix this issue:</p>
                    <ol className="text-red-200 text-sm list-decimal list-inside space-y-1">
                      <li>Check your .env file exists in the project root</li>
                      <li>Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set</li>
                      <li>Copy values from your Supabase project dashboard</li>
                      <li>Restart the development server</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 transition-colors"
              />
            </div>

            {/* Membership Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedMembershipType}
                onChange={(e) => setSelectedMembershipType(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                <option value="all">All Types</option>
                <option value="competitor">Competitor</option>
                <option value="retailer">Retailer</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="organization">Organization</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
                <option value="banned">Banned</option>
              </select>
            </div>

            {/* Verification Filter */}
            <div className="relative">
              <select
                value={selectedVerification}
                onChange={(e) => setSelectedVerification(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="unverified">Unverified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-white">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-electric-500" />
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Users</p>
                <p className="text-2xl font-bold text-green-400">{users.filter(u => u.status === 'active').length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Verification</p>
                <p className="text-2xl font-bold text-yellow-400">{users.filter(u => u.verification_status === 'pending').length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Suspended</p>
                <p className="text-2xl font-bold text-red-400">{users.filter(u => u.status === 'suspended' || u.status === 'banned').length}</p>
              </div>
              <Ban className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Verification</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-electric-500"></div>
                        <span>Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      No users found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-white font-medium">{user.name}</div>
                          <div className="text-gray-400 text-sm">{user.email}</div>
                          {user.company_name && (
                            <div className="text-gray-500 text-xs">{user.company_name}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getMembershipTypeBadge(user.membership_type)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4">
                        {getVerificationBadge(user.verification_status)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300 capitalize">{user.subscription_plan}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-300 text-sm">
                          {user.last_login_at ? formatDate(user.last_login_at) : 'Never'}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {user.login_count} logins
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserModal(true);
                            }}
                            className="text-electric-400 hover:text-electric-300 transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserModal(true);
                            }}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {user.status === 'pending' && (
                            <button
                              onClick={() => handleApproveUser(user.id)}
                              className="text-green-400 hover:text-green-300 transition-colors"
                              title="Approve User"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          
                          {user.status === 'active' ? (
                            <button
                              onClick={() => handleUserAction(user.id, 'suspend')}
                              className="text-yellow-400 hover:text-yellow-300 transition-colors"
                              title="Suspend User"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserAction(user.id, 'activate')}
                              className="text-green-400 hover:text-green-300 transition-colors"
                              title="Activate User"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setUserToDelete(user);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-center text-gray-400 text-sm">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">User Details</h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Name</label>
                  <div className="text-white">{selectedUser.name}</div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Email</label>
                  <div className="text-white">{selectedUser.email}</div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Membership Type</label>
                  <div>{getMembershipTypeBadge(selectedUser.membership_type)}</div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Status</label>
                  <div>{getStatusBadge(selectedUser.status)}</div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Verification</label>
                  <div>{getVerificationBadge(selectedUser.verification_status)}</div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Subscription Plan</label>
                  <div className="text-white capitalize">{selectedUser.subscription_plan}</div>
                </div>
                {selectedUser.location && (
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Location</label>
                    <div className="text-white">{selectedUser.location}</div>
                  </div>
                )}
                {selectedUser.company_name && (
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Company</label>
                    <div className="text-white">{selectedUser.company_name}</div>
                  </div>
                )}
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Created</label>
                  <div className="text-white">{formatDate(selectedUser.created_at)}</div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Last Login</label>
                  <div className="text-white">
                    {selectedUser.last_login_at ? formatDate(selectedUser.last_login_at) : 'Never'}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Login Count</label>
                  <div className="text-white">{selectedUser.login_count}</div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Failed Attempts</label>
                  <div className="text-white">{selectedUser.failed_login_attempts}</div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors">
                Edit User
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-electric-500 rounded-full flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Add New User</h3>
                </div>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleAddUser(); }} className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <span className="text-red-400 font-medium">{error}</span>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={newUserData.email}
                        onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="user@example.com"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={newUserData.name}
                        onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Must be at least 8 characters with uppercase, lowercase, number, and special character
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Membership Type *
                    </label>
                    <select
                      required
                      value={newUserData.membership_type}
                      onChange={(e) => setNewUserData({...newUserData, membership_type: e.target.value as any})}
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
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={newUserData.location || ''}
                        onChange={(e) => setNewUserData({...newUserData, location: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="City, State"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        value={newUserData.phone || ''}
                        onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                  
                  {(newUserData.membership_type === 'retailer' || 
                    newUserData.membership_type === 'manufacturer' || 
                    newUserData.membership_type === 'organization') && (
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        Company Name
                      </label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={newUserData.company_name || ''}
                          onChange={(e) => setNewUserData({...newUserData, company_name: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                          placeholder="Company Name"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Status *
                    </label>
                    <select
                      required
                      value={newUserData.status}
                      onChange={(e) => setNewUserData({...newUserData, status: e.target.value as any})}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Verification Status *
                    </label>
                    <select
                      required
                      value={newUserData.verification_status}
                      onChange={(e) => setNewUserData({...newUserData, verification_status: e.target.value as any})}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="unverified">Unverified</option>
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Subscription Plan *
                    </label>
                    <select
                      required
                      value={newUserData.subscription_plan}
                      onChange={(e) => setNewUserData({...newUserData, subscription_plan: e.target.value as any})}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="business">Business</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
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
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span>Create User</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Edit className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Edit User</h3>
                </div>
                <button
                  onClick={() => setShowEditUserModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleEditUser(); }} className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <span className="text-red-400 font-medium">{error}</span>
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
                        value={editUserData.email || selectedUser.email}
                        onChange={(e) => setEditUserData({...editUserData, email: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="user@example.com"
                        disabled
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={editUserData.name || selectedUser.name}
                        onChange={(e) => setEditUserData({...editUserData, name: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Membership Type
                    </label>
                    <select
                      value={editUserData.membership_type || selectedUser.membership_type}
                      onChange={(e) => setEditUserData({...editUserData, membership_type: e.target.value as any})}
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
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={editUserData.location !== undefined ? editUserData.location : (selectedUser.location || '')}
                        onChange={(e) => setEditUserData({...editUserData, location: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="City, State"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        value={editUserData.phone !== undefined ? editUserData.phone : (selectedUser.phone || '')}
                        onChange={(e) => setEditUserData({...editUserData, phone: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                  
                  {((editUserData.membership_type || selectedUser.membership_type) === 'retailer' || 
                    (editUserData.membership_type || selectedUser.membership_type) === 'manufacturer' || 
                    (editUserData.membership_type || selectedUser.membership_type) === 'organization') && (
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        Company Name
                      </label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={editUserData.company_name !== undefined ? editUserData.company_name : (selectedUser.company_name || '')}
                          onChange={(e) => setEditUserData({...editUserData, company_name: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                          placeholder="Company Name"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Status
                    </label>
                    <select
                      value={editUserData.status || selectedUser.status}
                      onChange={(e) => setEditUserData({...editUserData, status: e.target.value as any})}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                      <option value="banned">Banned</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Verification Status
                    </label>
                    <select
                      value={editUserData.verification_status || selectedUser.verification_status}
                      onChange={(e) => setEditUserData({...editUserData, verification_status: e.target.value as any})}
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
                      Subscription Plan
                    </label>
                    <select
                      value={editUserData.subscription_plan || selectedUser.subscription_plan}
                      onChange={(e) => setEditUserData({...editUserData, subscription_plan: e.target.value as any})}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="business">Business</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditUserModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
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
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
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
                Are you sure you want to delete <strong>{userToDelete.name}</strong>? 
                This will permanently remove their account and all associated data.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (userToDelete) {
                      handleUserAction(userToDelete.id, 'delete');
                      setShowDeleteConfirm(false);
                      setUserToDelete(null);
                    }
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
    </div>
  );
}