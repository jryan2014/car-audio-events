/**
 * Admin Permission Management Interface
 * Handles dynamic feature detection, permission assignment, and organization management
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { permissionSystem } from '../../utils/permissionSystem';
import { featureRegistry } from '../../utils/dynamicFeatureRegistry';

interface Feature {
  id: string;
  name: string;
  displayName: string;
  category: string;
  isActive: boolean;
  autoDetectedAt?: string;
  detectionMethod?: string;
  subFeatures: SubFeature[];
}

interface SubFeature {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

interface Tier {
  id: string;
  name: string;
  displayName: string;
  priorityLevel: number;
}

interface Permission {
  tierId: string;
  featureId: string;
  actionId: string;
  isGranted: boolean;
  conditions?: Record<string, any>;
}

export const PermissionManagement: React.FC = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanningForFeatures, setScanningForFeatures] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadFeatures(),
        loadTiers(),
        loadPermissions()
      ]);
    } catch (error) {
      console.error('Error loading permission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeatures = async () => {
    const { data, error } = await supabase
      .from('features')
      .select(`
        id,
        name,
        display_name,
        category,
        is_active,
        auto_detected_at,
        detection_method,
        sub_features(
          id,
          name,
          display_name,
          description
        )
      `)
      .order('category', { ascending: true })
      .order('display_name', { ascending: true });

    if (error) throw error;

    setFeatures(data?.map(f => ({
      id: f.id,
      name: f.name,
      displayName: f.display_name,
      category: f.category,
      isActive: f.is_active,
      autoDetectedAt: f.auto_detected_at,
      detectionMethod: f.detection_method,
      subFeatures: f.sub_features || []
    })) || []);
  };

  const loadTiers = async () => {
    const { data, error } = await supabase
      .from('permission_tiers')
      .select('id, name, display_name, priority_level')
      .eq('is_active', true)
      .order('priority_level', { ascending: true });

    if (error) throw error;
    setTiers(data || []);
  };

  const loadPermissions = async () => {
    const { data, error } = await supabase
      .from('tier_feature_permissions')
      .select('tier_id, feature_id, action_id, is_granted, conditions');

    if (error) throw error;
    setPermissions(data || []);
  };

  const scanForNewFeatures = async () => {
    setScanningForFeatures(true);
    try {
      const detectedFeatures = await featureRegistry.scanForFeatures();
      
      for (const feature of detectedFeatures) {
        await featureRegistry.registerFeature(feature);
      }

      await loadFeatures();
      
      if (detectedFeatures.length > 0) {
        alert(`Detected and registered ${detectedFeatures.length} new features!`);
      } else {
        alert('No new features detected.');
      }
    } catch (error) {
      console.error('Error scanning for features:', error);
      alert('Error scanning for features. Check console for details.');
    } finally {
      setScanningForFeatures(false);
    }
  };

  const toggleFeatureActive = async (featureId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('features')
      .update({ is_active: isActive })
      .eq('id', featureId);

    if (error) {
      console.error('Error updating feature:', error);
      return;
    }

    setFeatures(prev => prev.map(f => 
      f.id === featureId ? { ...f, isActive } : f
    ));
  };

  const updatePermission = async (
    tierId: string, 
    featureId: string, 
    actionId: string, 
    isGranted: boolean,
    conditions?: Record<string, any>
  ) => {
    const { error } = await supabase
      .from('tier_feature_permissions')
      .upsert({
        tier_id: tierId,
        feature_id: featureId,
        action_id: actionId,
        is_granted: isGranted,
        conditions
      }, {
        onConflict: 'tier_id,feature_id,action_id'
      });

    if (error) {
      console.error('Error updating permission:', error);
      return;
    }

    // Update local state
    setPermissions(prev => {
      const filtered = prev.filter(p => 
        !(p.tierId === tierId && p.featureId === featureId && p.actionId === actionId)
      );
      return [...filtered, { tierId, featureId, actionId, isGranted, conditions }];
    });
  };

  const getPermission = (tierId: string, featureId: string, actionId: string): Permission | undefined => {
    return permissions.find(p => 
      p.tierId === tierId && p.featureId === featureId && p.actionId === actionId
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading permission system...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Permission Management</h1>
          <button
            onClick={scanForNewFeatures}
            disabled={scanningForFeatures}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            {scanningForFeatures ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Scanning...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Scan for New Features
              </>
            )}
          </button>
        </div>
        <p className="text-gray-600">
          Manage permissions for dynamically detected features and configure access tiers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feature List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Features</h2>
            <p className="text-sm text-gray-600">
              {features.length} features ({features.filter(f => f.isActive).length} active)
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {Object.entries(
              features.reduce((acc, feature) => {
                if (!acc[feature.category]) acc[feature.category] = [];
                acc[feature.category].push(feature);
                return acc;
              }, {} as Record<string, Feature[]>)
            ).map(([category, categoryFeatures]) => (
              <div key={category} className="p-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-700 mb-2 uppercase text-xs tracking-wider">
                  {category}
                </h3>
                {categoryFeatures.map(feature => (
                  <div
                    key={feature.id}
                    className={`p-2 rounded cursor-pointer mb-1 ${
                      selectedFeature?.id === feature.id
                        ? 'bg-blue-100 border border-blue-300'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedFeature(feature)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${feature.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                          {feature.displayName}
                        </span>
                        {feature.autoDetectedAt && (
                          <span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded">
                            Auto
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFeatureActive(feature.id, !feature.isActive);
                        }}
                        className={`w-4 h-4 rounded-full border-2 ${
                          feature.isActive 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {feature.subFeatures.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {feature.subFeatures.length} sub-features
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Permission Matrix */}
        {selectedFeature && (
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{selectedFeature.displayName}</h2>
              <p className="text-sm text-gray-600">
                Configure permissions for different access tiers
              </p>
              {selectedFeature.autoDetectedAt && (
                <div className="mt-2 text-xs text-green-600">
                  Auto-detected via {selectedFeature.detectionMethod} on{' '}
                  {new Date(selectedFeature.autoDetectedAt).toLocaleDateString()}
                </div>
              )}
            </div>
            
            <div className="p-4">
              <PermissionMatrix
                feature={selectedFeature}
                tiers={tiers}
                permissions={permissions}
                onUpdatePermission={updatePermission}
              />
            </div>
          </div>
        )}

        {/* Help Panel */}
        {!selectedFeature && (
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md">
            <div className="p-6 text-center text-gray-500">
              <svg className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium mb-2">Select a Feature</h3>
              <p className="text-sm">
                Choose a feature from the list to configure its permissions across different access tiers.
              </p>
              <div className="mt-4 text-left bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Feature Detection</h4>
                <ul className="text-sm space-y-1">
                  <li>• Auto-detected features appear with an "Auto" badge</li>
                  <li>• Click "Scan for New Features" to discover new functionality</li>
                  <li>• Toggle feature active status with the circle buttons</li>
                  <li>• Sub-features inherit parent feature permissions</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface PermissionMatrixProps {
  feature: Feature;
  tiers: Tier[];
  permissions: Permission[];
  onUpdatePermission: (tierId: string, featureId: string, actionId: string, isGranted: boolean, conditions?: Record<string, any>) => void;
}

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  feature,
  tiers,
  permissions,
  onUpdatePermission
}) => {
  const [actions, setActions] = useState<Array<{ id: string; name: string; displayName: string }>>([]);
  const [showConditions, setShowConditions] = useState<string | null>(null);

  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async () => {
    const { data, error } = await supabase
      .from('permission_actions')
      .select('id, name, display_name')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setActions(data);
    }
  };

  const getPermission = (tierId: string, actionId: string): Permission | undefined => {
    return permissions.find(p => 
      p.tierId === tierId && p.featureId === feature.id && p.actionId === actionId
    );
  };

  const handlePermissionChange = (tierId: string, actionId: string, isGranted: boolean) => {
    onUpdatePermission(tierId, feature.id, actionId, isGranted);
  };

  const handleConditionsChange = (tierId: string, actionId: string, conditions: Record<string, any>) => {
    const permission = getPermission(tierId, actionId);
    onUpdatePermission(tierId, feature.id, actionId, permission?.isGranted || false, conditions);
    setShowConditions(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-3 border-b border-gray-200">Tier</th>
            {actions.map(action => (
              <th key={action.id} className="text-center p-3 border-b border-gray-200 min-w-24">
                <div className="text-xs font-medium">{action.displayName}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tiers.map(tier => (
            <tr key={tier.id} className={tier.name === 'admin' ? 'bg-orange-50' : ''}>
              <td className="p-3 border-b border-gray-100">
                <div className="font-medium">{tier.displayName}</div>
                <div className="text-xs text-gray-500">Priority: {tier.priorityLevel}</div>
              </td>
              {actions.map(action => {
                const permission = getPermission(tier.id, action.id);
                const conditionsKey = `${tier.id}-${action.id}`;
                
                return (
                  <td key={action.id} className="p-3 border-b border-gray-100 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => handlePermissionChange(tier.id, action.id, !permission?.isGranted)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          permission?.isGranted
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {permission?.isGranted && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      
                      {permission?.isGranted && (
                        <button
                          onClick={() => setShowConditions(conditionsKey)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          {permission.conditions ? 'Edit' : 'Add'} Limits
                        </button>
                      )}
                      
                      {permission?.conditions && (
                        <div className="text-xs text-gray-600">
                          {permission.conditions.usage_limit && `${permission.conditions.usage_limit}/day`}
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Conditions Modal */}
      {showConditions && (
        <ConditionsModal
          tierId={showConditions.split('-')[0]}
          actionId={showConditions.split('-')[1]}
          tierName={tiers.find(t => t.id === showConditions.split('-')[0])?.displayName || ''}
          actionName={actions.find(a => a.id === showConditions.split('-')[1])?.displayName || ''}
          currentConditions={getPermission(showConditions.split('-')[0], showConditions.split('-')[1])?.conditions}
          onSave={handleConditionsChange}
          onCancel={() => setShowConditions(null)}
        />
      )}
    </div>
  );
};

interface ConditionsModalProps {
  tierId: string;
  actionId: string;
  tierName: string;
  actionName: string;
  currentConditions?: Record<string, any>;
  onSave: (tierId: string, actionId: string, conditions: Record<string, any>) => void;
  onCancel: () => void;
}

const ConditionsModal: React.FC<ConditionsModalProps> = ({
  tierId,
  actionId,
  tierName,
  actionName,
  currentConditions,
  onSave,
  onCancel
}) => {
  const [usageLimit, setUsageLimit] = useState(currentConditions?.usage_limit?.toString() || '');
  const [timeWindow, setTimeWindow] = useState(currentConditions?.time_window || 'daily');

  const handleSave = () => {
    const conditions: Record<string, any> = {};
    
    if (usageLimit) {
      conditions.usage_limit = parseInt(usageLimit);
      conditions.time_window = timeWindow;
    }
    
    onSave(tierId, actionId, conditions);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">
          Set Conditions: {tierName} - {actionName}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usage Limit
            </label>
            <input
              type="number"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="No limit"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Window
            </label>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Per Day</option>
              <option value="weekly">Per Week</option>
              <option value="monthly">Per Month</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Save
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