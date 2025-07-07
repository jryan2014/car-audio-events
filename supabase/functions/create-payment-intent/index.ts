import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PaymentConfig {
  mode: 'test' | 'live';
  stripe_active: boolean;
  stripe_test_secret_key: string;
  stripe_live_secret_key: string;
}

/**
 * Get Stripe configuration from database first, fallback to environment
 */
async function getStripeConfig(supabase: any): Promise<{ secretKey: string; isTestMode: boolean; source: string }> {
  try {
    // Try to load from database first
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('category', 'payment');

    if (error) {
      console.warn('Error loading payment config from database, using environment variables:', error);
      return getEnvironmentStripeConfig();
    }

    if (!data || data.length === 0) {
      console.log('No payment config found in database, using environment variables');
      return getEnvironmentStripeConfig();
    }

    // Convert database settings to config object
    const config: PaymentConfig = {
      mode: 'test',
      stripe_active: true,
      stripe_test_secret_key: '',
      stripe_live_secret_key: ''
    };

    // Map database values to config
    data.forEach((setting: any) => {
      const key = setting.key;
      if (key === 'stripe_active') {
        config.stripe_active = setting.value === 'true';
      } else if (key === 'mode') {
        config.mode = setting.value as 'test' | 'live';
      } else if (key === 'stripe_test_secret_key') {
        config.stripe_test_secret_key = setting.value || '';
      } else if (key === 'stripe_live_secret_key') {
        config.stripe_live_secret_key = setting.value || '';
      }
    });

    if (!config.stripe_active) {
      throw new Error('Stripe is not active in payment configuration');
    }

    const isTestMode = config.mode === 'test';
    const secretKey = isTestMode ? config.stripe_test_secret_key : config.stripe_live_secret_key;

    if (!secretKey) {
      console.log('Stripe secret key not found in database, falling back to environment variables');
      return getEnvironmentStripeConfig();
    }

    console.log(`Stripe config loaded from database - Mode: ${config.mode}, Source: database`);
    return {
      secretKey,
      isTestMode,
      source: 'database'
    };

  } catch (error) {
    console.error('Error getting Stripe config from database:', error);
    return getEnvironmentStripeConfig();
  }
}

/**
 * Fallback to environment variables
 */
function getEnvironmentStripeConfig(): { secretKey: string; isTestMode: boolean; source: string } {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY not found in environment variables or database');
  }

  const isTestMode = stripeSecretKey.startsWith('sk_test_');
  console.log(`Stripe config loaded from environment - Test Mode: ${isTestMode}, Source: environment`);
  
  return {
    secretKey: stripeSecretKey,
    isTestMode,
    source: 'environment'
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get Stripe configuration from database or environment
    const stripeConfig = await getStripeConfig(supabase);

    // Initialize Stripe with the correct configuration
    const stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: '2023-10-16',
    })

    // Parse request body
    const { amount, currency = 'usd', metadata = {} } = await req.json()

    // Validate amount
    if (!amount || amount < 50) { // Minimum $0.50 USD
      throw new Error('Amount must be at least $0.50 USD')
    }

    // Get user from authorization header (optional for membership purchases)
    const authHeader = req.headers.get('Authorization')
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(token)
      
      if (!userError && authUser) {
        user = authUser;
      }
    }

    // For membership purchases, we allow anonymous users
    // The user info will be collected in the payment form
    const userId = user?.id || 'anonymous';
    const userEmail = user?.email || metadata.email || 'anonymous@membership.purchase';

    // Add configuration info to metadata
    const enhancedMetadata = {
      user_id: userId,
      user_email: userEmail,
      stripe_mode: stripeConfig.isTestMode ? 'test' : 'live',
      config_source: stripeConfig.source,
      ...metadata
    };

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in cents
      currency: currency.toLowerCase(),
      metadata: enhancedMetadata,
      payment_method_types: ['card', 'link'], // Match frontend configuration
    })

    // Store payment intent in database with enhanced schema (only for authenticated users)
    if (user) {
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          id: paymentIntent.id,
          user_id: user.id,
          amount: Math.round(amount),
          currency: currency.toLowerCase(),
          status: paymentIntent.status,
          payment_provider: 'stripe',
          stripe_payment_intent_id: paymentIntent.id,
          metadata: enhancedMetadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Error storing payment record:', insertError)
        // Continue anyway - webhook will handle this
      }

      // Log payment creation in subscription history
      await supabase.from('subscription_history').insert({
        user_id: user.id,
        subscription_id: paymentIntent.id,
        provider: 'stripe',
        action: 'created',
        new_status: paymentIntent.status,
        amount: amount / 100,
        currency: currency.toLowerCase(),
        metadata: { 
          payment_intent_id: paymentIntent.id,
          stripe_mode: stripeConfig.isTestMode ? 'test' : 'live',
          config_source: stripeConfig.source
        }
      })

      // Update user's refund eligibility window
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          refund_eligible_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        })
        .eq('id', user.id)

      if (userUpdateError) {
        console.error('Error updating user refund eligibility:', userUpdateError)
      }
    }

    // Log payment intent creation
    console.log(`Payment intent created: ${paymentIntent.id} for user: ${userEmail} using ${stripeConfig.source} config (${stripeConfig.isTestMode ? 'test' : 'live'} mode)`)

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        provider: 'stripe',
        mode: stripeConfig.isTestMode ? 'test' : 'live',
        config_source: stripeConfig.source
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating payment intent:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create payment intent'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 