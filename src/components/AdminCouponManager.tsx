import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit, Trash2, Save, X, Eye, Calendar, Users, Percent, DollarSign, AlertCircle, Check, Copy, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/date-utils';

interface PromoCode {
  id: string;
  code: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'trial_extension';
  value: number;
  applies_to?: {
    membership_types?: string[];
    plan_ids?: string[];
  };
  usage_limit?: number;
  usage_count: number;
  minimum_amount?: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  created_by?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface CouponFormData {
  code: string;
  description: string;
  type: 'percentage' | 'fixed_amount' | 'trial_extension';
  value: number;
  usage_limit?: number;
  minimum_amount?: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  applies_to_all: boolean;
  selected_plan_ids: string[];
  selected_membership_types: string[];
}

interface MembershipPlan {
  id: string;
  name: string;
  type: string;
}

export const AdminCouponManager: React.FC = () => {
  const [coupons, setCoupons] = useState<PromoCode[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<PromoCode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CouponFormData>({
    code: '',
    description: '',
    type: 'percentage',
    value: 0,
    usage_limit: undefined,
    minimum_amount: undefined,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: undefined,
    is_active: true,
    applies_to_all: true,
    selected_plan_ids: [],
    selected_membership_types: []
  });

  const membershipTypes = [
    { id: 'competitor', name: 'Competitor' },
    { id: 'retailer', name: 'Retailer' },
    { id: 'manufacturer', name: 'Manufacturer' },
    { id: 'organization', name: 'Organization' }
  ];

  useEffect(() => {
    loadCoupons();
    loadPlans();
  }, []);

  const loadCoupons = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Error loading coupons:', error);
      setError('Failed to load coupon codes');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('id, name, type')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const handleCreateCoupon = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      description: '',
      type: 'percentage',
      value: 0,
      usage_limit: undefined,
      minimum_amount: undefined,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: undefined,
      is_active: true,
      applies_to_all: true,
      selected_plan_ids: [],
      selected_membership_types: []
    });
    setShowModal(true);
  };

  const handleEditCoupon = (coupon: PromoCode) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      type: coupon.type,
      value: coupon.value,
      usage_limit: coupon.usage_limit,
      minimum_amount: coupon.minimum_amount,
      valid_from: coupon.valid_from.split('T')[0],
      valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : undefined,
      is_active: coupon.is_active,
      applies_to_all: !coupon.applies_to?.plan_ids && !coupon.applies_to?.membership_types,
      selected_plan_ids: coupon.applies_to?.plan_ids || [],
      selected_membership_types: coupon.applies_to?.membership_types || []
    });
    setShowModal(true);
  };

  const handleSaveCoupon = async () => {
    try {
      setError('');
      
      if (!formData.code.trim()) {
        throw new Error('Coupon code is required');
      }

      if (formData.value <= 0) {
        throw new Error('Value must be greater than 0');
      }

      if (formData.type === 'percentage' && formData.value > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }

      // Prepare the applies_to object
      let applies_to = null;
      if (!formData.applies_to_all) {
        applies_to = {
          plan_ids: formData.selected_plan_ids.length > 0 ? formData.selected_plan_ids : undefined,
          membership_types: formData.selected_membership_types.length > 0 ? formData.selected_membership_types : undefined
        };
      }

      const couponData = {
        code: formData.code.toUpperCase().trim(),
        description: formData.description.trim() || null,
        type: formData.type,
        value: formData.value,
        usage_limit: formData.usage_limit || null,
        minimum_amount: formData.minimum_amount ? Math.round(formData.minimum_amount * 100) : null, // Convert to cents
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        is_active: formData.is_active,
        applies_to: applies_to,
        updated_at: new Date().toISOString()
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from('promo_codes')
          .update(couponData)
          .eq('id', editingCoupon.id);

        if (error) throw error;
        setSuccess('Coupon updated successfully');
      } else {
        const { error } = await supabase
          .from('promo_codes')
          .insert({
            ...couponData,
            usage_count: 0,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        setSuccess('Coupon created successfully');
      }

      setShowModal(false);
      await loadCoupons();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      setSuccess('Coupon deleted successfully');
      await loadCoupons();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleCopyCoupon = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setSuccess(`Coupon code "${code}" copied to clipboard`);
    } catch (error) {
      setError('Failed to copy coupon code');
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code: result });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="h-4 w-4 text-green-400" />;
      case 'fixed_amount':
        return <DollarSign className="h-4 w-4 text-blue-400" />;
      case 'trial_extension':
        return <Calendar className="h-4 w-4 text-purple-400" />;
      default:
        return <Tag className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (coupon: PromoCode) => {
    if (!coupon.is_active) return 'bg-gray-500/20 text-gray-400';
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) return 'bg-red-500/20 text-red-400';
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) return 'bg-orange-500/20 text-orange-400';
    return 'bg-green-500/20 text-green-400';
  };

  const getStatusText = (coupon: PromoCode) => {
    if (!coupon.is_active) return 'Inactive';
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) return 'Expired';
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) return 'Limit Reached';
    return 'Active';
  };

  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         coupon.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || coupon.type === filterType;
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && coupon.is_active && 
                          (!coupon.valid_until || new Date(coupon.valid_until) >= new Date()) &&
                          (!coupon.usage_limit || coupon.usage_count < coupon.usage_limit)) ||
                         (filterStatus === 'inactive' && !coupon.is_active) ||
                         (filterStatus === 'expired' && coupon.valid_until && new Date(coupon.valid_until) < new Date());
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Coupon Management</h3>
          <p className="text-gray-400 mt-1">Create and manage promotional discount codes</p>
        </div>
        <button
          onClick={handleCreateCoupon}
          className="bg-electric-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-electric-600 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Coupon</span>
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="h-5 w-5" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search coupons..."
              className="w-full pl-10 pr-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          >
            <option value="all">All Types</option>
            <option value="percentage">Percentage</option>
            <option value="fixed_amount">Fixed Amount</option>
            <option value="trial_extension">Trial Extension</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCoupons.map((coupon) => (
          <div key={coupon.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getTypeIcon(coupon.type)}
                <div className="font-mono font-bold text-white">{coupon.code}</div>
                <button
                  onClick={() => handleCopyCoupon(coupon.code)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Copy code"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEditCoupon(coupon)}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteCoupon(coupon.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-gray-300 text-sm">
                {coupon.description || 'No description'}
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-electric-400 font-semibold">
                  {coupon.type === 'percentage' 
                    ? `${coupon.value}% off`
                    : coupon.type === 'fixed_amount'
                    ? formatAmount(coupon.value)
                    : `${coupon.value} days trial`
                  }
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(coupon)}`}>
                  {getStatusText(coupon)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Usage: {coupon.usage_count}{coupon.usage_limit ? `/${coupon.usage_limit}` : ''}</span>
                {coupon.valid_until && (
                  <span>Expires: {formatDate(coupon.valid_until)}</span>
                )}
              </div>
            </div>

            {coupon.applies_to && (
              <div className="border-t border-gray-600 pt-3">
                <div className="text-xs text-gray-400 mb-1">Applies to:</div>
                {coupon.applies_to.membership_types && (
                  <div className="flex flex-wrap gap-1">
                    {coupon.applies_to.membership_types.map(type => (
                      <span key={type} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                        {membershipTypes.find(mt => mt.id === type)?.name || type}
                      </span>
                    ))}
                  </div>
                )}
                {coupon.applies_to.plan_ids && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {coupon.applies_to.plan_ids.map(planId => {
                      const plan = plans.find(p => p.id === planId);
                      return (
                        <span key={planId} className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                          {plan?.name || 'Unknown Plan'}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCoupons.length === 0 && (
        <div className="text-center py-12">
          <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No coupons found</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Code and Generate Button */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Coupon Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Enter code or generate"
                  />
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Optional description"
                />
              </div>

              {/* Type and Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Discount Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed_amount">Fixed Amount</option>
                    <option value="trial_extension">Trial Extension</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Value {formData.type === 'percentage' ? '(%)' : formData.type === 'fixed_amount' ? '($)' : '(days)'}
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    min="0"
                    max={formData.type === 'percentage' ? 100 : undefined}
                    step={formData.type === 'fixed_amount' ? '0.01' : '1'}
                  />
                </div>
              </div>

              {/* Usage Limit and Minimum Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Usage Limit (optional)</label>
                  <input
                    type="number"
                    value={formData.usage_limit || ''}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Minimum Amount ($)</label>
                  <input
                    type="number"
                    value={formData.minimum_amount || ''}
                    onChange={(e) => setFormData({ ...formData, minimum_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="No minimum"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Valid From and Until */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Valid From</label>
                  <input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Valid Until (optional)</label>
                  <input
                    type="date"
                    value={formData.valid_until || ''}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value || undefined })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  />
                </div>
              </div>

              {/* Applies To */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Applies To</label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.applies_to_all}
                      onChange={(e) => setFormData({ ...formData, applies_to_all: e.target.checked })}
                      className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                    />
                    <span className="text-gray-300">All plans and membership types</span>
                  </label>

                  {!formData.applies_to_all && (
                    <div className="space-y-3 pl-6">
                      <div>
                        <div className="text-sm text-gray-400 mb-2">Specific Plans:</div>
                        <div className="grid grid-cols-2 gap-2">
                          {plans.map(plan => (
                            <label key={plan.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={formData.selected_plan_ids.includes(plan.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      selected_plan_ids: [...formData.selected_plan_ids, plan.id]
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      selected_plan_ids: formData.selected_plan_ids.filter(id => id !== plan.id)
                                    });
                                  }
                                }}
                                className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                              />
                              <span className="text-gray-300 text-sm">{plan.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-400 mb-2">Membership Types:</div>
                        <div className="grid grid-cols-2 gap-2">
                          {membershipTypes.map(type => (
                            <label key={type.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={formData.selected_membership_types.includes(type.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      selected_membership_types: [...formData.selected_membership_types, type.id]
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      selected_membership_types: formData.selected_membership_types.filter(id => id !== type.id)
                                    });
                                  }
                                }}
                                className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                              />
                              <span className="text-gray-300 text-sm">{type.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Toggle */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                  />
                  <span className="text-gray-300">Active</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 px-4 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCoupon}
                  className="flex-1 py-3 px-4 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingCoupon ? 'Update' : 'Create'} Coupon</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 