import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCors } from '../_shared/cors.ts'

interface PayPalTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface PayPalOrderResponse {
  id: string
  status: string
  links: Array<{
    href: string
    rel: string
    method: string
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
    const { amount, currency = 'USD', metadata = {} } = await req.json()

    // Validate amount
    if (!amount || amount < 0.50) {
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

    // Create PayPal order
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency.toUpperCase(),
          value: amount.toFixed(2)
        },
        custom_id: user.id,
        description: metadata.description || 'Car Audio Events Payment',
        reference_id: metadata.event_id || `user_${user.id}_${Date.now()}`
      }],
      application_context: {
        return_url: `${Deno.env.get('FRONTEND_URL')}/payment/success`,
        cancel_url: `${Deno.env.get('FRONTEND_URL')}/payment/cancel`,
        brand_name: 'Car Audio Events',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW'
      }
    }

    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`,
        'PayPal-Request-Id': `${user.id}_${Date.now()}`
      },
      body: JSON.stringify(orderData)
    })

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json()
      console.error('PayPal order creation failed:', errorData)
      throw new Error('Failed to create PayPal order')
    }

    const orderResult: PayPalOrderResponse = await orderResponse.json()

    // Store payment intent in database
    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        id: orderResult.id,
        user_id: user.id,
        amount: Math.round(amount * 100), // Store in cents
        currency: currency.toUpperCase(),
        status: 'pending',
        payment_provider: 'paypal',
        paypal_order_id: orderResult.id,
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

    // Log payment creation
    await supabase.from('subscription_history').insert({
      user_id: user.id,
      subscription_id: orderResult.id,
      provider: 'paypal',
      action: 'created',
      new_status: 'pending',
      amount: amount,
      currency: currency.toUpperCase(),
      metadata: { order_id: orderResult.id }
    })

    console.log(`PayPal order created: ${orderResult.id} for user: ${user.email}`)

    // Find approval URL
    const approvalUrl = orderResult.links.find(link => link.rel === 'approve')?.href

    return new Response(
      JSON.stringify({
        order_id: orderResult.id,
        approval_url: approvalUrl,
        status: orderResult.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating PayPal payment:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create PayPal payment'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 