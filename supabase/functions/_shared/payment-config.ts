import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Hybrid payment configuration that uses environment variables when available
 * and falls back to database values when not set
 */
export async function getPaymentConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get database configuration
  const { data: dbConfig } = await supabase
    .from('admin_settings')
    .select('key, value')
    .eq('category', 'payment')
    .in('key', [
      'mode',
      'stripe_test_secret_key',
      'stripe_test_webhook_secret',
      'stripe_live_secret_key', 
      'stripe_live_webhook_secret',
      'stripe_test_publishable_key',
      'stripe_live_publishable_key',
      'paypal_test_client_id',
      'paypal_test_client_secret',
      'paypal_live_client_id',
      'paypal_live_client_secret'
    ]);

  const dbConfigMap = dbConfig?.reduce((acc: any, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {}) || {};

  // Determine payment mode (env var takes precedence)
  const paymentMode = Deno.env.get('PAYMENT_MODE') || dbConfigMap.mode || 'test';
  const isTestMode = paymentMode === 'test';

  // Build configuration with environment variable precedence
  const config = {
    mode: paymentMode,
    stripe: {
      secretKey: Deno.env.get('STRIPE_SECRET_KEY') || 
                 Deno.env.get(isTestMode ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_LIVE_SECRET_KEY') ||
                 dbConfigMap[isTestMode ? 'stripe_test_secret_key' : 'stripe_live_secret_key'],
      
      webhookSecret: Deno.env.get('STRIPE_WEBHOOK_SECRET') ||
                     Deno.env.get(isTestMode ? 'STRIPE_TEST_WEBHOOK_SECRET' : 'STRIPE_LIVE_WEBHOOK_SECRET') ||
                     dbConfigMap[isTestMode ? 'stripe_test_webhook_secret' : 'stripe_live_webhook_secret'],
      
      publishableKey: dbConfigMap[isTestMode ? 'stripe_test_publishable_key' : 'stripe_live_publishable_key']
    },
    paypal: {
      clientId: dbConfigMap[isTestMode ? 'paypal_test_client_id' : 'paypal_live_client_id'],
      clientSecret: Deno.env.get(isTestMode ? 'PAYPAL_TEST_CLIENT_SECRET' : 'PAYPAL_LIVE_CLIENT_SECRET') ||
                    dbConfigMap[isTestMode ? 'paypal_test_client_secret' : 'paypal_live_client_secret']
    }
  };

  return config;
}

/**
 * Get Stripe configuration with proper error handling
 */
export async function getStripeConfig() {
  const config = await getPaymentConfig();
  
  if (!config.stripe.secretKey) {
    throw new Error('Stripe secret key not configured');
  }
  
  return {
    secretKey: config.stripe.secretKey,
    webhookSecret: config.stripe.webhookSecret,
    publishableKey: config.stripe.publishableKey,
    isTestMode: config.mode === 'test'
  };
}

/**
 * Get PayPal configuration with proper error handling
 */
export async function getPayPalConfig() {
  const config = await getPaymentConfig();
  
  if (!config.paypal.clientId || !config.paypal.clientSecret) {
    throw new Error('PayPal configuration incomplete');
  }
  
  return {
    clientId: config.paypal.clientId,
    clientSecret: config.paypal.clientSecret,
    isTestMode: config.mode === 'test'
  };
}