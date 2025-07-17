import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentElement,
  ExpressCheckoutElement
} from '@stripe/react-stripe-js';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { TestTube } from 'lucide-react';
import { getPaymentConfig, getStripeConfig } from '../services/paymentConfigService';

interface PaymentFormProps {
  amount: number;
  planName: string;
  description?: string;
  metadata?: Record<string, any>;
  onSuccess: (paymentIntentId: string, userInfo?: any) => void;
  onError: (error: string) => void;
}

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

interface PaymentFormContentProps extends PaymentFormProps {
  currentUser: User | null;
}

const PaymentFormContent: React.FC<PaymentFormContentProps> = ({ 
  amount, 
  planName, 
  description,
  metadata,
  onSuccess, 
  onError, 
  currentUser 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [expressCheckoutReady, setExpressCheckoutReady] = useState(false);
  const [showTraditionalForm, setShowTraditionalForm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [paymentConfig, setPaymentConfig] = useState<{ mode: 'test' | 'live'; stripe_active: boolean } | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    firstName: currentUser?.user_metadata?.first_name || '',
    lastName: currentUser?.user_metadata?.last_name || '',
    email: currentUser?.email || '',
    phone: currentUser?.user_metadata?.phone || '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });

  // Load payment configuration to detect test mode
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getPaymentConfig();
        setPaymentConfig(config);
      } catch (error) {
        console.error('Error loading payment config:', error);
      }
    };
    
    loadConfig();
  }, []);

  // Handle Express Checkout (Apple Pay, Google Pay, etc.)
  const handleExpressCheckout = async (event: any) => {
    if (!stripe || !elements) {
      onError('Stripe not initialized');
      return;
    }

    try {
      setLoading(true);

      // Extract user info from express payment method if available
      const expressUserInfo = {
        firstName: event.billingDetails?.name?.split(' ')[0] || '',
        lastName: event.billingDetails?.name?.split(' ').slice(1).join(' ') || '',
        email: event.billingDetails?.email || '',
        phone: event.billingDetails?.phone || '',
        address: {
          line1: event.billingDetails?.address?.line1 || '',
          line2: event.billingDetails?.address?.line2 || '',
          city: event.billingDetails?.address?.city || '',
          state: event.billingDetails?.address?.state || '',
          postal_code: event.billingDetails?.address?.postal_code || '',
          country: event.billingDetails?.address?.country || 'US'
        }
      };

      // Create payment intent
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert to cents
          currency: 'usd',
          description: description || `Payment for ${planName}`,
          metadata: {
            plan_name: planName,
            user_id: currentUser?.id || 'anonymous',
            user_email: expressUserInfo.email,
            user_name: `${expressUserInfo.firstName} ${expressUserInfo.lastName}`,
            user_phone: expressUserInfo.phone,
            billing_address: JSON.stringify(expressUserInfo.address),
            payment_method: event.expressPaymentType,
            ...metadata
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { client_secret: clientSecret } = await response.json();

      // Confirm the payment
      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.origin + '/payment-success',
        },
        redirect: 'if_required'
      });

      if (result.error) {
        onError(result.error.message || 'Payment failed');
      } else {
        onSuccess(result.paymentIntent.id, expressUserInfo);
      }
    } catch (error) {
      console.error('Express checkout error:', error);
      onError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle traditional form submission
  const handleTraditionalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      onError('Stripe not initialized');
      return;
    }

    // Validate form
    const errors: Record<string, string> = {};
    if (!userInfo.firstName.trim()) errors.firstName = 'First name is required';
    if (!userInfo.lastName.trim()) errors.lastName = 'Last name is required';
    if (!userInfo.email.trim()) errors.email = 'Email is required';
    if (!userInfo.address.line1.trim()) errors.addressLine1 = 'Address is required';
    if (!userInfo.address.city.trim()) errors.city = 'City is required';
    if (!userInfo.address.state.trim()) errors.state = 'State is required';
    if (!userInfo.address.postal_code.trim()) errors.postalCode = 'Postal code is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setLoading(true);
      setFormErrors({});

      // Submit form data to Elements
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message || 'Form validation failed');
        return;
      }

      // Create payment intent
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert to cents
          currency: 'usd',
          description: description || `Payment for ${planName}`,
          metadata: {
            plan_name: planName,
            user_id: currentUser?.id || 'anonymous',
            user_email: userInfo.email,
            user_name: `${userInfo.firstName} ${userInfo.lastName}`,
            user_phone: userInfo.phone,
            billing_address: JSON.stringify(userInfo.address),
            payment_method: 'card',
            ...metadata
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { client_secret: clientSecret } = await response.json();

      // Confirm the payment
      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.origin + '/payment-success',
          payment_method_data: {
            billing_details: {
              name: `${userInfo.firstName} ${userInfo.lastName}`,
              email: userInfo.email,
              phone: userInfo.phone,
              address: {
                line1: userInfo.address.line1,
                line2: userInfo.address.line2,
                city: userInfo.address.city,
                state: userInfo.address.state,
                postal_code: userInfo.address.postal_code,
                country: userInfo.address.country
              }
            }
          }
        },
        redirect: 'if_required'
      });

      if (result.error) {
        onError(result.error.message || 'Payment failed');
      } else {
        onSuccess(result.paymentIntent.id, userInfo);
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const updateUserInfo = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setUserInfo(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setUserInfo(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-t-2xl px-8 py-8 text-white">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">Complete Your Payment</h2>
            <div className="text-4xl font-extrabold mb-2">${amount.toFixed(2)}</div>
            <p className="text-blue-100 text-lg">{description || planName}</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-b-2xl border border-gray-700 p-8">
          {/* Test Mode Indicator */}
          {paymentConfig && paymentConfig.mode === 'test' && (
            <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <TestTube className="h-5 w-5 text-yellow-400" />
                <span className="text-yellow-300 text-lg font-semibold">Test Mode Active</span>
              </div>
              <p className="text-yellow-200 text-sm mt-2">
                This is a test payment. No real money will be charged.
              </p>
            </div>
          )}

          {/* Payment Methods */}
          <div className="mb-8">
            <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
              <PaymentElement 
                options={{ 
                  layout: 'tabs',
                  paymentMethodOrder: ['link', 'card'],
                  defaultValues: {
                    billingDetails: {
                      name: `${userInfo.firstName} ${userInfo.lastName}`.trim(),
                      email: userInfo.email,
                      phone: userInfo.phone,
                      address: {
                        line1: userInfo.address.line1,
                        line2: userInfo.address.line2,
                        city: userInfo.address.city,
                        state: userInfo.address.state,
                        postal_code: userInfo.address.postal_code,
                        country: userInfo.address.country,
                      }
                    }
                  }
                }} 
              />
            </div>
          </div>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-800 text-gray-400">or</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleTraditionalSubmit} className="space-y-8">
            {/* Personal Information */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">1</span>
                Personal Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                  <input
                    type="text"
                    value={userInfo.firstName}
                    onChange={(e) => updateUserInfo('firstName', e.target.value)}
                    className={`w-full px-4 py-3 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 ${
                      formErrors.firstName ? 'border-red-500' : 'border-gray-600'
                    }`}
                    disabled={loading}
                    placeholder="First Name"
                  />
                  {formErrors.firstName && (
                    <p className="text-red-400 text-sm mt-1">{formErrors.firstName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={userInfo.lastName}
                    onChange={(e) => updateUserInfo('lastName', e.target.value)}
                    className={`w-full px-4 py-3 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 ${
                      formErrors.lastName ? 'border-red-500' : 'border-gray-600'
                    }`}
                    disabled={loading}
                    placeholder="Last Name"
                  />
                  {formErrors.lastName && (
                    <p className="text-red-400 text-sm mt-1">{formErrors.lastName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={userInfo.email}
                    onChange={(e) => updateUserInfo('email', e.target.value)}
                    className={`w-full px-4 py-3 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 ${
                      formErrors.email ? 'border-red-500' : 'border-gray-600'
                    }`}
                    disabled={loading}
                    placeholder="Email Address"
                  />
                  {formErrors.email && (
                    <p className="text-red-400 text-sm mt-1">{formErrors.email}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={userInfo.phone}
                    onChange={(e) => updateUserInfo('phone', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                    disabled={loading}
                    placeholder="Phone Number"
                  />
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">2</span>
                Billing Address
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Street Address *</label>
                    <input
                      type="text"
                      value={userInfo.address.line1}
                      onChange={(e) => updateUserInfo('address.line1', e.target.value)}
                      className={`w-full px-4 py-3 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 ${
                        formErrors.addressLine1 ? 'border-red-500' : 'border-gray-600'
                      }`}
                      disabled={loading}
                      placeholder="Street Address"
                    />
                    {formErrors.addressLine1 && (
                      <p className="text-red-400 text-sm mt-1">{formErrors.addressLine1}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Apartment</label>
                    <input
                      type="text"
                      value={userInfo.address.line2}
                      onChange={(e) => updateUserInfo('address.line2', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                      disabled={loading}
                      placeholder="Apt, Suite, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">City *</label>
                    <input
                      type="text"
                      value={userInfo.address.city}
                      onChange={(e) => updateUserInfo('address.city', e.target.value)}
                      className={`w-full px-4 py-3 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 ${
                        formErrors.city ? 'border-red-500' : 'border-gray-600'
                      }`}
                      disabled={loading}
                      placeholder="City"
                    />
                    {formErrors.city && (
                      <p className="text-red-400 text-sm mt-1">{formErrors.city}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">State *</label>
                    <input
                      type="text"
                      value={userInfo.address.state}
                      onChange={(e) => updateUserInfo('address.state', e.target.value)}
                      className={`w-full px-4 py-3 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 ${
                        formErrors.state ? 'border-red-500' : 'border-gray-600'
                      }`}
                      disabled={loading}
                      placeholder="State"
                    />
                    {formErrors.state && (
                      <p className="text-red-400 text-sm mt-1">{formErrors.state}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">ZIP *</label>
                    <input
                      type="text"
                      value={userInfo.address.postal_code}
                      onChange={(e) => updateUserInfo('address.postal_code', e.target.value)}
                      className={`w-full px-4 py-3 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 ${
                        formErrors.postalCode ? 'border-red-500' : 'border-gray-600'
                      }`}
                      disabled={loading}
                      placeholder="ZIP"
                    />
                    {formErrors.postalCode && (
                      <p className="text-red-400 text-sm mt-1">{formErrors.postalCode}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                    <select
                      value={userInfo.address.country}
                      onChange={(e) => updateUserInfo('address.country', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                      disabled={loading}
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Express Checkout */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 text-center">🚀 Express Checkout</h3>
              <div className="max-w-md mx-auto">
                <ExpressCheckoutElement
                  onConfirm={handleExpressCheckout}
                  onReady={() => setExpressCheckoutReady(true)}
                  options={{
                    buttonType: { applePay: 'buy', googlePay: 'buy' },
                    layout: { maxColumns: 1, maxRows: 1 }
                  }}
                />
                {!expressCheckoutReady && (
                  <div className="text-center text-gray-400 py-4">
                    <div className="animate-pulse">Loading express payment options...</div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !stripe || !elements}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-700 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-800 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  <span>Processing Payment...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span className="mr-2">🔒</span>
                  <span>Pay ${amount.toFixed(2)} Securely</span>
                </div>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="text-center mt-6">
            <div className="inline-flex items-center px-4 py-2 bg-green-900 border border-green-700 rounded-lg">
              <div className="flex items-center text-green-300">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Secured by Stripe</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Your payment information is encrypted and secure. We never store your card details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const stripeConfig = await getStripeConfig();
        const stripe = loadStripe(stripeConfig.publishableKey);
        setStripePromise(stripe);
        console.log(`Stripe initialized - Mode: ${stripeConfig.isTestMode ? 'Test' : 'Live'}, Source: ${stripeConfig.source}`);
      } catch (error) {
        console.error('Failed to initialize Stripe:', error);
        // Fallback to environment variable
        const fallbackKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (fallbackKey) {
          const fallbackStripe = loadStripe(fallbackKey);
          setStripePromise(fallbackStripe);
        } else {
          console.warn('No Stripe publishable key available');
          setStripePromise(null);
        }
      }
    };

    initializeStripe();
  }, []);

  if (!stripePromise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing secure payment...</p>
        </div>
      </div>
    );
  }

  // Elements options for deferred payment intent creation  
  const elementsOptions = {
    mode: 'payment' as const,
    amount: props.amount * 100, // Convert to cents
    currency: 'usd',
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '6px'
      }
    },
    paymentMethodTypes: ['link', 'card']
  };

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <PaymentFormContent {...props} currentUser={currentUser} />
    </Elements>
  );
};

export default PaymentForm;