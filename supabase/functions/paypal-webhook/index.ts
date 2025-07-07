import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface PayPalWebhookEvent {
  id: string;
  event_version: string;
  create_time: string;
  resource_type: string;
  resource_version?: string;
  event_type: string;
  summary: string;
  resource: any;
  links?: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const payload = await req.text()
    const webhookId = req.headers.get('paypal-transmission-id')
    const webhookTimestamp = req.headers.get('paypal-transmission-time')
    const webhookSignature = req.headers.get('paypal-transmission-sig')
    const certUrl = req.headers.get('paypal-cert-url')
    
    // Parse the webhook event
    const event: PayPalWebhookEvent = JSON.parse(payload)
    
    console.log(`Processing PayPal webhook event: ${event.event_type}`)

    // Create webhook log entry
    await adminClient
      .from('webhook_logs')
      .insert({
        provider: 'paypal',
        event_type: event.event_type,
        event_id: event.id,
        webhook_id: webhookId,
        payload: event,
        headers: Object.fromEntries(req.headers.entries()),
        status: 'processing',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
        user_agent: req.headers.get('user-agent')
      });

    // Handle different PayPal event types
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const capture = event.resource
        const orderId = capture.supplementary_data?.related_ids?.order_id
        const customId = capture.custom_id // This should contain our user_id
        
        console.log('PayPal payment captured:', capture.id)
        
        if (customId) {
          // Record transaction
          await adminClient
            .from('transactions')
            .insert({
              user_id: customId,
              type: 'payment',
              status: 'succeeded',
              amount: parseFloat(capture.amount.value),
              currency: capture.amount.currency_code,
              payment_provider: 'paypal',
              provider_transaction_id: capture.id,
              payment_method_type: 'paypal',
              description: 'PayPal payment',
              metadata: {
                order_id: orderId,
                paypal_account: capture.payer?.email_address
              }
            });

          // Queue success email
          const { data: user } = await adminClient
            .from('users')
            .select('email, name')
            .eq('id', customId)
            .maybeSingle();

          if (user) {
            await adminClient
              .from('email_queue')
              .insert({
                to_email: user.email,
                template_id: 'payment_success',
                template_data: {
                  name: user.name,
                  amount: capture.amount.value,
                  payment_method: 'PayPal'
                },
                priority: 'high'
              });
          }
        }
        break
      }

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REFUNDED': {
        const capture = event.resource
        const customId = capture.custom_id
        
        console.log(`PayPal payment ${event.event_type}:`, capture.id)
        
        if (customId) {
          const status = event.event_type === 'PAYMENT.CAPTURE.DENIED' ? 'failed' : 'refunded'
          
          // Record transaction
          await adminClient
            .from('transactions')
            .insert({
              user_id: customId,
              type: event.event_type === 'PAYMENT.CAPTURE.REFUNDED' ? 'refund' : 'payment',
              status: status,
              amount: parseFloat(capture.amount.value),
              currency: capture.amount.currency_code,
              payment_provider: 'paypal',
              provider_transaction_id: capture.id,
              description: `PayPal ${status} payment`,
              metadata: {
                reason: capture.status_details?.reason
              }
            });
        }
        break
      }

      case 'BILLING.SUBSCRIPTION.CREATED':
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const subscription = event.resource
        const customId = subscription.custom_id // Should contain user_id
        
        console.log('PayPal subscription created/activated:', subscription.id)
        
        if (customId) {
          const planId = subscription.plan_id // This should map to our membership_plan_id
          
          // Create or update subscription record
          await adminClient
            .from('subscriptions')
            .upsert({
              user_id: customId,
              membership_plan_id: planId,
              status: 'active',
              payment_provider: 'paypal',
              provider_subscription_id: subscription.id,
              current_period_start: subscription.start_time,
              current_period_end: subscription.billing_info?.next_billing_time,
              metadata: {
                paypal_plan_id: subscription.plan_id,
                paypal_status: subscription.status
              }
            });

          // Update user's PayPal customer info
          await adminClient
            .from('users')
            .update({
              paypal_customer_id: subscription.subscriber?.payer_id
            })
            .eq('id', customId);
        }
        break
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        const subscription = event.resource
        
        console.log(`PayPal subscription ${event.event_type}:`, subscription.id)
        
        const status = event.event_type === 'BILLING.SUBSCRIPTION.SUSPENDED' ? 'paused' : 'cancelled'
        
        // Update subscription status
        await adminClient
          .from('subscriptions')
          .update({
            status: status,
            cancelled_at: new Date().toISOString(),
            cancellation_reason: subscription.status_change_note,
            updated_at: new Date().toISOString()
          })
          .eq('provider_subscription_id', subscription.id);
        
        break
      }

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
        const subscription = event.resource
        
        console.log('PayPal subscription payment failed:', subscription.id)
        
        // Update subscription to past_due
        await adminClient
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString()
          })
          .eq('provider_subscription_id', subscription.id);

        // Get user for email notification
        const { data: sub } = await adminClient
          .from('subscriptions')
          .select('user_id')
          .eq('provider_subscription_id', subscription.id)
          .maybeSingle();

        if (sub) {
          const { data: user } = await adminClient
            .from('users')
            .select('email, name')
            .eq('id', sub.user_id)
            .single();

          if (user) {
            await adminClient
              .from('email_queue')
              .insert({
                to_email: user.email,
                template_id: 'payment_failed',
                template_data: {
                  name: user.name,
                  payment_method: 'PayPal'
                },
                priority: 'high'
              });
          }
        }
        break
      }

      default:
        console.log(`Unhandled PayPal event type: ${event.event_type}`)
    }

    // Update webhook log status
    await adminClient
      .from('webhook_logs')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('event_id', event.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('PayPal webhook error:', error)
    
    // Log error if we have an event ID
    const eventData = await req.clone().json().catch(() => null)
    if (eventData?.id) {
      await adminClient
        .from('webhook_logs')
        .update({
          status: 'error',
          error_message: error.message,
          processed_at: new Date().toISOString()
        })
        .eq('event_id', eventData.id);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
}) 