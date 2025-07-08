import React, { useState } from 'react';
import { AlertCircle, RefreshCw, CreditCard, Loader } from 'lucide-react';
import { billingService } from '../services/billingService';
import { Transaction } from '../services/billingService';

interface FailedPaymentRetryProps {
  transaction: Transaction;
  userId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export const FailedPaymentRetry: React.FC<FailedPaymentRetryProps> = ({
  transaction,
  userId,
  onSuccess,
  onError
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showPaymentMethodSelector, setShowPaymentMethodSelector] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const handleRetryPayment = async () => {
    setIsRetrying(true);
    
    try {
      // Get payment methods if not already loaded
      if (paymentMethods.length === 0) {
        const billingData = await billingService.getUserBillingOverview(userId);
        setPaymentMethods(billingData.paymentMethods || []);
        
        if (billingData.paymentMethods && billingData.paymentMethods.length > 0) {
          setShowPaymentMethodSelector(true);
          setIsRetrying(false);
          return;
        }
      }

      // Retry the payment
      const result = await billingService.retryFailedPayment(
        transaction.id,
        userId,
        selectedPaymentMethodId || undefined
      );

      if (result.success) {
        onSuccess();
      } else {
        throw new Error(result.message || 'Payment retry failed');
      }
    } catch (error: any) {
      onError(error.message || 'Failed to retry payment');
    } finally {
      setIsRetrying(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: transaction.currency || 'USD'
    }).format(amount);
  };

  if (showPaymentMethodSelector && paymentMethods.length > 0) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div className="flex items-start space-x-3 mb-4">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-white font-medium">Payment Failed - {formatAmount(transaction.amount)}</p>
            <p className="text-gray-400 text-sm mt-1">Select a payment method to retry</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {paymentMethods.map((method) => (
            <label
              key={method.id}
              className="flex items-center p-3 bg-gray-700/30 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors"
            >
              <input
                type="radio"
                name="payment-method"
                value={method.id}
                checked={selectedPaymentMethodId === method.id}
                onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                className="mr-3"
              />
              <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-white">
                {method.brand} •••• {method.last4}
              </span>
              {method.is_default && (
                <span className="ml-2 text-xs text-electric-400">Default</span>
              )}
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowPaymentMethodSelector(false)}
            className="flex-1 py-2 px-4 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRetryPayment}
            disabled={!selectedPaymentMethodId || isRetrying}
            className="flex-1 py-2 px-4 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isRetrying ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Payment
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-medium">Payment Failed</p>
            <p className="text-gray-400 text-sm mt-1">
              {transaction.description || 'Subscription payment'} - {formatAmount(transaction.amount)}
            </p>
            {transaction.metadata?.failure_reason && (
              <p className="text-red-400 text-sm mt-1">
                Reason: {transaction.metadata.failure_reason}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleRetryPayment}
          disabled={isRetrying}
          className="ml-4 px-4 py-2 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isRetrying ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </>
          )}
        </button>
      </div>
    </div>
  );
}; 