import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

    console.log('Processing renewal notifications...')

    // Get subscriptions that renew in 3 days
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    threeDaysFromNow.setHours(0, 0, 0, 0)

    const fourDaysFromNow = new Date(threeDaysFromNow)
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 1)

    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        users!inner (id, name, email),
        membership_plans!inner (id, name, price, billing_period),
        payment_methods (id, brand, last4, type, is_default)
      `)
      .eq('status', 'active')
      .eq('cancel_at_period_end', false)
      .gte('current_period_end', threeDaysFromNow.toISOString())
      .lt('current_period_end', fourDaysFromNow.toISOString())

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      throw subError
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No upcoming renewals found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No upcoming renewals found',
          processed: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`Processing ${subscriptions.length} renewal notifications`)

    let successCount = 0
    let errorCount = 0

    for (const subscription of subscriptions) {
      try {
        const user = (subscription as any).users
        const plan = (subscription as any).membership_plans
        const paymentMethods = (subscription as any).payment_methods || []
        
        // Find default payment method
        const defaultPaymentMethod = paymentMethods.find((pm: any) => pm.is_default) || paymentMethods[0]
        const paymentMethodDisplay = defaultPaymentMethod 
          ? `${defaultPaymentMethod.brand || defaultPaymentMethod.type} ending in ${defaultPaymentMethod.last4 || '****'}`
          : 'Default payment method'

        // Queue renewal reminder email
        const { error: emailError } = await supabase
          .from('email_queue')
          .insert({
            to_email: user.email,
            template_id: 'upcoming_renewal',
            template_data: {
              name: user.name || user.email.split('@')[0],
              email: user.email,
              plan_name: plan.name,
              renewal_amount: (plan.price / 100).toFixed(2),
              renewal_date: new Date(subscription.current_period_end).toLocaleDateString(),
              payment_method: paymentMethodDisplay,
              billing_url: 'https://car-audio-events.netlify.app/billing',
              website_url: 'https://car-audio-events.netlify.app',
              support_url: 'https://car-audio-events.netlify.app/contact'
            },
            priority: 'normal',
            status: 'pending'
          })

        if (emailError) {
          console.error(`Failed to queue renewal email for user ${user.id}:`, emailError)
          errorCount++
        } else {
          console.log(`✓ Queued renewal reminder for ${user.email}`)
          successCount++
        }

        // Log the notification
        await supabase
          .from('activity_logs')
          .insert({
            user_id: user.id,
            activity_type: 'renewal_notification_sent',
            activity_description: `Renewal reminder sent for subscription renewing on ${new Date(subscription.current_period_end).toLocaleDateString()}`,
            metadata: {
              subscription_id: subscription.id,
              plan_name: plan.name,
              renewal_date: subscription.current_period_end
            }
          })

      } catch (error) {
        console.error(`Failed to process renewal notification for subscription ${subscription.id}:`, error)
        errorCount++
      }
    }

    const result = {
      success: true,
      message: `Processed ${subscriptions.length} renewal notifications`,
      processed: successCount,
      errors: errorCount,
      total: subscriptions.length
    }

    console.log('Renewal notification processing complete:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error processing renewal notifications:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 