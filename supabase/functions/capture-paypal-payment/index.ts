import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderId, userId } = await req.json();

    if (!orderId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get PayPal credentials
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalSecret = Deno.env.get('PAYPAL_SECRET');
    const paypalApiUrl = Deno.env.get('PAYPAL_SANDBOX') === 'true' 
      ? 'https://api-m.sandbox.paypal.com' 
      : 'https://api-m.paypal.com';

    if (!paypalClientId || !paypalSecret) {
      throw new Error('PayPal credentials not configured');
    }

    // Get PayPal access token
    const authResponse = await fetch(`${paypalApiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${paypalClientId}:${paypalSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!authResponse.ok) {
      throw new Error('Failed to authenticate with PayPal');
    }

    const { access_token } = await authResponse.json();

    // Capture the payment
    const captureResponse = await fetch(`${paypalApiUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!captureResponse.ok) {
      const errorData = await captureResponse.json();
      throw new Error(errorData.message || 'Failed to capture PayPal payment');
    }

    const captureData = await captureResponse.json();

    // Extract payment details
    const capture = captureData.purchase_units[0].payments.captures[0];
    const amount = parseFloat(capture.amount.value);

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'payment',
        status: 'succeeded',
        amount: amount,
        currency: capture.amount.currency_code,
        payment_provider: 'paypal',
        provider_payment_id: capture.id,
        description: `PayPal payment - Order ${orderId}`,
        metadata: {
          order_id: orderId,
          capture_id: capture.id,
          payer_email: captureData.payer?.email_address
        }
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      throw transactionError;
    }

    // Log webhook event
    await supabase
      .from('webhook_logs')
      .insert({
        provider: 'paypal',
        event_type: 'payment.capture.completed',
        event_id: capture.id,
        status: 'succeeded',
        request_body: captureData,
        processed_at: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        transactionId: transaction.id,
        captureId: capture.id,
        amount: amount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error capturing PayPal payment:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to capture payment' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 