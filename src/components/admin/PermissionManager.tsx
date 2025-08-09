import React, { useState, useEffect } from 'react';
import { Shield, Save, Plus, Trash2, Edit, Check, X, AlertCircle, Settings, Users, Zap, Lock, Unlock, ChevronDown, ChevronRight, Package, DollarSign, Clock, BarChart, HelpCircle, Info, Book } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { permissionService } from '../../services/enhancedPermissionService';

interface Feature {
  id: string;
  feature_name: string;
  feature_category: string;
  tiers: string[];
  actions: string[];
  tier_actions?: Record<string, string[]>; // Which actions each tier gets
  default_limits: Record<string, any>;
  limit_timeframes?: Record<string, 'daily' | 'weekly' | 'monthly' | 'yearly' | 'lifetime'>;
  visibility_mode?: 'always' | 'when_available' | 'hidden'; // How to display when not available
  upsell_config?: {
    is_addon?: boolean; // Is this a paid add-on?
    addon_price?: number; // Monthly price for add-on
    upsell_message?: string; // Message to show for upsell
    required_base_tier?: string[]; // Which tiers can purchase this add-on
  };
  is_active: boolean;
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
}

export const PermissionManager: React.FC = () => {
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
  const [hoveredHelp, setHoveredHelp] = useState<string | null>(null);
  const [showActionHelper, setShowActionHelper] = useState(false);
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

  const updateFeatureLimits = async (featureName: string, limits: Record<string, any>) => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('feature_registry')
        .update({ default_limits: limits })
        .eq('feature_name', featureName);

      if (error) throw error;

      // Update local state
      setFeatures(prev => prev.map(f => 
        f.feature_name === featureName ? { ...f, default_limits: limits } : f
      ));

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error updating feature limits:', error);
      setSaveStatus('error');
    }
  };

  const updatePlanPermissions = async (planId: string, updates: Partial<MembershipPlan>) => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('membership_plans')
        .update(updates)
        .eq('id', planId);

      if (error) throw error;

      // Update local state
      setPlans(prev => prev.map(p => 
        p.id === planId ? { ...p, ...updates } : p
      ));

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error updating plan permissions:', error);
      setSaveStatus('error');
    }
  };

  const toggleFeatureFlag = async () => {
    const newState = !featureFlagsEnabled;
    
    const { error } = await supabase
      .from('feature_flags')
      .update({ is_enabled: newState })
      .eq('feature_name', 'enhanced_permissions');

    if (!error) {
      setFeatureFlagsEnabled(newState);
      // Reinitialize permission service
      await permissionService.initialize();
    }
  };

  // Group features by category
  const featuresByCategory = features.reduce((acc, feature) => {
    const category = feature.feature_category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  const membershipTiers = ['public', 'free', 'competitor', 'pro_competitor', 'retailer', 'manufacturer', 'organization', 'admin'];

  // Get context-appropriate action examples based on the actual feature
  const getActionExamples = (feature: Feature) => {
    const featureName = feature.feature_name.toLowerCase();
    const category = feature.feature_category.toLowerCase();
    
    // SPL Calculator specific actions
    if (featureName.includes('spl')) {
      return [
        { action: 'view', description: 'View the SPL calculator' },
        { action: 'calculate', description: 'Perform SPL calculations' },
        { action: 'save', description: 'Save calculation results' },
        { action: 'export', description: 'Export results to PDF/CSV' },
        { action: 'share', description: 'Share calculations with others' },
        { action: 'print', description: 'Print calculation results' },
      ];
    }
    
    // Subwoofer Designer specific actions
    if (featureName.includes('subwoofer')) {
      return [
        { action: 'view', description: 'View the subwoofer designer' },
        { action: 'design', description: 'Create box designs' },
        { action: 'save', description: 'Save designs' },
        { action: 'export', description: 'Export design specs' },
        { action: 'share', description: 'Share designs' },
        { action: 'print', description: 'Print design blueprints' },
        { action: '3d_view', description: 'View 3D model' },
      ];
    }
    
    // Events category actions
    if (category === 'events') {
      return [
        { action: 'view', description: 'View events' },
        { action: 'create', description: 'Create new events' },
        { action: 'edit', description: 'Edit existing events' },
        { action: 'delete', description: 'Delete events' },
        { action: 'publish', description: 'Publish events publicly' },
        { action: 'register', description: 'Register for events' },
        { action: 'manage_registrations', description: 'Manage event registrations' },
        { action: 'view_results', description: 'View competition results' },
        { action: 'submit_results', description: 'Submit competition results' },
        { action: 'export', description: 'Export event data' },
      ];
    }
    
    // Teams specific actions
    if (featureName.includes('team')) {
      return [
        { action: 'view_teams', description: 'View existing teams' },
        { action: 'join_team', description: 'Join an existing team' },
        { action: 'create_team', description: 'Create new teams' },
        { action: 'manage_team', description: 'Manage team settings' },
        { action: 'invite_members', description: 'Invite team members' },
        { action: 'remove_members', description: 'Remove team members' },
        { action: 'custom_titles', description: 'Create custom team titles (PAID ADD-ON)' },
        { action: 'team_analytics', description: 'View team performance analytics' },
      ];
    }
    
    // Marketing category actions
    if (category === 'marketing') {
      return [
        // Core advertising actions
        { action: 'ai_create', description: 'Access to AI ad creator (all sizes)' },
        { action: 'upload_ads', description: 'Upload pre-made ads' },
        { action: 'submit_for_approval', description: 'Submit ads for approval' },
        { action: 'auto_approve', description: 'Ads auto-approved without review' },
        { action: 'view_analytics', description: 'View marketing analytics' },
        { action: 'manage_campaigns', description: 'Manage ad campaigns' },
        { action: 'create_newsletter', description: 'Create newsletters' },
        { action: 'send_campaign', description: 'Send marketing campaigns' },
        { action: 'manage_subscribers', description: 'Manage subscriber lists' },
      ];
    }
    
    // Support category actions
    if (category === 'support') {
      return [
        { action: 'create_ticket', description: 'Create support tickets' },
        { action: 'view_tickets', description: 'View support tickets' },
        { action: 'respond_tickets', description: 'Respond to tickets' },
        { action: 'manage_reps', description: 'Number of support representatives' },
        { action: 'escalate', description: 'Escalate tickets' },
        { action: 'close_tickets', description: 'Close resolved tickets' },
        { action: 'refund', description: 'Process refunds' },
      ];
    }
    
    // Default tools actions
    return [
      { action: 'view', description: 'View the tool' },
      { action: 'use', description: 'Use the tool' },
      { action: 'save', description: 'Save results' },
      { action: 'export', description: 'Export data' },
      { action: 'share', description: 'Share with others' },
      { action: 'print', description: 'Print results' },
    ];
  };

  // Help content for different sections
  const helpContent = {
    features: {
      title: "Features & Limits",
      description: "Control which features are available to different user types and set usage limits.",
      details: `Features are grouped by category (Events, Marketing, Support, Tools). Each feature can have:
      • Multiple tiers with access (Free, Pro, Business, etc.)
      • Different actions (view, create, edit, delete)
      • Usage limits per tier (daily/weekly/monthly)
      • Active/inactive status
      
      Click the edit button to modify any feature's settings.`
    },
    plans: {
      title: "Plan Assignment",
      description: "Configure which features are included in each membership plan.",
      details: `Membership plans determine what users can access. You can:
      • Assign features to specific plans
      • Configure seat settings for organization plans
      • Set pricing for additional seats
      • Control feature access per plan type
      
      Select a plan on the left to configure its settings.`
    },
    seats: {
      title: "Organization Seats",
      description: "Manage how many users can be part of an organization account.",
      details: `Organizations can have multiple users under one account:
      • Base Seats: Included with the plan (e.g., 5 users)
      • Additional Seats: Extra users beyond the base
      • Seat Price: Monthly cost per additional seat
      • Max Seats: Upper limit of users allowed
      
      This allows businesses to add team members to their account.`
    },
    support: {
      title: "Support Levels",
      description: "Configure support representative permissions and routing.",
      details: `Support levels determine what support staff can do:
      • Level 1: Basic support, general questions
      • Level 2: Technical issues, advanced support
      • Level 3+: Critical issues, refunds, escalations
      
      Each level has different permissions for viewing, responding, and modifying tickets.`
    },
    usage_limits: {
      title: "Usage Limits",
      description: "Control how many times users can use specific features.",
      details: `Set limits to prevent abuse and create upgrade incentives:
      • -1 = Unlimited access
      • 0 = No access
      • Any positive number = Daily limit
      
      Example: Free users get 50 SPL calculations/day, Pro gets unlimited.`
    },
    tiers: {
      title: "Membership Tiers",
      description: "Different user types in your platform.",
      details: `Each tier represents a user type:
      • Public: Non-logged-in visitors
      • Free: Basic registered users
      • Competitor: Basic competitor features
      • Pro Competitor: Premium competitor features
      • Retailer: Retail business accounts
      • Manufacturer: Product manufacturers
      • Organization: Multi-user business accounts
      • Admin: Full system access`
    },
    actions: {
      title: "Feature Actions",
      description: "Specific operations users can perform.",
      details: `Actions define what users can do with a feature:
      • view: Can see/access the feature
      • create: Can make new items
      • edit: Can modify existing items
      • delete: Can remove items
      • export: Can download data
      • share: Can share with others
      
      Each action can have different limits per tier.`
    },
    routing: {
      title: "Ticket Routing",
      description: "Automatically assign support tickets based on rules.",
      details: `Tickets are routed based on:
      • Category (billing, technical, general)
      • Priority (low, normal, high, critical)
      • User's membership type
      • Custom fields and tags
      
      Higher priority rules are evaluated first.`
    }
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

  if (!featureFlagsEnabled) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-electric-500" />
            <h2 className="text-xl font-bold text-white">Enhanced Permission System</h2>
          </div>
          <button
            onClick={toggleFeatureFlag}
            className="flex items-center space-x-2 px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
          >
            <Unlock className="h-4 w-4" />
            <span>Enable Enhanced Permissions</span>
          </button>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="text-yellow-500 font-medium">System Currently Using Legacy Permissions</p>
              <p className="text-gray-400 text-sm mt-1">
                The enhanced permission system is installed but disabled. Enable it to access advanced features like:
              </p>
              <ul className="text-gray-400 text-sm mt-2 space-y-1">
                <li>• Tiered feature access (Public/Free/Pro)</li>
                <li>• Usage limits and tracking</li>
                <li>• Organization seat management</li>
                <li>• Support level configuration</li>
                <li>• Dynamic feature registration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6 text-electric-500" />
          <h2 className="text-xl font-bold text-white">Permission Management</h2>
          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
            Enhanced Mode Active
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
            onClick={() => setShowHelpModal(true)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
          >
            <Book className="h-3 w-3" />
            <span>Help Guide</span>
          </button>
          <button
            onClick={toggleFeatureFlag}
            className="flex items-center space-x-2 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
          >
            <Lock className="h-3 w-3" />
            <span>Disable</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('features')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'features'
                ? 'bg-electric-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Features & Limits</span>
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'plans'
                ? 'bg-electric-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Plan Assignment</span>
          </button>
          <button
            onClick={() => setActiveTab('seats')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'seats'
                ? 'bg-electric-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Organization Seats</span>
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'support'
                ? 'bg-electric-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Support Levels</span>
          </button>
        </div>
        
        {/* Tab Help Text */}
        <div className="mt-2 flex items-center justify-center">
          <span className="text-xs text-gray-500">
            {activeTab === 'features' && (
              <span className="flex items-center">
                {helpContent.features.description}
                <HelpTooltip id="tab-features-help" content={helpContent.features.details} />
              </span>
            )}
            {activeTab === 'plans' && (
              <span className="flex items-center">
                {helpContent.plans.description}
                <HelpTooltip id="tab-plans-help" content={helpContent.plans.details} />
              </span>
            )}
            {activeTab === 'seats' && (
              <span className="flex items-center">
                {helpContent.seats.description}
                <HelpTooltip id="tab-seats-help" content={helpContent.seats.details} />
              </span>
            )}
            {activeTab === 'support' && (
              <span className="flex items-center">
                {helpContent.support.description}
                <HelpTooltip id="tab-support-help" content={helpContent.support.details} />
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading permission data...</p>
        </div>
      ) : (
        <>
          {/* Features & Limits Tab */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                <div key={category} className="bg-gray-700/30 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {expandedCategories.has(category) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <h3 className="text-lg font-semibold text-white capitalize">{category}</h3>
                      <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded-full">
                        {categoryFeatures.length} features
                      </span>
                    </div>
                  </button>
                  
                  {expandedCategories.has(category) && (
                    <div className="px-4 pb-4 space-y-3">
                      {categoryFeatures.map(feature => (
                        <div key={feature.id} className="bg-gray-800/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <h4 className="text-white font-medium">{feature.feature_name}</h4>
                              <HelpTooltip 
                                id={`feature-${feature.id}`} 
                                content={`This feature controls access to ${feature.feature_name}. Edit to set which user types can access it and how many times they can use it.`} 
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              {feature.is_active ? (
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                                  Active
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                                  Inactive
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  setEditingFeature(feature);
                                  setShowEditModal(true);
                                }}
                                className="p-1 hover:bg-gray-700 rounded"
                              >
                                <Edit className="h-4 w-4 text-gray-400" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {membershipTiers.map(tier => {
                              const limits = feature.default_limits[tier] || {};
                              const hasAccess = feature.tiers.includes(tier);
                              
                              return (
                                <div key={tier} className={`p-2 rounded ${hasAccess ? 'bg-gray-700/50' : 'bg-gray-900/50'}`}>
                                  <div className="text-xs text-gray-400 mb-1 capitalize">{tier}</div>
                                  {hasAccess ? (
                                    <div className="space-y-1">
                                      {feature.actions.map(action => {
                                        const limit = limits[action];
                                        return (
                                          <div key={action} className="flex items-center justify-between">
                                            <span className="text-xs text-gray-300">{action}:</span>
                                            <span className="text-xs text-white font-medium">
                                              {limit === -1 ? '∞' : limit || '0'}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-500">No Access</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Plan Assignment Tab */}
          {activeTab === 'plans' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Membership Plans</h3>
                <div className="space-y-3">
                  {plans.map(plan => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full text-left p-4 rounded-lg transition-all ${
                        selectedPlan?.id === plan.id
                          ? 'bg-electric-500/20 border-electric-500'
                          : 'bg-gray-700/30 hover:bg-gray-700/50'
                      } border border-gray-600`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">{plan.name}</h4>
                          <p className="text-gray-400 text-sm">{plan.type}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {selectedPlan && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Configure: {selectedPlan.name}
                  </h3>
                  <div className="bg-gray-700/30 rounded-lg p-4 space-y-4">
                    {/* Seat Configuration */}
                    <div>
                      <h4 className="text-white font-medium mb-2 flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Seat Configuration
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-gray-400">Base Seats</label>
                          <input
                            type="number"
                            value={selectedPlan.seat_configuration?.base_seats || 1}
                            onChange={(e) => {
                              const updated = {
                                ...selectedPlan,
                                seat_configuration: {
                                  ...selectedPlan.seat_configuration,
                                  base_seats: parseInt(e.target.value)
                                }
                              };
                              setSelectedPlan(updated);
                              updatePlanPermissions(selectedPlan.id, {
                                seat_configuration: updated.seat_configuration
                              });
                            }}
                            className="w-full px-3 py-1.5 bg-gray-800 text-white rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Max Additional</label>
                          <input
                            type="number"
                            value={selectedPlan.seat_configuration?.max_additional_seats || 0}
                            onChange={(e) => {
                              const updated = {
                                ...selectedPlan,
                                seat_configuration: {
                                  ...selectedPlan.seat_configuration,
                                  max_additional_seats: parseInt(e.target.value)
                                }
                              };
                              setSelectedPlan(updated);
                              updatePlanPermissions(selectedPlan.id, {
                                seat_configuration: updated.seat_configuration
                              });
                            }}
                            className="w-full px-3 py-1.5 bg-gray-800 text-white rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Seat Price</label>
                          <input
                            type="number"
                            step="0.01"
                            value={selectedPlan.seat_configuration?.seat_price || 0}
                            onChange={(e) => {
                              const updated = {
                                ...selectedPlan,
                                seat_configuration: {
                                  ...selectedPlan.seat_configuration,
                                  seat_price: parseFloat(e.target.value)
                                }
                              };
                              setSelectedPlan(updated);
                              updatePlanPermissions(selectedPlan.id, {
                                seat_configuration: updated.seat_configuration
                              });
                            }}
                            className="w-full px-3 py-1.5 bg-gray-800 text-white rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Feature Access */}
                    <div>
                      <h4 className="text-white font-medium mb-2 flex items-center">
                        <Zap className="h-4 w-4 mr-2" />
                        Feature Access
                      </h4>
                      <div className="space-y-2">
                        {features.map(feature => {
                          const hasAccess = selectedPlan.permissions?.includes(feature.feature_name);
                          return (
                            <label key={feature.id} className="flex items-center space-x-3 p-2 hover:bg-gray-700/50 rounded">
                              <input
                                type="checkbox"
                                checked={hasAccess}
                                onChange={(e) => {
                                  const newPermissions = e.target.checked
                                    ? [...(selectedPlan.permissions || []), feature.feature_name]
                                    : (selectedPlan.permissions || []).filter(p => p !== feature.feature_name);
                                  
                                  const updated = { ...selectedPlan, permissions: newPermissions };
                                  setSelectedPlan(updated);
                                  updatePlanPermissions(selectedPlan.id, { permissions: newPermissions });
                                }}
                                className="rounded border-gray-600 bg-gray-700 text-electric-500"
                              />
                              <span className="text-white text-sm">{feature.feature_name}</span>
                              <span className="text-gray-400 text-xs">({feature.feature_category})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Organization Seats Tab */}
          {activeTab === 'seats' && (
            <div className="space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-blue-500 font-medium">Organization Seat Management</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Configure how many user seats are included with each organization plan and pricing for additional seats.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.filter(p => ['retailer', 'manufacturer', 'organization'].includes(p.type)).map(plan => (
                  <div key={plan.id} className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">{plan.name}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Base Seats:</span>
                        <span className="text-white font-medium">
                          {plan.seat_configuration?.base_seats || 5}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Max Additional:</span>
                        <span className="text-white font-medium">
                          {plan.seat_configuration?.max_additional_seats || 'Unlimited'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Per Seat Price:</span>
                        <span className="text-white font-medium">
                          ${plan.seat_configuration?.seat_price || '29.99'}/mo
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Support Levels Tab */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              {supportLevels.map(level => (
                <div key={level.id} className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium">{level.level_name}</h4>
                    <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded-full">
                      Level {level.level_number}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">View Permissions</p>
                      <div className="space-y-1">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={level.permissions.view_basic}
                            className="rounded border-gray-600 bg-gray-700 text-electric-500"
                          />
                          <span className="text-xs text-gray-300">Basic Info</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={level.permissions.view_billing}
                            className="rounded border-gray-600 bg-gray-700 text-electric-500"
                          />
                          <span className="text-xs text-gray-300">Billing</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Actions</p>
                      <div className="space-y-1">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={level.permissions.respond}
                            className="rounded border-gray-600 bg-gray-700 text-electric-500"
                          />
                          <span className="text-xs text-gray-300">Respond</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={level.permissions.close}
                            className="rounded border-gray-600 bg-gray-700 text-electric-500"
                          />
                          <span className="text-xs text-gray-300">Close</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Advanced</p>
                      <div className="space-y-1">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={level.permissions.modify}
                            className="rounded border-gray-600 bg-gray-700 text-electric-500"
                          />
                          <span className="text-xs text-gray-300">Modify</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={level.permissions.refund}
                            className="rounded border-gray-600 bg-gray-700 text-electric-500"
                          />
                          <span className="text-xs text-gray-300">Refund</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Categories</p>
                      <div className="flex flex-wrap gap-1">
                        {level.routing_categories.map(cat => (
                          <span key={cat} className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Feature Edit Modal */}
      {showEditModal && editingFeature && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                      <option value="teams">Teams</option>
                      <option value="analytics">Analytics</option>
                      <option value="billing">Billing</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Visibility Mode
                      <HelpTooltip 
                        id="visibility" 
                        content="Control how this feature appears to users who don't have access. Hidden = completely invisible, When Available = shows when they have access, Always = always visible (may show upgrade prompt)" 
                      />
                    </label>
                    <select
                      value={editingFeature.visibility_mode || 'when_available'}
                      onChange={(e) => setEditingFeature({
                        ...editingFeature,
                        visibility_mode: e.target.value as 'always' | 'when_available' | 'hidden'
                      })}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-500"
                    >
                      <option value="hidden">Hidden (Invisible without access)</option>
                      <option value="when_available">When Available (Show only with access)</option>
                      <option value="always">Always (Show with upsell if no access)</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center space-x-3 mt-8">
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
              </div>
              
              {/* Upsell Configuration */}
              {editingFeature.visibility_mode === 'always' && (
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3 flex items-center">
                    Upsell Configuration
                    <HelpTooltip 
                      id="upsell" 
                      content="Configure upsell options for features that can be purchased as add-ons" 
                    />
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={editingFeature.upsell_config?.is_addon || false}
                          onChange={(e) => setEditingFeature({
                            ...editingFeature,
                            upsell_config: {
                              ...editingFeature.upsell_config,
                              is_addon: e.target.checked
                            }
                          })}
                          className="rounded border-gray-600 bg-gray-700 text-electric-500"
                        />
                        <span className="text-white">This is a paid add-on</span>
                      </label>
                    </div>
                    {editingFeature.upsell_config?.is_addon && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Add-on Price ($/month)
                          </label>
                          <input
                            type="number"
                            value={editingFeature.upsell_config?.addon_price || 0}
                            onChange={(e) => setEditingFeature({
                              ...editingFeature,
                              upsell_config: {
                                ...editingFeature.upsell_config,
                                addon_price: parseFloat(e.target.value)
                              }
                            })}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-500"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Upsell Message
                          </label>
                          <input
                            type="text"
                            value={editingFeature.upsell_config?.upsell_message || ''}
                            onChange={(e) => setEditingFeature({
                              ...editingFeature,
                              upsell_config: {
                                ...editingFeature.upsell_config,
                                upsell_message: e.target.value
                              }
                            })}
                            placeholder="Upgrade to unlock this feature..."
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

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
                        checked={editingFeature.tiers.includes(tier)}
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
                  Actions & Tier Permissions
                  <HelpTooltip 
                    id="actions" 
                    content="Define actions and which tiers can perform them. You can give different actions to different tiers." 
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
                      Suggested Actions for {editingFeature.feature_name}:
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {getActionExamples(editingFeature).map(example => (
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
                
                <p className="text-gray-400 text-sm mb-3">Define actions and select which tiers can perform each action</p>
                
                {/* Actions List */}
                <div className="mb-4">
                  <h5 className="text-white text-sm mb-2">Available Actions:</h5>
                  <div className="flex flex-wrap gap-2 mb-4">
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
                            // Remove action and its permissions
                            const newTierActions = { ...editingFeature.tier_actions };
                            Object.keys(newTierActions).forEach(tier => {
                              newTierActions[tier] = newTierActions[tier]?.filter(a => a !== action) || [];
                            });
                            setEditingFeature({
                              ...editingFeature,
                              actions: editingFeature.actions.filter((_, i) => i !== index),
                              tier_actions: newTierActions
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
                
                {/* Action-Tier Permission Matrix */}
                {editingFeature.tiers.length > 0 && editingFeature.actions.length > 0 && (
                  <div>
                    <h5 className="text-white text-sm mb-2">Which tiers can perform each action:</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-600">
                            <th className="text-left text-gray-400 py-2">Action</th>
                            {editingFeature.tiers.map(tier => (
                              <th key={tier} className="text-center text-gray-400 py-2 px-2 capitalize">
                                {tier}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {editingFeature.actions.map(action => (
                            <tr key={action} className="border-b border-gray-700">
                              <td className="py-2 text-white">{action}</td>
                              {editingFeature.tiers.map(tier => {
                                const tierActions = editingFeature.tier_actions?.[tier] || editingFeature.actions;
                                const hasAction = tierActions.includes(action);
                                return (
                                  <td key={tier} className="text-center py-2 px-2">
                                    <input
                                      type="checkbox"
                                      checked={hasAction}
                                      onChange={(e) => {
                                        const newTierActions = { ...editingFeature.tier_actions } || {};
                                        if (!newTierActions[tier]) {
                                          newTierActions[tier] = [...editingFeature.actions];
                                        }
                                        if (e.target.checked) {
                                          if (!newTierActions[tier].includes(action)) {
                                            newTierActions[tier] = [...newTierActions[tier], action];
                                          }
                                        } else {
                                          newTierActions[tier] = newTierActions[tier].filter(a => a !== action);
                                        }
                                        setEditingFeature({
                                          ...editingFeature,
                                          tier_actions: newTierActions
                                        });
                                      }}
                                      className="rounded border-gray-600 bg-gray-700 text-electric-500"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Usage Limits */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center">
                  Usage Limits
                  <HelpTooltip 
                    id="usage-limits" 
                    content="Set limits for each tier. Use -1 for unlimited. For support: number of support reps. For marketing: ad creation limits by type." 
                  />
                </h4>
                <p className="text-gray-400 text-sm mb-3">
                  {editingFeature.feature_category === 'support' 
                    ? 'Set the number of support representatives each tier can have'
                    : 'Set limits per tier (-1 for unlimited, 0 for no access). Timeframe applies to all actions for that tier.'}
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
                        {editingFeature.feature_category !== 'support' && (
                          <th className="text-left text-gray-400 text-sm py-2 px-2">Timeframe</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {membershipTiers.map(tier => {
                        const hasAccess = editingFeature.tiers.includes(tier);
                        const limits = editingFeature.default_limits[tier] || {};
                        const tierActions = editingFeature.tier_actions?.[tier] || editingFeature.actions;
                        
                        if (!hasAccess) return null;
                        
                        return (
                          <tr key={tier} className="border-b border-gray-700">
                            <td className="py-2 text-white text-sm capitalize">{tier}</td>
                            {editingFeature.actions.map(action => {
                              // Only show input if this tier has access to this action
                              const hasTierAction = tierActions.includes(action);
                              return (
                                <td key={action} className="py-2 px-2">
                                  {hasTierAction ? (
                                    <input
                                      type="number"
                                      value={limits[action] !== undefined ? limits[action] : 0}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value) || 0;
                                        setEditingFeature({
                                          ...editingFeature,
                                          default_limits: {
                                            ...editingFeature.default_limits,
                                            [tier]: {
                                              ...limits,
                                              [action]: value
                                            }
                                          }
                                        });
                                      }}
                                      className="w-20 px-2 py-1 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-electric-500"
                                      placeholder="0"
                                      min="-1"
                                    />
                                  ) : (
                                    <span className="text-gray-600 text-sm">N/A</span>
                                  )}
                                </td>
                              );
                            })}
                            {editingFeature.feature_category !== 'support' && (
                              <td className="py-2 px-2">
                                <select
                                  value={editingFeature.limit_timeframes?.[tier] || 'monthly'}
                                  onChange={(e) => {
                                    setEditingFeature({
                                      ...editingFeature,
                                      limit_timeframes: {
                                        ...editingFeature.limit_timeframes,
                                        [tier]: e.target.value
                                      }
                                    });
                                  }}
                                  className="px-2 py-1 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-electric-500"
                                >
                                  <option value="daily">Per Day</option>
                                  <option value="weekly">Per Week</option>
                                  <option value="monthly">Per Month</option>
                                  <option value="yearly">Per Year</option>
                                </select>
                              </td>
                            )}
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
                          tier_actions: editingFeature.tier_actions,
                          default_limits: editingFeature.default_limits,
                          limit_timeframes: editingFeature.limit_timeframes,
                          visibility_mode: editingFeature.visibility_mode,
                          upsell_config: editingFeature.upsell_config,
                          is_active: editingFeature.is_active
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

      {/* Comprehensive Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <Book className="h-6 w-6 mr-3 text-electric-500" />
                  Permission System Guide
                </h3>
                <p className="text-gray-400 mt-2">Everything you need to know about managing permissions</p>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Quick Start */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-semibold mb-2 flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  Quick Start
                </h4>
                <p className="text-gray-300 text-sm">
                  The permission system controls who can access what features and how often they can use them. 
                  Start by enabling features in the "Features & Limits" tab, then assign them to membership plans 
                  in the "Plan Assignment" tab.
                </p>
              </div>

              {/* Features & Limits */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">{helpContent.features.title}</h4>
                <p className="text-gray-400 text-sm mb-3">{helpContent.features.description}</p>
                <div className="bg-gray-800/50 rounded p-3">
                  <pre className="text-gray-300 text-xs whitespace-pre-wrap">{helpContent.features.details}</pre>
                </div>
                <div className="mt-3 space-y-2">
                  <h5 className="text-electric-400 font-medium text-sm">Feature Categories:</h5>
                  <ul className="text-gray-300 text-sm space-y-1 ml-4">
                    <li>• <strong>Events:</strong> Event creation, registration, results tracking</li>
                    <li>• <strong>Marketing:</strong> Advertisements, newsletters, social features</li>
                    <li>• <strong>Support:</strong> Help desk, ticketing, customer service</li>
                    <li>• <strong>Tools:</strong> SPL Calculator, Subwoofer Designer, analytics</li>
                  </ul>
                </div>
              </div>

              {/* Plan Assignment */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">{helpContent.plans.title}</h4>
                <p className="text-gray-400 text-sm mb-3">{helpContent.plans.description}</p>
                <div className="bg-gray-800/50 rounded p-3">
                  <pre className="text-gray-300 text-xs whitespace-pre-wrap">{helpContent.plans.details}</pre>
                </div>
                <div className="mt-3 space-y-2">
                  <h5 className="text-electric-400 font-medium text-sm">How to Configure:</h5>
                  <ol className="text-gray-300 text-sm space-y-1 ml-4 list-decimal">
                    <li>Select a membership plan from the left panel</li>
                    <li>Check/uncheck features to include/exclude them</li>
                    <li>Set seat configuration for organization plans</li>
                    <li>Changes save automatically</li>
                  </ol>
                </div>
              </div>

              {/* Organization Seats */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">{helpContent.seats.title}</h4>
                <p className="text-gray-400 text-sm mb-3">{helpContent.seats.description}</p>
                <div className="bg-gray-800/50 rounded p-3">
                  <pre className="text-gray-300 text-xs whitespace-pre-wrap">{helpContent.seats.details}</pre>
                </div>
                <div className="mt-3">
                  <h5 className="text-electric-400 font-medium text-sm mb-2">Example Pricing:</h5>
                  <div className="bg-gray-800/50 rounded p-3 text-sm">
                    <div className="text-gray-300">
                      Organization Plan: $299/month (includes 5 seats)<br/>
                      Additional seats: $29.99/month each<br/>
                      10 total users = $299 + (5 × $29.99) = $448.95/month
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage Limits */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">{helpContent.usage_limits.title}</h4>
                <p className="text-gray-400 text-sm mb-3">{helpContent.usage_limits.description}</p>
                <div className="bg-gray-800/50 rounded p-3">
                  <pre className="text-gray-300 text-xs whitespace-pre-wrap">{helpContent.usage_limits.details}</pre>
                </div>
                <div className="mt-3">
                  <h5 className="text-electric-400 font-medium text-sm mb-2">Common Patterns:</h5>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-left text-gray-400 py-2">Feature</th>
                        <th className="text-left text-gray-400 py-2">Free</th>
                        <th className="text-left text-gray-400 py-2">Pro</th>
                        <th className="text-left text-gray-400 py-2">Business</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      <tr className="border-b border-gray-700">
                        <td className="py-2">SPL Calculator</td>
                        <td>50/day</td>
                        <td>500/day</td>
                        <td>Unlimited (-1)</td>
                      </tr>
                      <tr className="border-b border-gray-700">
                        <td className="py-2">Event Creation</td>
                        <td>0</td>
                        <td>5/month</td>
                        <td>Unlimited (-1)</td>
                      </tr>
                      <tr className="border-b border-gray-700">
                        <td className="py-2">AI Ad Creation</td>
                        <td>0</td>
                        <td>10/month</td>
                        <td>50/month</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Membership Tiers */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">{helpContent.tiers.title}</h4>
                <p className="text-gray-400 text-sm mb-3">{helpContent.tiers.description}</p>
                <div className="bg-gray-800/50 rounded p-3">
                  <pre className="text-gray-300 text-xs whitespace-pre-wrap">{helpContent.tiers.details}</pre>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">{helpContent.actions.title}</h4>
                <p className="text-gray-400 text-sm mb-3">{helpContent.actions.description}</p>
                <div className="bg-gray-800/50 rounded p-3">
                  <pre className="text-gray-300 text-xs whitespace-pre-wrap">{helpContent.actions.details}</pre>
                </div>
              </div>

              {/* Support Routing */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">{helpContent.routing.title}</h4>
                <p className="text-gray-400 text-sm mb-3">{helpContent.routing.description}</p>
                <div className="bg-gray-800/50 rounded p-3">
                  <pre className="text-gray-300 text-xs whitespace-pre-wrap">{helpContent.routing.details}</pre>
                </div>
              </div>

              {/* Best Practices */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <h4 className="text-yellow-400 font-semibold mb-2 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Best Practices
                </h4>
                <ul className="text-gray-300 text-sm space-y-2">
                  <li>• Start with restrictive limits and increase as needed</li>
                  <li>• Use -1 for unlimited access sparingly (only for paid tiers)</li>
                  <li>• Test changes with a test account before going live</li>
                  <li>• Monitor usage patterns to adjust limits appropriately</li>
                  <li>• Create clear upgrade paths by gradually increasing limits</li>
                  <li>• Document major changes for support team reference</li>
                </ul>
              </div>

              {/* Common Tasks */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h4 className="text-green-400 font-semibold mb-2">Common Tasks</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <h5 className="text-white font-medium mb-1">Add a new feature:</h5>
                    <ol className="text-gray-300 ml-4 list-decimal">
                      <li>Go to Features & Limits tab</li>
                      <li>Click edit on any feature</li>
                      <li>Configure tiers and limits</li>
                      <li>Save changes</li>
                    </ol>
                  </div>
                  <div>
                    <h5 className="text-white font-medium mb-1">Change usage limits:</h5>
                    <ol className="text-gray-300 ml-4 list-decimal">
                      <li>Find the feature in Features & Limits</li>
                      <li>Click the edit button</li>
                      <li>Adjust limits in the table</li>
                      <li>Use -1 for unlimited, 0 for no access</li>
                    </ol>
                  </div>
                  <div>
                    <h5 className="text-white font-medium mb-1">Configure organization seats:</h5>
                    <ol className="text-gray-300 ml-4 list-decimal">
                      <li>Go to Organization Seats tab</li>
                      <li>Adjust base seats and pricing</li>
                      <li>Changes apply to new signups</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-6 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};