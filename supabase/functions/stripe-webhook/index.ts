import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { corsHeaders } from '../_shared/cors.ts'
import { edgeEmailService } from '../_shared/edge-email-service.ts'

interface PaymentConfig {
  mode: 'test' | 'live';
  stripe_active: boolean;
  stripe_test_secret_key: string;
  stripe_live_secret_key: string;
  stripe_test_webhook_secret: string;
  stripe_live_webhook_secret: string;
}

/**
 * Get Stripe configuration from database first, fallback to environment
 */
async function getStripeWebhookConfig(supabase: any): Promise<{ secretKey: string; webhookSecret: string; isTestMode: boolean; source: string }> {
  try {
    // Try to load from database first
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('category', 'payment');

    if (error) {
      console.warn('Error loading payment config from database, using environment variables:', error);
      return getEnvironmentWebhookConfig();
    }

    if (!data || data.length === 0) {
      console.log('No payment config found in database, using environment variables');
      return getEnvironmentWebhookConfig();
    }

    // Convert database settings to config object
    const config: PaymentConfig = {
      mode: 'test',
      stripe_active: true,
      stripe_test_secret_key: '',
      stripe_live_secret_key: '',
      stripe_test_webhook_secret: '',
      stripe_live_webhook_secret: ''
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
      } else if (key === 'stripe_test_webhook_secret') {
        config.stripe_test_webhook_secret = setting.value || '';
      } else if (key === 'stripe_live_webhook_secret') {
        config.stripe_live_webhook_secret = setting.value || '';
      }
    });

    if (!config.stripe_active) {
      throw new Error('Stripe is not active in payment configuration');
    }

    const isTestMode = config.mode === 'test';
    const secretKey = isTestMode ? config.stripe_test_secret_key : config.stripe_live_secret_key;
    const webhookSecret = isTestMode ? config.stripe_test_webhook_secret : config.stripe_live_webhook_secret;

    if (!secretKey || !webhookSecret) {
      console.log('Stripe keys not found in database, falling back to environment variables');
      return getEnvironmentWebhookConfig();
    }

    console.log(`Stripe webhook config loaded from database - Mode: ${config.mode}, Source: database`);
    return {
      secretKey,
      webhookSecret,
      isTestMode,
      source: 'database'
    };

  } catch (error) {
    console.error('Error getting Stripe webhook config from database:', error);
    return getEnvironmentWebhookConfig();
  }
}

/**
 * Fallback to environment variables
 */
