import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { getStripeConfig } from '../_shared/payment-config.ts'
import { RateLimiter, RateLimitConfigs, createRateLimitHeaders } from '../_shared/rate-limiter.ts'
import { AuditLogger } from '../_shared/audit-logger.ts'
import { getCorsHeaders, handleSecureCors } from '../_shared/cors.ts'
import { EdgeFunctionHeaders, createSecurityMiddleware, addRateLimitHeaders } from '../_shared/security-headers.ts'


serve(async (req) => {
  // Handle CORS preflight requests with enhanced security
  const corsResponse = handleSecureCors(req);
  if (corsResponse) {
    return corsResponse;
  }
  
  // Initialize security middleware
  const securityMiddleware = createSecurityMiddleware();
  
  // Validate request security
  const requestValidation = securityMiddleware.validateRequest(req);
  if (!requestValidation.valid) {
    return requestValidation.response!;
  }
  
  // Get secure headers for payment operations
  const corsHeaders = getCorsHeaders(req);
  const paymentHeaders = EdgeFunctionHeaders.payment(corsHeaders);

  // Initialize rate limiter for payment creation
  const rateLimiter = new RateLimiter(RateLimitConfigs.payment);
  
  // Initialize audit logger
  const auditLogger = new AuditLogger();
  const requestInfo = auditLogger.getRequestInfo(req);
  
  // Get user identifier for rate limiting
  const authHeader = req.headers.get('Authorization');
  let rateLimitKey = 'anonymous';
  
  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get Stripe configuration using shared config
    const stripeConfig = await getStripeConfig();

    // Initialize Stripe with the correct configuration
    const stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: '2023-10-16',
    })

    // Parse request body
    const { amount, currency = 'usd', metadata = {} } = await req.json()

    // Enhanced amount validation
    if (!amount || typeof amount !== 'number') {
      throw new Error('Amount must be a valid number')
    }

    // Check for negative amounts
    if (amount < 0) {
      throw new Error('Amount cannot be negative')
    }

    // Check for unreasonably large amounts
    if (amount > 99999999) { // $999,999.99
      throw new Error('Amount exceeds maximum allowed')
    }

    // Currency-specific minimum validation
    const minimumAmounts: Record<string, number> = {
      usd: 50,  // $0.50
      eur: 50,  // €0.50
      gbp: 30,  // £0.30
      cad: 50,  // C$0.50
      aud: 50,  // A$0.50
    }

    const minAmount = minimumAmounts[currency.toLowerCase()] || 50
    if (amount < minAmount) {
      throw new Error(`Amount must be at least ${(minAmount / 100).toFixed(2)} ${currency.toUpperCase()}`)
    }

    // Validate currency
    const supportedCurrencies = Object.keys(minimumAmounts)
    if (!supportedCurrencies.includes(currency.toLowerCase())) {
      throw new Error(`Unsupported currency: ${currency}. Supported: ${supportedCurrencies.join(', ')}`)
    }

    // Sanitize metadata - remove any potential XSS or injection attempts
    const sanitizedMetadata: Record<string, string> = {}
    if (metadata && typeof metadata === 'object') {
      const metadataKeys = Object.keys(metadata).slice(0, 50) // Limit to 50 keys
      for (const key of metadataKeys) {
        const sanitizedKey = String(key).slice(0, 40) // Max 40 chars for keys
        const value = metadata[key]
        let sanitizedValue: string
        
        if (value === null || value === undefined) {
          sanitizedValue = ''
        } else if (typeof value === 'object') {
          sanitizedValue = JSON.stringify(value).slice(0, 500) // Max 500 chars for values
        } else {
          sanitizedValue = String(value).slice(0, 500)
        }
        
        // Remove potentially dangerous characters
        sanitizedValue = sanitizedValue.replace(/[<>]/g, '').replace(/\0/g, '')
        sanitizedMetadata[sanitizedKey] = sanitizedValue
      }
    }

    // Get user from authorization header (optional for membership purchases)
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(token)
      
      if (!userError && authUser) {
        user = authUser;
        rateLimitKey = `user:${user.id}`;
      }
    } else {
      // Use IP for anonymous users
      const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                       req.headers.get('cf-connecting-ip') || 
                       'unknown';
      rateLimitKey = `ip:${ipAddress}`;
    }
    
    // Check rate limit
    const rateLimitResult = await rateLimiter.checkLimit(rateLimitKey);
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
    
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for payment creation: ${rateLimitKey}`);
      
      // Log rate limit exceeded
      await auditLogger.log({
        user_id: user?.id,
        action: AuditLogger.Actions.RATE_LIMIT_EXCEEDED,
        provider: 'stripe',
        metadata: { 
          endpoint: 'create-payment-intent',
          identifier: rateLimitKey 
        },
        ...requestInfo
      });
      
      const secureHeaders = addRateLimitHeaders(paymentHeaders, rateLimitHeaders);
      
      return new Response(
        JSON.stringify({ 
          error: 'Too many payment attempts. Please try again later.', 
          retryAfter: rateLimitResult.retryAfter 
        }),
        {
          headers: secureHeaders,
          status: 429,
        }
      )
    }

    // For membership purchases, we allow anonymous users
    // The user info will be collected in the payment form
    const userId = user?.id || 'anonymous';
    const userEmail = user?.email || metadata.email || 'anonymous@membership.purchase';

    // Add configuration info to sanitized metadata
    const enhancedMetadata = {
      user_id: userId,
      user_email: userEmail,
      stripe_mode: stripeConfig.isTestMode ? 'test' : 'live',
      ...sanitizedMetadata
    };

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in cents
      currency: currency.toLowerCase(),
      metadata: enhancedMetadata,
      payment_method_types: ['card', 'link'], // Match frontend configuration
    })

    // Store payment intent in database with enhanced schema (only for authenticated users)
    if (user) {
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          id: paymentIntent.id,
          user_id: user.id,
          amount: Math.round(amount),
          currency: currency.toLowerCase(),
          status: paymentIntent.status,
          payment_provider: 'stripe',
          stripe_payment_intent_id: paymentIntent.id,
          metadata: enhancedMetadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Error storing payment record:', insertError)
        // Continue anyway - webhook will handle this
      }

      // Log payment creation in subscription history
      await supabase.from('subscription_history').insert({
        user_id: user.id,
        subscription_id: paymentIntent.id,
        provider: 'stripe',
        action: 'created',
        new_status: paymentIntent.status,
        amount: amount / 100,
        currency: currency.toLowerCase(),
        metadata: { 
          payment_intent_id: paymentIntent.id,
          stripe_mode: stripeConfig.isTestMode ? 'test' : 'live'
        }
      })

      // Update user's refund eligibility window
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          refund_eligible_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        })
        .eq('id', user.id)

      if (userUpdateError) {
        console.error('Error updating user refund eligibility:', userUpdateError)
      }
    }

    // Log payment intent creation
    console.log(`Payment intent created: ${paymentIntent.id} for user: ${userEmail} (${stripeConfig.isTestMode ? 'test' : 'live'} mode)`)
    
    // Audit log the payment intent creation
    await auditLogger.log({
      user_id: user?.id || undefined,
      action: AuditLogger.Actions.PAYMENT_INTENT_CREATED,
      provider: 'stripe',
      payment_intent_id: paymentIntent.id,
      amount: amount / 100, // Convert to dollars
      currency: currency.toLowerCase(),
      status: paymentIntent.status,
      metadata: enhancedMetadata,
      ...requestInfo
    });

    const successHeaders = addRateLimitHeaders(paymentHeaders, rateLimitHeaders);
    
    return securityMiddleware.createResponse(
      {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        provider: 'stripe',
        mode: stripeConfig.isTestMode ? 'test' : 'live'
      },
      corsHeaders,
      {
        sensitiveOperation: true,
        customHeaders: rateLimitHeaders
      }
    )

  } catch (error) {
    console.error('Error creating payment intent:', error)
    
    // Audit log the failure
    await auditLogger.log({
      user_id: user?.id || undefined,
      action: AuditLogger.Actions.PAYMENT_INTENT_FAILED,
      provider: 'stripe',
      error_message: error.message || 'Unknown error',
      metadata: { 
        amount: amount / 100,
        currency,
        rateLimitKey 
      },
      ...requestInfo
    });
    
    const errorHeaders = addRateLimitHeaders(paymentHeaders, rateLimitHeaders);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create payment intent'
      }),
      {
        headers: errorHeaders,
        status: 400,
      }
    )
  }
}) 