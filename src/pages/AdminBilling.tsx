import React, { useState, useEffect } from 'react';
import { CreditCard, Users, TrendingUp, AlertCircle, Search, Filter, Download, RefreshCw, DollarSign, Calendar, Package, FileText, Activity, ChevronDown, ChevronUp, Edit, Ban, Eye, CheckCircle, XCircle, Loader, Tag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { billingService, BillingStats, Subscription, Transaction } from '../services/billingService';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/date-utils';

interface UserWithBilling {
  id: string;
  name: string;
  email: string;
  membershipType: string;
  created_at: string;
  subscription?: Subscription;
  total_spent?: number;
  last_payment?: string;
}

// Refund Modal Component
const RefundModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onConfirm: (amount: number, reason: string) => void;
}> = ({ isOpen, onClose, transaction, onConfirm }) => {
  const [amount, setAmount] = useState(transaction?.amount || 0);
  const [reason, setReason] = useState('');
  const [isPartial, setIsPartial] = useState(false);

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount - (transaction.refunded_amount || 0));
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const maxRefundAmount = transaction.amount - (transaction.refunded_amount || 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Process Refund</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Transaction Details</label>
            <div className="bg-gray-700/50 p-3 rounded-lg text-sm">
              <p className="text-white">{transaction.description || 'Payment'}</p>
              <p className="text-gray-400">
                Amount: ${transaction.amount.toFixed(2)} | 
                Date: {formatDate(transaction.created_at)}
              </p>
              {transaction.refunded_amount > 0 && (
                <p className="text-yellow-400">
                  Already refunded: ${transaction.refunded_amount.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={isPartial}
                onChange={(e) => {
                  setIsPartial(e.target.checked);
                  if (!e.target.checked) setAmount(maxRefundAmount);
                }}
                className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded"
              />
              <span className="text-gray-300">Partial refund</span>
            </label>

            <label className="block text-gray-400 text-sm mb-1">Refund Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                max={maxRefundAmount}
                min={0.01}
                step={0.01}
                disabled={!isPartial}
                className="w-full pl-8 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50"
              />
            </div>
            <p className="text-gray-400 text-xs mt-1">
              Maximum refundable: ${maxRefundAmount.toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Refund Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              placeholder="Enter reason for refund..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(amount, reason)}
            disabled={!reason || amount <= 0 || amount > maxRefundAmount}
            className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Process Refund
          </button>
        </div>
      </div>
    </div>
  );
};

// Manual Adjustment Modal
const ManualAdjustmentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: UserWithBilling | null;
  onConfirm: (data: any) => void;
}> = ({ isOpen, onClose, user, onConfirm }) => {
  const [adjustmentType, setAdjustmentType] = useState<'credit' | 'debit' | 'plan_change'>('credit');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && adjustmentType === 'plan_change') {
      loadPlans();
    }
  }, [isOpen, adjustmentType]);

  const loadPlans = async () => {
    const { data } = await supabase
      .from('membership_plans')
      .select('id, name, type, price, billing_period')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    setPlans(data || []);
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Manual Adjustment</h3>

        <div className="mb-4">
          <p className="text-gray-400 text-sm">User: {user.name} ({user.email})</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Adjustment Type</label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as any)}
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            >
              <option value="credit">Add Credit</option>
              <option value="debit">Add Charge</option>
              <option value="plan_change">Change Plan</option>
            </select>
          </div>

          {adjustmentType !== 'plan_change' ? (
            <>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    min={0.01}
                    step={0.01}
                    className="w-full pl-8 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Enter reason for adjustment..."
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-gray-400 text-sm mb-2">Select New Plan</label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              >
                <option value="">Select a plan</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - ${plan.price}/{plan.billing_period}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({
              type: adjustmentType,
              amount,
              description,
              selectedPlan
            })}
            disabled={
              (adjustmentType !== 'plan_change' && (!amount || !description)) ||
              (adjustmentType === 'plan_change' && !selectedPlan)
            }
            className="flex-1 py-2 px-4 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Adjustment
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminBilling() {
  const { user } = useAuth();
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [users, setUsers] = useState<UserWithBilling[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions' | 'webhooks'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserWithBilling | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load stats
      const statsData = await billingService.getAdminBillingStats();
      setStats(statsData);

      // Load users with billing info
      const { data: usersData } = await supabase
        .from('users')
        .select(`
          *,
          subscriptions (
            *,
            membership_plans (
              name,
              price,
              billing_period
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (usersData) {
        const usersWithBilling = await Promise.all(usersData.map(async (user) => {
          // Get total spent for each user
          const { data: transactionData } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('type', 'payment')
            .eq('status', 'succeeded');

          const totalSpent = transactionData?.reduce((sum, t) => sum + t.amount, 0) || 0;

          // Get last payment date
          const { data: lastPayment } = await supabase
            .from('transactions')
            .select('created_at')
            .eq('user_id', user.id)
            .eq('type', 'payment')
            .eq('status', 'succeeded')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: user.id,
            name: user.name || 'Unknown',
            email: user.email,
            membershipType: user.membershipType,
            created_at: user.created_at,
            subscription: user.subscriptions?.[0],
            total_spent: totalSpent,
            last_payment: lastPayment?.created_at
          };
        }));

        setUsers(usersWithBilling);
      }

      // Load recent transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select(`
          *,
          users (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions(transactionsData || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefund = async (amount: number, reason: string) => {
    if (!selectedTransaction) return;

    try {
      setProcessingAction('refund');
      await billingService.processRefund(
        selectedTransaction.id,
        amount,
        reason,
        user.id
      );
      setSuccess('Refund processed successfully');
      setShowRefundModal(false);
      await loadDashboardData();
    } catch (error: any) {
      setError(error.message || 'Failed to process refund');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleManualAdjustment = async (data: any) => {
    if (!selectedUser) return;

    try {
      setProcessingAction('adjustment');
      
      if (data.type === 'credit' || data.type === 'debit') {
        // Create a manual transaction
        await supabase
          .from('transactions')
          .insert({
            user_id: selectedUser.id,
            type: data.type,
            status: 'succeeded',
            amount: data.amount,
            currency: 'USD',
            payment_provider: 'manual',
            description: data.description,
            metadata: {
              adjusted_by: user.id,
              adjustment_reason: data.description
            }
          });

        // Log the action
        await supabase
          .from('billing_audit_log')
          .insert({
            admin_id: user.id,
            target_user_id: selectedUser.id,
            action: `manual_${data.type}`,
            entity_type: 'transaction',
            new_values: { amount: data.amount },
            reason: data.description
          });

        setSuccess(`${data.type === 'credit' ? 'Credit' : 'Charge'} applied successfully`);
      } else if (data.type === 'plan_change') {
        // Update user's subscription
        await billingService.updateSubscription(
          selectedUser.id,
          data.selectedPlan,
          'monthly' // Default to monthly for manual changes
        );

        setSuccess('Plan changed successfully');
      }

      setShowAdjustmentModal(false);
      await loadDashboardData();
    } catch (error: any) {
      setError(error.message || 'Failed to apply adjustment');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await billingService.exportBillingData({
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString(),
        endDate: new Date().toISOString()
      });

      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => row[header]).join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `billing-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error: any) {
      setError(error.message || 'Failed to export data');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'active' && user.subscription?.status === 'active') ||
                         (filterStatus === 'inactive' && (!user.subscription || user.subscription.status !== 'active'));
    
    return matchesSearch && matchesFilter;
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 text-electric-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Billing Management</h1>
            <p className="text-gray-400 mt-1">Manage subscriptions, payments, and billing operations</p>
          </div>
          <button
            onClick={handleExportData}
            className="py-2 px-4 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
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
        <div className="flex space-x-1 mb-6 bg-gray-800/50 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-electric-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-electric-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            User Billing
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'transactions'
                ? 'bg-electric-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'webhooks'
                ? 'bg-electric-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Webhooks
          </button>
        </div>

        {/* Content */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-white">
                      {formatAmount(stats.total_revenue)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Subscriptions</p>
                    <p className="text-2xl font-bold text-white">{stats.active_subscriptions}</p>
                  </div>
                  <Users className="h-8 w-8 text-electric-500 opacity-50" />
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Failed Payments</p>
                    <p className="text-2xl font-bold text-white">{stats.failed_payments}</p>
                    <p className="text-xs text-gray-400">Last 30 days</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500 opacity-50" />
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Upcoming Renewals</p>
                    <p className="text-2xl font-bold text-white">{stats.upcoming_renewals}</p>
                    <p className="text-xs text-gray-400">Next 7 days</p>
                  </div>
                  <Calendar className="h-8 w-8 text-yellow-500 opacity-50" />
                </div>
              </div>
            </div>

            {/* Revenue by Plan */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Revenue by Plan</h2>
              <div className="space-y-4">
                {stats.revenue_by_plan.map((plan) => (
                  <div key={plan.plan_name} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">{plan.plan_name}</span>
                        <span className="text-gray-400 text-sm">{plan.subscriber_count} subscribers</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-electric-500 h-2 rounded-full"
                          style={{
                            width: `${(plan.revenue / stats.total_revenue) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-white font-medium">{formatAmount(plan.revenue)}</p>
                      <p className="text-gray-400 text-xs">
                        {((plan.revenue / stats.total_revenue) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Recent Transactions</h2>
              <div className="space-y-3">
                {stats.recent_transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        transaction.status === 'succeeded' ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                      <div>
                        <p className="text-white">{transaction.description || 'Payment'}</p>
                        <p className="text-gray-400 text-sm">{formatDate(transaction.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.type === 'refund' ? 'text-red-400' : 'text-white'
                      }`}>
                        {transaction.type === 'refund' ? '-' : ''}{formatAmount(transaction.amount)}
                      </p>
                      <p className="text-gray-400 text-sm">{transaction.payment_provider}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              >
                <option value="all">All Users</option>
                <option value="active">Active Subscriptions</option>
                <option value="inactive">Inactive/No Subscription</option>
              </select>
            </div>

            {/* Users Table */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Subscription</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Total Spent</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Last Payment</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-white font-medium">{user.name}</p>
                            <p className="text-gray-400 text-sm">{user.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {user.subscription ? (
                            <div>
                              <p className="text-white">{user.subscription.membership_plan?.name}</p>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                user.subscription.status === 'active'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {user.subscription.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">No subscription</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-white">{formatAmount(user.total_spent || 0)}</td>
                        <td className="py-3 px-4 text-gray-300">
                          {user.last_payment ? formatDate(user.last_payment) : 'Never'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowAdjustmentModal(true);
                              }}
                              className="p-1 text-gray-400 hover:text-white transition-colors"
                              title="Manual adjustment"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {/* Add more actions as needed */}
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

        {activeTab === 'transactions' && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Description</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Provider</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Amount</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-3 px-4 text-gray-300">{formatDate(transaction.created_at)}</td>
                      <td className="py-3 px-4">
                        <p className="text-white text-sm">{(transaction as any).users?.name || 'Unknown'}</p>
                        <p className="text-gray-400 text-xs">{(transaction as any).users?.email || ''}</p>
                      </td>
                      <td className="py-3 px-4 text-white">{transaction.description || 'Payment'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'payment'
                            ? 'bg-blue-500/20 text-blue-400'
                            : transaction.type === 'refund'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'succeeded'
                            ? 'bg-green-500/20 text-green-400'
                            : transaction.status === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{transaction.payment_provider}</td>
                      <td className="py-3 px-4 text-right font-medium text-white">
                        {transaction.type === 'refund' ? '-' : ''}{formatAmount(transaction.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          {transaction.type === 'payment' && 
                           transaction.status === 'succeeded' && 
                           transaction.amount > (transaction.refunded_amount || 0) && (
                            <button
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setShowRefundModal(true);
                              }}
                              className="text-sm text-red-400 hover:text-red-300"
                            >
                              Refund
                            </button>
                          )}
                          <button className="text-sm text-gray-400 hover:text-white">
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'webhooks' && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Webhook Logs</h3>
              <p className="text-gray-400">View and monitor payment provider webhooks</p>
              <p className="text-gray-400 text-sm mt-4">Coming soon...</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <RefundModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        transaction={selectedTransaction}
        onConfirm={handleRefund}
      />

      <ManualAdjustmentModal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        user={selectedUser}
        onConfirm={handleManualAdjustment}
      />
    </div>
  );
} 