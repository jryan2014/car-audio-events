import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayPalWebhookEvent {
  id: string
  event_type: string
  resource_type: string
  summary: string
  resource: {
    id: string
    status: string
    amount?: {
      currency_code: string
      value: string
    }
    custom_id?: string
    purchase_units?: Array<{
      custom_id: string
      reference_id: string
    }>
  }
  create_time: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse webhook payload
    const webhookEvent: PayPalWebhookEvent = await req.json()

    console.log(`Received PayPal webhook: ${webhookEvent.event_type}`)

    // Verify webhook signature (optional but recommended for production)
    const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID')
    if (webhookId) {
      // In production, you should verify the webhook signature here
      // For now, we'll proceed with processing
    }

    // Handle different event types
    switch (webhookEvent.event_type) {
      case 'CHECKOUT.ORDER.APPROVED': {
        const orderId = webhookEvent.resource.id
        const customId = webhookEvent.resource.purchase_units?.[0]?.custom_id
        
        if (customId) {
          // Update payment status to approved
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'approved',
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .eq('payment_provider', 'paypal')

          if (updateError) {
            console.error('Error updating payment status:', updateError)
          }

          // Log event
          await supabase.from('subscription_history').insert({
            user_id: customId,
            subscription_id: orderId,
            provider: 'paypal',
            action: 'updated',
            old_status: 'pending',
            new_status: 'approved',
            metadata: { webhook_event_id: webhookEvent.id }
          })
        }
        break
      }

      case 'PAYMENT.CAPTURE.COMPLETED': {
        const captureId = webhookEvent.resource.id
        const amount = webhookEvent.resource.amount
        
        // Find the payment record by PayPal payment ID
        const { data: paymentRecord, error: paymentError } = await supabase
          .from('payments')
          .select('*')
          .eq('paypal_payment_id', captureId)
          .eq('payment_provider', 'paypal')
          .single()

        if (!paymentError && paymentRecord) {
          // Update payment status to succeeded
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'succeeded',
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentRecord.id)

          if (updateError) {
            console.error('Error updating payment status:', updateError)
          }

          // Log successful payment
          await supabase.from('subscription_history').insert({
            user_id: paymentRecord.user_id,
            subscription_id: paymentRecord.id,
            provider: 'paypal',
            action: 'renewed',
            old_status: 'approved',
            new_status: 'completed',
            amount: amount ? parseFloat(amount.value) : 0,
            currency: amount?.currency_code || 'USD',
            metadata: { 
              webhook_event_id: webhookEvent.id,
              capture_id: captureId
            }
          })

          // If this is an event registration payment, ensure registration exists
          if (paymentRecord.metadata?.event_id) {
            const { error: registrationError } = await supabase
              .from('event_registrations')
              .upsert({
                user_id: paymentRecord.user_id,
                event_id: paymentRecord.metadata.event_id,
                payment_id: paymentRecord.id,
                registration_date: new Date().toISOString(),
                status: 'confirmed'
              })

            if (registrationError) {
              console.error('Error creating event registration:', registrationError)
            }
          }

          console.log(`PayPal payment completed: ${paymentRecord.id}`)
        }
        break
      }

      case 'PAYMENT.CAPTURE.DENIED': {
        const captureId = webhookEvent.resource.id
        
        // Find and update payment record
        const { data: paymentRecord, error: paymentError } = await supabase
          .from('payments')
          .select('*')
          .eq('paypal_payment_id', captureId)
          .eq('payment_provider', 'paypal')
          .single()

        if (!paymentError && paymentRecord) {
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentRecord.id)

          if (updateError) {
            console.error('Error updating payment status:', updateError)
          }

          // Log failed payment
          await supabase.from('subscription_history').insert({
            user_id: paymentRecord.user_id,
            subscription_id: paymentRecord.id,
            provider: 'paypal',
            action: 'updated',
            old_status: 'approved',
            new_status: 'failed',
            metadata: { 
              webhook_event_id: webhookEvent.id,
              capture_id: captureId
            }
          })
        }
        break
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        const refundId = webhookEvent.resource.id
        const amount = webhookEvent.resource.amount
        
        // Update refund record if exists
        const { error: refundUpdateError } = await supabase
          .from('refunds')
          .update({
            status: 'processed',
            processed_at: new Date().toISOString()
          })
          .eq('provider_refund_id', refundId)
          .eq('provider', 'paypal')

        if (refundUpdateError) {
          console.error('Error updating refund status:', refundUpdateError)
        }

        console.log(`PayPal refund processed: ${refundId}`)
        break
      }

      default:
        console.log(`Unhandled PayPal webhook event: ${webhookEvent.event_type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('PayPal webhook error:', error)
    
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