import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { AlertCircle, Loader } from 'lucide-react';
import { billingService } from '../services/billingService';
import { useAuth } from '../contexts/AuthContext';

interface PayPalPaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  setAsDefault?: boolean;
}

// Button wrapper component that handles the loading state
const PayPalButtonWrapper: React.FC<PayPalPaymentFormProps> = ({ 
  onSuccess, 
  onCancel,
  setAsDefault = false
}) => {
  const [{ isPending }] = usePayPalScriptReducer();
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  const handleApprove = async (data: any, actions: any) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Get the payer ID from the approved order
      const payerId = data.payerID;
      
      // Save PayPal as a payment method
      await billingService.addPaymentMethod(
        user.id,
        payerId,
        'paypal',
        setAsDefault
      );

      onSuccess();
    } catch (err: any) {
      console.error('Error saving PayPal payment method:', err);
      setError(err.message || 'Failed to save PayPal payment method');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="h-8 w-8 text-electric-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {isProcessing ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="h-8 w-8 text-electric-500 animate-spin" />
          <span className="ml-3 text-gray-400">Processing...</span>
        </div>
      ) : (
        <div className="paypal-button-container">
          <PayPalButtons
            style={{
              layout: "vertical",
              color: "blue",
              shape: "rect",
              label: "paypal"
            }}
            createOrder={(data, actions) => {
              // For saving payment method, we don't create an order
              // We just need the user to authorize their PayPal account
              return Promise.resolve('VAULT');
            }}
            onApprove={handleApprove}
            onCancel={() => {
              setError('');
              onCancel();
            }}
            onError={(err) => {
              console.error('PayPal error:', err);
              setError('An error occurred with PayPal. Please try again.');
            }}
            // Enable vault flow for saving payment methods
            vault={true}
            intent="tokenize"
          />
        </div>
      )}

      <p className="text-sm text-gray-400 text-center">
        You'll be redirected to PayPal to authorize future payments
      </p>
    </div>
  );
};

export const PayPalPaymentForm: React.FC<PayPalPaymentFormProps> = (props) => {
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

  if (!paypalClientId) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-400">PayPal is not configured</p>
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalClientId,
        components: "buttons",
        intent: "tokenize",
        vault: true,
        currency: "USD"
      }}
    >
      <PayPalButtonWrapper {...props} />
    </PayPalScriptProvider>
  );
};