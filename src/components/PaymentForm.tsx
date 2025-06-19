import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CreditCard, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { createPaymentIntent } from '../lib/stripe';
import { CreditCardLogos } from './CreditCardLogos';

interface PaymentFormProps {
  amount: number;
  description: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  metadata?: any;
}

export default function PaymentForm({ amount, description, onSuccess, onError, metadata = {} }: PaymentFormProps) {
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);
  const [cardElement, setCardElement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    const initializeStripe = async () => {
      const stripeInstance = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
      setStripe(stripeInstance);

      if (stripeInstance) {
        const elementsInstance = stripeInstance.elements({
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#0ea5e9',
              colorBackground: '#1f2937',
              colorText: '#ffffff',
              colorDanger: '#ef4444',
              fontFamily: 'Inter, system-ui, sans-serif',
              spacingUnit: '4px',
              borderRadius: '8px',
            },
          },
        });
        setElements(elementsInstance);

        const cardElementInstance = elementsInstance.create('card', {
          style: {
            base: {
              fontSize: '16px',
              color: '#ffffff',
              '::placeholder': {
                color: '#9ca3af',
              },
            },
          },
        });
        setCardElement(cardElementInstance);
        cardElementInstance.mount('#card-element');
      }
    };

    initializeStripe();
  }, []);

  useEffect(() => {
    const createIntent = async () => {
      try {
        const { client_secret } = await createPaymentIntent(amount * 100, 'usd', metadata);
        setClientSecret(client_secret);
      } catch (error) {
        setError('Failed to initialize payment. Please try again.');
      }
    };

    if (amount > 0) {
      createIntent();
    }
  }, [amount, metadata]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements || !cardElement || !clientSecret) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (stripeError) {
        setError(stripeError.message);
      } else if (paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
    } catch (error) {
      setError('Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Lock className="h-5 w-5 text-electric-500" />
        <h3 className="text-xl font-bold text-white">Secure Payment</h3>
      </div>

      <div className="mb-6">
        <div className="bg-gray-700/30 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">{description}</span>
            <span className="text-white font-bold">${amount.toFixed(2)}</span>
          </div>
          <div className="text-sm text-gray-400">
            Secure payment processed by Stripe
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Card Information
          </label>
          <div className="relative">
            <div 
              id="card-element"
              className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg focus-within:border-electric-500 transition-colors"
            />
            <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || isLoading}
          className="w-full bg-electric-500 text-white py-3 px-4 rounded-lg font-bold hover:bg-electric-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Lock className="h-5 w-5" />
              <span>Pay ${amount.toFixed(2)}</span>
            </>
          )}
        </button>

        {/* Credit Card Logos */}
        <CreditCardLogos size="md" showText={false} className="justify-center" />
        
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
          <div className="flex items-center space-x-1">
            <Lock className="h-3 w-3" />
            <span>SSL Encrypted</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-3 w-3" />
            <span>PCI Compliant</span>
          </div>
        </div>
      </form>
    </div>
  );
}