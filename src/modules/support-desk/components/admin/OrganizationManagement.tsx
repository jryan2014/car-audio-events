import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Settings, UserPlus, BarChart3 } from 'lucide-react';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { supabase } from '../../../../lib/supabase';
import { organizationService } from '../../services/supabase-client';

interface Organization {
  id: number;
  name: string;
  email: string;
  website?: string;
  logo_url?: string;
  created_at: string;
  has_support?: boolean;
}

interface SupportOrganizationSettings {
  id: string;
  organization_id: number;
  is_provisioned: boolean;
  provisioned_at?: string;
  support_email?: string;
  custom_message?: string;
}

const OrganizationManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrgs, setSelectedOrgs] = useState<number[]>([]);
  const [enablingSupport, setEnablingSupport] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      // Get all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (orgsError) throw orgsError;

      // Get support settings for each org
      const organizationsWithSupport = await Promise.all(
        (orgs || []).map(async (org) => {
          const settings = await organizationService.getOrganizationSettings(org.id);
          return {
            ...org,
            has_support: settings?.is_provisioned || false
          };
        })
      );

      setOrganizations(organizationsWithSupport);
    } catch (error) {
      console.error('Error loading organizations:', error);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableSupport = async (orgId: number) => {
    setEnablingSupport(true);
    try {
      // Create support settings for the organization
      const { error } = await supabase
        .from('support_organization_settings')
        .insert({
          organization_id: orgId,
          is_provisioned: true,
          provisioned_at: new Date().toISOString(),
          support_team_user_ids: [],
          auto_assign_enabled: false,
          email_notifications_enabled: true
        });

      if (error && error.code !== '23505') { // Ignore duplicate key error
        throw error;
      }

      await loadOrganizations();
    } catch (error) {
      console.error('Error enabling support:', error);
      setError('Failed to enable support for organization');
    } finally {
      setEnablingSupport(false);
    }
  };

  const handleDisableSupport = async (orgId: number) => {
    if (!confirm('Are you sure you want to disable support for this organization? This action cannot be undone.')) {
      return;
    }

    setEnablingSupport(true);
    try {
      const { error } = await supabase
        .from('support_organization_settings')
        .update({ is_provisioned: false })
        .eq('organization_id', orgId);

      if (error) throw error;

      await loadOrganizations();
    } catch (error) {
      console.error('Error disabling support:', error);
      setError('Failed to disable support for organization');
    } finally {
      setEnablingSupport(false);
    }
  };

  const handleBulkEnable = async () => {
    if (selectedOrgs.length === 0) {
      setError('Please select organizations to enable support');
      return;
    }

    setEnablingSupport(true);
    try {
      await Promise.all(
        selectedOrgs.map(orgId => handleEnableSupport(orgId))
      );
      setSelectedOrgs([]);
    } finally {
      setEnablingSupport(false);
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'enabled' && org.has_support) ||
      (filter === 'disabled' && !org.has_support);

    const matchesSearch = 
      !searchTerm ||
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const toggleOrgSelection = (orgId: number) => {
    setSelectedOrgs(prev =>
      prev.includes(orgId)
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link
            to="/admin/support/settings"
            className="inline-flex items-center text-gray-400 hover:text-gray-200 mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Settings
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Organization Support Management
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Enable or disable support desk access for organizations
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Organizations
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filter by Support Status
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
            >
              <option value="all">All Organizations</option>
              <option value="enabled">Support Enabled</option>
              <option value="disabled">Support Disabled</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleBulkEnable}
              disabled={selectedOrgs.length === 0 || enablingSupport}
              className="px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600 disabled:opacity-50"
            >
              Enable Support for Selected ({selectedOrgs.length})
            </button>
          </div>
        </div>
      </div>

      {/* Organizations List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="large" />
        </div>
      ) : filteredOrganizations.length === 0 ? (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-8 text-center">
          <p className="text-gray-400">No organizations found</p>
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedOrgs.length === filteredOrganizations.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrgs(filteredOrganizations.map(org => org.id));
                      } else {
                        setSelectedOrgs([]);
                      }
                    }}
                    className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Support Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredOrganizations.map((org) => (
                <tr key={org.id} className={`${filteredOrganizations.indexOf(org) % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/50'}`}>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedOrgs.includes(org.id)}
                      onChange={() => toggleOrgSelection(org.id)}
                      className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {org.logo_url && (
                        <img
                          src={org.logo_url}
                          alt={org.name}
                          className="h-8 w-8 rounded-full mr-3"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-white">
                          {org.name}
                        </div>
                        {org.website && (
                          <div className="text-sm text-gray-400">
                            {org.website}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {org.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {org.has_support ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900/50 text-green-400">
                        Enabled
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-700 text-gray-300">
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {org.has_support ? (
                        <>
                          <Link
                            to={`/admin/support/organizations/${org.id}/settings`}
                            className="text-electric-500 hover:text-electric-400"
                          >
                            <Settings className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/admin/support/organizations/${org.id}/analytics`}
                            className="text-purple-500 hover:text-purple-400"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDisableSupport(org.id)}
                            disabled={enablingSupport}
                            className="text-red-500 hover:text-red-400 disabled:opacity-50"
                          >
                            Disable
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEnableSupport(org.id)}
                          disabled={enablingSupport}
                          className="text-green-500 hover:text-green-400 disabled:opacity-50"
                        >
                          Enable
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
};

export default OrganizationManagement;