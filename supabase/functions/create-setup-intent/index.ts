import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { corsHeaders } from '../_shared/cors.ts'
import { AuditLogger } from '../_shared/audit-logger.ts'

/**
 * Creates a Stripe SetupIntent for securely collecting payment method details
 * This is used when adding a new payment method without charging immediately
 */
serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const auditLogger = new AuditLogger()
  const requestInfo = auditLogger.getRequestInfo(req)

  try {
    const { userId } = await req.json()

    if (!userId) {
      throw new Error('User ID is required')
    }

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get Stripe configuration
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('Stripe configuration not found')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    // Get user details
    const { data: user, error: userError } = await adminClient
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw new Error('User not found')
    }

    let customerId = user.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: userId
        }
      })
      customerId = customer.id

      // Update user record with Stripe customer ID
      await adminClient
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)

      // Log customer creation
      await auditLogger.log({
        user_id: userId,
        action: AuditLogger.Actions.STRIPE_CUSTOMER_CREATED,
        metadata: {
          customer_id: customerId,
          email: user.email
        },
        ...requestInfo
      })
    }

    // Create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session', // Allow charging later without customer presence
      metadata: {
        user_id: userId
      }
    })

    // Log setup intent creation
    await auditLogger.log({
      user_id: userId,
      action: AuditLogger.Actions.SETUP_INTENT_CREATED,
      metadata: {
        setup_intent_id: setupIntent.id,
        customer_id: customerId
      },
      ...requestInfo
    })

    return new Response(
      JSON.stringify({
        clientSecret: setupIntent.client_secret,
        customerId: customerId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Setup intent error:', error)
    
    // Log error
    await auditLogger.log({
      action: AuditLogger.Actions.SETUP_INTENT_FAILED,
      error_message: error.message || 'Unknown error',
      ...requestInfo
    })

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create setup intent' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})