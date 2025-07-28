import { supabase } from '../lib/supabase';

/**
 * Secure Payment Configuration Service
 * 
 * SECURITY PRINCIPLES:
 * 1. Never store secret keys in the database
 * 2. Only return public keys to the frontend
 * 3. Secret keys only exist in environment variables on the server
 * 4. All secret operations happen in Edge Functions
 */

interface PublicPaymentConfig {
  mode: 'test' | 'live';
  stripe_active: boolean;
  paypal_active: boolean;
  stripe_test_publishable_key: string;
  stripe_live_publishable_key: string;
  paypal_test_client_id: string;
  paypal_live_client_id: string;
  // NO SECRET KEYS HERE!
}

interface PublicStripeConfig {
  publishableKey: string;
  isTestMode: boolean;
  source: 'database' | 'environment' | 'fallback';
  // NO SECRET KEY OR WEBHOOK SECRET!
}

interface PublicPayPalConfig {
  clientId: string;
  environment: 'sandbox' | 'production';
  isTestMode: boolean;
  source: 'database' | 'environment' | 'fallback';
  // NO CLIENT SECRET!
}

/**
 * Get public payment configuration (safe for frontend)
 */
export const getPublicPaymentConfig = async (): Promise<PublicPaymentConfig> => {
  try {
    // Try to load from database first
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('category', 'payment')
      .in('key', [
        'mode',
        'stripe_active',
        'paypal_active',
        'stripe_test_publishable_key',
        'stripe_live_publishable_key',
        'paypal_test_client_id',
        'paypal_live_client_id'
      ]); // Only fetch PUBLIC keys

    if (error) {
      console.warn('Error loading payment config from database, falling back to environment variables:', error);
      return getEnvironmentFallbackConfig();
    }

    if (!data || data.length === 0) {
      console.log('No payment config found in database, using environment variables');
      return getEnvironmentFallbackConfig();
    }

    // Convert database settings to config object
    const config: PublicPaymentConfig = {
      mode: 'test',
      stripe_active: true,
      paypal_active: false,
      stripe_test_publishable_key: '',
      stripe_live_publishable_key: '',
      paypal_test_client_id: '',
      paypal_live_client_id: ''
    };

    // Map database values to config
    data.forEach(setting => {
      const key = setting.key as keyof PublicPaymentConfig;
      if (key === 'stripe_active' || key === 'paypal_active') {
        config[key] = setting.value === 'true';
      } else if (key === 'mode') {
        config[key] = setting.value as 'test' | 'live';
      } else if (key in config) {
        (config as any)[key] = setting.value || '';
      }
    });

    console.log(`Payment config loaded from database - Mode: ${config.mode}, Stripe: ${config.stripe_active ? 'Active' : 'Inactive'}`);
    return config;

  } catch (error) {
    console.error('Error getting payment config from database:', error);
    return getEnvironmentFallbackConfig();
  }
};

/**
 * Get public Stripe configuration (safe for frontend)
 */
export const getPublicStripeConfig = async (): Promise<PublicStripeConfig> => {
  try {
    const paymentConfig = await getPublicPaymentConfig();
    
    if (!paymentConfig.stripe_active) {
      throw new Error('Stripe is not active in payment configuration');
    }

    const isTestMode = paymentConfig.mode === 'test';
    
    // Get appropriate publishable key based on mode
    const publishableKey = isTestMode 
      ? paymentConfig.stripe_test_publishable_key 
      : paymentConfig.stripe_live_publishable_key;

    // Check if we have valid key from database
    if (publishableKey) {
      console.log(`Stripe config loaded from database - Mode: ${paymentConfig.mode}`);
      return {
        publishableKey,
        isTestMode,
        source: 'database'
      };
    }

    // Fallback to environment variables
    console.log('Stripe keys not found in database, using environment variables');
    return getEnvironmentStripeConfig();

  } catch (error) {
    console.error('Error getting Stripe config:', error);
    return getEnvironmentStripeConfig();
  }
};

/**
 * Get public PayPal configuration (safe for frontend)
 */
export const getPublicPayPalConfig = async (): Promise<PublicPayPalConfig> => {
  try {
    const paymentConfig = await getPublicPaymentConfig();
    
    if (!paymentConfig.paypal_active) {
      throw new Error('PayPal is not active in payment configuration');
    }

    const isTestMode = paymentConfig.mode === 'test';
    
    // Get appropriate client ID based on mode
    const clientId = isTestMode 
      ? paymentConfig.paypal_test_client_id 
      : paymentConfig.paypal_live_client_id;

    if (clientId) {
      console.log(`PayPal config loaded from database - Mode: ${paymentConfig.mode}`);
      return {
        clientId,
        environment: isTestMode ? 'sandbox' : 'production',
        isTestMode,
        source: 'database'
      };
    }

    // Fallback to environment variables
    console.log('PayPal client ID not found in database, using environment variables');
    return getEnvironmentPayPalConfig();

  } catch (error) {
    console.error('Error getting PayPal config:', error);
    return getEnvironmentPayPalConfig();
  }
};

/**
 * Fallback configuration using environment variables
 */
const getEnvironmentFallbackConfig = (): PublicPaymentConfig => {
  return {
    mode: 'test', // Default to test mode for safety
    stripe_active: true,
    paypal_active: false,
    stripe_test_publishable_key: import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || '',
    stripe_live_publishable_key: import.meta.env.VITE_STRIPE_LIVE_PUBLISHABLE_KEY || '',
    paypal_test_client_id: import.meta.env.VITE_PAYPAL_CLIENT_ID || '',
    paypal_live_client_id: import.meta.env.VITE_PAYPAL_CLIENT_ID || ''
  };
};

/**
 * Get Stripe configuration from environment variables
 */
const getEnvironmentStripeConfig = (): PublicStripeConfig => {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  const isTestMode = publishableKey.startsWith('pk_test_');
  
  console.log('Stripe config loaded from environment');
  
  return {
    publishableKey,
    isTestMode,
    source: 'environment'
  };
};

/**
 * Get PayPal configuration from environment variables
 */
const getEnvironmentPayPalConfig = (): PublicPayPalConfig => {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
  const environment = import.meta.env.VITE_PAYPAL_ENVIRONMENT || 'sandbox';
  const isTestMode = environment === 'sandbox';
  
  console.log(`PayPal config loaded from environment - Environment: ${environment}`);
  
  return {
    clientId,
    environment: environment as 'sandbox' | 'production',
    isTestMode,
    source: 'environment'
  };
};

// Re-export compatible functions for backward compatibility
export const getPaymentConfig = getPublicPaymentConfig;
export const getStripeConfig = getPublicStripeConfig;
export const getPayPalConfig = getPublicPayPalConfig;

/**
 * Check if payment system is in demo mode (no valid keys configured)
 */
export const isDemoMode = async (): Promise<boolean> => {
  try {
    const stripeConfig = await getPublicStripeConfig();
    return !stripeConfig.publishableKey;
  } catch (error) {
    return true; // If we can't get config, assume demo mode
  }
};

/**
 * Get current payment mode (test or live)
 */
export const getPaymentMode = async (): Promise<'test' | 'live' | 'demo'> => {
  const isDemo = await isDemoMode();
  if (isDemo) return 'demo';
  
  const config = await getPublicPaymentConfig();
  return config.mode;
};