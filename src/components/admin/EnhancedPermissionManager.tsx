import React, { useState, useEffect } from 'react';
import { Shield, Save, Plus, Trash2, Edit, Check, X, AlertCircle, Settings, Users, Zap, Lock, Unlock, ChevronDown, ChevronRight, Package, DollarSign, Clock, BarChart, HelpCircle, Info, Book, FileText, Tag, Hash } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { permissionService } from '../../services/enhancedPermissionService';

interface Feature {
  id: string;
  feature_name: string;
  feature_category: string;
  tiers: string[];
  actions: string[];
  default_limits: Record<string, any>;
  is_active: boolean;
  metadata?: {
    description?: string;
    unit_type?: 'count' | 'seats' | 'ads' | 'tickets';
    ad_types?: string[];
    ticket_types?: string[];
  };
}

interface MembershipPlan {
  id: string;
  name: string;
  type: string;
  permissions: string[];
  usage_limits?: Record<string, any>;
  seat_configuration?: {
    base_seats: number;
    max_additional_seats: number;
    seat_price: number;
  };
  feature_tiers?: Record<string, string>;
}

interface SupportLevel {
  id: string;
  level_name: string;
  level_number: number;
  permissions: Record<string, boolean>;
  routing_categories: string[];
  ticket_types?: string[];
  max_support_reps?: number;
}

// Action examples by category
const ACTION_EXAMPLES = {
  events: [
    { action: 'create', description: 'Create new events' },
    { action: 'edit', description: 'Edit existing events' },
    { action: 'delete', description: 'Delete events' },
    { action: 'publish', description: 'Publish events publicly' },
    { action: 'register', description: 'Register for events' },
    { action: 'manage_registrations', description: 'Manage event registrations' },
    { action: 'view_results', description: 'View competition results' },
    { action: 'submit_results', description: 'Submit competition results' },
    { action: 'export', description: 'Export event data' },
  ],
  marketing: [
    { action: 'create_728x90', description: 'Create 728x90 banner ads' },
    { action: 'create_300x250', description: 'Create 300x250 medium rectangle ads' },
    { action: 'create_160x600', description: 'Create 160x600 skyscraper ads' },
    { action: 'create_320x50', description: 'Create 320x50 mobile banner ads' },
    { action: 'create_newsletter', description: 'Create newsletters' },
    { action: 'send_campaign', description: 'Send marketing campaigns' },
    { action: 'view_analytics', description: 'View marketing analytics' },
    { action: 'manage_subscribers', description: 'Manage subscriber lists' },
    { action: 'create_social', description: 'Create social media posts' },
  ],
  support: [
    { action: 'create_ticket', description: 'Create support tickets' },
    { action: 'view_tickets', description: 'View support tickets' },
    { action: 'respond_tickets', description: 'Respond to tickets' },
    { action: 'escalate', description: 'Escalate tickets to higher level' },
    { action: 'close_tickets', description: 'Close resolved tickets' },
    { action: 'refund', description: 'Process refunds' },
    { action: 'manage_reps', description: 'Manage support representatives' },
    { action: 'view_billing_tickets', description: 'View billing-related tickets' },
    { action: 'view_technical_tickets', description: 'View technical tickets' },
  ],
  tools: [
    { action: 'use', description: 'Use the tool/feature' },
    { action: 'save', description: 'Save results/configurations' },
    { action: 'export', description: 'Export data/results' },
    { action: 'share', description: 'Share with others' },
    { action: 'print', description: 'Print results' },
    { action: 'advanced_features', description: 'Access advanced features' },
    { action: 'api_access', description: 'API access for integration' },
  ],
  analytics: [
    { action: 'view_basic', description: 'View basic analytics' },
    { action: 'view_advanced', description: 'View advanced analytics' },
    { action: 'export', description: 'Export analytics data' },
    { action: 'create_reports', description: 'Create custom reports' },
    { action: 'schedule_reports', description: 'Schedule automated reports' },
    { action: 'api_access', description: 'API access for analytics' },
  ],
  billing: [
    { action: 'view_invoices', description: 'View invoices' },
    { action: 'manage_payment', description: 'Manage payment methods' },
    { action: 'cancel_subscription', description: 'Cancel subscriptions' },
    { action: 'upgrade_plan', description: 'Upgrade membership plan' },
    { action: 'purchase_seats', description: 'Purchase additional seats' },
    { action: 'apply_credits', description: 'Apply account credits' },
  ]
};

