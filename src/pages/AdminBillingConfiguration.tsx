import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  Settings, 
  CreditCard, 
  BarChart3, 
  Users, 
  AlertTriangle,
  Tag,
  TrendingUp,
  Clock,
  DollarSign,
  Shield,
  Bell,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  Calendar,
  Target,
  Gift,
  Zap,
  Mail,
  Database,
  FileText,
  Percent
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProRateRule {
  id: string;
  name: string;
  from_plan_type?: string;
  to_plan_type?: string;
  calculation_method: 'daily' | 'monthly' | 'none';
  credit_unused: boolean;
  immediate_charge: boolean;
  min_proration_amount?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BillingRule {
  id: string;
  name: string;
  rule_type: 'auto_retry' | 'grace_period' | 'cancellation' | 'upgrade_reminder';
  trigger_condition: string;
  action: string;
  delay_days?: number;
  max_attempts?: number;
  is_active: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface DunningSettings {
  id: string;
  setting_name: string;
  failed_payment_grace_days: number;
  max_retry_attempts: number;
  retry_intervals: number[]; // Days between retries
  auto_cancel_after_days: number;
  send_email_notifications: boolean;
  email_template_ids?: string[];
  escalation_enabled: boolean;
  escalation_days: number;
  webhook_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CouponCampaign {
  id: string;
  campaign_name: string;
  description?: string;
  campaign_type: 'seasonal' | 'promotional' | 'loyalty' | 'acquisition';
  target_audience?: string[];
  start_date: string;
  end_date?: string;
  total_budget?: number;
  used_budget: number;
  coupon_template: {
    prefix: string;
    type: 'percentage' | 'fixed_amount';
    value: number;
    minimum_amount?: number;
    usage_limit_per_user?: number;
    total_usage_limit?: number;
  };
  generated_coupons: number;
  used_coupons: number;
  conversion_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminBillingConfiguration() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'prorate' | 'rules' | 'dunning' | 'campaigns'>('prorate');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pro-rate Settings State
  const [proRateRules, setProRateRules] = useState<ProRateRule[]>([]);
  const [showProRateModal, setShowProRateModal] = useState(false);
  const [editingProRateRule, setEditingProRateRule] = useState<ProRateRule | null>(null);

  // Billing Rules State
  const [billingRules, setBillingRules] = useState<BillingRule[]>([]);
  const [showBillingRuleModal, setShowBillingRuleModal] = useState(false);
  const [editingBillingRule, setEditingBillingRule] = useState<BillingRule | null>(null);

  // Dunning Settings State
  const [dunningSettings, setDunningSettings] = useState<DunningSettings[]>([]);
  const [showDunningModal, setShowDunningModal] = useState(false);
  const [editingDunningSettings, setEditingDunningSettings] = useState<DunningSettings | null>(null);

  // Coupon Campaigns State
  const [couponCampaigns, setCouponCampaigns] = useState<CouponCampaign[]>([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CouponCampaign | null>(null);

  // Form data states
  const [proRateFormData, setProRateFormData] = useState<Partial<ProRateRule>>({});
  const [billingRuleFormData, setBillingRuleFormData] = useState<Partial<BillingRule>>({});
  const [dunningFormData, setDunningFormData] = useState<Partial<DunningSettings>>({});
  const [campaignFormData, setCampaignFormData] = useState<Partial<CouponCampaign>>({});

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadBillingConfiguration();
  }, []);

  const loadBillingConfiguration = async () => {
    setIsLoading(true);
    try {
      // Load all billing configuration data
      await Promise.all([
        loadProRateRules(),
        loadBillingRules(),
        loadDunningSettings(),
        loadCouponCampaigns()
      ]);
    } catch (error: any) {
      console.error('Error loading billing configuration:', error);
      setError('Failed to load billing configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProRateRules = async () => {
    try {
      const { data, error } = await supabase
        .from('prorate_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProRateRules(data || []);
    } catch (error) {
      console.error('Error loading pro-rate rules:', error);
      // Continue with empty array if table doesn't exist
      setProRateRules([]);
    }
  };

  const loadBillingRules = async () => {
    try {
      const { data, error } = await supabase
        .from('billing_automation_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBillingRules(data || []);
    } catch (error) {
      console.error('Error loading billing rules:', error);
      setBillingRules([]);
    }
  };

  const loadDunningSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('dunning_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDunningSettings(data || []);
    } catch (error) {
      console.error('Error loading dunning settings:', error);
      setDunningSettings([]);
    }
  };

  const loadCouponCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('coupon_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCouponCampaigns(data || []);
    } catch (error) {
      console.error('Error loading coupon campaigns:', error);
      setCouponCampaigns([]);
    }
  };

  const handleCreateProRateRule = () => {
    setEditingProRateRule(null);
    setProRateFormData({
      name: '',
      calculation_method: 'daily',
      credit_unused: true,
      immediate_charge: false,
      is_active: true
    });
    setShowProRateModal(true);
  };

  const handleEditProRateRule = (rule: ProRateRule) => {
    setEditingProRateRule(rule);
    setProRateFormData(rule);
    setShowProRateModal(true);
  };

  const handleSaveProRateRule = async () => {
    try {
      if (editingProRateRule) {
        // Update existing rule
        const { error } = await supabase
          .from('prorate_rules')
          .update(proRateFormData)
          .eq('id', editingProRateRule.id);
        
        if (error) throw error;
        setSuccess('Pro-rate rule updated successfully');
      } else {
        // Create new rule
        const { error } = await supabase
          .from('prorate_rules')
          .insert([proRateFormData]);
        
        if (error) throw error;
        setSuccess('Pro-rate rule created successfully');
      }
      
      setShowProRateModal(false);
      loadProRateRules();
    } catch (error: any) {
      setError(error.message || 'Failed to save pro-rate rule');
    }
  };

  const handleDeleteProRateRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this pro-rate rule?')) return;
    
    try {
      const { error } = await supabase
        .from('prorate_rules')
        .delete()
        .eq('id', ruleId);
      
      if (error) throw error;
      setSuccess('Pro-rate rule deleted successfully');
      loadProRateRules();
    } catch (error: any) {
      setError(error.message || 'Failed to delete pro-rate rule');
    }
  };

  // Billing Rules Handlers
  const handleCreateBillingRule = () => {
    setEditingBillingRule(null);
    setBillingRuleFormData({
      name: '',
      rule_type: 'auto_retry',
      trigger_condition: '',
      action: '',
      delay_days: 0,
      max_attempts: 3,
      is_active: true,
      metadata: {}
    });
    setShowBillingRuleModal(true);
  };

  const handleEditBillingRule = (rule: BillingRule) => {
    setEditingBillingRule(rule);
    setBillingRuleFormData(rule);
    setShowBillingRuleModal(true);
  };

  const handleSaveBillingRule = async () => {
    try {
      if (editingBillingRule) {
        // Update existing rule
        const { error } = await supabase
          .from('billing_automation_rules')
          .update(billingRuleFormData)
          .eq('id', editingBillingRule.id);
        
        if (error) throw error;
        setSuccess('Billing rule updated successfully');
      } else {
        // Create new rule
        const { error } = await supabase
          .from('billing_automation_rules')
          .insert([billingRuleFormData]);
        
        if (error) throw error;
        setSuccess('Billing rule created successfully');
      }
      
      setShowBillingRuleModal(false);
      loadBillingRules();
    } catch (error: any) {
      setError(error.message || 'Failed to save billing rule');
    }
  };

  const handleDeleteBillingRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this billing rule?')) return;
    
    try {
      const { error } = await supabase
        .from('billing_automation_rules')
        .delete()
        .eq('id', ruleId);
      
      if (error) throw error;
      setSuccess('Billing rule deleted successfully');
      loadBillingRules();
    } catch (error: any) {
      setError(error.message || 'Failed to delete billing rule');
    }
  };

  // Dunning Settings Handlers
  const handleCreateDunningSettings = () => {
    setEditingDunningSettings(null);
    setDunningFormData({
      setting_name: '',
      failed_payment_grace_days: 3,
      max_retry_attempts: 3,
      retry_intervals: [1, 3, 7],
      auto_cancel_after_days: 30,
      send_email_notifications: true,
      escalation_enabled: false,
      escalation_days: 14,
      is_active: true
    });
    setShowDunningModal(true);
  };

  const handleEditDunningSettings = (settings: DunningSettings) => {
    setEditingDunningSettings(settings);
    setDunningFormData(settings);
    setShowDunningModal(true);
  };

  const handleSaveDunningSettings = async () => {
    try {
      if (editingDunningSettings) {
        // Update existing settings
        const { error } = await supabase
          .from('dunning_settings')
          .update(dunningFormData)
          .eq('id', editingDunningSettings.id);
        
        if (error) throw error;
        setSuccess('Dunning settings updated successfully');
      } else {
        // Create new settings
        const { error } = await supabase
          .from('dunning_settings')
          .insert([dunningFormData]);
        
        if (error) throw error;
        setSuccess('Dunning settings created successfully');
      }
      
      setShowDunningModal(false);
      loadDunningSettings();
    } catch (error: any) {
      setError(error.message || 'Failed to save dunning settings');
    }
  };

  const handleDeleteDunningSettings = async (settingsId: string) => {
    if (!confirm('Are you sure you want to delete these dunning settings?')) return;
    
    try {
      const { error } = await supabase
        .from('dunning_settings')
        .delete()
        .eq('id', settingsId);
      
      if (error) throw error;
      setSuccess('Dunning settings deleted successfully');
      loadDunningSettings();
    } catch (error: any) {
      setError(error.message || 'Failed to delete dunning settings');
    }
  };

  // Coupon Campaign Handlers
  const handleCreateCampaign = () => {
    setEditingCampaign(null);
    setCampaignFormData({
      campaign_name: '',
      description: '',
      campaign_type: 'promotional',
      start_date: new Date().toISOString().split('T')[0],
      coupon_template: {
        prefix: 'PROMO',
        type: 'percentage',
        value: 10,
        usage_limit_per_user: 1,
        total_usage_limit: 100
      },
      used_budget: 0,
      generated_coupons: 0,
      used_coupons: 0,
      conversion_rate: 0,
      is_active: true
    });
    setShowCampaignModal(true);
  };

  const handleEditCampaign = (campaign: CouponCampaign) => {
    setEditingCampaign(campaign);
    setCampaignFormData(campaign);
    setShowCampaignModal(true);
  };

  const handleSaveCampaign = async () => {
    try {
      if (editingCampaign) {
        // Update existing campaign
        const { error } = await supabase
          .from('coupon_campaigns')
          .update(campaignFormData)
          .eq('id', editingCampaign.id);
        
        if (error) throw error;
        setSuccess('Campaign updated successfully');
      } else {
        // Create new campaign
        const { error } = await supabase
          .from('coupon_campaigns')
          .insert([campaignFormData]);
        
        if (error) throw error;
        setSuccess('Campaign created successfully');
      }
      
      setShowCampaignModal(false);
      loadCouponCampaigns();
    } catch (error: any) {
      setError(error.message || 'Failed to save campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      const { error } = await supabase
        .from('coupon_campaigns')
        .delete()
        .eq('id', campaignId);
      
      if (error) throw error;
      setSuccess('Campaign deleted successfully');
      loadCouponCampaigns();
    } catch (error: any) {
      setError(error.message || 'Failed to delete campaign');
    }
  };

  // Helper function to update coupon template safely
  const updateCouponTemplate = (field: keyof CouponCampaign['coupon_template'], value: any) => {
    const existingTemplate = campaignFormData.coupon_template || { 
      type: 'percentage' as const, 
      value: 10, 
      prefix: 'PROMO' 
    };
    
    setCampaignFormData({ 
      ...campaignFormData, 
      coupon_template: { 
        ...existingTemplate,
        [field]: value 
      } 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-electric-500 rounded-lg flex items-center justify-center">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Billing Configuration</h1>
              <p className="text-gray-400">Advanced billing management and automation settings</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadBillingConfiguration}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
                         {activeTab === 'prorate' && (
               <button
                 onClick={handleCreateProRateRule}
                 className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
               >
                 <Plus className="h-4 w-4" />
                 <span>Add Pro-rate Rule</span>
               </button>
             )}
             {activeTab === 'rules' && (
               <button
                 onClick={handleCreateBillingRule}
                 className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
               >
                 <Plus className="h-4 w-4" />
                 <span>Add Rule</span>
               </button>
             )}
             {activeTab === 'dunning' && (
               <button
                 onClick={handleCreateDunningSettings}
                 className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
               >
                 <Plus className="h-4 w-4" />
                 <span>Add Settings</span>
               </button>
             )}
             {activeTab === 'campaigns' && (
               <button
                 onClick={handleCreateCampaign}
                 className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
               >
                 <Plus className="h-4 w-4" />
                 <span>Create Campaign</span>
               </button>
             )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <p className="text-green-400">{success}</p>
            </div>
            <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex bg-gray-800/30 rounded-xl p-1 mb-8">
          <button
            onClick={() => setActiveTab('prorate')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'prorate'
                ? 'bg-electric-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Percent className="h-4 w-4" />
            <span>Pro-rate Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'rules'
                ? 'bg-electric-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Billing Rules</span>
          </button>
          <button
            onClick={() => setActiveTab('dunning')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'dunning'
                ? 'bg-electric-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Dunning Management</span>
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'campaigns'
                ? 'bg-electric-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Gift className="h-4 w-4" />
            <span>Coupon Campaigns</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'prorate' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Pro-rate Settings Management</h2>
                  <p className="text-gray-400">Configure pricing rules for membership upgrades and downgrades</p>
                </div>
                <button
                  onClick={handleCreateProRateRule}
                  className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Rule</span>
                </button>
              </div>

              {proRateRules.length === 0 ? (
                <div className="text-center py-12">
                  <Percent className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-white font-medium mb-2">No Pro-rate Rules Configured</h3>
                  <p className="text-gray-400 mb-4">Create your first pro-rate rule to handle membership changes</p>
                  <button
                    onClick={handleCreateProRateRule}
                    className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    Create Pro-rate Rule
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {proRateRules.map((rule) => (
                    <div key={rule.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-white font-medium">{rule.name}</h3>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditProRateRule(rule)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteProRateRule(rule.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Method:</span>
                          <span className="text-white capitalize">{rule.calculation_method}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Credit Unused:</span>
                          <span className={rule.credit_unused ? 'text-green-400' : 'text-red-400'}>
                            {rule.credit_unused ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            rule.is_active 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Automated Billing Rules</h2>
                  <p className="text-gray-400">Configure automated actions for billing events and scenarios</p>
                </div>
                <button 
                  onClick={handleCreateBillingRule}
                  className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Rule</span>
                </button>
              </div>

              {billingRules.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-white font-medium mb-2">No Billing Rules Configured</h3>
                  <p className="text-gray-400 mb-4">Create your first billing rule to automate payment processes</p>
                  <button
                    onClick={handleCreateBillingRule}
                    className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    Create Billing Rule
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {billingRules.map((rule) => (
                    <div key={rule.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-white font-medium">{rule.name}</h3>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditBillingRule(rule)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteBillingRule(rule.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Type:</span>
                          <span className="text-white capitalize">{rule.rule_type.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Trigger:</span>
                          <span className="text-white text-xs truncate">{rule.trigger_condition}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Max Attempts:</span>
                          <span className="text-white">{rule.max_attempts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            rule.is_active 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'dunning' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Dunning Management</h2>
                  <p className="text-gray-400">Configure failed payment handling and customer communication</p>
                </div>
                <button 
                  onClick={handleCreateDunningSettings}
                  className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Settings</span>
                </button>
              </div>

              {dunningSettings.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-white font-medium mb-2">No Dunning Settings Configured</h3>
                  <p className="text-gray-400 mb-4">Create your first dunning policy to handle failed payments</p>
                  <button
                    onClick={handleCreateDunningSettings}
                    className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    Create Dunning Policy
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dunningSettings.map((settings) => (
                    <div key={settings.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-white font-medium">{settings.setting_name}</h3>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditDunningSettings(settings)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteDunningSettings(settings.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Grace Days:</span>
                          <span className="text-white">{settings.failed_payment_grace_days}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Max Retries:</span>
                          <span className="text-white">{settings.max_retry_attempts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Auto Cancel:</span>
                          <span className="text-white">{settings.auto_cancel_after_days} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            settings.is_active 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {settings.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Advanced Coupon Campaigns</h2>
                  <p className="text-gray-400">Create and manage marketing campaigns with automated coupon generation</p>
                </div>
                <button 
                  onClick={handleCreateCampaign}
                  className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Campaign</span>
                </button>
              </div>

              {couponCampaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-white font-medium mb-2">No Coupon Campaigns</h3>
                  <p className="text-gray-400 mb-4">Create your first coupon campaign to drive sales and engagement</p>
                  <button
                    onClick={handleCreateCampaign}
                    className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    Create Campaign
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {couponCampaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-white font-medium">{campaign.campaign_name}</h3>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditCampaign(campaign)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Type:</span>
                          <span className="text-white capitalize">{campaign.campaign_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Generated:</span>
                          <span className="text-white">{campaign.generated_coupons} coupons</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Used:</span>
                          <span className="text-white">{campaign.used_coupons} / {campaign.generated_coupons}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Conversion:</span>
                          <span className="text-white">{campaign.conversion_rate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            campaign.is_active 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {campaign.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pro-rate Rule Modal */}
        {showProRateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {editingProRateRule ? 'Edit Pro-rate Rule' : 'Create Pro-rate Rule'}
                  </h3>
                  <button
                    onClick={() => setShowProRateModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Rule Name</label>
                    <input
                      type="text"
                      value={proRateFormData.name || ''}
                      onChange={(e) => setProRateFormData({ ...proRateFormData, name: e.target.value })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Enter rule name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Calculation Method</label>
                    <select
                      value={proRateFormData.calculation_method || 'daily'}
                      onChange={(e) => setProRateFormData({ ...proRateFormData, calculation_method: e.target.value as any })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="daily">Daily Pro-ration</option>
                      <option value="monthly">Monthly Pro-ration</option>
                      <option value="none">No Pro-ration</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={proRateFormData.credit_unused || false}
                        onChange={(e) => setProRateFormData({ ...proRateFormData, credit_unused: e.target.checked })}
                        className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                      />
                      <span className="text-gray-300">Credit unused time</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={proRateFormData.immediate_charge || false}
                        onChange={(e) => setProRateFormData({ ...proRateFormData, immediate_charge: e.target.checked })}
                        className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                      />
                      <span className="text-gray-300">Immediate charge</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowProRateModal(false)}
                    className="flex-1 py-2 px-4 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProRateRule}
                    className="flex-1 py-2 px-4 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Rule</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Billing Rule Modal */}
        {showBillingRuleModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {editingBillingRule ? 'Edit Billing Rule' : 'Create Billing Rule'}
                  </h3>
                  <button
                    onClick={() => setShowBillingRuleModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Rule Name</label>
                    <input
                      type="text"
                      value={billingRuleFormData.name || ''}
                      onChange={(e) => setBillingRuleFormData({ ...billingRuleFormData, name: e.target.value })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Enter rule name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Rule Type</label>
                    <select
                      value={billingRuleFormData.rule_type || 'auto_retry'}
                      onChange={(e) => setBillingRuleFormData({ ...billingRuleFormData, rule_type: e.target.value as any })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="auto_retry">Auto Retry</option>
                      <option value="grace_period">Grace Period</option>
                      <option value="cancellation">Cancellation</option>
                      <option value="upgrade_reminder">Upgrade Reminder</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Delay Days</label>
                    <input
                      type="number"
                      value={billingRuleFormData.delay_days || 0}
                      onChange={(e) => setBillingRuleFormData({ ...billingRuleFormData, delay_days: parseInt(e.target.value) })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Max Attempts</label>
                    <input
                      type="number"
                      value={billingRuleFormData.max_attempts || 3}
                      onChange={(e) => setBillingRuleFormData({ ...billingRuleFormData, max_attempts: parseInt(e.target.value) })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Trigger Condition</label>
                  <input
                    type="text"
                    value={billingRuleFormData.trigger_condition || ''}
                    onChange={(e) => setBillingRuleFormData({ ...billingRuleFormData, trigger_condition: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="e.g., payment_failed, subscription_expired"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Action</label>
                  <input
                    type="text"
                    value={billingRuleFormData.action || ''}
                    onChange={(e) => setBillingRuleFormData({ ...billingRuleFormData, action: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="e.g., retry_payment, send_notification"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBillingRuleModal(false)}
                    className="flex-1 py-2 px-4 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBillingRule}
                    className="flex-1 py-2 px-4 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Rule</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dunning Settings Modal */}
        {showDunningModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {editingDunningSettings ? 'Edit Dunning Settings' : 'Create Dunning Settings'}
                  </h3>
                  <button
                    onClick={() => setShowDunningModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Setting Name</label>
                  <input
                    type="text"
                    value={dunningFormData.setting_name || ''}
                    onChange={(e) => setDunningFormData({ ...dunningFormData, setting_name: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Enter setting name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Grace Period Days</label>
                    <input
                      type="number"
                      value={dunningFormData.failed_payment_grace_days || 3}
                      onChange={(e) => setDunningFormData({ ...dunningFormData, failed_payment_grace_days: parseInt(e.target.value) })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Max Retry Attempts</label>
                    <input
                      type="number"
                      value={dunningFormData.max_retry_attempts || 3}
                      onChange={(e) => setDunningFormData({ ...dunningFormData, max_retry_attempts: parseInt(e.target.value) })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Auto Cancel After Days</label>
                  <input
                    type="number"
                    value={dunningFormData.auto_cancel_after_days || 30}
                    onChange={(e) => setDunningFormData({ ...dunningFormData, auto_cancel_after_days: parseInt(e.target.value) })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    min="1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dunningFormData.send_email_notifications || false}
                        onChange={(e) => setDunningFormData({ ...dunningFormData, send_email_notifications: e.target.checked })}
                        className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                      />
                      <span className="text-gray-300">Send Email Notifications</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dunningFormData.escalation_enabled || false}
                        onChange={(e) => setDunningFormData({ ...dunningFormData, escalation_enabled: e.target.checked })}
                        className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                      />
                      <span className="text-gray-300">Enable Escalation</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDunningModal(false)}
                    className="flex-1 py-2 px-4 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDunningSettings}
                    className="flex-1 py-2 px-4 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Settings</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coupon Campaign Modal */}
        {showCampaignModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
                  </h3>
                  <button
                    onClick={() => setShowCampaignModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Campaign Name</label>
                    <input
                      type="text"
                      value={campaignFormData.campaign_name || ''}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, campaign_name: e.target.value })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Enter campaign name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Campaign Type</label>
                    <select
                      value={campaignFormData.campaign_type || 'promotional'}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, campaign_type: e.target.value as any })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="seasonal">Seasonal</option>
                      <option value="promotional">Promotional</option>
                      <option value="loyalty">Loyalty</option>
                      <option value="acquisition">Acquisition</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Description</label>
                  <textarea
                    value={campaignFormData.description || ''}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, description: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    rows={3}
                    placeholder="Campaign description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Start Date</label>
                    <input
                      type="date"
                      value={campaignFormData.start_date || ''}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, start_date: e.target.value })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">End Date (Optional)</label>
                    <input
                      type="date"
                      value={campaignFormData.end_date || ''}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, end_date: e.target.value })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-lg font-medium text-white mb-4">Coupon Template</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Coupon Prefix</label>
                      <input
                        type="text"
                                                 value={campaignFormData.coupon_template?.prefix || 'PROMO'}
                         onChange={(e) => updateCouponTemplate('prefix', e.target.value)}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder="PROMO"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Discount Type</label>
                      <select
                                                 value={campaignFormData.coupon_template?.type || 'percentage'}
                         onChange={(e) => updateCouponTemplate('type', e.target.value as 'percentage' | 'fixed_amount')}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed_amount">Fixed Amount</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-gray-400 text-sm mb-2">Discount Value</label>
                    <input
                      type="number"
                                             value={campaignFormData.coupon_template?.value || 10}
                       onChange={(e) => updateCouponTemplate('value', parseFloat(e.target.value))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCampaignModal(false)}
                    className="flex-1 py-2 px-4 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCampaign}
                    className="flex-1 py-2 px-4 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Campaign</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 