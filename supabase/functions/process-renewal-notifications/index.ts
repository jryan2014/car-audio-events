import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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
    // Get the number of days to look ahead (default 7)
    const { days = 7 } = await req.json().catch(() => ({ days: 7 }))
    
    console.log(`Processing renewal notifications for subscriptions renewing in ${days} days`)

    // Calculate the date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + days - 1)
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)

    // Find subscriptions that will renew in the specified timeframe
    const { data: subscriptions, error } = await adminClient
      .from('subscriptions')
      .select(`
        *,
        users (
          id,
          name,
          email
        ),
        membership_plans (
          name,
          price,
          billing_period
        )
      `)
      .eq('status', 'active')
      .eq('cancel_at_period_end', false)
      .gte('current_period_end', startDate.toISOString())
      .lte('current_period_end', endDate.toISOString())

    if (error) {
      throw error
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions to notify`)

    const notifications: Array<{
      subscription_id: string;
      user_email: string;
      renewal_date: string;
    }> = []

    // Process each subscription
    for (const subscription of subscriptions || []) {
      if (!subscription.users || !subscription.membership_plans) {
        console.log(`Skipping subscription ${subscription.id} - missing user or plan data`)
        continue
      }

      // Check if we've already sent a notification for this renewal period
      const { data: existingNotification } = await adminClient
        .from('email_queue')
        .select('id')
        .eq('to_email', subscription.users.email)
        .eq('template_id', 'upcoming_renewal')
        .like('template_data', `%"subscription_id":"${subscription.id}"%`)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .single()

      if (existingNotification) {
        console.log(`Skipping subscription ${subscription.id} - notification already sent`)
        continue
      }

      // Queue the email notification
      const { error: emailError } = await adminClient
        .from('email_queue')
        .insert({
          to_email: subscription.users.email,
          template_id: 'upcoming_renewal',
          template_data: {
            name: subscription.users.name || 'Member',
            plan_name: subscription.membership_plans.name,
            renewal_date: new Date(subscription.current_period_end).toLocaleDateString(),
            amount: subscription.membership_plans.price,
            billing_url: `${Deno.env.get('PUBLIC_URL') || 'https://caraudioevents.com'}/billing`,
            subscription_id: subscription.id // For tracking
          },
          priority: 'medium'
        })

      if (emailError) {
        console.error(`Failed to queue email for subscription ${subscription.id}:`, emailError)
      } else {
        notifications.push({
          subscription_id: subscription.id,
          user_email: subscription.users.email,
          renewal_date: subscription.current_period_end
        })
      }
    }

    // Log the job execution
    await adminClient
      .from('billing_audit_log')
      .insert({
        admin_id: null, // System job
        action: 'renewal_notifications_processed',
        entity_type: 'system',
        new_values: {
          notifications_sent: notifications.length,
          days_ahead: days,
          processed_at: new Date().toISOString()
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: notifications.length,
        notifications
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error processing renewal notifications:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
}) 