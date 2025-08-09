/**
 * Organization Seat Management Component
 * Manages employee seats, roles, and restrictions for organizations
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { permissionSystem } from '../../utils/permissionSystem';

interface Organization {
  id: number;
  name: string;
  logoUrl?: string;
  organizationType: string;
}

interface Subscription {
  planName: string;
  seatLimit: number;
  seatsUsed: number;
  billingStatus: string;
  nextBillingDate?: string;
}

interface Employee {
  userId: string;
  email: string;
  name?: string;
  employeeRole: string;
  department?: string;
  jobTitle?: string;
  status: string;
  lastActive?: string;
  featureRestrictions?: Record<string, any>;
  invitationAcceptedAt?: string;
}

interface Feature {
  id: string;
  name: string;
  displayName: string;
  category: string;
}

export const OrganizationSeatManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRestrictionModal, setShowRestrictionModal] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizations();
    loadFeatures();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      loadOrganizationData(selectedOrg.id);
    }
  }, [selectedOrg]);

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, logo_url, organization_type')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
      if (data && data.length > 0 && !selectedOrg) {
        setSelectedOrg(data[0]);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeatures = async () => {
    const { data, error } = await supabase
      .from('features')
      .select('id, name, display_name, category')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (!error && data) {
      setFeatures(data);
    }
  };

  const loadOrganizationData = async (orgId: number) => {
    try {
      // Load subscription info
      const { data: subData, error: subError } = await supabase
        .from('organization_subscriptions')
        .select('*')
        .eq('organization_id', orgId)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error loading subscription:', subError);
      } else if (subData) {
        setSubscription({
          planName: subData.plan_name,
          seatLimit: subData.seat_limit,
          seatsUsed: subData.seats_used,
          billingStatus: subData.billing_status,
          nextBillingDate: subData.next_billing_date
        });
      }

      // Load employees
      const employeeData = await permissionSystem.getOrganizationEmployees(orgId);
      setEmployees(employeeData);
    } catch (error) {
      console.error('Error loading organization data:', error);
    }
  };

  const handleInviteEmployee = async (email: string, role: string, department?: string, jobTitle?: string) => {
    if (!selectedOrg) return;

    const seatCheck = await permissionSystem.checkSeatAvailability(selectedOrg.id);
    if (!seatCheck.canAddEmployee) {
      alert('No available seats. Please upgrade your plan or remove an employee.');
      return;
    }

    // In a real implementation, this would create a user account or send an invitation
    // For now, we'll assume the user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError) {
      alert('User not found. Please ensure the user has an account first.');
      return;
    }

    const result = await permissionSystem.addOrganizationEmployee(
      selectedOrg.id,
      user.id,
      role,
      'current-admin-user-id', // This would be the current admin's ID
      {}
    );

    if (result.success) {
      await loadOrganizationData(selectedOrg.id);
      setShowInviteModal(false);
      alert('Employee added successfully!');
    } else {
      alert(`Failed to add employee: ${result.error}`);
    }
  };

  const handleUpdateRestrictions = async (employee: Employee, restrictions: Record<string, any>) => {
    if (!selectedOrg) return;

    const result = await permissionSystem.updateEmployeeRestrictions(
      selectedOrg.id,
      employee.userId,
      restrictions,
      'current-admin-user-id'
    );

    if (result.success) {
      await loadOrganizationData(selectedOrg.id);
      setShowRestrictionModal(null);
      alert('Employee restrictions updated successfully!');
    } else {
      alert(`Failed to update restrictions: ${result.error}`);
    }
  };

  const handleRemoveEmployee = async (employee: Employee) => {
    if (!selectedOrg) return;
    
    if (!confirm(`Are you sure you want to remove ${employee.name || employee.email} from the organization?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_employees')
        .update({ status: 'inactive' })
        .eq('organization_id', selectedOrg.id)
        .eq('user_id', employee.userId);

      if (error) throw error;

      await loadOrganizationData(selectedOrg.id);
      alert('Employee removed successfully!');
    } catch (error) {
      console.error('Error removing employee:', error);
      alert('Failed to remove employee.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading organization data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Organization Seat Management</h1>
        <p className="text-gray-600">
          Manage employee seats, roles, and feature restrictions for organizations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Organization Selector */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Organizations</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {organizations.map(org => (
              <div
                key={org.id}
                className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
                  selectedOrg?.id === org.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => setSelectedOrg(org)}
              >
                <div className="flex items-center gap-3">
                  {org.logoUrl ? (
                    <img
                      src={org.logoUrl}
                      alt={org.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {org.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{org.name}</div>
                    <div className="text-sm text-gray-500 capitalize">
                      {org.organizationType.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Organization Details & Employee Management */}
        {selectedOrg && (
          <div className="lg:col-span-3 space-y-6">
            {/* Subscription Overview */}
            {subscription && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">{selectedOrg.name}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    subscription.billingStatus === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {subscription.billingStatus}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Plan</div>
                    <div className="text-lg font-semibold capitalize">
                      {subscription.planName.replace('_', ' ')}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Seats</div>
                    <div className="text-lg font-semibold">
                      {subscription.seatsUsed} / {subscription.seatLimit}
                    </div>
                    <div className="text-sm text-gray-500">
                      {subscription.seatLimit - subscription.seatsUsed} available
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Next Billing</div>
                    <div className="text-lg font-semibold">
                      {subscription.nextBillingDate 
                        ? new Date(subscription.nextBillingDate).toLocaleDateString()
                        : 'N/A'
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Employee List */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Employees</h2>
                  <p className="text-sm text-gray-600">
                    {employees.length} employees
                  </p>
                </div>
                <button
                  onClick={() => setShowInviteModal(true)}
                  disabled={subscription && subscription.seatsUsed >= subscription.seatLimit}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                >
                  Invite Employee
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Active
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map(employee => (
                      <tr key={employee.userId}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {(employee.name || employee.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {employee.name || 'No name'}
                              </div>
                              <div className="text-sm text-gray-500">{employee.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            employee.employeeRole === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : employee.employeeRole === 'manager'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {employee.employeeRole}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.department || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            employee.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {employee.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.lastActive 
                            ? new Date(employee.lastActive).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => setShowRestrictionModal(employee)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Restrictions
                            </button>
                            <button
                              onClick={() => handleRemoveEmployee(employee)}
                              className="text-red-600 hover:text-red-900 ml-2"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invite Employee Modal */}
      {showInviteModal && (
        <InviteEmployeeModal
          onInvite={handleInviteEmployee}
          onCancel={() => setShowInviteModal(false)}
          availableSeats={subscription ? subscription.seatLimit - subscription.seatsUsed : 0}
        />
      )}

      {/* Employee Restrictions Modal */}
      {showRestrictionModal && (
        <EmployeeRestrictionsModal
          employee={showRestrictionModal}
          features={features}
          onSave={(restrictions) => handleUpdateRestrictions(showRestrictionModal, restrictions)}
          onCancel={() => setShowRestrictionModal(null)}
        />
      )}
    </div>
  );
};

interface InviteEmployeeModalProps {
  onInvite: (email: string, role: string, department?: string, jobTitle?: string) => void;
  onCancel: () => void;
  availableSeats: number;
}

const InviteEmployeeModal: React.FC<InviteEmployeeModalProps> = ({
  onInvite,
  onCancel,
  availableSeats
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && role) {
      onInvite(email, role, department || undefined, jobTitle || undefined);
    }
  };

  if (availableSeats <= 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96">
          <h3 className="text-lg font-semibold mb-4">No Available Seats</h3>
          <p className="text-gray-600 mb-4">
            This organization has reached its seat limit. Please upgrade the plan or remove an employee to add a new one.
          </p>
          <button
            onClick={onCancel}
            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">Invite Employee</h3>
        <p className="text-sm text-gray-600 mb-4">
          {availableSeats} seat{availableSeats !== 1 ? 's' : ''} available
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="support_rep">Support Rep</option>
              <option value="read_only">Read Only</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Sales, Support, Marketing"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Title
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Sales Manager, Support Rep"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-2 mt-6">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Send Invitation
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EmployeeRestrictionsModalProps {
  employee: Employee;
  features: Feature[];
  onSave: (restrictions: Record<string, any>) => void;
  onCancel: () => void;
}

const EmployeeRestrictionsModal: React.FC<EmployeeRestrictionsModalProps> = ({
  employee,
  features,
  onSave,
  onCancel
}) => {
  const [restrictions, setRestrictions] = useState<Record<string, any>>(
    employee.featureRestrictions || {}
  );

  const toggleFeatureAccess = (featureId: string, action: string, allowed: boolean) => {
    setRestrictions(prev => ({
      ...prev,
      [featureId]: {
        ...prev[featureId],
        allowed_actions: allowed
          ? [...(prev[featureId]?.allowed_actions || []), action]
          : (prev[featureId]?.allowed_actions || []).filter((a: string) => a !== action)
      }
    }));
  };

  const setUsageLimit = (featureId: string, limit: number) => {
    setRestrictions(prev => ({
      ...prev,
      [featureId]: {
        ...prev[featureId],
        usage_limits: { daily_limit: limit }
      }
    }));
  };

  const handleSave = () => {
    onSave(restrictions);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-3/4 max-w-4xl max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          Employee Restrictions: {employee.name || employee.email}
        </h3>
        
        <div className="space-y-4">
          {Object.entries(
            features.reduce((acc, feature) => {
              if (!acc[feature.category]) acc[feature.category] = [];
              acc[feature.category].push(feature);
              return acc;
            }, {} as Record<string, Feature[]>)
          ).map(([category, categoryFeatures]) => (
            <div key={category} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-3 uppercase text-sm tracking-wider">
                {category}
              </h4>
              
              {categoryFeatures.map(feature => {
                const featureRestrictions = restrictions[feature.id] || {};
                const allowedActions = featureRestrictions.allowed_actions || [];
                const usageLimit = featureRestrictions.usage_limits?.daily_limit || '';
                
                return (
                  <div key={feature.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 border border-gray-100 rounded mb-2">
                    <div>
                      <div className="font-medium">{feature.displayName}</div>
                      <div className="text-sm text-gray-500">{feature.name}</div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {['view', 'create', 'edit', 'delete'].map(action => (
                        <label key={action} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={allowedActions.includes(action)}
                            onChange={(e) => toggleFeatureAccess(feature.id, action, e.target.checked)}
                            className="mr-1"
                          />
                          <span className="text-sm">{action}</span>
                        </label>
                      ))}
                    </div>
                    
                    <div>
                      <input
                        type="number"
                        value={usageLimit}
                        onChange={(e) => setUsageLimit(feature.id, parseInt(e.target.value) || 0)}
                        placeholder="Daily limit"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Save Restrictions
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};