function getEnvironmentWebhookConfig(): { secretKey: string; webhookSecret: string; isTestMode: boolean; source: string } {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  
  if (!stripeSecretKey || !webhookSecret) {
    throw new Error('STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET not found in environment variables or database');
  }

  const isTestMode = stripeSecretKey.startsWith('sk_test_');
  console.log(`Stripe webhook config loaded from environment - Test Mode: ${isTestMode}, Source: environment`);
  
  return {
    secretKey: stripeSecretKey,
    webhookSecret,
    isTestMode,
    source: 'environment'
  };
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
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Initialize clients
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)
  
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
  })

  let event: Stripe.Event;

  try {
    const payload = await req.text()
    const signature = req.headers.get('stripe-signature')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
      console.error('Missing signature or webhook secret')
      return new Response('Bad request', { status: 400 })
    }

    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)

    console.log(`Processing webhook event: ${event.type}`)

    // Try to create webhook log entry (table might not exist yet)
    try {
      await adminClient
        .from('webhook_logs')
        .insert({
          provider: 'stripe',
          event_type: event.type,
          event_id: event.id,
          payload: event,
          headers: Object.fromEntries(req.headers.entries()),
          status: 'processing',
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
          user_agent: req.headers.get('user-agent')
        });
    } catch (logError) {
      console.warn('Could not log webhook (table might not exist):', logError);
      // Continue processing even if logging fails
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        console.log('Payment succeeded:', paymentIntent.id)
        
        const userId = paymentIntent.metadata?.user_id
        const eventId = paymentIntent.metadata?.event_id
        
        if (userId) {
          // Record transaction
          await adminClient
            .from('transactions')
            .insert({
              user_id: userId,
              type: eventId ? 'one_time' : 'subscription',
              status: 'succeeded',
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency.toUpperCase(),
              payment_provider: 'stripe',
              provider_transaction_id: paymentIntent.id,
              provider_customer_id: paymentIntent.customer as string,
              payment_method_type: paymentIntent.payment_method_types[0],
              description: paymentIntent.description || 'Payment',
              metadata: paymentIntent.metadata
            });

          if (eventId) {
            // Handle event registration
            const paymentId = paymentIntent.metadata?.payment_id
            
            if (paymentId) {
              // Update payment status
              await adminClient
                .from('payments')
                .update({ 
                  status: 'completed',
                  stripe_payment_intent_id: paymentIntent.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', paymentId)
              
              // Update registration status
              await adminClient
                .from('event_registrations')
                .update({ status: 'confirmed' })
                .eq('payment_id', paymentId)
              
              // Log activity
              await adminClient
                .from('activity_logs')
                .insert({
                  user_id: userId,
                  activity_type: 'event_registration_confirmed',
                  activity_description: `Event registration confirmed via Stripe payment`,
                  metadata: { event_id: eventId, payment_id: paymentId }
                })
            }
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        console.log('Payment failed:', paymentIntent.id)
        
        const userId = paymentIntent.metadata?.user_id
        
        if (userId) {
          // Record failed transaction
          await adminClient
            .from('transactions')
            .insert({
              user_id: userId,
              type: 'payment',
              status: 'failed',
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency.toUpperCase(),
              payment_provider: 'stripe',
              provider_transaction_id: paymentIntent.id,
              description: paymentIntent.description || 'Failed payment',
              metadata: {
                ...paymentIntent.metadata,
                failure_code: paymentIntent.last_payment_error?.code,
                failure_message: paymentIntent.last_payment_error?.message
              }
            });

          // Update user payment failed count
          const { data: user } = await adminClient
            .from('users')
            .select('payment_failed_count')
            .eq('id', userId)
            .maybeSingle();

          if (user) {
            await adminClient
              .from('users')
              .update({
                payment_failed_count: (user.payment_failed_count || 0) + 1,
                last_payment_attempt: new Date().toISOString()
              })
              .eq('id', userId);
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        console.log(`Subscription ${event.type}:`, subscription.id)
        
        const customerId = subscription.customer as string
        const userId = subscription.metadata?.user_id
        
        if (userId) {
          // Check if subscription exists
          const { data: existingSub } = await adminClient
            .from('subscriptions')
            .select('id')
            .eq('provider_subscription_id', subscription.id)
            .single();

          const subData = {
            user_id: userId,
            membership_plan_id: subscription.metadata?.plan_id,
            status: subscription.status as any,
            payment_provider: 'stripe',
            provider_subscription_id: subscription.id,
            provider_customer_id: customerId,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            metadata: subscription.metadata,
            updated_at: new Date().toISOString()
          };

          if (existingSub) {
            // Update existing subscription
            await adminClient
              .from('subscriptions')
              .update(subData)
              .eq('id', existingSub.id);
          } else {
            // Create new subscription
            await adminClient
              .from('subscriptions')
              .insert(subData);
          }

          // Update user's Stripe customer ID if not set
          await adminClient
            .from('users')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId)
            .is('stripe_customer_id', null);
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        console.log('Subscription cancelled:', subscription.id)
        
        // Update subscription status
        await adminClient
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('provider_subscription_id', subscription.id);
        
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        console.log('Invoice payment succeeded:', invoice.id)
        
        const userId = invoice.subscription_metadata?.user_id || invoice.metadata?.user_id
        
        if (userId && invoice.subscription) {
          // Create invoice record
          const invoiceNumber = await adminClient.rpc('generate_invoice_number');
          
          await adminClient
            .from('invoices')
            .insert({
              invoice_number: invoiceNumber,
              user_id: userId,
              subscription_id: invoice.subscription as string,
              status: 'paid',
              due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
              paid_at: new Date().toISOString(),
              subtotal: invoice.subtotal / 100,
              tax_amount: (invoice.tax || 0) / 100,
              discount_amount: invoice.discount ? invoice.discount.coupon.amount_off || 0 : 0,
              total: invoice.amount_paid / 100,
              currency: invoice.currency.toUpperCase(),
              payment_provider: 'stripe',
              provider_invoice_id: invoice.id,
              provider_invoice_url: invoice.hosted_invoice_url,
              pdf_url: invoice.invoice_pdf,
              line_items: invoice.lines.data.map(item => ({
                description: item.description,
                amount: item.amount / 100,
                quantity: item.quantity
              })),
              metadata: invoice.metadata
            });

          // Record successful payment transaction
          await adminClient
            .from('transactions')
            .insert({
              user_id: userId,
              type: 'subscription',
              status: 'succeeded',
              amount: invoice.amount_paid / 100,
              currency: invoice.currency.toUpperCase(),
              payment_provider: 'stripe',
              provider_transaction_id: invoice.payment_intent as string,
              description: `Subscription payment for ${invoice.period_start ? new Date(invoice.period_start * 1000).toLocaleDateString() : 'N/A'}`,
              metadata: {
                invoice_id: invoice.id,
                subscription_id: invoice.subscription
              }
            });

          // Queue email notification for successful payment
          if (invoice.customer_email && userId) {
            const { data: user } = await adminClient
              .from('users')
              .select('name, email')
              .eq('id', userId)
              .single();

            if (user) {
              await adminClient
                .from('email_queue')
                .insert({
                  to_email: user.email,
                  template_id: 'payment_success',
                  template_data: {
                    name: user.name || user.email.split('@')[0],
                    email: user.email,
                    amount: (invoice.amount_paid / 100).toFixed(2),
                    payment_method: 'Card',
                    payment_date: new Date().toLocaleDateString(),
                    website_url: 'https://car-audio-events.netlify.app',
                    support_url: 'https://car-audio-events.netlify.app/contact'
                  },
                  priority: 'high'
                });
            }
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        console.log('Invoice payment failed:', invoice.id)
        
        const userId = invoice.subscription_metadata?.user_id || invoice.metadata?.user_id
        
        if (userId) {
          // Update subscription to past_due
          await adminClient
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString()
            })
            .eq('provider_subscription_id', invoice.subscription);

          // Queue email notification for failed payment
          if (invoice.customer_email && userId) {
            const { data: user } = await adminClient
              .from('users')
              .select('name, email')
              .eq('id', userId)
              .single();

            if (user) {
              await adminClient
                .from('email_queue')
                .insert({
                  to_email: user.email,
                  template_id: 'payment_failed',
                  template_data: {
                    name: user.name || user.email.split('@')[0],
                    email: user.email,
                    payment_method: 'Card',
                    retry_payment_url: invoice.hosted_invoice_url || 'https://car-audio-events.netlify.app/billing',
                    website_url: 'https://car-audio-events.netlify.app',
                    support_url: 'https://car-audio-events.netlify.app/contact'
                  },
                  priority: 'high'
                });
            }
          }
        }
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        console.log('Checkout session completed:', session.id)
        
        const userId = session.metadata?.user_id
        const planId = session.metadata?.plan_id
        
        if (userId && planId) {
          // Session completed, subscription should be created via subscription webhooks
          console.log('Checkout completed for user:', userId, 'plan:', planId)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Update webhook log status
    await adminClient
      .from('webhook_logs')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('event_id', event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    
    // Log error in webhook logs
    if (event?.id) {
      await adminClient
        .from('webhook_logs')
        .update({
          status: 'error',
          error_message: error.message,
          processed_at: new Date().toISOString()
        })
        .eq('event_id', event.id);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 400 
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