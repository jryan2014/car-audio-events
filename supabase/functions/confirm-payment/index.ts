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
    const { payment_intent_id } = await req.json()

    if (!payment_intent_id) {
      throw new Error('Payment intent ID is required')
    }

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)

    // Verify the payment intent belongs to this user
    if (paymentIntent.metadata.user_id !== user.id) {
      throw new Error('Payment intent does not belong to this user')
    }

    // Check payment status
    if (paymentIntent.status === 'succeeded') {
      // Create payment record in database with configuration metadata
      const enhancedMetadata = {
        ...paymentIntent.metadata,
        stripe_mode: stripeConfig.isTestMode ? 'test' : 'live',
        config_source: stripeConfig.source,
        confirmed_at: new Date().toISOString()
      };

      const { data: paymentRecord, error: insertError } = await supabase
        .from('payments')
        .insert({
          id: paymentIntent.id,
          user_id: user.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          metadata: enhancedMetadata,
          stripe_payment_intent_id: paymentIntent.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting payment record:', insertError)
        // Don't throw error here - payment succeeded but record creation failed
        // This should be handled by webhook as backup
      }

      // If this is an event registration payment, create the registration
      if (paymentIntent.metadata.event_id) {
        const { error: registrationError } = await supabase
          .from('event_registrations')
          .insert({
            user_id: user.id,
            event_id: paymentIntent.metadata.event_id,
            payment_id: paymentIntent.id,
            registration_date: new Date().toISOString(),
            status: 'confirmed'
          })

        if (registrationError) {
          console.error('Error creating event registration:', registrationError)
        }
      }

      console.log(`Payment confirmed: ${paymentIntent.id} for user: ${user.email} using ${stripeConfig.source} config (${stripeConfig.isTestMode ? 'test' : 'live'} mode)`)

      return new Response(
        JSON.stringify({
          success: true,
          payment_intent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            mode: stripeConfig.isTestMode ? 'test' : 'live',
            config_source: stripeConfig.source
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          status: paymentIntent.status,
          message: 'Payment not completed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

  } catch (error) {
    console.error('Error confirming payment:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to confirm payment'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 