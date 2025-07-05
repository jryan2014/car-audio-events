import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Lock, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { PaymentProvider, createPaymentIntent, confirmStripePayment, loadPayPalSDK, getAvailableProviders } from '../lib/payments';
import { CreditCardLogos } from './CreditCardLogos';
import { getStripe } from '../lib/stripe';

interface MultiProviderPaymentFormProps {
  amount: number;
  description: string;
  onSuccess: (paymentId: string, provider: PaymentProvider) => void;
  onError: (error: string) => void;
  metadata?: any;
  allowedProviders?: PaymentProvider[];
}

export default function MultiProviderPaymentForm({ 
  amount, 
  description, 
  onSuccess, 
  onError, 
  metadata = {},
  allowedProviders = ['stripe', 'paypal']
}: MultiProviderPaymentFormProps) {
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('stripe');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  
  // Stripe specific state
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);
  const [cardElement, setCardElement] = useState<any>(null);
  
  // PayPal specific state
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const paypalRef = useRef<HTMLDivElement>(null);

  // Initialize Stripe
  useEffect(() => {
    if (selectedProvider === 'stripe' && allowedProviders.includes('stripe')) {
      const initializeStripe = async () => {
        try {
          const stripeInstance = await getStripe();
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
            
            // Mount card element when container is ready
            setTimeout(() => {
              const container = document.getElementById('stripe-card-element');
              if (container && cardElementInstance) {
                cardElementInstance.mount('#stripe-card-element');
              }
            }, 100);
          }
        } catch (error) {
          console.error('Error initializing Stripe:', error);
          setError('Failed to initialize Stripe. Please try again.');
        }
      };

      initializeStripe();
    }
  }, [selectedProvider, allowedProviders]);

  // Initialize PayPal
  useEffect(() => {
    if (selectedProvider === 'paypal' && allowedProviders.includes('paypal')) {
      const initializePayPal = async () => {
        try {
          await loadPayPalSDK();
          setPaypalLoaded(true);
        } catch (error) {
          console.error('Error loading PayPal SDK:', error);
          setError('Failed to load PayPal. Please try again.');
        }
      };

      initializePayPal();
    }
  }, [selectedProvider, allowedProviders]);

  // Create payment intent when provider or amount changes
  useEffect(() => {
    if (amount > 0) {
      createIntent();
    }
  }, [selectedProvider, amount]);

  const createIntent = async () => {
    try {
      setError(null);
      const intent = await createPaymentIntent(selectedProvider, amount, 'USD', metadata);
      setPaymentIntent(intent);
      
      // Render PayPal buttons if PayPal is selected
      if (selectedProvider === 'paypal' && paypalLoaded && paypalRef.current) {
        renderPayPalButtons(intent);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to initialize payment');
    }
  };

  const renderPayPalButtons = (intent: any) => {
    if (!paypalRef.current || !(window as any).paypal) return;

    // Clear existing buttons
    paypalRef.current.innerHTML = '';

    (window as any).paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'paypal',
        height: 45
      },
      createOrder: () => {
        return intent.id;
      },
      onApprove: async (data: any) => {
        setIsLoading(true);
        try {
          // The order is automatically captured by our Edge Function
          onSuccess(data.orderID, 'paypal');
        } catch (error) {
          setError('PayPal payment confirmation failed');
        } finally {
          setIsLoading(false);
        }
      },
      onError: (err: any) => {
        console.error('PayPal error:', err);
        setError('PayPal payment failed. Please try again.');
      },
      onCancel: () => {
        setError('PayPal payment was cancelled');
      }
    }).render(paypalRef.current);
  };

  const handleStripeSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements || !cardElement || !paymentIntent) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const paymentResult = await confirmStripePayment(paymentIntent.client_secret, {
        card: cardElement,
      });

      if (paymentResult.status === 'succeeded') {
        onSuccess(paymentResult.id, 'stripe');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Lock className="h-5 w-5 text-electric-500" />
        <h3 className="text-xl font-bold text-white">Secure Payment</h3>
      </div>

      {/* Payment Summary */}
      <div className="mb-6">
        <div className="bg-gray-700/30 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">{description}</span>
            <span className="text-white font-bold">{formatAmount(amount)}</span>
          </div>
          <div className="text-sm text-gray-400">
            30-day refund policy applies
          </div>
        </div>
      </div>

      {/* Provider Selection */}
      {allowedProviders.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Choose Payment Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            {allowedProviders.includes('stripe') && (
              <button
                type="button"
                onClick={() => setSelectedProvider('stripe')}
                className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                  selectedProvider === 'stripe'
                    ? 'border-electric-500 bg-electric-500/10'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <CreditCard className="h-5 w-5 text-white" />
                  <span className="text-white font-medium">Credit Card</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">via Stripe</div>
              </button>
            )}
            
            {allowedProviders.includes('paypal') && (
              <button
                type="button"
                onClick={() => setSelectedProvider('paypal')}
                className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                  selectedProvider === 'paypal'
                    ? 'border-electric-500 bg-electric-500/10'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">P</span>
                  </div>
                  <span className="text-white font-medium">PayPal</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">PayPal & Cards</div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-6">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* Stripe Payment Form */}
      {selectedProvider === 'stripe' && (
        <form onSubmit={handleStripeSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Card Information
            </label>
            <div className="relative">
              <div 
                id="stripe-card-element"
                className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg focus-within:border-electric-500 transition-colors min-h-[48px]"
              />
              <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={!stripe || isLoading || !paymentIntent}
            className="w-full bg-electric-500 text-white py-3 px-4 rounded-lg font-bold hover:bg-electric-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin h-5 w-5" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Lock className="h-5 w-5" />
                <span>Pay {formatAmount(amount)}</span>
              </>
            )}
          </button>

          {/* Credit Card Logos */}
          <CreditCardLogos size="md" showText={false} className="justify-center" />
        </form>
      )}

      {/* PayPal Payment */}
      {selectedProvider === 'paypal' && (
        <div className="space-y-6">
          {paypalLoaded && paymentIntent ? (
            <div ref={paypalRef} className="min-h-[120px]" />
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin h-8 w-8 text-electric-500" />
              <span className="ml-3 text-gray-300">Loading PayPal...</span>
            </div>
          )}
        </div>
      )}

      {/* Security Features */}
      <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 mt-6">
        <div className="flex items-center space-x-1">
          <Lock className="h-3 w-3" />
          <span>SSL Encrypted</span>
        </div>
        <div className="flex items-center space-x-1">
          <CheckCircle className="h-3 w-3" />
          <span>PCI Compliant</span>
        </div>
        <div className="flex items-center space-x-1">
          <CheckCircle className="h-3 w-3" />
          <span>30-Day Refunds</span>
        </div>
      </div>
    </div>
  );
} 