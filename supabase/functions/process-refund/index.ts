import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayPalTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface PayPalRefundResponse {
  id: string
  status: string
  amount: {
    currency_code: string
    value: string
  }
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

    // Parse request body
    const { payment_id, refund_amount, reason } = await req.json()

    if (!payment_id || !refund_amount || !reason) {
      throw new Error('Payment ID, refund amount, and reason are required')
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

    // Get payment record and verify ownership
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .eq('user_id', user.id)
      .single()

    if (paymentError || !paymentRecord) {
      throw new Error('Payment record not found or unauthorized')
    }

    // Check if refund is within 30-day policy using database function
    const { data: eligibilityCheck, error: eligibilityError } = await supabase
      .rpc('check_refund_eligibility', { payment_uuid: payment_id })

    if (eligibilityError) {
      console.error('Error checking refund eligibility:', eligibilityError)
      throw new Error('Failed to verify refund eligibility')
    }

    if (!eligibilityCheck) {
      throw new Error('Refund request is outside the 30-day eligibility window')
    }

    // Validate refund amount
    const maxRefundAmount = paymentRecord.amount - (paymentRecord.refund_amount || 0)
    if (refund_amount > maxRefundAmount) {
      throw new Error(`Refund amount cannot exceed ${maxRefundAmount / 100} ${paymentRecord.currency}`)
    }

    // Create refund request record
    const { data: refundRecord, error: refundInsertError } = await supabase
      .from('refunds')
      .insert({
        user_id: user.id,
        payment_id: payment_id,
        original_amount: paymentRecord.amount,
        refund_amount: refund_amount,
        currency: paymentRecord.currency,
        reason: reason,
        status: 'pending',
        provider: paymentRecord.payment_provider,
        requested_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (refundInsertError) {
      console.error('Error creating refund record:', refundInsertError)
      throw new Error('Failed to create refund request')
    }

    // Process refund based on payment provider
    let refundResult: any = null
    
    if (paymentRecord.payment_provider === 'stripe') {
      // Process Stripe refund
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
      if (!stripeSecretKey) {
        throw new Error('Stripe configuration is missing')
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
      })

      try {
        refundResult = await stripe.refunds.create({
          payment_intent: paymentRecord.stripe_payment_intent_id,
          amount: refund_amount,
          reason: 'requested_by_customer',
          metadata: {
            user_id: user.id,
            refund_request_id: refundRecord.id
          }
        })

        // Update refund record with Stripe refund ID
        await supabase
          .from('refunds')
          .update({
            provider_refund_id: refundResult.id,
            status: refundResult.status === 'succeeded' ? 'processed' : 'pending',
            processed_at: refundResult.status === 'succeeded' ? new Date().toISOString() : null
          })
          .eq('id', refundRecord.id)

      } catch (stripeError) {
        console.error('Stripe refund failed:', stripeError)
        await supabase
          .from('refunds')
          .update({ status: 'denied' })
          .eq('id', refundRecord.id)
        throw new Error('Stripe refund processing failed')
      }

    } else if (paymentRecord.payment_provider === 'paypal') {
      // Process PayPal refund
      const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID')
      const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')
      const paypalEnvironment = Deno.env.get('PAYPAL_ENVIRONMENT') || 'sandbox'
      
      if (!paypalClientId || !paypalClientSecret) {
        throw new Error('PayPal configuration is missing')
      }

      const baseUrl = paypalEnvironment === 'production' 
        ? 'https://api.paypal.com'
        : 'https://api.sandbox.paypal.com'

      // Get PayPal access token
      const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en_US',
          'Authorization': `Basic ${btoa(`${paypalClientId}:${paypalClientSecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      })

      if (!authResponse.ok) {
        throw new Error('Failed to authenticate with PayPal')
      }

      const authData: PayPalTokenResponse = await authResponse.json()

      // Process PayPal refund
      try {
        const refundResponse = await fetch(`${baseUrl}/v2/payments/captures/${paymentRecord.paypal_payment_id}/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authData.access_token}`,
            'PayPal-Request-Id': `${user.id}_${Date.now()}_refund`
          },
          body: JSON.stringify({
            amount: {
              currency_code: paymentRecord.currency,
              value: (refund_amount / 100).toFixed(2)
            },
            note_to_payer: `Refund for payment ${payment_id}: ${reason}`
          })
        })

        if (!refundResponse.ok) {
          const errorData = await refundResponse.json()
          console.error('PayPal refund failed:', errorData)
          throw new Error('PayPal refund processing failed')
        }

        refundResult = await refundResponse.json() as PayPalRefundResponse

        // Update refund record with PayPal refund ID
        await supabase
          .from('refunds')
          .update({
            provider_refund_id: refundResult.id,
            status: refundResult.status === 'COMPLETED' ? 'processed' : 'pending',
            processed_at: refundResult.status === 'COMPLETED' ? new Date().toISOString() : null
          })
          .eq('id', refundRecord.id)

      } catch (paypalError) {
        console.error('PayPal refund failed:', paypalError)
        await supabase
          .from('refunds')
          .update({ status: 'denied' })
          .eq('id', refundRecord.id)
        throw new Error('PayPal refund processing failed')
      }
    }

    // Update payment record with refund amount
    await supabase
      .from('payments')
      .update({
        refund_amount: (paymentRecord.refund_amount || 0) + refund_amount,
        refund_reason: reason,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', payment_id)

    // Log refund in subscription history
    await supabase.from('subscription_history').insert({
      user_id: user.id,
      subscription_id: payment_id,
      provider: paymentRecord.payment_provider,
      action: 'refunded',
      old_status: 'completed',
      new_status: 'refunded',
      amount: refund_amount / 100,
      currency: paymentRecord.currency,
      metadata: {
        refund_id: refundRecord.id,
        provider_refund_id: refundResult?.id,
        reason: reason
      }
    })

    console.log(`Refund processed: ${refundRecord.id} for payment: ${payment_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        refund: {
          id: refundRecord.id,
          provider_refund_id: refundResult?.id,
          amount: refund_amount / 100,
          currency: paymentRecord.currency,
          status: refundResult?.status || 'pending'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing refund:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process refund'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 