// Ad size configurations
const AD_SIZES = [
  { size: '728x90', name: 'Leaderboard', category: 'desktop' },
  { size: '300x250', name: 'Medium Rectangle', category: 'universal' },
  { size: '336x280', name: 'Large Rectangle', category: 'desktop' },
  { size: '300x600', name: 'Half Page', category: 'desktop' },
  { size: '160x600', name: 'Wide Skyscraper', category: 'desktop' },
  { size: '970x90', name: 'Large Leaderboard', category: 'desktop' },
  { size: '320x50', name: 'Mobile Banner', category: 'mobile' },
  { size: '320x100', name: 'Large Mobile Banner', category: 'mobile' },
];

// Ticket types
const TICKET_TYPES = [
  'billing',
  'technical',
  'general',
  'account',
  'event',
  'payment',
  'feature_request',
  'bug_report',
  'compliance',
  'security',
];

export const EnhancedPermissionManager: React.FC = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [supportLevels, setSupportLevels] = useState<SupportLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('features');
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [featureFlagsEnabled, setFeatureFlagsEnabled] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showActionHelper, setShowActionHelper] = useState(false);
  const [hoveredHelp, setHoveredHelp] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('events');

  // Check if enhanced permissions are enabled
  useEffect(() => {
    checkFeatureFlags();
    loadData();
  }, []);

  const checkFeatureFlags = async () => {
    const { data } = await supabase
      .from('feature_flags')
      .select('is_enabled')
      .eq('feature_name', 'enhanced_permissions')
      .single();
    
    setFeatureFlagsEnabled(data?.is_enabled || false);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load features
      const { data: featuresData } = await supabase
        .from('feature_registry')
        .select('*')
        .order('feature_category, feature_name');
      
      setFeatures(featuresData || []);

      // Load membership plans
      const { data: plansData } = await supabase
        .from('membership_plans')
        .select('*')
        .order('display_order, name');
      
      setPlans(plansData || []);

      // Load support levels
      const { data: levelsData } = await supabase
        .from('support_rep_levels')
        .select('*')
        .order('level_number');
      
      setSupportLevels(levelsData || []);
    } catch (error) {
      console.error('Error loading permission data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Helper tooltip component
  const HelpTooltip = ({ id, content }: { id: string; content: string }) => (
    <div className="relative inline-block">
      <span
        onMouseEnter={() => setHoveredHelp(id)}
        onMouseLeave={() => setHoveredHelp(null)}
        onClick={(e) => {
          e.stopPropagation();
          setHoveredHelp(hoveredHelp === id ? null : id);
        }}
        className="ml-2 text-gray-400 hover:text-white transition-colors cursor-help inline-flex"
      >
        <HelpCircle className="h-4 w-4" />
      </span>
      {hoveredHelp === id && (
        <div className="absolute z-50 w-64 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-xl -top-2 left-6">
          <div className="text-sm text-gray-300">{content}</div>
          <div className="absolute w-2 h-2 bg-gray-900 border-l border-b border-gray-700 transform rotate-45 -left-1 top-4"></div>
        </div>
      )}
    </div>
  );

  const membershipTiers = ['public', 'free', 'competitor', 'pro_competitor', 'retailer', 'manufacturer', 'organization', 'admin'];

  // Group features by category
  const featuresByCategory = features.reduce((acc, feature) => {
    const category = feature.feature_category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  // Render usage limit input based on feature type
  const renderUsageLimitInput = (feature: Feature, tier: string, action: string) => {
    const limits = feature.default_limits[tier] || {};
    const value = limits[action] !== undefined ? limits[action] : 0;
    
    // For marketing features with ad types
    if (feature.feature_category === 'marketing' && action.startsWith('create_')) {
      const adSize = action.replace('create_', '');
      return (
        <div className="flex items-center space-x-1">
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const newValue = parseInt(e.target.value) || 0;
              setEditingFeature({
                ...editingFeature!,
                default_limits: {
                  ...editingFeature!.default_limits,
                  [tier]: {
                    ...limits,
                    [action]: newValue
                  }
                }
              });
            }}
            className="w-16 px-2 py-1 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-electric-500"
            placeholder="0"
            min="-1"
          />
          <span className="text-xs text-gray-400">/mo</span>
        </div>
      );
    }
    
    // For support features (support reps)
    if (feature.feature_category === 'support' && action === 'manage_reps') {
      return (
        <div className="flex items-center space-x-1">
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const newValue = parseInt(e.target.value) || 0;
              setEditingFeature({
                ...editingFeature!,
                default_limits: {
                  ...editingFeature!.default_limits,
                  [tier]: {
                    ...limits,
                    [action]: newValue
                  }
                }
              });
            }}
            className="w-16 px-2 py-1 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-electric-500"
            placeholder="0"
            min="0"
          />
          <span className="text-xs text-gray-400">reps</span>
        </div>
      );
    }
    
    // Default input for other features
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const newValue = parseInt(e.target.value) || 0;
          setEditingFeature({
            ...editingFeature!,
            default_limits: {
              ...editingFeature!.default_limits,
              [tier]: {
                ...limits,
                [action]: newValue
              }
            }
          });
        }}
        className="w-20 px-2 py-1 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-electric-500"
        placeholder="0"
        min="-1"
      />
    );
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      {/* Feature Edit Modal */}
      {showEditModal && editingFeature && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Edit Feature: {editingFeature.feature_name}</h3>
                <p className="text-gray-400 text-sm mt-1">Configure access tiers and usage limits</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingFeature(null);
                  setShowActionHelper(false);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Settings */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center">
                  Basic Settings
                  <HelpTooltip 
                    id="basic-settings" 
                    content="Configure the basic properties of this feature including name, category, and active status." 
                  />
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Feature Name
                    </label>
                    <input
                      type="text"
                      value={editingFeature.feature_name}
                      onChange={(e) => setEditingFeature({
                        ...editingFeature,
                        feature_name: e.target.value
                      })}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Category
                    </label>
                    <select
                      value={editingFeature.feature_category}
                      onChange={(e) => {
                        setEditingFeature({
                          ...editingFeature,
                          feature_category: e.target.value
                        });
                        setSelectedCategory(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-500"
                    >
                      <option value="events">Events</option>
                      <option value="marketing">Marketing</option>
                      <option value="support">Support</option>
                      <option value="tools">Tools</option>
                      <option value="analytics">Analytics</option>
                      <option value="billing">Billing</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={editingFeature.is_active}
                      onChange={(e) => setEditingFeature({
                        ...editingFeature,
                        is_active: e.target.checked
                      })}
                      className="rounded border-gray-600 bg-gray-700 text-electric-500"
                    />
                    <span className="text-white">Feature is Active</span>
                  </label>
                </div>
              </div>

              {/* Access Tiers */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center">
                  Access Tiers
                  <HelpTooltip 
                    id="access-tiers" 
                    content="Select which membership types can access this feature. Each tier can have different usage limits and permissions." 
                  />
                </h4>
                <p className="text-gray-400 text-sm mb-3">Select which membership types can access this feature</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {membershipTiers.map(tier => (
                    <label key={tier} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editingFeature.tiers.includes(tier) || tier === 'admin'}
                        disabled={tier === 'admin'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingFeature({
                              ...editingFeature,
                              tiers: [...editingFeature.tiers, tier]
                            });
                          } else {
                            setEditingFeature({
                              ...editingFeature,
                              tiers: editingFeature.tiers.filter(t => t !== tier)
                            });
                          }
                        }}
                        className="rounded border-gray-600 bg-gray-700 text-electric-500"
                      />
                      <span className="text-white text-sm capitalize">{tier}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center">
                  Actions
                  <HelpTooltip 
                    id="actions" 
                    content="Define specific actions users can perform. Examples: create, view, edit, delete, export, share, etc." 
                  />
                  <button
                    onClick={() => setShowActionHelper(!showActionHelper)}
                    className="ml-2 text-xs text-electric-400 hover:text-electric-300"
                  >
                    View Examples
                  </button>
                </h4>
                
                {/* Action Helper */}
                {showActionHelper && (
                  <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                    <h5 className="text-electric-400 font-medium text-sm mb-2">
                      Common Actions for {selectedCategory}:
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ACTION_EXAMPLES[selectedCategory as keyof typeof ACTION_EXAMPLES]?.map(example => (
                        <div key={example.action} className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                          <div>
                            <span className="text-white text-sm font-medium">{example.action}</span>
                            <span className="text-gray-400 text-xs ml-2">{example.description}</span>
                          </div>
                          <button
                            onClick={() => {
                              if (!editingFeature.actions.includes(example.action)) {
                                setEditingFeature({
                                  ...editingFeature,
                                  actions: [...editingFeature.actions, example.action]
                                });
                              }
                            }}
                            className="text-electric-400 hover:text-electric-300 text-xs"
                          >
                            + Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-gray-400 text-sm mb-3">Define available actions for this feature</p>
                <div className="flex flex-wrap gap-2">
                  {editingFeature.actions.map((action, index) => (
                    <div key={index} className="flex items-center space-x-2 bg-gray-700 rounded-lg px-3 py-1">
                      <input
                        type="text"
                        value={action}
                        onChange={(e) => {
                          const newActions = [...editingFeature.actions];
                          newActions[index] = e.target.value;
                          setEditingFeature({
                            ...editingFeature,
                            actions: newActions
                          });
                        }}
                        className="bg-transparent text-white text-sm focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          setEditingFeature({
                            ...editingFeature,
                            actions: editingFeature.actions.filter((_, i) => i !== index)
                          });
                        }}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newAction = prompt('Enter new action name:');
                      if (newAction) {
                        setEditingFeature({
                          ...editingFeature,
                          actions: [...editingFeature.actions, newAction]
                        });
                      }
                    }}
                    className="px-3 py-1 bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600 hover:text-white transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Usage Limits */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center">
                  Usage Limits
                  <HelpTooltip 
                    id="usage-limits" 
                    content="Set daily, weekly, or monthly limits for each tier. Use -1 for unlimited. For support: number of support reps. For marketing: ad creation limits by type." 
                  />
                </h4>
                <p className="text-gray-400 text-sm mb-3">
                  {editingFeature.feature_category === 'support' 
                    ? 'Set the number of support representatives each tier can have'
                    : editingFeature.feature_category === 'marketing'
                    ? 'Set monthly ad creation limits by ad size for each tier'
                    : 'Set daily/weekly/monthly limits per tier (-1 for unlimited)'}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-left text-gray-400 text-sm py-2">Tier</th>
                        {editingFeature.actions.map(action => (
                          <th key={action} className="text-left text-gray-400 text-sm py-2 px-2">
                            {action}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {membershipTiers.map(tier => {
                        const hasAccess = editingFeature.tiers.includes(tier) || tier === 'admin';
                        const limits = editingFeature.default_limits[tier] || {};
                        
                        if (!hasAccess && tier !== 'admin') return null;
                        
                        return (
                          <tr key={tier} className="border-b border-gray-700">
                            <td className="py-2 text-white text-sm capitalize">{tier}</td>
                            {editingFeature.actions.map(action => (
                              <td key={action} className="py-2 px-2">
                                {renderUsageLimitInput(editingFeature, tier, action)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Special notes for specific categories */}
                {editingFeature.feature_category === 'marketing' && (
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-400 text-sm">
                      <strong>Marketing Limits:</strong> These numbers represent how many ads of each type can be created per month. 
                      Use -1 for unlimited. Example: Retailers might get 10 x 728x90 and 20 x 300x250 ads per month.
                    </p>
                  </div>
                )}
                
                {editingFeature.feature_category === 'support' && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-400 text-sm">
                      <strong>Support Reps:</strong> These numbers represent how many support representatives an organization can have. 
                      Organizations can assign their employees as support reps to handle their customer tickets.
                    </p>
                  </div>
                )}
              </div>

              {/* Save Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingFeature(null);
                    setShowActionHelper(false);
                  }}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setSaveStatus('saving');
                    try {
                      const { error } = await supabase
                        .from('feature_registry')
                        .update({
                          feature_name: editingFeature.feature_name,
                          feature_category: editingFeature.feature_category,
                          tiers: editingFeature.tiers,
                          actions: editingFeature.actions,
                          default_limits: editingFeature.default_limits,
                          is_active: editingFeature.is_active,
                          metadata: editingFeature.metadata
                        })
                        .eq('id', editingFeature.id);

                      if (error) throw error;

                      // Update local state
                      setFeatures(prev => prev.map(f => 
                        f.id === editingFeature.id ? editingFeature : f
                      ));

                      setSaveStatus('success');
                      setTimeout(() => {
                        setSaveStatus('idle');
                        setShowEditModal(false);
                        setEditingFeature(null);
                        setShowActionHelper(false);
                      }, 1500);
                    } catch (error) {
                      console.error('Error updating feature:', error);
                      setSaveStatus('error');
                    }
                  }}
                  className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rest of the component remains the same... */}
      <div className="text-center py-8">
        <p className="text-gray-400">Enhanced Permission Manager component ready for integration</p>
      </div>
    </div>
  );
};