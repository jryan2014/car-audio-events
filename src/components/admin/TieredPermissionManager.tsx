import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Users, Settings, BarChart, Eye, EyeOff, Plus, Edit, Trash2 } from 'lucide-react';

interface Tier {
  id: string;
  name: string;
  display_name: string;
  description: string;
  priority_level: number;
  is_active: boolean;
}

interface Feature {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_active: boolean;
}

interface SubFeature {
  id: string;
  feature_id: string;
  name: string;
  display_name: string;
  description: string;
  is_active: boolean;
}

interface PermissionAction {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_active: boolean;
}

interface TierPermission {
  tier_id: string;
  feature_id: string;
  sub_feature_id?: string;
  action_id: string;
  is_granted: boolean;
  conditions?: Record<string, any>;
}

const TieredPermissionManager: React.FC = () => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [subFeatures, setSubFeatures] = useState<SubFeature[]>([]);
  const [actions, setActions] = useState<PermissionAction[]>([]);
  const [permissions, setPermissions] = useState<TierPermission[]>([]);
  
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedFeature, setSelectedFeature] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [showTierModal, setShowTierModal] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all configuration data
      const [tiersRes, featuresRes, subFeaturesRes, actionsRes, permissionsRes] = await Promise.all([
        supabase.from('permission_tiers').select('*').order('priority_level'),
        supabase.from('features').select('*').order('category', { ascending: true }),
        supabase.from('sub_features').select('*'),
        supabase.from('permission_actions').select('*').order('name'),
        Promise.all([
          supabase.from('tier_feature_permissions').select('*'),
          supabase.from('tier_sub_feature_permissions').select('*')
        ])
      ]);

      if (tiersRes.data) setTiers(tiersRes.data);
      if (featuresRes.data) setFeatures(featuresRes.data);
      if (subFeaturesRes.data) setSubFeatures(subFeaturesRes.data);
      if (actionsRes.data) setActions(actionsRes.data);
      
      // Combine feature and sub-feature permissions
      const allPermissions: TierPermission[] = [
        ...(permissionsRes[0].data || []).map(p => ({ ...p, sub_feature_id: undefined })),
        ...(permissionsRes[1].data || []).map(p => ({ ...p, feature_id: subFeatures.find(sf => sf.id === p.sub_feature_id)?.feature_id || '' }))
      ];
      setPermissions(allPermissions);
      
    } catch (error) {
      console.error('Failed to load permission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPermission = (tierId: string, featureId: string, subFeatureId: string | undefined, actionId: string): TierPermission | undefined => {
    return permissions.find(p => 
      p.tier_id === tierId && 
      p.feature_id === featureId && 
      p.sub_feature_id === subFeatureId && 
      p.action_id === actionId
    );
  };

  const updatePermission = async (tierId: string, featureId: string, subFeatureId: string | undefined, actionId: string, isGranted: boolean, conditions?: Record<string, any>) => {
    setSaving(true);
    try {
      const permissionData = {
        tier_id: tierId,
        feature_id: featureId,
        sub_feature_id: subFeatureId,
        action_id: actionId,
        is_granted: isGranted,
        conditions: conditions || null
      };

      const table = subFeatureId ? 'tier_sub_feature_permissions' : 'tier_feature_permissions';
      const key = subFeatureId ? 'sub_feature_id' : 'feature_id';
      const keyValue = subFeatureId || featureId;

      // Check if permission exists
      const existing = getPermission(tierId, featureId, subFeatureId, actionId);
      
      if (existing) {
        // Update existing permission
        const { error } = await supabase
          .from(table)
          .update(permissionData)
          .eq('tier_id', tierId)
          .eq(key, keyValue)
          .eq('action_id', actionId);
          
        if (error) throw error;
      } else {
        // Create new permission
        const { error } = await supabase
          .from(table)
          .insert(permissionData);
          
        if (error) throw error;
      }

      // Reload permissions
      await loadData();
      
    } catch (error) {
      console.error('Failed to update permission:', error);
    } finally {
      setSaving(false);
    }
  };

  const PermissionCell: React.FC<{
    tier: Tier;
    feature: Feature;
    subFeature?: SubFeature;
    action: PermissionAction;
  }> = ({ tier, feature, subFeature, action }) => {
    const permission = getPermission(tier.id, feature.id, subFeature?.id, action.id);
    const isGranted = permission?.is_granted || false;
    const hasConditions = permission?.conditions && Object.keys(permission.conditions).length > 0;

    const handleToggle = () => {
      updatePermission(tier.id, feature.id, subFeature?.id, action.id, !isGranted);
    };

    return (
      <div className="flex items-center justify-center space-x-1">
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`p-1 rounded transition-colors ${
            isGranted
              ? 'bg-green-100 text-green-600 hover:bg-green-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isGranted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        {hasConditions && (
          <div className="w-2 h-2 bg-orange-400 rounded-full" title="Has conditions" />
        )}
      </div>
    );
  };

  const filteredSubFeatures = selectedFeature 
    ? subFeatures.filter(sf => sf.feature_id === selectedFeature)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading permission configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Tiered Permission Management</h2>
          <p className="text-gray-300 mt-1">Configure granular permissions for features and tiers</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setEditingItem(null);
              setShowTierModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Tier</span>
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setShowFeatureModal(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Feature</span>
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Filter by Tier
          </label>
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2"
          >
            <option value="">All Tiers</option>
            {tiers.filter(t => t.is_active).map(tier => (
              <option key={tier.id} value={tier.id}>{tier.display_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Filter by Feature
          </label>
          <select
            value={selectedFeature}
            onChange={(e) => setSelectedFeature(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2"
          >
            <option value="">All Features</option>
            {features.filter(f => f.is_active).map(feature => (
              <option key={feature.id} value={feature.id}>{feature.display_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Feature / Sub-Feature
                </th>
                {(selectedTier ? tiers.filter(t => t.id === selectedTier) : tiers.filter(t => t.is_active)).map(tier => (
                  <th key={tier.id} className="px-3 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                    <div className="flex flex-col items-center">
                      <span>{tier.display_name}</span>
                      <span className="text-xs text-gray-400">({tier.name})</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-700">
              {(selectedFeature ? features.filter(f => f.id === selectedFeature) : features.filter(f => f.is_active)).map(feature => (
                <React.Fragment key={feature.id}>
                  {/* Feature-level permissions */}
                  {actions.filter(a => a.is_active).map(action => (
                    <tr key={`${feature.id}-${action.id}`} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Shield className="w-4 h-4 text-blue-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-white">
                              {feature.display_name} - {action.display_name}
                            </div>
                            <div className="text-sm text-gray-400">
                              {feature.category} / {action.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      {(selectedTier ? tiers.filter(t => t.id === selectedTier) : tiers.filter(t => t.is_active)).map(tier => (
                        <td key={tier.id} className="px-3 py-4 text-center">
                          <PermissionCell
                            tier={tier}
                            feature={feature}
                            action={action}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  
                  {/* Sub-feature permissions */}
                  {subFeatures
                    .filter(sf => sf.feature_id === feature.id && sf.is_active)
                    .map(subFeature => 
                      actions.filter(a => a.is_active).map(action => (
                        <tr key={`${subFeature.id}-${action.id}`} className="hover:bg-gray-800 bg-gray-950">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center pl-6">
                              <Users className="w-4 h-4 text-green-400 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {subFeature.display_name} - {action.display_name}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {subFeature.name} / {action.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          {(selectedTier ? tiers.filter(t => t.id === selectedTier) : tiers.filter(t => t.is_active)).map(tier => (
                            <td key={tier.id} className="px-3 py-4 text-center">
                              <PermissionCell
                                tier={tier}
                                feature={feature}
                                subFeature={subFeature}
                                action={action}
                              />
                            </td>
                          ))}
                        </tr>
                      ))
                    )
                  }
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-blue-400 mr-2" />
            <div>
              <div className="text-sm text-gray-400">Active Tiers</div>
              <div className="text-xl font-bold text-white">{tiers.filter(t => t.is_active).length}</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center">
            <Settings className="w-5 h-5 text-green-400 mr-2" />
            <div>
              <div className="text-sm text-gray-400">Active Features</div>
              <div className="text-xl font-bold text-white">{features.filter(f => f.is_active).length}</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-purple-400 mr-2" />
            <div>
              <div className="text-sm text-gray-400">Sub-Features</div>
              <div className="text-xl font-bold text-white">{subFeatures.filter(sf => sf.is_active).length}</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center">
            <BarChart className="w-5 h-5 text-orange-400 mr-2" />
            <div>
              <div className="text-sm text-gray-400">Permissions</div>
              <div className="text-xl font-bold text-white">{permissions.filter(p => p.is_granted).length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TieredPermissionManager;