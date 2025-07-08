import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Stripe configuration
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured')
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { userId, planId, billingPeriod } = await req.json()

    // Validate input
    if (!userId || !planId || !billingPeriod) {
      throw new Error('Missing required parameters')
    }

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user || user.id !== userId) {
      throw new Error('Unauthorized')
    }

    // Get user's Stripe customer ID
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single()

    if (userDataError || !userData) {
      throw new Error('User not found')
    }

    // Get the new plan details
    const { data: newPlan, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single()

    if (planError || !newPlan) {
      throw new Error('Plan not found')
    }

    // Get current subscription
    const { data: currentSub, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (subError) {
      throw new Error('Error fetching current subscription')
    }

    let subscriptionResult

    if (currentSub && currentSub.provider_subscription_id && currentSub.payment_provider === 'stripe') {
      // Update existing Stripe subscription with proration
      const stripeResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${currentSub.provider_subscription_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'items[0][id]': currentSub.stripe_subscription_item_id || '',
          'items[0][price]': newPlan.stripe_price_id || '',
          'proration_behavior': 'create_prorations',
          'billing_cycle_anchor': 'unchanged'
        })
      })

      if (!stripeResponse.ok) {
        const errorData = await stripeResponse.json()
        console.error('Stripe subscription update failed:', errorData)
        throw new Error('Failed to update Stripe subscription')
      }

      subscriptionResult = await stripeResponse.json()

      // Update our database record
      await supabase
        .from('subscriptions')
        .update({
          membership_plan_id: planId,
          updated_at: new Date().toISOString(),
          metadata: {
            ...currentSub.metadata,
            last_plan_change: new Date().toISOString(),
            previous_plan_id: currentSub.membership_plan_id
          }
        })
        .eq('id', currentSub.id)

    } else {
      // Create new subscription or update non-Stripe subscription
      if (currentSub) {
        // Update existing subscription
        await supabase
          .from('subscriptions')
          .update({
            membership_plan_id: planId,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSub.id)
      } else {
        // Create new subscription record
        const { data: newSub } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            membership_plan_id: planId,
            status: 'active',
            payment_provider: 'stripe',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + (billingPeriod === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single()

        subscriptionResult = newSub
      }
    }

    // Log the subscription change
    await supabase
      .from('subscription_history')
      .insert({
        user_id: userId,
        subscription_id: currentSub?.id || subscriptionResult?.id,
        action: 'plan_changed',
        previous_status: currentSub?.status,
        new_status: 'active',
        previous_plan_id: currentSub?.membership_plan_id,
        new_plan_id: planId,
        metadata: {
          billing_period: billingPeriod,
          change_type: currentSub ? 'update' : 'create'
        }
      })

    // Queue email notification
    await supabase
      .from('email_queue')
      .insert({
        to_email: userData.email,
        template_id: 'plan_changed',
        template_data: {
          user_name: user.user_metadata?.name || userData.email,
          new_plan_name: newPlan.name,
          billing_period: billingPeriod
        },
        priority: 'normal'
      })

    console.log(`Subscription updated for user ${userId} to plan ${planId}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription updated successfully',
        subscription: subscriptionResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error updating subscription:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to update subscription'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 