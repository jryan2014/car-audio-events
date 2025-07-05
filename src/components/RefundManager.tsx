import React, { useState, useEffect } from 'react';
import { Calendar, CreditCard, DollarSign, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { getUserPayments, requestRefund, checkRefundEligibility } from '../lib/payments';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_provider: string;
  created_at: string;
  metadata: any;
  refund_amount?: number;
  refunds?: Array<{
    id: string;
    refund_amount: number;
    status: string;
    reason: string;
    requested_at: string;
    processed_at?: string;
  }>;
  refund_eligible: boolean;
  refund_deadline: Date;
}

export default function RefundManager() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refundingPayment, setRefundingPayment] = useState<string | null>(null);
  const [refundModal, setRefundModal] = useState<{
    isOpen: boolean;
    payment: Payment | null;
    amount: string;
    reason: string;
  }>({
    isOpen: false,
    payment: null,
    amount: '',
    reason: ''
  });

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const userPayments = await getUserPayments();
      setPayments(userPayments);
    } catch (error) {
      console.error('Error loading payments:', error);
      setError('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const openRefundModal = (payment: Payment) => {
    const maxRefundAmount = (payment.amount - (payment.refund_amount || 0)) / 100;
    setRefundModal({
      isOpen: true,
      payment,
      amount: maxRefundAmount.toFixed(2),
      reason: ''
    });
  };

  const closeRefundModal = () => {
    setRefundModal({
      isOpen: false,
      payment: null,
      amount: '',
      reason: ''
    });
  };

  const handleRefundRequest = async () => {
    if (!refundModal.payment || !refundModal.reason.trim()) {
      return;
    }

    const refundAmount = parseFloat(refundModal.amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      return;
    }

    setRefundingPayment(refundModal.payment.id);

    try {
      const result = await requestRefund({
        payment_id: refundModal.payment.id,
        refund_amount: refundAmount,
        reason: refundModal.reason.trim()
      });

      if (result.success) {
        // Refresh payments list
        await loadPayments();
        closeRefundModal();
      } else {
        setError(result.error || 'Refund request failed');
      }
    } catch (error) {
      setError('Failed to process refund request');
    } finally {
      setRefundingPayment(null);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysRemaining = (deadline: Date) => {
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getProviderIcon = (provider: string) => {
    if (provider === 'stripe') {
      return <CreditCard className="h-4 w-4 text-blue-400" />;
    } else if (provider === 'paypal') {
      return (
        <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">P</span>
        </div>
      );
    }
    return <DollarSign className="h-4 w-4 text-gray-400" />;
  };

  const getRefundStatus = (payment: Payment) => {
    if (payment.refunds && payment.refunds.length > 0) {
      const latestRefund = payment.refunds[0];
      switch (latestRefund.status) {
        case 'pending':
          return { icon: Clock, color: 'text-yellow-400', text: 'Refund Pending' };
        case 'processed':
          return { icon: CheckCircle, color: 'text-green-400', text: 'Refunded' };
        case 'denied':
          return { icon: XCircle, color: 'text-red-400', text: 'Refund Denied' };
        default:
          return { icon: Clock, color: 'text-gray-400', text: 'Processing' };
      }
    }
    
    if (!payment.refund_eligible) {
      return { icon: XCircle, color: 'text-gray-400', text: 'Refund Expired' };
    }
    
    return { icon: RefreshCw, color: 'text-electric-400', text: 'Refund Available' };
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin h-8 w-8 text-electric-500" />
          <span className="ml-3 text-gray-300">Loading payment history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Payment History & Refunds</h3>
        <button
          onClick={loadPayments}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-6">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No payments found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => {
            const refundStatus = getRefundStatus(payment);
            const StatusIcon = refundStatus.icon;
            const daysRemaining = getDaysRemaining(payment.refund_deadline);
            
            return (
              <div
                key={payment.id}
                className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getProviderIcon(payment.payment_provider)}
                    <div>
                      <div className="text-white font-medium">
                        {formatAmount(payment.amount, payment.currency)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {payment.metadata?.description || 'Payment'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center space-x-1 ${refundStatus.color}`}>
                      <StatusIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{refundStatus.text}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(payment.created_at)}</span>
                  </div>
                  
                  {payment.refund_eligible && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {daysRemaining > 0 
                          ? `${daysRemaining} days left for refund`
                          : 'Refund deadline passed'
                        }
                      </span>
                    </div>
                  )}
                </div>

                {payment.refunds && payment.refunds.length > 0 && (
                  <div className="border-t border-gray-600/50 pt-3 mt-3">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Refund History</h4>
                    {payment.refunds.map((refund) => (
                      <div key={refund.id} className="text-sm text-gray-400 mb-1">
                        <span className="font-medium">
                          {formatAmount(refund.refund_amount, payment.currency)}
                        </span>
                        <span className="mx-2">•</span>
                        <span className={`capitalize ${
                          refund.status === 'processed' ? 'text-green-400' :
                          refund.status === 'denied' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {refund.status}
                        </span>
                        <span className="mx-2">•</span>
                        <span>{refund.reason}</span>
                        <span className="mx-2">•</span>
                        <span>{formatDate(refund.requested_at)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {payment.refund_eligible && !payment.refunds?.some(r => r.status === 'pending') && (
                  <div className="border-t border-gray-600/50 pt-3 mt-3">
                    <button
                      onClick={() => openRefundModal(payment)}
                      disabled={refundingPayment === payment.id}
                      className="bg-electric-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {refundingPayment === payment.id ? 'Processing...' : 'Request Refund'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Refund Modal */}
      {refundModal.isOpen && refundModal.payment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Request Refund</h3>
            
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">Payment Details</div>
              <div className="bg-gray-700/50 p-3 rounded-lg">
                <div className="text-white font-medium">
                  {formatAmount(refundModal.payment.amount, refundModal.payment.currency)}
                </div>
                <div className="text-sm text-gray-400">
                  Paid on {formatDate(refundModal.payment.created_at)}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Refund Amount
              </label>
              <input
                type="number"
                value={refundModal.amount}
                onChange={(e) => setRefundModal(prev => ({ ...prev, amount: e.target.value }))}
                max={(refundModal.payment.amount - (refundModal.payment.refund_amount || 0)) / 100}
                min="0.01"
                step="0.01"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-electric-500 focus:ring-1 focus:ring-electric-500 outline-none"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason for Refund
              </label>
              <textarea
                value={refundModal.reason}
                onChange={(e) => setRefundModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Please explain why you're requesting a refund..."
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-electric-500 focus:ring-1 focus:ring-electric-500 outline-none resize-none"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={closeRefundModal}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRefundRequest}
                disabled={!refundModal.reason.trim() || refundingPayment === refundModal.payment.id}
                className="flex-1 bg-electric-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refundingPayment === refundModal.payment.id ? 'Processing...' : 'Request Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 