import React, { useState, useEffect } from 'react';
import { 
  Settings, Users, Save, RefreshCw, AlertCircle, CheckCircle, 
  UserCheck, UserX, Calendar, Clock, Search, Filter
} from 'lucide-react';
import { featureFlagService, FeatureFlag, UserFeatureAccess, AccessMode } from '../services/featureFlagService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import Badge from './Badge';
import { useNotifications } from './NotificationSystem';

interface SubwooferDesignerAdminProps {
  className?: string;
}

export default function SubwooferDesignerAdmin({ className = '' }: SubwooferDesignerAdminProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [featureFlag, setFeatureFlag] = useState<FeatureFlag | null>(null);
  const [users, setUsers] = useState<UserFeatureAccess[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserFeatureAccess[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [membershipFilter, setMembershipFilter] = useState<string>('all');
  const [accessFilter, setAccessFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, membershipFilter, accessFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [flagData, usersData] = await Promise.all([
        featureFlagService.getFeatureFlag(),
        featureFlagService.getSubwooferUsers()
      ]);
      
      setFeatureFlag(flagData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Load Error', 'Failed to load feature flag data');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(term) || 
        user.email.toLowerCase().includes(term)
      );
    }

    // Membership filter
    if (membershipFilter !== 'all') {
      filtered = filtered.filter(user => user.membership_type === membershipFilter);
    }

    // Access filter
    if (accessFilter !== 'all') {
      const hasAccess = accessFilter === 'granted';
      filtered = filtered.filter(user => user.has_access === hasAccess);
    }

    setFilteredUsers(filtered);
  };

  const handleToggleFeature = async (accessMode: AccessMode, enabled: boolean = true) => {
    try {
      setSaving(true);
      await featureFlagService.toggleFeature(accessMode, enabled);
      await loadData();
      showSuccess('Settings Updated', 'Feature flag settings have been updated successfully');
    } catch (error) {
      console.error('Error toggling feature:', error);
      showError('Update Error', 'Failed to update feature flag settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUserAccessChange = async (userId: string, grantAccess: boolean, expiresAt?: Date) => {
    try {
      setSaving(true);
      await featureFlagService.manageUserAccess(userId, grantAccess, expiresAt);
      await loadData();
      
      const action = grantAccess ? 'granted' : 'revoked';
      showSuccess('Access Updated', `User access has been ${action} successfully`);
    } catch (error) {
      console.error('Error managing user access:', error);
      showError('Access Error', 'Failed to update user access');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAccessChange = async (grantAccess: boolean) => {
    if (selectedUsers.length === 0) {
      showError('Selection Required', 'Please select users first');
      return;
    }

    try {
      setSaving(true);
      
      // Process users in batches to avoid overwhelming the server
      for (const userId of selectedUsers) {
        await featureFlagService.manageUserAccess(userId, grantAccess);
      }
      
      await loadData();
      setSelectedUsers([]);
      
      const action = grantAccess ? 'granted' : 'revoked';
      showSuccess('Bulk Update Complete', `Access ${action} for ${selectedUsers.length} users`);
    } catch (error) {
      console.error('Error with bulk access change:', error);
      showError('Bulk Update Error', 'Failed to update access for all selected users');
    } finally {
      setSaving(false);
    }
  };

  const getAccessModeDisplay = (mode: AccessMode) => {
    switch (mode) {
      case 'disabled':
        return { text: 'Disabled', color: 'red' };
      case 'all_pro':
        return { text: 'All Pro Members', color: 'green' };
      case 'specific_users':
        return { text: 'Specific Users', color: 'blue' };
      default:
        return { text: 'Unknown', color: 'gray' };
    }
  };

  const getMembershipDisplayName = (type: string) => {
    switch (type) {
      case 'pro_competitor':
        return 'Pro Competitor';
      case 'competitor':
        return 'Competitor';
      case 'retailer':
        return 'Retailer';
      case 'manufacturer':
        return 'Manufacturer';
      case 'organization':
        return 'Organization';
      case 'admin':
        return 'Administrator';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-900 min-h-screen ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSpinner 
            size="large" 
            color="electric" 
            message="Loading feature settings..." 
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 min-h-screen ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Subwoofer Designer Admin</h1>
            <p className="text-gray-400 mt-2">Manage feature access and user permissions</p>
          </div>
          <button
            onClick={loadData}
            disabled={saving}
            className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Feature Status Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="h-6 w-6 text-electric-500" />
            <h2 className="text-xl font-bold text-white">Feature Control</h2>
          </div>

          {featureFlag && (
            <div className="space-y-6">
              {/* Current Status */}
              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${featureFlag.is_enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <p className="font-medium text-white">
                      Feature Status: {featureFlag.is_enabled ? 'Enabled' : 'Disabled'}
                    </p>
                    <p className="text-sm text-gray-400">
                      Access Mode: <Badge {...getAccessModeDisplay(featureFlag.access_mode)} size="sm" />
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Last updated</p>
                  <p className="text-white">{new Date(featureFlag.updated_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Access Mode Controls */}
              <div className="grid md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleToggleFeature('disabled', false)}
                  disabled={saving}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    featureFlag.access_mode === 'disabled' && !featureFlag.is_enabled
                      ? 'border-red-500 bg-red-500/10 text-red-300'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-red-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <UserX className="h-5 w-5" />
                    <span className="font-medium">Disabled</span>
                  </div>
                  <p className="text-sm opacity-80">Nobody can access the feature</p>
                </button>

                <button
                  onClick={() => handleToggleFeature('all_pro', true)}
                  disabled={saving}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    featureFlag.access_mode === 'all_pro' && featureFlag.is_enabled
                      ? 'border-green-500 bg-green-500/10 text-green-300'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-green-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5" />
                    <span className="font-medium">All Pro Members</span>
                  </div>
                  <p className="text-sm opacity-80">All pro subscribers get access</p>
                </button>

                <button
                  onClick={() => handleToggleFeature('specific_users', true)}
                  disabled={saving}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    featureFlag.access_mode === 'specific_users' && featureFlag.is_enabled
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-blue-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="h-5 w-5" />
                    <span className="font-medium">Specific Users</span>
                  </div>
                  <p className="text-sm opacity-80">Manually grant individual access</p>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Management - Only show if specific users mode is active */}
        {featureFlag?.access_mode === 'specific_users' && featureFlag?.is_enabled && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="h-6 w-6 text-electric-500" />
              <h2 className="text-xl font-bold text-white">User Access Management</h2>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400"
                  />
                </div>
              </div>
              
              <select
                value={membershipFilter}
                onChange={(e) => setMembershipFilter(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="all">All Membership Types</option>
                <option value="pro_competitor">Pro Competitors</option>
                <option value="competitor">Competitors</option>
                <option value="retailer">Retailers</option>
                <option value="manufacturer">Manufacturers</option>
                <option value="organization">Organizations</option>
              </select>

              <select
                value={accessFilter}
                onChange={(e) => setAccessFilter(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="all">All Access Status</option>
                <option value="granted">Has Access</option>
                <option value="denied">No Access</option>
              </select>
            </div>

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-blue-300">
                    {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBulkAccessChange(true)}
                      disabled={saving}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      Grant Access
                    </button>
                    <button
                      onClick={() => handleBulkAccessChange(false)}
                      disabled={saving}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      Revoke Access
                    </button>
                    <button
                      onClick={() => setSelectedUsers([])}
                      className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* User List */}
            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No users found matching your filters
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.user_id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.user_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.user_id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.user_id));
                            }
                          }}
                          className="h-4 w-4 text-electric-500 rounded border-gray-600 bg-gray-800"
                        />
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{user.name}</span>
                            <Badge text={getMembershipDisplayName(user.membership_type)} color="blue" size="sm" />
                            {user.has_access && (
                              <Badge text="Access Granted" color="green" size="sm" />
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{user.email}</p>
                          {user.access_granted_at && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3 text-gray-500" />
                              <span className="text-xs text-gray-500">
                                Access granted: {new Date(user.access_granted_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {user.access_expires_at && (
                            <div className="flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs text-yellow-500">
                                Expires: {new Date(user.access_expires_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUserAccessChange(user.user_id, !user.has_access)}
                          disabled={saving}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50 ${
                            user.has_access
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {user.has_access ? 'Revoke' : 'Grant'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination info */}
            {filteredUsers.length > 0 && (
              <div className="mt-6 text-center text-sm text-gray-400">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            )}
          </div>
        )}

        {/* Statistics */}
        <div className="mt-8 grid md:grid-cols-4 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Total Users</span>
            </div>
            <p className="text-2xl font-bold text-white">{users.length}</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <UserCheck className="h-5 w-5 text-green-400" />
              <span className="text-sm font-medium text-gray-300">With Access</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {users.filter(u => u.has_access).length}
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <UserX className="h-5 w-5 text-red-400" />
              <span className="text-sm font-medium text-gray-300">No Access</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {users.filter(u => !u.has_access).length}
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">Pro Members</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {users.filter(u => u.membership_type === 'pro_competitor').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}