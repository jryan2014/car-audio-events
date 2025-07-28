import { loadStripe, Stripe } from '@stripe/stripe-js';
import { getStripeConfig } from '../services/paymentConfigService';
import { validatePaymentAmount, validatePaymentMetadata } from '../utils/paymentValidation';
import { addCSRFHeader } from '../utils/csrfProtection';

// Global Stripe instance - will be initialized on first use
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Initialize Stripe with configuration from database or environment
 */
const initializeStripe = async (): Promise<Stripe | null> => {
  try {
    const stripeConfig = await getStripeConfig();
    
    if (!stripeConfig.publishableKey) {
      console.warn('No Stripe publishable key found - payment functionality will be limited');
      return null;
    }
    
    console.log(`Initializing Stripe - Mode: ${stripeConfig.isTestMode ? 'Test' : 'Live'}, Source: ${stripeConfig.source}`);
    
    return await loadStripe(stripeConfig.publishableKey);
  } catch (error) {
    console.error('Error initializing Stripe:', error);
    return null;
  }
};

/**
 * Get Stripe instance with dynamic configuration
 */
export const getStripe = async (): Promise<Stripe | null> => {
  if (!stripePromise) {
    stripePromise = initializeStripe();
  }
  return stripePromise;
};

/**
 * Legacy export for backward compatibility
 * @deprecated Use getStripe() instead for dynamic configuration
 */
export const stripePromiseCompat = getStripe();

/**
 * Create a payment intent using current configuration
 */
export const createPaymentIntent = async (amount: number, currency: string = 'usd', metadata: any = {}) => {
  try {
    // Validate and sanitize payment amount
    const amountValidation = validatePaymentAmount(amount, currency);
    if (!amountValidation.valid) {
      throw new Error(amountValidation.errors.join(', '));
    }

    // Validate and sanitize metadata
    const metadataValidation = validatePaymentMetadata(metadata);
    if (!metadataValidation.valid) {
      throw new Error('Invalid metadata: ' + metadataValidation.errors.join(', '));
    }

    // Import supabase client to get authenticated session
    const { supabase } = await import('./supabase');
    
    // Get authenticated session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required for payment processing');
    }
    
    // Get Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      throw new Error('Missing Supabase URL for payment processing');
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
      method: 'POST',
      headers: addCSRFHeader({
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        amount: amountValidation.sanitizedAmount,
        currency: amountValidation.sanitizedCurrency,
        metadata: metadataValidation.sanitized
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create payment intent');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Confirm a payment using current configuration
 */
export const confirmPayment = async (paymentIntentId: string) => {
  try {
    // Import supabase client to get authenticated session
    const { supabase } = await import('./supabase');
    
    // Get authenticated session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required for payment confirmation');
    }
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      throw new Error('Missing Supabase URL for payment confirmation');
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/confirm-payment`, {
      method: 'POST',
      headers: addCSRFHeader({
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        payment_intent_id: paymentIntentId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to confirm payment');
    }

    return await response.json();
  } catch (error) {
    console.error('Error confirming payment:', error);
    throw error;
  }
};

/**
 * Force re-initialization of Stripe (useful when configuration changes)
 */
export const reinitializeStripe = async (): Promise<Stripe | null> => {
  stripePromise = null;
  return await getStripe();
};

/**
 * Check if Stripe is properly configured
 */
export const isStripeConfigured = async (): Promise<boolean> => {
  try {
    const stripe = await getStripe();
    return stripe !== null;
  } catch (error) {
    return false;
  }
};