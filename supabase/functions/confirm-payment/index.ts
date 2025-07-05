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
      // Create payment record in database
      const { data: paymentRecord, error: insertError } = await supabase
        .from('payments')
        .insert({
          id: paymentIntent.id,
          user_id: user.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          metadata: paymentIntent.metadata,
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

      console.log(`Payment confirmed: ${paymentIntent.id} for user: ${user.email}`)

      return new Response(
        JSON.stringify({
          success: true,
          payment_intent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
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