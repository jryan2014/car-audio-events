import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-06-30',
    })

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { amount, currency = 'usd', metadata = {} } = await req.json()

    // Validate amount
    if (!amount || amount < 50) { // Minimum $0.50 USD
      throw new Error('Amount must be at least $0.50 USD')
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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in cents
      currency: currency.toLowerCase(),
      metadata: {
        user_id: user.id,
        user_email: user.email,
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // Store payment intent in database with enhanced schema
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
        metadata: {
          user_id: user.id,
          user_email: user.email,
          ...metadata
        },
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
      metadata: { payment_intent_id: paymentIntent.id }
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

    // Log payment intent creation
    console.log(`Payment intent created: ${paymentIntent.id} for user: ${user.email}`)

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        provider: 'stripe'
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