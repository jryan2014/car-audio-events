import { supabase } from '../lib/supabase';

interface PaymentConfig {
  mode: 'test' | 'live';
  stripe_active: boolean;
  paypal_active: boolean;
  stripe_test_publishable_key: string;
  stripe_test_secret_key: string;
  stripe_test_webhook_secret: string;
  stripe_live_publishable_key: string;
  stripe_live_secret_key: string;
  stripe_live_webhook_secret: string;
  paypal_test_client_id: string;
  paypal_test_client_secret: string;
  paypal_live_client_id: string;
  paypal_live_client_secret: string;
}

interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  isTestMode: boolean;
  source: 'database' | 'environment' | 'fallback';
}

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
  isTestMode: boolean;
  source: 'database' | 'environment' | 'fallback';
}

/**
 * Get payment configuration from database first, fallback to environment variables
 */
export const getPaymentConfig = async (): Promise<PaymentConfig> => {
  try {
    // Try to load from database first
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('category', 'payment');

    if (error) {
      console.warn('Error loading payment config from database, falling back to environment variables:', error);
      return getEnvironmentFallbackConfig();
    }

    if (!data || data.length === 0) {
      console.log('No payment config found in database, using environment variables');
      return getEnvironmentFallbackConfig();
    }

    // Convert database settings to config object
    const config: PaymentConfig = {
      mode: 'test',
      stripe_active: true,
      paypal_active: false,
      stripe_test_publishable_key: '',
      stripe_test_secret_key: '',
      stripe_test_webhook_secret: '',
      stripe_live_publishable_key: '',
      stripe_live_secret_key: '',
      stripe_live_webhook_secret: '',
      paypal_test_client_id: '',
      paypal_test_client_secret: '',
      paypal_live_client_id: '',
      paypal_live_client_secret: ''
    };

    // Map database values to config
    data.forEach(setting => {
      const key = setting.key as keyof PaymentConfig;
      if (key === 'stripe_active' || key === 'paypal_active') {
        config[key] = setting.value === 'true';
      } else if (key === 'mode') {
        config[key] = setting.value as 'test' | 'live';
      } else if (key in config) {
        config[key] = setting.value || '';
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
 * Get Stripe configuration based on current mode
 */
export const getStripeConfig = async (): Promise<StripeConfig> => {
  try {
    const paymentConfig = await getPaymentConfig();
    
    if (!paymentConfig.stripe_active) {
      throw new Error('Stripe is not active in payment configuration');
    }

    const isTestMode = paymentConfig.mode === 'test';
    
    // Get appropriate keys based on mode
    const publishableKey = isTestMode 
      ? paymentConfig.stripe_test_publishable_key 
      : paymentConfig.stripe_live_publishable_key;
    
    const secretKey = isTestMode 
      ? paymentConfig.stripe_test_secret_key 
      : paymentConfig.stripe_live_secret_key;
    
    const webhookSecret = isTestMode 
      ? paymentConfig.stripe_test_webhook_secret 
      : paymentConfig.stripe_live_webhook_secret;

    // Check if we have valid keys from database
    if (publishableKey && secretKey) {
      console.log(`Stripe config loaded from database - Mode: ${paymentConfig.mode}, Key: ${publishableKey.substring(0, 12)}...`);
      return {
        publishableKey,
        secretKey,
        webhookSecret,
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
 * Get PayPal configuration based on current mode
 */
export const getPayPalConfig = async (): Promise<PayPalConfig> => {
  try {
    const paymentConfig = await getPaymentConfig();
    
    if (!paymentConfig.paypal_active) {
      throw new Error('PayPal is not active in payment configuration');
    }

    const isTestMode = paymentConfig.mode === 'test';
    
    // Get appropriate keys based on mode
    const clientId = isTestMode 
      ? paymentConfig.paypal_test_client_id 
      : paymentConfig.paypal_live_client_id;
    
    const clientSecret = isTestMode 
      ? paymentConfig.paypal_test_client_secret 
      : paymentConfig.paypal_live_client_secret;

    // Check if we have valid keys from database
    if (clientId && clientSecret) {
      console.log(`PayPal config loaded from database - Mode: ${paymentConfig.mode}, Environment: ${isTestMode ? 'sandbox' : 'production'}`);
      return {
        clientId,
        clientSecret,
        environment: isTestMode ? 'sandbox' : 'production',
        isTestMode,
        source: 'database'
      };
    }

    // Fallback to environment variables
    console.log('PayPal keys not found in database, using environment variables');
    return getEnvironmentPayPalConfig();

  } catch (error) {
    console.error('Error getting PayPal config:', error);
    return getEnvironmentPayPalConfig();
  }
};

/**
 * Fallback configuration using environment variables
 */
const getEnvironmentFallbackConfig = (): PaymentConfig => {
  return {
    mode: 'test', // Default to test mode for safety
    stripe_active: true,
    paypal_active: false,
    stripe_test_publishable_key: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    stripe_test_secret_key: '', // Not available in frontend
    stripe_test_webhook_secret: '', // Not available in frontend
    stripe_live_publishable_key: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    stripe_live_secret_key: '', // Not available in frontend
    stripe_live_webhook_secret: '', // Not available in frontend
    paypal_test_client_id: import.meta.env.VITE_PAYPAL_CLIENT_ID || '',
    paypal_test_client_secret: '', // Not available in frontend
    paypal_live_client_id: import.meta.env.VITE_PAYPAL_CLIENT_ID || '',
    paypal_live_client_secret: '' // Not available in frontend
  };
};

/**
 * Get Stripe configuration from environment variables
 */
const getEnvironmentStripeConfig = (): StripeConfig => {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  const isTestMode = publishableKey.startsWith('pk_test_');
  
  console.log(`Stripe config loaded from environment - Test Mode: ${isTestMode}, Key: ${publishableKey.substring(0, 12)}...`);
  
  return {
    publishableKey,
    secretKey: '', // Not available in frontend
    webhookSecret: '', // Not available in frontend
    isTestMode,
    source: 'environment'
  };
};

/**
 * Get PayPal configuration from environment variables
 */
const getEnvironmentPayPalConfig = (): PayPalConfig => {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
  const environment = import.meta.env.VITE_PAYPAL_ENVIRONMENT || 'sandbox';
  const isTestMode = environment === 'sandbox';
  
  console.log(`PayPal config loaded from environment - Environment: ${environment}`);
  
  return {
    clientId,
    clientSecret: '', // Not available in frontend
    environment: environment as 'sandbox' | 'production',
    isTestMode,
    source: 'environment'
  };
};

/**
 * Check if payment system is in demo mode (no valid keys configured)
 */
export const isDemoMode = async (): Promise<boolean> => {
  try {
    const stripeConfig = await getStripeConfig();
    return !stripeConfig.publishableKey;
  } catch (error) {
    return true; // If we can't get config, assume demo mode
  }
};

/**
 * Get current payment mode (test or live)
 */
export const getPaymentMode = async (): Promise<'test' | 'live' | 'demo'> => {
  try {
    const config = await getPaymentConfig();
    const stripeConfig = await getStripeConfig();
    
    if (!stripeConfig.publishableKey) {
      return 'demo';
    }
    
    return config.mode;
  } catch (error) {
    return 'demo';
  }
};

/**
 * Get human-readable payment status
 */
export const getPaymentStatus = async (): Promise<string> => {
  try {
    const mode = await getPaymentMode();
    const stripeConfig = await getStripeConfig();
    
    if (mode === 'demo') {
      return 'Demo Mode: Payment processing is not configured';
    }
    
    const modeText = mode === 'test' ? 'Test Mode (Safe for testing)' : 'Live Mode (Real payments)';
    const sourceText = stripeConfig.source === 'database' ? 'Database' : 'Environment';
    
    return `${modeText} - Source: ${sourceText}`;
  } catch (error) {
    return 'Error: Unable to determine payment status';
  }
}; 