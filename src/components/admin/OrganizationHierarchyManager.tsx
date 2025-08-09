import React, { useState, useEffect } from 'react';
import { Users, Building, UserPlus, UserMinus, Mail, DollarSign, Settings, ChevronDown, ChevronRight, Search, Filter, MoreVertical, Check, X, AlertCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Organization {
  id: number;
  name: string;
  owner_id: string;
  membership_plan_id: string;
  description: string;
  website: string;
  email: string;
  seat_configuration: {
    base_seats: number;
    used_seats: number;
    max_additional_seats: number;
    seat_price: number;
  };
  is_active: boolean;
  created_at: string;
}

interface OrganizationSeat {
  id: string;
  organization_id: number;
  user_id: string;
  seat_type: 'standard' | 'admin' | 'viewer';
  is_active: boolean;
  monthly_cost: number;
  user?: {
    email: string;
    full_name: string;
    membership_type: string;
  };
}

interface Invitation {
  id: string;
  organization_id: number;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
}

export const OrganizationHierarchyManager: React.FC = () => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [seats, setSeats] = useState<OrganizationSeat[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [searchTerm, setSearchTerm] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      loadOrganizationDetails(selectedOrg.id);
    }
  }, [selectedOrg]);

  const loadOrganizations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          owner:users!organizations_owner_id_fkey(email, full_name),
          plan:membership_plans(name, type)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
      
      if (data && data.length > 0 && !selectedOrg) {
        setSelectedOrg(data[0]);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrganizationDetails = async (orgId: number) => {
    try {
      // Load seats
      const { data: seatsData } = await supabase
        .from('organization_seats')
        .select(`
          *,
          user:users(email, full_name, membership_type)
        `)
        .eq('organization_id', orgId)
        .eq('is_active', true);

      setSeats(seatsData || []);

      // Load invitations
      const { data: invitesData } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', orgId)
        .is('accepted_at', null)
        .gte('expires_at', new Date().toISOString());

      setInvitations(invitesData || []);

      // Get seat usage
      const { data: usageData } = await supabase
        .rpc('get_organization_seat_usage', { org_id: orgId });

      if (usageData && usageData.length > 0) {
        setSelectedOrg(prev => prev ? {
          ...prev,
          seat_configuration: {
            ...prev.seat_configuration,
            used_seats: usageData[0].used_seats
          }
        } : null);
      }
    } catch (error) {
      console.error('Error loading organization details:', error);
    }
  };

  const createOrganization = async () => {
    const name = prompt('Organization name:');
    if (!name) return;

    setSaveStatus('saving');
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name,
          owner_id: user?.id,
          membership_plan_id: 'default-org-plan', // You'll need to set this appropriately
          seat_configuration: {
            base_seats: 5,
            used_seats: 1,
            max_additional_seats: 100,
            seat_price: 29.99
          }
        })
        .select()
        .single();

      if (error) throw error;

      await loadOrganizations();
      setSelectedOrg(data);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error creating organization:', error);
      setSaveStatus('error');
    }
  };

  const inviteUser = async () => {
    if (!selectedOrg || !inviteEmail) return;

    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: selectedOrg.id,
          email: inviteEmail,
          role: inviteRole,
          invited_by: user?.id
        });

      if (error) throw error;

      await loadOrganizationDetails(selectedOrg.id);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error sending invitation:', error);
      setSaveStatus('error');
    }
  };

  const removeUserFromOrg = async (userId: string) => {
    if (!selectedOrg || !confirm('Remove this user from the organization?')) return;

    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .rpc('remove_user_from_organization', {
          p_organization_id: selectedOrg.id,
          p_user_id: userId,
          p_removed_by: user?.id
        });

      if (error) throw error;

      await loadOrganizationDetails(selectedOrg.id);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error removing user:', error);
      setSaveStatus('error');
    }
  };

  const updateSeatConfiguration = async (updates: Partial<Organization['seat_configuration']>) => {
    if (!selectedOrg) return;

    setSaveStatus('saving');
    try {
      const newConfig = { ...selectedOrg.seat_configuration, ...updates };
      
      const { error } = await supabase
        .from('organizations')
        .update({ seat_configuration: newConfig })
        .eq('id', selectedOrg.id);

      if (error) throw error;

      setSelectedOrg({ ...selectedOrg, seat_configuration: newConfig });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error updating seat configuration:', error);
      setSaveStatus('error');
    }
  };

  const cancelInvitation = async (inviteId: string) => {
    if (!confirm('Cancel this invitation?')) return;

    try {
      const { error } = await supabase
        .from('organization_invitations')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      if (selectedOrg) {
        await loadOrganizationDetails(selectedOrg.id);
      }
    } catch (error) {
      console.error('Error canceling invitation:', error);
    }
  };

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Building className="h-6 w-6 text-electric-500" />
          <h2 className="text-xl font-bold text-white">Organization Management</h2>
          <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
            {organizations.length} organizations
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {saveStatus === 'saving' && (
            <span className="text-gray-400 text-sm">Saving...</span>
          )}
          {saveStatus === 'success' && (
            <span className="text-green-400 text-sm flex items-center">
              <Check className="h-4 w-4 mr-1" /> Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-400 text-sm">Error saving</span>
          )}
          <button
            onClick={createOrganization}
            className="flex items-center space-x-2 px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Organization</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization List */}
        <div className="lg:col-span-1">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredOrgs.map(org => (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedOrg?.id === org.id
                    ? 'bg-electric-500/20 border-electric-500'
                    : 'bg-gray-700/30 hover:bg-gray-700/50'
                } border border-gray-600`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">{org.name}</h4>
                    <p className="text-gray-400 text-sm">{org.email || 'No email'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-medium">
                      {org.seat_configuration?.used_seats || 0}/{org.seat_configuration?.base_seats || 5}
                    </p>
                    <p className="text-gray-400 text-xs">seats</p>
                  </div>
                </div>
              </button>
            ))}

            {filteredOrgs.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No organizations found
              </div>
            )}
          </div>
        </div>

        {/* Organization Details */}
        {selectedOrg ? (
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex space-x-1 mb-6 bg-gray-900/50 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  activeTab === 'overview'
                    ? 'bg-electric-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('seats')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  activeTab === 'seats'
                    ? 'bg-electric-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                Seats & Users
              </button>
              <button
                onClick={() => setActiveTab('billing')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  activeTab === 'billing'
                    ? 'bg-electric-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                Billing
              </button>
            </div>

            {/* Content */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-3">Organization Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400">Name</label>
                      <p className="text-white">{selectedOrg.name}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Status</label>
                      <p className="text-white">
                        {selectedOrg.is_active ? (
                          <span className="text-green-400">Active</span>
                        ) : (
                          <span className="text-red-400">Inactive</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Email</label>
                      <p className="text-white">{selectedOrg.email || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Website</label>
                      <p className="text-white">{selectedOrg.website || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Created</label>
                      <p className="text-white">
                        {new Date(selectedOrg.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Description</label>
                      <p className="text-white">{selectedOrg.description || 'No description'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-3">Seat Configuration</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-400">Base Seats</label>
                      <input
                        type="number"
                        value={selectedOrg.seat_configuration?.base_seats || 5}
                        onChange={(e) => updateSeatConfiguration({ base_seats: parseInt(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-gray-800 text-white rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Max Additional</label>
                      <input
                        type="number"
                        value={selectedOrg.seat_configuration?.max_additional_seats || 100}
                        onChange={(e) => updateSeatConfiguration({ max_additional_seats: parseInt(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-gray-800 text-white rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Seat Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={selectedOrg.seat_configuration?.seat_price || 29.99}
                        onChange={(e) => updateSeatConfiguration({ seat_price: parseFloat(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-gray-800 text-white rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seats' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-medium">Active Seats</h3>
                    <p className="text-gray-400 text-sm">
                      {seats.length} of {selectedOrg.seat_configuration?.base_seats || 5} seats used
                    </p>
                  </div>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Invite User</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {seats.map(seat => (
                    <div key={seat.id} className="bg-gray-700/30 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{seat.user?.full_name || 'Unknown'}</p>
                          <p className="text-gray-400 text-sm">{seat.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          seat.seat_type === 'admin' 
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-gray-600 text-gray-300'
                        }`}>
                          {seat.seat_type}
                        </span>
                        <button
                          onClick={() => removeUserFromOrg(seat.user_id)}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                        >
                          <UserMinus className="h-4 w-4 text-gray-400 hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {seats.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      No users in this organization
                    </div>
                  )}
                </div>

                {invitations.length > 0 && (
                  <>
                    <h3 className="text-white font-medium mt-6 mb-3">Pending Invitations</h3>
                    <div className="space-y-2">
                      {invitations.map(invite => (
                        <div key={invite.id} className="bg-gray-700/30 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <p className="text-white">{invite.email}</p>
                            <p className="text-gray-400 text-sm">
                              Expires {new Date(invite.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => cancelInvitation(invite.id)}
                            className="text-red-400 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-4">
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-3">Billing Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Base Plan</span>
                      <span className="text-white">Organization</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Base Seats</span>
                      <span className="text-white">{selectedOrg.seat_configuration?.base_seats || 5}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Used Seats</span>
                      <span className="text-white">{seats.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Additional Seats</span>
                      <span className="text-white">
                        {Math.max(0, seats.length - (selectedOrg.seat_configuration?.base_seats || 5))}
                      </span>
                    </div>
                    <hr className="border-gray-600" />
                    <div className="flex justify-between">
                      <span className="text-gray-400">Additional Seat Cost</span>
                      <span className="text-white">
                        ${(Math.max(0, seats.length - (selectedOrg.seat_configuration?.base_seats || 5)) * 
                          (selectedOrg.seat_configuration?.seat_price || 29.99)).toFixed(2)}/mo
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center py-12">
            <div className="text-center">
              <Building className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Select an organization to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">Invite User</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-500"
                >
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={inviteUser}
                  disabled={!inviteEmail}
                  className="flex-1 px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Invitation
                </button>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};