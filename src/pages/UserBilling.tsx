import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Calendar, Download, AlertCircle, Plus, Trash2, Check, X, Pause, Play, Package, Clock, DollarSign, FileText, Tag, ChevronRight, Shield, RefreshCw, Loader, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { billingService, Subscription, Transaction, PaymentMethod, Invoice } from '../services/billingService';
import { invoiceService } from '../services/invoiceService';
import { PromoCodeInput } from '../components/PromoCodeInput';
import { FailedPaymentRetry } from '../components/FailedPaymentRetry';
import { PlanUpgradeModal } from '../components/PlanUpgradeModal';
import RefundManager from '../components/RefundManager';
import { formatDate } from '../utils/date-utils';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { loadPayPalSDK } from '../lib/payments';
import { getStripeConfig } from '../services/paymentConfigService';

interface BillingOverview {
  subscription: Subscription | null;
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  upcomingInvoice: Invoice | null;
}

// Add Payment Method Modal Component
const AddPaymentMethodModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}> = ({ isOpen, onClose, onSuccess, userId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentType, setPaymentType] = useState<'card' | 'paypal'>('card');
  const [paypalClientId, setPaypalClientId] = useState<string>('');
  const paypalRef = useRef<HTMLDivElement>(null);

  // Load PayPal client ID
  useEffect(() => {
    if (isOpen && paymentType === 'paypal') {
      const loadPayPalConfig = async () => {
        try {
          await loadPayPalSDK();
          // PayPal SDK is loaded, we can use it
        } catch (error) {
          console.error('Error loading PayPal:', error);
          setError('Failed to load PayPal. Please try again.');
        }
      };
      loadPayPalConfig();
    }
  }, [isOpen, paymentType]);

  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError('');

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) return;

      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        setError(error.message || 'Failed to add payment method');
        return;
      }

      // Save to backend
      await billingService.addPaymentMethod(userId, paymentMethod.id, 'card', true);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add payment method');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayPalApproval = async (data: any) => {
    try {
      setIsProcessing(true);
      setError('');
      
      // Save PayPal payment method to backend
      await billingService.addPaymentMethod(userId, data.paymentID || data.orderID, 'paypal', true);
      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to add PayPal payment method');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Add Payment Method</h3>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setPaymentType('card')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              paymentType === 'card'
                ? 'bg-electric-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Credit/Debit Card</span>
            </div>
          </button>
          <button
            onClick={() => setPaymentType('paypal')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              paymentType === 'paypal'
                ? 'bg-electric-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">P</span>
              </div>
              <span>PayPal</span>
            </div>
          </button>
        </div>

        {paymentType === 'card' ? (
          <form onSubmit={handleStripeSubmit}>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Card Details</label>
              <div className="p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#ffffff',
                        '::placeholder': {
                          color: '#9ca3af',
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing || !stripe}
                className="flex-1 py-2 px-4 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isProcessing ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : (
                  'Add Card'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Connect PayPal Account</label>
              <p className="text-gray-400 text-sm mb-4">
                Set up PayPal as a payment method for future purchases.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {(window as any).paypal ? (
              <div ref={paypalRef} className="mb-4">
                <PayPalButtons
                  style={{
                    layout: 'vertical',
                    color: 'blue',
                    shape: 'rect',
                    label: 'paypal',
                    height: 45
                  }}
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      purchase_units: [{
                        amount: {
                          currency_code: 'USD',
                          value: '0.01' // Minimal amount for setup
                        }
                      }],
                      intent: 'AUTHORIZE' // Just authorize, don't capture
                    });
                  }}
                  onApprove={handlePayPalApproval}
                  onError={(err) => {
                    console.error('PayPal error:', err);
                    setError('PayPal setup failed. Please try again.');
                  }}
                  onCancel={() => {
                    setError('PayPal setup was cancelled');
                  }}
                />
              </div>
            ) : (
              <div className="mb-4 flex items-center justify-center py-8">
                <Loader className="animate-spin h-6 w-6 text-electric-500 mr-2" />
                <span className="text-gray-300">Loading PayPal...</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Cancel Subscription Modal
const CancelSubscriptionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, immediately: boolean) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [immediately, setImmediately] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Cancel Subscription</h3>
        
        <p className="text-gray-300 mb-4">
          We're sorry to see you go. Please let us know why you're cancelling.
        </p>

        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">Cancellation Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          >
            <option value="">Select a reason</option>
            <option value="too_expensive">Too expensive</option>
            <option value="not_using">Not using the service</option>
            <option value="missing_features">Missing features I need</option>
            <option value="found_alternative">Found an alternative</option>
            <option value="temporary">Just need a break</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={immediately}
              onChange={(e) => setImmediately(e.target.checked)}
              className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
            />
            <span className="text-gray-300 text-sm">
              Cancel immediately (no access after today)
            </span>
          </label>
          {!immediately && (
            <p className="text-gray-400 text-xs mt-1 ml-6">
              You'll continue to have access until the end of your current billing period
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Keep Subscription
          </button>
          <button
            onClick={() => onConfirm(reason, immediately)}
            disabled={!reason}
            className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel Subscription
          </button>
        </div>
      </div>
    </div>
  );
};

export default function UserBilling() {
  const { user } = useAuth();
  const [billingData, setBillingData] = useState<BillingOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'invoices' | 'methods' | 'refunds'>('overview');
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stripePromise, setStripePromise] = useState<any>(null);

  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    if (user?.id) {
      loadBillingData();
    }
  }, [user]);

  // Load Stripe configuration from payment settings
  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const stripeConfig = await getStripeConfig();
        if (stripeConfig.publishableKey) {
          const stripe = loadStripe(stripeConfig.publishableKey);
          setStripePromise(stripe);
        }
      } catch (error) {
        console.error('Failed to load Stripe config:', error);
        // Fallback to environment variable if payment settings fetch fails
        const envKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (envKey) {
          const stripe = loadStripe(envKey);
          setStripePromise(stripe);
        }
      }
    };

    initializeStripe();
  }, []);

  const loadBillingData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const data = await billingService.getUserBillingOverview(user.id);
      setBillingData(data);
    } catch (error) {
      console.error('Error loading billing data:', error);
      setError('Failed to load billing information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async (reason: string, immediately: boolean) => {
    try {
      setProcessingAction('cancel');
      await billingService.cancelSubscription(user.id, reason, immediately);
      setSuccess(immediately ? 'Subscription cancelled' : 'Subscription will cancel at end of period');
      setShowCancelModal(false);
      await loadBillingData();
    } catch (error: any) {
      setError(error.message || 'Failed to cancel subscription');
    } finally {
      setProcessingAction(null);
    }
  };

  const handlePauseSubscription = async () => {
    try {
      setProcessingAction('pause');
      await billingService.pauseSubscription(user.id);
      setSuccess('Subscription paused successfully');
      await loadBillingData();
    } catch (error: any) {
      setError(error.message || 'Failed to pause subscription');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      setProcessingAction('resume');
      await billingService.resumeSubscription(user.id);
      setSuccess('Subscription resumed successfully');
      await loadBillingData();
    } catch (error: any) {
      setError(error.message || 'Failed to resume subscription');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRemovePaymentMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;

    try {
      setProcessingAction(`remove-${methodId}`);
      await billingService.removePaymentMethod(user.id, methodId);
      setSuccess('Payment method removed');
      await loadBillingData();
    } catch (error: any) {
      setError(error.message || 'Failed to remove payment method');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleSetDefaultPaymentMethod = async (methodId: string) => {
    try {
      setProcessingAction(`default-${methodId}`);
      await billingService.setDefaultPaymentMethod(user.id, methodId);
      setSuccess('Default payment method updated');
      await loadBillingData();
    } catch (error: any) {
      setError(error.message || 'Failed to update default payment method');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      await invoiceService.downloadInvoice(invoiceId, user.id);
    } catch (error: any) {
      setError(error.message || 'Failed to download invoice');
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100); // Convert cents to dollars
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 text-electric-500 animate-spin" />
      </div>
    );
  }

  const content = (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Billing & Subscription</h1>
            <p className="text-gray-400 mt-2">Manage your membership, payment methods, and billing history</p>
          </div>

            {/* Alerts */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="text-red-400">{error}</p>
                </div>
                <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-400" />
                  <p className="text-green-400">{success}</p>
                </div>
                <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">
                  <X className="h-4 w-4" />
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
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'bg-electric-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Transaction History
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  activeTab === 'invoices'
                    ? 'bg-electric-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Invoices
              </button>
              <button
                onClick={() => setActiveTab('refunds')}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  activeTab === 'refunds'
                    ? 'bg-electric-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Refunds
              </button>
              <button
                onClick={() => setActiveTab('methods')}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  activeTab === 'methods'
                    ? 'bg-electric-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Payment Methods
              </button>
            </div>

            {/* Content */}
            <div>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Current Subscription */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <Package className="h-5 w-5 mr-2 text-electric-500" />
                    Current Subscription
                  </h2>

                  {billingData?.subscription ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-white">
                            {billingData.subscription.membership_plan?.name || 'Unknown Plan'}
                          </h3>
                          <p className="text-gray-400">
                            {formatAmount(billingData.subscription.membership_plan?.price || 0)} / {billingData.subscription.membership_plan?.billing_period}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          billingData.subscription.status === 'active' 
                            ? 'bg-green-500/20 text-green-400'
                            : billingData.subscription.status === 'paused'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {billingData.subscription.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">Current Period</p>
                          <p className="text-white">
                            {formatDate(billingData.subscription.current_period_start)} - {formatDate(billingData.subscription.current_period_end)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Next Billing Date</p>
                          <p className="text-white">
                            {billingData.subscription.cancel_at_period_end 
                              ? 'Subscription ending'
                              : formatDate(billingData.subscription.current_period_end)
                            }
                          </p>
                        </div>
                      </div>

                      {billingData.subscription.membership_plan?.features && (
                        <div>
                          <p className="text-gray-400 text-sm mb-2">Included Features:</p>
                          <ul className="space-y-1">
                            {billingData.subscription.membership_plan.features.slice(0, 5).map((feature, index) => (
                              <li key={index} className="flex items-center text-sm text-gray-300">
                                <Check className="h-4 w-4 text-green-400 mr-2 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Promo Code Section */}
                      {billingData.subscription.status === 'active' && !billingData.subscription.promo_code_id && (
                        <div className="pt-4 border-t border-gray-700">
                          <p className="text-gray-400 text-sm mb-2">Have a promo code?</p>
                          <PromoCodeInput
                            userId={user.id}
                            onSuccess={(discount) => {
                              setSuccess(`Promo code applied! You saved ${
                                discount.type === 'percentage' 
                                  ? `${discount.value}%` 
                                  : formatAmount(discount.value)
                              }`);
                              loadBillingData();
                            }}
                            onError={(error) => setError(error)}
                          />
                        </div>
                      )}

                      {/* Show active discount if any */}
                      {billingData.subscription.promo_code_id && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Tag className="h-4 w-4 text-green-400" />
                            <p className="text-green-400 text-sm">
                              Active discount: {
                                billingData.subscription.discount_percentage 
                                  ? `${billingData.subscription.discount_percentage}% off`
                                  : billingData.subscription.discount_amount
                                  ? formatAmount(billingData.subscription.discount_amount) + ' off'
                                  : 'Special discount applied'
                              }
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-4 border-t border-gray-700">
                        <button
                          onClick={() => setShowUpgradeModal(true)}
                          className="flex-1 py-2 px-4 bg-electric-500 text-white rounded-lg font-medium text-center hover:bg-electric-600 transition-colors"
                        >
                          Change Plan
                        </button>
                        {billingData.subscription.status === 'active' && (
                          <>
                            <button
                              onClick={() => setShowCancelModal(true)}
                              disabled={processingAction === 'cancel'}
                              className="flex-1 py-2 px-4 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handlePauseSubscription}
                              disabled={processingAction === 'pause'}
                              className="py-2 px-4 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors disabled:opacity-50"
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {billingData.subscription.status === 'paused' && (
                          <button
                            onClick={handleResumeSubscription}
                            disabled={processingAction === 'resume'}
                            className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                          >
                            <Play className="h-4 w-4 inline mr-2" />
                            Resume
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-4">You don't have an active subscription</p>
                      <Link
                        to="/pricing"
                        className="inline-flex items-center px-6 py-3 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors"
                      >
                        View Membership Plans
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Failed Payments Alert */}
                {billingData?.transactions && billingData.transactions.some(t => 
                  t.status === 'failed' && 
                  t.type === 'payment' &&
                  new Date(t.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                ) && (
                  <div className="space-y-3">
                    {billingData.transactions
                      .filter(t => 
                        t.status === 'failed' && 
                        t.type === 'payment' &&
                        new Date(t.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                      )
                      .slice(0, 3)
                      .map((transaction) => (
                        <FailedPaymentRetry
                          key={transaction.id}
                          transaction={transaction}
                          userId={user.id}
                          onSuccess={() => {
                            setSuccess('Payment processed successfully!');
                            loadBillingData();
                          }}
                          onError={(error) => setError(error)}
                        />
                      ))}
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Spent</p>
                        <p className="text-2xl font-bold text-white">
                          {formatAmount(
                            billingData?.transactions
                              .filter(t => t.type === 'payment' && t.status === 'succeeded')
                              .reduce((sum, t) => sum + t.amount, 0) || 0
                          )}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-electric-500 opacity-50" />
                    </div>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Payment Methods</p>
                        <p className="text-2xl font-bold text-white">
                          {billingData?.paymentMethods.length || 0}
                        </p>
                      </div>
                      <CreditCard className="h-8 w-8 text-electric-500 opacity-50" />
                    </div>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Member Since</p>
                        <p className="text-2xl font-bold text-white">
                          {new Date().getFullYear()}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-electric-500 opacity-50" />
                    </div>
                  </div>
                </div>

                {/* Recent Transactions Preview */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-electric-500" />
                      Recent Transactions
                    </h2>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="text-electric-400 hover:text-electric-300 text-sm"
                    >
                      View All
                    </button>
                  </div>

                  {billingData?.transactions && billingData.transactions.length > 0 ? (
                    <div className="space-y-3">
                      {billingData.transactions.slice(0, 5).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between py-2">
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${
                              transaction.status === 'succeeded' ? 'bg-green-400' : 'bg-red-400'
                            }`} />
                            <div>
                              <p className="text-white font-medium">{transaction.description || 'Payment'}</p>
                              <p className="text-gray-400 text-sm">{formatDate(transaction.created_at)}</p>
                            </div>
                          </div>
                          <p className={`font-medium ${
                            transaction.type === 'refund' ? 'text-red-400' : 'text-white'
                          }`}>
                            {transaction.type === 'refund' ? '-' : ''}{formatAmount(transaction.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">No transactions yet</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Transaction History</h2>
                
                {billingData?.transactions && billingData.transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-2 text-gray-400 font-medium">Date</th>
                          <th className="text-left py-3 px-2 text-gray-400 font-medium">Description</th>
                          <th className="text-left py-3 px-2 text-gray-400 font-medium">Type</th>
                          <th className="text-left py-3 px-2 text-gray-400 font-medium">Status</th>
                          <th className="text-right py-3 px-2 text-gray-400 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingData.transactions.map((transaction) => (
                          <tr key={transaction.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                            <td className="py-3 px-2 text-gray-300">{formatDate(transaction.created_at)}</td>
                            <td className="py-3 px-2 text-white">{transaction.description || 'Payment'}</td>
                            <td className="py-3 px-2">
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
                            <td className="py-3 px-2">
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
                            <td className="py-3 px-2 text-right font-medium text-white">
                              {transaction.type === 'refund' ? '-' : ''}{formatAmount(transaction.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">No transactions yet</p>
                )}
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Invoices</h2>
                
                {billingData?.transactions && billingData.transactions.filter(t => t.invoice_id).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-2 text-gray-400 font-medium">Invoice #</th>
                          <th className="text-left py-3 px-2 text-gray-400 font-medium">Date</th>
                          <th className="text-left py-3 px-2 text-gray-400 font-medium">Description</th>
                          <th className="text-left py-3 px-2 text-gray-400 font-medium">Status</th>
                          <th className="text-right py-3 px-2 text-gray-400 font-medium">Amount</th>
                          <th className="text-center py-3 px-2 text-gray-400 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingData.transactions
                          .filter(t => t.invoice_id)
                          .map((transaction) => (
                            <tr key={transaction.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                              <td className="py-3 px-2 text-white">
                                #{transaction.invoice_id?.slice(-8) || 'N/A'}
                              </td>
                              <td className="py-3 px-2 text-gray-300">{formatDate(transaction.created_at)}</td>
                              <td className="py-3 px-2 text-white">{transaction.description || 'Subscription Payment'}</td>
                              <td className="py-3 px-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.status === 'succeeded'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {transaction.status === 'succeeded' ? 'Paid' : 'Pending'}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right font-medium text-white">
                                {formatAmount(transaction.amount)}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <button
                                  onClick={() => transaction.invoice_id && handleDownloadInvoice(transaction.invoice_id)}
                                  className="inline-flex items-center px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No invoices available yet</p>
                    <p className="text-gray-400 text-sm mt-2">Invoices will appear here after your first payment</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'refunds' && (
              <div className="space-y-6">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <RotateCcw className="h-5 w-5 mr-2 text-electric-500" />
                    Refund Management
                  </h2>
                  <p className="text-gray-400 mb-6">
                    Manage your refunds and process refund requests. You can request refunds for eligible transactions.
                  </p>
                  
                  <RefundManager />
                </div>

                {/* Refund History */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">Refund History</h2>
                  
                  {billingData?.transactions && billingData.transactions.filter(t => t.type === 'refund').length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="text-left py-3 px-2 text-gray-400 font-medium">Date</th>
                            <th className="text-left py-3 px-2 text-gray-400 font-medium">Transaction</th>
                            <th className="text-left py-3 px-2 text-gray-400 font-medium">Reason</th>
                            <th className="text-left py-3 px-2 text-gray-400 font-medium">Status</th>
                            <th className="text-right py-3 px-2 text-gray-400 font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {billingData.transactions
                            .filter(t => t.type === 'refund')
                            .map((refund) => (
                              <tr key={refund.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                <td className="py-3 px-2 text-gray-300">{formatDate(refund.created_at)}</td>
                                <td className="py-3 px-2 text-white">{refund.description || 'Refund'}</td>
                                <td className="py-3 px-2 text-gray-300">{refund.metadata?.reason || 'Not specified'}</td>
                                <td className="py-3 px-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    refund.status === 'succeeded'
                                      ? 'bg-green-500/20 text-green-400'
                                      : refund.status === 'failed'
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {refund.status}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-right font-medium text-green-400">
                                  +{formatAmount(refund.amount)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <RotateCcw className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">No refunds yet</p>
                      <p className="text-gray-400 text-sm mt-2">Refunds will appear here when processed</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'methods' && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Payment Methods</h2>
                  <button
                    onClick={() => setShowAddPaymentMethod(true)}
                    className="py-2 px-4 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </button>
                </div>

                {billingData?.paymentMethods && billingData.paymentMethods.length > 0 ? (
                  <div className="grid gap-4">
                    {billingData.paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-8 bg-gray-600 rounded flex items-center justify-center">
                            {method.type === 'card' ? (
                              <CreditCard className="h-5 w-5 text-gray-400" />
                            ) : (
                              <span className="text-xs text-gray-400">PP</span>
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {method.brand ? `${method.brand} •••• ${method.last4}` : 'Payment Method'}
                            </p>
                            {method.exp_month && method.exp_year && (
                              <p className="text-gray-400 text-sm">
                                Expires {method.exp_month}/{method.exp_year}
                              </p>
                            )}
                          </div>
                          {method.is_default && (
                            <span className="px-2 py-1 bg-electric-500/20 text-electric-400 text-xs rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {!method.is_default && (
                            <button
                              onClick={() => handleSetDefaultPaymentMethod(method.id)}
                              disabled={processingAction === `default-${method.id}`}
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              {processingAction === `default-${method.id}` ? (
                                <Loader className="h-4 w-4 animate-spin" />
                              ) : (
                                'Set Default'
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleRemovePaymentMethod(method.id)}
                            disabled={processingAction === `remove-${method.id}`}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            {processingAction === `remove-${method.id}` ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No payment methods on file</p>
                    <button
                      onClick={() => setShowAddPaymentMethod(true)}
                      className="inline-flex items-center px-4 py-2 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Payment Method
                    </button>
                  </div>
                )}

                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-400 font-medium">Your payment information is secure</p>
                      <p className="text-gray-400 text-sm mt-1">
                        We use industry-standard encryption and never store your full card details. 
                        All payments are processed securely through Stripe and PayPal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modals */}
          <AddPaymentMethodModal
            isOpen={showAddPaymentMethod}
            onClose={() => setShowAddPaymentMethod(false)}
            onSuccess={() => {
              setSuccess('Payment method added successfully');
              loadBillingData();
            }}
            userId={user.id}
          />

          <CancelSubscriptionModal
            isOpen={showCancelModal}
            onClose={() => setShowCancelModal(false)}
            onConfirm={handleCancelSubscription}
          />

          <PlanUpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            currentPlanId={billingData?.subscription?.membership_plan_id}
            currentSubscription={billingData?.subscription}
            userId={user.id}
            onSuccess={() => {
              setSuccess('Subscription plan updated successfully!');
              setShowUpgradeModal(false);
              loadBillingData();
            }}
          />
        </div>
      </div>
  );

  // Only wrap with Elements if Stripe is configured
  return stripePromise ? (
    <Elements stripe={stripePromise}>
      {content}
    </Elements>
  ) : content;
} 