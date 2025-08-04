import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { corsHeaders } from '../_shared/cors.ts'
import { AuditLogger } from '../_shared/audit-logger.ts'
import { RateLimiter, RateLimitConfigs, createRateLimitHeaders } from '../_shared/rate-limiter.ts'

interface PaymentMethodRequest {
  action: 'add' | 'remove' | 'setDefault' | 'list'
  userId: string
  paymentMethodId?: string
  paymentMethodType?: 'card' | 'paypal'
  setAsDefault?: boolean
}

/**
 * Production-ready payment method management
 * Handles Stripe payment methods securely without storing sensitive data
 */
serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const rateLimiter = new RateLimiter(RateLimitConfigs.api)
  const auditLogger = new AuditLogger()
  const requestInfo = auditLogger.getRequestInfo(req)

  try {
    // Parse request
    const { action, userId, paymentMethodId, paymentMethodType, setAsDefault } = await req.json() as PaymentMethodRequest

    if (!action || !userId) {
      throw new Error('Missing required parameters')
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

    // Get user's Stripe customer ID
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

      // Update user record
      await adminClient
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    }

    switch (action) {
      case 'add': {
        if (!paymentMethodId) {
          throw new Error('Payment method ID required')
        }

        // Attach payment method to customer
        const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId
        })

        // Set as default if requested
        if (setAsDefault) {
          await stripe.customers.update(customerId, {
            invoice_settings: {
              default_payment_method: paymentMethodId
            }
          })

          // Update all existing methods to not default
          await adminClient
            .from('payment_methods')
            .update({ is_default: false })
            .eq('user_id', userId)
        }

        // Store payment method reference (NO sensitive data)
        const { error: insertError } = await adminClient
          .from('payment_methods')
          .insert({
            user_id: userId,
            type: paymentMethod.type as 'card' | 'paypal',
            provider: 'stripe',
            provider_payment_method_id: paymentMethod.id,
            is_default: setAsDefault || false,
            last4: paymentMethod.card?.last4,
            brand: paymentMethod.card?.brand,
            exp_month: paymentMethod.card?.exp_month,
            exp_year: paymentMethod.card?.exp_year,
            metadata: {
              funding: paymentMethod.card?.funding,
              country: paymentMethod.card?.country
            }
          })

        if (insertError) {
          throw insertError
        }

        // Log action
        await auditLogger.log({
          user_id: userId,
          action: AuditLogger.Actions.PAYMENT_METHOD_ADDED,
          metadata: {
            payment_method_id: paymentMethod.id,
            type: paymentMethod.type,
            last4: paymentMethod.card?.last4
          },
          ...requestInfo
        })

        return new Response(
          JSON.stringify({ 
            success: true, 
            paymentMethod: {
              id: paymentMethod.id,
              type: paymentMethod.type,
              card: paymentMethod.card ? {
                brand: paymentMethod.card.brand,
                last4: paymentMethod.card.last4,
                exp_month: paymentMethod.card.exp_month,
                exp_year: paymentMethod.card.exp_year
              } : null
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'remove': {
        if (!paymentMethodId) {
          throw new Error('Payment method ID required')
        }

        // Get payment method from database
        const { data: dbPaymentMethod, error: fetchError } = await adminClient
          .from('payment_methods')
          .select('provider_payment_method_id')
          .eq('id', paymentMethodId)
          .eq('user_id', userId)
          .single()

        if (fetchError || !dbPaymentMethod) {
          throw new Error('Payment method not found')
        }

        // Detach from Stripe
        await stripe.paymentMethods.detach(dbPaymentMethod.provider_payment_method_id)

        // Remove from database
        const { error: deleteError } = await adminClient
          .from('payment_methods')
          .delete()
          .eq('id', paymentMethodId)
          .eq('user_id', userId)

        if (deleteError) {
          throw deleteError
        }

        // Log action
        await auditLogger.log({
          user_id: userId,
          action: AuditLogger.Actions.PAYMENT_METHOD_REMOVED,
          metadata: {
            payment_method_id: paymentMethodId
          },
          ...requestInfo
        })

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'setDefault': {
        if (!paymentMethodId) {
          throw new Error('Payment method ID required')
        }

        // Get payment method
        const { data: dbPaymentMethod, error: fetchError } = await adminClient
          .from('payment_methods')
          .select('provider_payment_method_id')
          .eq('id', paymentMethodId)
          .eq('user_id', userId)
          .single()

        if (fetchError || !dbPaymentMethod) {
          throw new Error('Payment method not found')
        }

        // Update Stripe customer default
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: dbPaymentMethod.provider_payment_method_id
          }
        })

        // Update database
        await adminClient
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', userId)

        await adminClient
          .from('payment_methods')
          .update({ is_default: true })
          .eq('id', paymentMethodId)

        // Log action
        await auditLogger.log({
          user_id: userId,
          action: AuditLogger.Actions.PAYMENT_METHOD_DEFAULT_CHANGED,
          metadata: {
            payment_method_id: paymentMethodId
          },
          ...requestInfo
        })

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'list': {
        // Get payment methods from Stripe
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: 'card'
        })

        // Sync with database
        for (const pm of paymentMethods.data) {
          const { data: existing } = await adminClient
            .from('payment_methods')
            .select('id')
            .eq('provider_payment_method_id', pm.id)
            .single()

          if (!existing) {
            // Add missing payment method
            await adminClient
              .from('payment_methods')
              .insert({
                user_id: userId,
                type: 'card',
                provider: 'stripe',
                provider_payment_method_id: pm.id,
                is_default: false,
                last4: pm.card?.last4,
                brand: pm.card?.brand,
                exp_month: pm.card?.exp_month,
                exp_year: pm.card?.exp_year
              })
          }
        }

        // Get all from database
        const { data: dbPaymentMethods, error: listError } = await adminClient
          .from('payment_methods')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (listError) {
          throw listError
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            paymentMethods: dbPaymentMethods || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Payment method error:', error)
    
    // Log error
    await auditLogger.log({
      action: AuditLogger.Actions.PAYMENT_METHOD_ERROR,
      error_message: error.message || 'Unknown error',
      ...requestInfo
    })

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process payment method' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})