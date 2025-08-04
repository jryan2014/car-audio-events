import React, { useState, useEffect } from 'react';
import { Stripe, StripeElements } from '@stripe/stripe-js';
import {
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { CreditCard, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { billingService } from '../services/billingService';

interface PaymentMethodFormProps {
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  setAsDefault?: boolean;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#ffffff',
      '::placeholder': {
        color: '#9CA3AF',
      },
      backgroundColor: '#1F2937',
      padding: '12px',
    },
    invalid: {
      color: '#EF4444',
      iconColor: '#EF4444',
    },
  },
  hidePostalCode: false,
};

function PaymentMethodFormContent({ userId, onSuccess, onCancel, setAsDefault }: PaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create payment method with Stripe
      const { error: createError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)!,
      });

      if (createError) {
        throw new Error(createError.message);
      }

      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }

      // Attach payment method to user via our edge function
      const { error: attachError } = await billingService.addPaymentMethod(
        userId,
        paymentMethod.id,
        'card',
        setAsDefault
      );

      if (attachError) {
        throw attachError;
      }

      setSucceeded(true);
      onSuccess?.();
    } catch (err: any) {
      console.error('Payment method error:', err);
      setError(err.message || 'Failed to add payment method');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Card Information
        </label>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      {/* Security Badge */}
      <div className="flex items-center space-x-2 text-sm text-gray-400">
        <Shield className="h-4 w-4 text-green-500" />
        <span>Your card details are encrypted and secure</span>
      </div>

      {/* PCI Compliance Notice */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-electric-500 mt-0.5" />
          <div className="text-sm">
            <p className="text-gray-300 font-medium">Enterprise-Grade Security</p>
            <p className="text-gray-400 mt-1">
              Card details are processed directly by Stripe, a PCI Level 1 certified payment processor. 
              Your sensitive payment information never touches our servers.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing || succeeded}
          className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          {processing ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              <span>Add Card</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function PaymentMethodForm(props: PaymentMethodFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Stripe setup for adding payment methods
    const initializeStripe = async () => {
      try {
        // Create a SetupIntent to securely collect payment details
        const { data, error } = await supabase.functions.invoke('create-setup-intent', {
          body: {
            userId: props.userId
          }
        });

        if (error) throw error;
        
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error('Failed to initialize payment setup:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeStripe();
  }, [props.userId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  // UserBilling already wraps the entire page in Elements, so we don't need to wrap again
  return <PaymentMethodFormContent {...props} />;
}