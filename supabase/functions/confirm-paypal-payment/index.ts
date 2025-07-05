import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayPalTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface PayPalCaptureResponse {
  id: string
  status: string
  purchase_units: Array<{
    payments: {
      captures: Array<{
        id: string
        status: string
        amount: {
          currency_code: string
          value: string
        }
      }>
    }
  }>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get PayPal configuration from environment
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID')
    const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')
    const paypalEnvironment = Deno.env.get('PAYPAL_ENVIRONMENT') || 'sandbox'
    
    if (!paypalClientId || !paypalClientSecret) {
      throw new Error('PayPal configuration is missing')
    }

    // PayPal API URLs
    const baseUrl = paypalEnvironment === 'production' 
      ? 'https://api.paypal.com'
      : 'https://api.sandbox.paypal.com'

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { order_id } = await req.json()

    if (!order_id) {
      throw new Error('PayPal order ID is required')
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

    // Verify payment exists in database and belongs to user
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .eq('payment_provider', 'paypal')
      .single()

    if (paymentError || !paymentRecord) {
      throw new Error('Payment record not found or unauthorized')
    }

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

    // Capture the PayPal order
    const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${order_id}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`,
        'PayPal-Request-Id': `${user.id}_${Date.now()}_capture`
      }
    })

    if (!captureResponse.ok) {
      const errorData = await captureResponse.json()
      console.error('PayPal capture failed:', errorData)
      throw new Error('Failed to capture PayPal payment')
    }

    const captureResult: PayPalCaptureResponse = await captureResponse.json()

    // Check if capture was successful
    if (captureResult.status === 'COMPLETED') {
      const capture = captureResult.purchase_units[0]?.payments?.captures?.[0]
      
      if (capture && capture.status === 'COMPLETED') {
        // Update payment record
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'succeeded',
            paypal_payment_id: capture.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', order_id)

        if (updateError) {
          console.error('Error updating payment record:', updateError)
        }

        // Log successful payment
        await supabase.from('subscription_history').insert({
          user_id: user.id,
          subscription_id: order_id,
          provider: 'paypal',
          action: 'renewed',
          old_status: 'pending',
          new_status: 'completed',
          amount: parseFloat(capture.amount.value),
          currency: capture.amount.currency_code,
          metadata: { 
            capture_id: capture.id,
            order_id: order_id
          }
        })

        // If this is an event registration payment, create the registration
        if (paymentRecord.metadata?.event_id) {
          const { error: registrationError } = await supabase
            .from('event_registrations')
            .upsert({
              user_id: user.id,
              event_id: paymentRecord.metadata.event_id,
              payment_id: order_id,
              registration_date: new Date().toISOString(),
              status: 'confirmed'
            })

          if (registrationError) {
            console.error('Error creating event registration:', registrationError)
          }
        }

        // Update user's refund eligibility
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            refund_eligible_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
          })
          .eq('id', user.id)

        if (userUpdateError) {
          console.error('Error updating user refund eligibility:', userUpdateError)
        }

        console.log(`PayPal payment confirmed: ${order_id} for user: ${user.email}`)

        return new Response(
          JSON.stringify({
            success: true,
            payment: {
              id: order_id,
              capture_id: capture.id,
              status: 'succeeded',
              amount: parseFloat(capture.amount.value),
              currency: capture.amount.currency_code
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }
    }

    // If we get here, capture failed
    return new Response(
      JSON.stringify({
        success: false,
        status: captureResult.status,
        message: 'PayPal payment capture failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )

  } catch (error) {
    console.error('Error confirming PayPal payment:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to confirm PayPal payment'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 