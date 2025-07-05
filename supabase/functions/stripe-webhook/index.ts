import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          membershipType: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          subscription_status?: string
          subscription_current_period_end?: string
        }
        Insert: {
          id: string
          email: string
          membershipType?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          subscription_status?: string
          subscription_current_period_end?: string
        }
        Update: {
          membershipType?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          subscription_status?: string
          subscription_current_period_end?: string
        }
      }
      activity_logs: {
        Insert: {
          user_id?: string
          activity_type: string
          activity_description: string
          metadata?: any
        }
      }
      payments: {
        Insert: {
          id: string
          user_id: string
          amount: number
          currency: string
          status: string
          metadata: any
          stripe_payment_intent_id: string
          created_at: string
          updated_at: string
        }
        Update: {
          amount?: number
          currency?: string
          status?: string
          metadata?: any
          stripe_payment_intent_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      event_registrations: {
        Insert: {
          user_id: string
          event_id: string
          payment_id: string
          registration_date: string
          status: string
        }
        Update: {
          registration_date?: string
          status?: string
        }
      }
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Stripe secret key and webhook secret from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    if (!stripeSecretKey || !webhookSecret) {
      throw new Error('Missing Stripe configuration')
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-06-30',
    })

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    // Get the raw body and signature
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      throw new Error('No Stripe signature found')
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Invalid signature', { status: 400 })
    }

    console.log(`Received webhook event: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Create or update payment record with enhanced schema
        const { error: upsertError } = await supabase
          .from('payments')
          .upsert({
            id: paymentIntent.id,
            user_id: paymentIntent.metadata.user_id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            payment_provider: 'stripe',
            metadata: paymentIntent.metadata,
            stripe_payment_intent_id: paymentIntent.id,
            created_at: new Date(paymentIntent.created * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })

        if (upsertError) {
          console.error('Error upserting payment record:', upsertError)
        } else {
          // Log successful payment in subscription history
          await supabase.from('subscription_history').insert({
            user_id: paymentIntent.metadata.user_id,
            subscription_id: paymentIntent.id,
            provider: 'stripe',
            action: 'renewed',
            old_status: 'pending',
            new_status: 'completed',
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            metadata: { 
              payment_intent_id: paymentIntent.id,
              stripe_event_id: event.id
            }
          })
        }

        // If this is an event registration payment, ensure registration exists
        if (paymentIntent.metadata.event_id && paymentIntent.metadata.user_id) {
          const { error: registrationError } = await supabase
            .from('event_registrations')
            .upsert({
              user_id: paymentIntent.metadata.user_id,
              event_id: paymentIntent.metadata.event_id,
              payment_id: paymentIntent.id,
              registration_date: new Date().toISOString(),
              status: 'confirmed'
            })

          if (registrationError) {
            console.error('Error creating event registration:', registrationError)
          } else {
            console.log(`Event registration confirmed for user ${paymentIntent.metadata.user_id}`)
          }
        }

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Update payment record with failed status
        const { error: updateError } = await supabase
          .from('payments')
          .upsert({
            id: paymentIntent.id,
            user_id: paymentIntent.metadata.user_id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            metadata: paymentIntent.metadata,
            stripe_payment_intent_id: paymentIntent.id,
            created_at: new Date(paymentIntent.created * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })

        if (updateError) {
          console.error('Error updating failed payment record:', updateError)
        }

        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Update payment record with canceled status
        const { error: updateError } = await supabase
          .from('payments')
          .upsert({
            id: paymentIntent.id,
            user_id: paymentIntent.metadata.user_id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            metadata: paymentIntent.metadata,
            stripe_payment_intent_id: paymentIntent.id,
            created_at: new Date(paymentIntent.created * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })

        if (updateError) {
          console.error('Error updating canceled payment record:', updateError)
        }

        // Remove any associated event registrations
        if (paymentIntent.metadata.event_id && paymentIntent.metadata.user_id) {
          const { error: deleteError } = await supabase
            .from('event_registrations')
            .delete()
            .eq('user_id', paymentIntent.metadata.user_id)
            .eq('event_id', paymentIntent.metadata.event_id)
            .eq('payment_id', paymentIntent.id)

          if (deleteError) {
            console.error('Error removing event registration:', deleteError)
          }
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Webhook processing failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function handleSubscriptionChange(supabase: any, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const subscriptionId = subscription.id
  const status = subscription.status
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()

  // Determine membership type from subscription metadata or price
  let membershipType = 'competitor' // default
  
  if (subscription.items.data.length > 0) {
    const priceId = subscription.items.data[0].price.id
    const priceAmount = subscription.items.data[0].price.unit_amount || 0
    
    // Map price amounts to membership types (in cents)
    if (priceAmount === 2900) { // $29.00
      membershipType = 'competitor' // Pro Competitor
    } else if (priceAmount === 9900) { // $99.00
      membershipType = 'retailer'
    } else if (priceAmount === 19900) { // $199.00
      membershipType = 'manufacturer'
    } else if (priceAmount === 29900) { // $299.00
      membershipType = 'organization'
    }
  }

  // Update user record
  const { error } = await supabase
    .from('users')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: status,
      subscription_current_period_end: currentPeriodEnd,
      membershipType: status === 'active' ? membershipType : 'competitor'
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Error updating user subscription:', error)
    throw error
  }

  console.log(`Updated subscription for customer ${customerId}: ${status}`)
}

async function handleSubscriptionCancelled(supabase: any, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Downgrade user to free competitor membership
  const { error } = await supabase
    .from('users')
    .update({
      membershipType: 'competitor',
      subscription_status: 'canceled',
      stripe_subscription_id: null
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Error handling subscription cancellation:', error)
    throw error
  }

  console.log(`Cancelled subscription for customer ${customerId}`)
}

async function handlePaymentSucceeded(supabase: any, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription as string

  // Update subscription status to active
  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'active'
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Error updating payment success:', error)
    throw error
  }

  // Log successful payment
  await supabase.from('activity_logs').insert({
    activity_type: 'payment_succeeded',
    activity_description: `Payment succeeded for subscription ${subscriptionId}`,
    metadata: {
      customer_id: customerId,
      invoice_id: invoice.id,
      amount: invoice.amount_paid
    }
  })

  console.log(`Payment succeeded for customer ${customerId}`)
}

async function handlePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription as string

  // Update subscription status
  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'past_due'
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Error updating payment failure:', error)
    throw error
  }

  // Log failed payment
  await supabase.from('activity_logs').insert({
    activity_type: 'payment_failed',
    activity_description: `Payment failed for subscription ${subscriptionId}`,
    metadata: {
      customer_id: customerId,
      invoice_id: invoice.id,
      amount: invoice.amount_due
    }
  })

  console.log(`Payment failed for customer ${customerId}`)
}

async function handlePaymentIntentSucceeded(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  const customerId = paymentIntent.customer as string
  
  // Log one-time payment success
  await supabase.from('activity_logs').insert({
    activity_type: 'payment_intent_succeeded',
    activity_description: `One-time payment succeeded`,
    metadata: {
      customer_id: customerId,
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount
    }
  })

  console.log(`Payment intent succeeded for customer ${customerId}`)
} 