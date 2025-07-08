import { supabase } from './supabase';
import { getStripe } from './stripe';
import { getPayPalConfig, getPaymentConfig } from '../services/paymentConfigService';

// Payment provider types
export type PaymentProvider = 'stripe' | 'paypal';

export interface PaymentIntent {
  id: string;
  provider: PaymentProvider;
  client_secret?: string; // Stripe
  approval_url?: string;  // PayPal
  amount: number;
  currency: string;
  status: string;
}

export interface RefundRequest {
  payment_id: string;
  refund_amount: number;
  reason: string;
}

export interface RefundResponse {
  success: boolean;
  refund: {
    id: string;
    provider_refund_id?: string;
    amount: number;
    currency: string;
    status: string;
  };
  error?: string;
}

/**
 * Check if a payment provider is available and configured
 */
export const isProviderAvailable = async (provider: PaymentProvider): Promise<boolean> => {
  try {
    const config = await getPaymentConfig();
    
    if (provider === 'stripe') {
      return config.stripe_active;
    } else if (provider === 'paypal') {
      return config.paypal_active;
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking ${provider} availability:`, error);
    return false;
  }
};

/**
 * Get available payment providers based on configuration
 */
export const getAvailableProviders = async (): Promise<PaymentProvider[]> => {
  const providers: PaymentProvider[] = [];
  
  if (await isProviderAvailable('stripe')) {
    providers.push('stripe');
  }
  
  if (await isProviderAvailable('paypal')) {
    providers.push('paypal');
  }
  
  return providers;
};

/**
 * Create a payment intent for the specified provider
 */
export const createPaymentIntent = async (
  provider: PaymentProvider,
  amount: number,
  currency: string = 'USD',
  metadata: any = {}
): Promise<PaymentIntent> => {
  try {
    // Check if provider is available
    if (!(await isProviderAvailable(provider))) {
      throw new Error(`${provider} is not available or configured`);
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required for payment processing');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (provider === 'stripe') {
      const response = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert to cents
          currency: currency.toLowerCase(),
          metadata
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Stripe payment intent');
      }

      const data = await response.json();
      return {
        id: data.payment_intent_id,
        provider: 'stripe',
        client_secret: data.client_secret,
        amount,
        currency,
        status: 'pending'
      };

    } else if (provider === 'paypal') {
      const response = await fetch(`${supabaseUrl}/functions/v1/create-paypal-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: currency.toUpperCase(),
          metadata
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create PayPal payment');
      }

      const data = await response.json();
      return {
        id: data.order_id,
        provider: 'paypal',
        approval_url: data.approval_url,
        amount,
        currency,
        status: data.status
      };
    }

    throw new Error(`Unsupported payment provider: ${provider}`);
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Confirm a Stripe payment
 */
export const confirmStripePayment = async (
  clientSecret: string,
  paymentMethod: any
): Promise<any> => {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Stripe not initialized or not configured');
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: paymentMethod,
    });

    if (error) {
      throw new Error(error.message);
    }

    return paymentIntent;
  } catch (error) {
    console.error('Error confirming Stripe payment:', error);
    throw error;
  }
};

/**
 * Confirm a PayPal payment after user approval
 */
export const confirmPayPalPayment = async (orderId: string): Promise<any> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required for payment confirmation');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/confirm-paypal-payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: orderId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to confirm PayPal payment');
    }

    return await response.json();
  } catch (error) {
    console.error('Error confirming PayPal payment:', error);
    throw error;
  }
};

/**
 * Request a refund for a payment (30-day policy enforced)
 */
export const requestRefund = async (refundRequest: RefundRequest): Promise<RefundResponse> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required for refund processing');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/process-refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_id: refundRequest.payment_id,
        refund_amount: Math.round(refundRequest.refund_amount * 100), // Convert to cents
        reason: refundRequest.reason
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        refund: {
          id: '',
          amount: 0,
          currency: '',
          status: 'failed'
        },
        error: data.error || 'Failed to process refund'
      };
    }

    return data;
  } catch (error) {
    console.error('Error requesting refund:', error);
    return {
      success: false,
      refund: {
        id: '',
        amount: 0,
        currency: '',
        status: 'failed'
      },
      error: error instanceof Error ? error.message : 'Failed to process refund'
    };
  }
};

/**
 * Get user's payment history with refund eligibility
 */
export const getUserPayments = async () => {
  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        refunds (
          id,
          amount,
          status,
          reason,
          requested_at,
          processed_at
        )
      `)
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Add refund eligibility status
    const paymentsWithEligibility = payments?.map(payment => ({
      ...payment,
      refund_eligible: checkRefundEligibility(payment.created_at),
      refund_deadline: new Date(new Date(payment.created_at).getTime() + 30 * 24 * 60 * 60 * 1000)
    }));

    return paymentsWithEligibility || [];
  } catch (error) {
    console.error('Error fetching user payments:', error);
    throw error;
  }
};

/**
 * Check if a payment is eligible for refund (30-day policy)
 */
export const checkRefundEligibility = (paymentDate: string): boolean => {
  const paymentTime = new Date(paymentDate).getTime();
  const currentTime = new Date().getTime();
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  
  return (currentTime - paymentTime) <= thirtyDaysInMs;
};

/**
 * Load PayPal SDK dynamically
 */
export const loadPayPalSDK = async (): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    if ((window as any).paypal) {
      resolve((window as any).paypal);
      return;
    }

    try {
      const paypalConfig = await getPayPalConfig();
      if (!paypalConfig || !paypalConfig.clientId) {
        reject(new Error('PayPal client ID not configured'));
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${paypalConfig.clientId}&currency=USD&intent=capture&enable-funding=venmo,paylater`;
      script.onload = () => {
        resolve((window as any).paypal);
      };
      script.onerror = () => {
        reject(new Error('Failed to load PayPal SDK'));
      };
      document.head.appendChild(script);
    } catch (error) {
      reject(new Error('Failed to get PayPal configuration'));
    }
  });
}; 