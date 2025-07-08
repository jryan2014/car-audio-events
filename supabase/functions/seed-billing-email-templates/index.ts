import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const billingEmailTemplates = [
  {
    name: 'payment_success',
    subject: '🎉 Payment Successful - Car Audio Events',
    body: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0ea5e9, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .success-icon { font-size: 48px; margin-bottom: 10px; }
        .amount { font-size: 24px; font-weight: bold; color: #059669; }
        .details { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">✅</div>
            <h1>Payment Successful!</h1>
        </div>
        <div class="content">
            <p>Hi {{name}},</p>
            <p>Great news! Your payment has been successfully processed.</p>
            
            <div class="details">
                <h3>Payment Details:</h3>
                <p><strong>Amount:</strong> <span class="amount">\${{amount}}</span></p>
                <p><strong>Payment Method:</strong> {{payment_method}}</p>
                <p><strong>Date:</strong> {{payment_date}}</p>
            </div>
            
            <p>Your membership is now active and you have full access to all Car Audio Events features.</p>
            <p>Thank you for being part of our community!</p>
        </div>
        <div class="footer">
            <p>Car Audio Events Team<br>
            <a href="{{website_url}}">Visit our website</a></p>
        </div>
    </div>
</body>
</html>
    `
  },
  {
    name: 'payment_failed',
    subject: '❌ Payment Failed - Action Required',
    body: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .error-icon { font-size: 48px; margin-bottom: 10px; }
        .retry-button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .details { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="error-icon">⚠️</div>
            <h1>Payment Failed</h1>
        </div>
        <div class="content">
            <p>Hi {{name}},</p>
            <p>We were unable to process your payment for your Car Audio Events membership.</p>
            
            <div class="details">
                <h3>What happened?</h3>
                <p>Your {{payment_method}} payment could not be completed. This might be due to:</p>
                <ul>
                    <li>Insufficient funds</li>
                    <li>Expired card</li>
                    <li>Bank security restrictions</li>
                    <li>Incorrect billing information</li>
                </ul>
            </div>
            
            <p>Don't worry - you can easily retry your payment or update your payment method.</p>
            
            <a href="{{retry_payment_url}}" class="retry-button">Retry Payment</a>
            
            <p>If you continue to experience issues, please contact our support team.</p>
        </div>
        <div class="footer">
            <p>Car Audio Events Team<br>
            <a href="{{website_url}}">Visit our website</a> | <a href="{{support_url}}">Get Support</a></p>
        </div>
    </div>
</body>
</html>
    `
  },
  {
    name: 'upcoming_renewal',
    subject: '🔔 Your membership renews in 3 days',
    body: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #0ea5e9); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .reminder-icon { font-size: 48px; margin-bottom: 10px; }
        .renewal-details { background: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .manage-button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="reminder-icon">🔔</div>
            <h1>Renewal Reminder</h1>
        </div>
        <div class="content">
            <p>Hi {{name}},</p>
            <p>Just a friendly reminder that your Car Audio Events membership will automatically renew in <strong>3 days</strong>.</p>
            
            <div class="renewal-details">
                <h3>Renewal Details:</h3>
                <p><strong>Plan:</strong> {{plan_name}}</p>
                <p><strong>Amount:</strong> \${{renewal_amount}}</p>
                <p><strong>Renewal Date:</strong> {{renewal_date}}</p>
                <p><strong>Payment Method:</strong> {{payment_method}}</p>
            </div>
            
            <p>No action is required - your membership will automatically continue with uninterrupted access to all features.</p>
            
            <p>Want to make changes? You can update your plan or payment method anytime.</p>
            
            <a href="{{billing_url}}" class="manage-button">Manage Billing</a>
        </div>
        <div class="footer">
            <p>Car Audio Events Team<br>
            <a href="{{website_url}}">Visit our website</a></p>
        </div>
    </div>
</body>
</html>
    `
  },
  {
    name: 'subscription_cancelled',
    subject: '👋 Subscription Cancelled - We\'ll miss you!',
    body: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6b7280, #4b5563); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .cancel-icon { font-size: 48px; margin-bottom: 10px; }
        .access-info { background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .reactivate-button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="cancel-icon">👋</div>
            <h1>Subscription Cancelled</h1>
        </div>
        <div class="content">
            <p>Hi {{name}},</p>
            <p>We're sorry to see you go! Your Car Audio Events subscription has been successfully cancelled.</p>
            
            <div class="access-info">
                <h3>Important Information:</h3>
                <p><strong>Access Until:</strong> {{access_end_date}}</p>
                <p>You'll continue to have full access to all features until your current billing period ends.</p>
            </div>
            
            <p>We'd love to have you back anytime! Your account will remain active, and you can reactivate your subscription at any time.</p>
            
            <p><strong>Feedback:</strong> We're always working to improve. If you have a moment, we'd appreciate any feedback about your experience.</p>
            
            <a href="{{reactivate_url}}" class="reactivate-button">Reactivate Subscription</a>
            
            <p>Thank you for being part of the Car Audio Events community!</p>
        </div>
        <div class="footer">
            <p>Car Audio Events Team<br>
            <a href="{{website_url}}">Visit our website</a> | <a href="{{feedback_url}}">Share Feedback</a></p>
        </div>
    </div>
</body>
</html>
    `
  },
  {
    name: 'plan_changed',
    subject: '🎉 Plan Updated Successfully',
    body: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #059669, #0ea5e9); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .update-icon { font-size: 48px; margin-bottom: 10px; }
        .plan-details { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .features-list { background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="update-icon">🎉</div>
            <h1>Plan Updated!</h1>
        </div>
        <div class="content">
            <p>Hi {{user_name}},</p>
            <p>Great news! Your subscription plan has been successfully updated.</p>
            
            <div class="plan-details">
                <h3>Your New Plan:</h3>
                <p><strong>{{new_plan_name}}</strong></p>
                <p><strong>Billing:</strong> {{billing_period}}</p>
                <p>Your new features are now active!</p>
            </div>
            
            <div class="features-list">
                <h3>What's included:</h3>
                <p>Your upgraded plan gives you access to enhanced features and capabilities. Log in to explore everything your new plan offers!</p>
            </div>
            
            <p>Thank you for continuing to grow with Car Audio Events!</p>
        </div>
        <div class="footer">
            <p>Car Audio Events Team<br>
            <a href="{{website_url}}">Visit our website</a></p>
        </div>
    </div>
</body>
</html>
    `
  }
];

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

    // Get user from authorization header for admin check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('membershipType')
      .eq('id', user.id)
      .single()

    if (!profile || profile.membershipType !== 'admin') {
      throw new Error('Admin access required')
    }

    console.log('Seeding billing email templates...')
    const results = []

    for (const template of billingEmailTemplates) {
      try {
        // Check if template already exists
        const { data: existing } = await supabase
          .from('email_templates')
          .select('id')
          .eq('name', template.name)
          .maybeSingle()

        if (existing) {
          // Update existing template
          const { data, error } = await supabase
            .from('email_templates')
            .update({
              subject: template.subject,
              body: template.body,
              updated_at: new Date().toISOString()
            })
            .eq('name', template.name)
            .select()
            .single()

          if (error) throw error
          results.push({ action: 'updated', template: template.name, data })
        } else {
          // Create new template
          const { data, error } = await supabase
            .from('email_templates')
            .insert({
              name: template.name,
              subject: template.subject,
              body: template.body
            })
            .select()
            .single()

          if (error) throw error
          results.push({ action: 'created', template: template.name, data })
        }

        console.log(`✓ ${template.name} template processed`)
      } catch (error) {
        console.error(`✗ Error processing ${template.name}:`, error)
        results.push({ action: 'error', template: template.name, error: error.message })
      }
    }

    console.log('Billing email templates seeding completed!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Billing email templates seeded successfully',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error seeding email templates:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to seed email templates'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 