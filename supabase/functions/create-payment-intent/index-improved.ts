/**
 * Improved Create Payment Intent Edge Function
 * Demonstrates integration with new validation and error handling frameworks
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { z } from 'zod';

// Import our new validation and error handling frameworks
import {
  validatePaymentRequest,
  createErrorResponse,
  createSuccessResponse,
  EdgeValidationSchemas,
} from '../_shared/validation-middleware.ts';

// Import existing utilities
import { getStripeConfig } from '../_shared/payment-config.ts';
import { AuditLogger } from '../_shared/audit-logger.ts';
import { getCorsHeaders, handleSecureCors } from '../_shared/cors.ts';
import { EdgeFunctionHeaders, createSecurityMiddleware } from '../_shared/security-headers.ts';

// Define payment creation schema with enhanced validation
const paymentCreationSchema = z.object({
  amount: EdgeValidationSchemas.paymentAmount,
  currency: EdgeValidationSchemas.currency,
  paymentMethodId: EdgeValidationSchemas.paymentMethodId.optional(),
  email: EdgeValidationSchemas.email.optional(),
  metadata: EdgeValidationSchemas.metadata,
  description: z.string().max(1000).optional(),
  eventId: EdgeValidationSchemas.uuid.optional(),
  registrationId: EdgeValidationSchemas.uuid.optional(),
});

type PaymentCreationData = z.infer<typeof paymentCreationSchema>;

serve(async (req) => {
  // Handle CORS preflight with enhanced security
  const corsResponse = handleSecureCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  // Initialize security middleware and audit logging
  const securityMiddleware = createSecurityMiddleware();
  const auditLogger = new AuditLogger();
  const requestInfo = auditLogger.getRequestInfo(req);

  try {
    // 1. VALIDATION PHASE - Use new validation middleware
    console.log('🔍 Starting payment request validation...');
    
    const validationResult = await validatePaymentRequest(req);
    
    if (!validationResult.success) {
      console.warn('❌ Payment validation failed:', validationResult.error);
      
      // Log validation failure for security monitoring
      await auditLogger.log({
        action: AuditLogger.Actions.VALIDATION_FAILED,
        provider: 'stripe',
        error_message: validationResult.error?.message,
        metadata: {
          endpoint: 'create-payment-intent',
          validationErrors: validationResult.error?.details?.validationErrors,
        },
        ...requestInfo
      });
      
      return createErrorResponse(validationResult);
    }

    const paymentData = validationResult.data!;
    console.log('✅ Payment validation successful');

    // 2. INITIALIZATION PHASE - Setup services
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Stripe configuration
    const stripeConfig = await getStripeConfig();
    const stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: '2023-10-16',
    });

    // 3. USER AUTHENTICATION PHASE
    const authHeader = req.headers.get('Authorization');
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(token);
      
      if (!userError && authUser) {
        user = authUser;
        console.log(`👤 Authenticated user: ${user.email}`);
      }
    }

    // For anonymous membership purchases, require email in payment data
    if (!user && !paymentData.email) {
      return createErrorResponse({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication or email required for payment',
          httpStatus: 401,
        },
      });
    }

    // 4. BUSINESS LOGIC VALIDATION PHASE
    const userId = user?.id || 'anonymous';
    const userEmail = user?.email || paymentData.email || 'anonymous@payment.com';

    // Enhanced metadata with security context
    const enhancedMetadata = {
      user_id: userId,
      user_email: userEmail,
      stripe_mode: stripeConfig.isTestMode ? 'test' : 'live',
      request_id: crypto.randomUUID(),
      created_via: 'edge_function_v2',
      ...(paymentData.metadata || {}),
    };

    // 5. PAYMENT CREATION PHASE
    console.log(`💳 Creating payment intent for ${userEmail} - $${paymentData.amount / 100} ${paymentData.currency.toUpperCase()}`);

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: paymentData.amount,
      currency: paymentData.currency,
      metadata: enhancedMetadata,
      payment_method_types: ['card', 'link'],
    };

    // Add description if provided
    if (paymentData.description) {
      paymentIntentParams.description = paymentData.description.slice(0, 1000); // Stripe limit
    }

    // Add automatic payment methods for better UX
    paymentIntentParams.automatic_payment_methods = {
      enabled: true,
    };

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    console.log(`✅ Payment intent created: ${paymentIntent.id}`);

    // 6. DATABASE STORAGE PHASE (for authenticated users)
    if (user) {
      // Store payment record
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          id: paymentIntent.id,
          user_id: user.id,
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: paymentIntent.status,
          payment_provider: 'stripe',
          stripe_payment_intent_id: paymentIntent.id,
          metadata: enhancedMetadata,
          event_id: paymentData.eventId || null,
          registration_id: paymentData.registrationId || null,
          description: paymentData.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('⚠️ Error storing payment record:', insertError);
        // Continue anyway - webhook will handle this
      }

      // Log in subscription history for membership payments
      if (!paymentData.eventId) {
        await supabase.from('subscription_history').insert({
          user_id: user.id,
          subscription_id: paymentIntent.id,
          provider: 'stripe',
          action: 'created',
          new_status: paymentIntent.status,
          amount: paymentData.amount / 100,
          currency: paymentData.currency,
          metadata: {
            payment_intent_id: paymentIntent.id,
            stripe_mode: stripeConfig.isTestMode ? 'test' : 'live',
          },
        });
      }

      // Update user's refund eligibility for membership purchases
      if (!paymentData.eventId) {
        const refundDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await supabase
          .from('users')
          .update({ refund_eligible_until: refundDeadline.toISOString() })
          .eq('id', user.id);
      }
    }

    // 7. AUDIT LOGGING PHASE
    await auditLogger.log({
      user_id: user?.id,
      action: AuditLogger.Actions.PAYMENT_INTENT_CREATED,
      provider: 'stripe',
      payment_intent_id: paymentIntent.id,
      amount: paymentData.amount / 100,
      currency: paymentData.currency,
      status: paymentIntent.status,
      metadata: {
        ...enhancedMetadata,
        event_id: paymentData.eventId,
        registration_id: paymentData.registrationId,
      },
      ...requestInfo,
    });

    console.log('📝 Audit log completed');

    // 8. SUCCESS RESPONSE PHASE
    const responseData = {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      provider: 'stripe',
      mode: stripeConfig.isTestMode ? 'test' : 'live',
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: paymentIntent.status,
    };

    // Include rate limit headers from validation
    const headers = new Headers(getCorsHeaders(req));
    if (validationResult.rateLimitHeaders) {
      Object.entries(validationResult.rateLimitHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    console.log('🎉 Payment intent created successfully');
    return createSuccessResponse(responseData, Object.fromEntries(headers.entries()));

  } catch (error) {
    console.error('💥 Payment intent creation failed:', error);

    // Use our secure error handler to create safe error response
    const secureError = {
      code: 'PAYMENT_CREATION_FAILED',
      message: 'Failed to create payment intent',
      httpStatus: 500,
    };

    // Determine specific error type based on error message
    const errorMessage = error.message?.toLowerCase() || '';
    
    if (errorMessage.includes('insufficient funds')) {
      secureError.code = 'INSUFFICIENT_FUNDS';
      secureError.message = 'Insufficient funds for this transaction';
      secureError.httpStatus = 402;
    } else if (errorMessage.includes('card') && errorMessage.includes('declined')) {
      secureError.code = 'CARD_DECLINED';
      secureError.message = 'Your card was declined';
      secureError.httpStatus = 402;
    } else if (errorMessage.includes('invalid')) {
      secureError.code = 'INVALID_PAYMENT_DATA';
      secureError.message = 'Invalid payment information provided';
      secureError.httpStatus = 400;
    }

    // Audit log the failure with sanitized error information
    await auditLogger.log({
      user_id: user?.id,
      action: AuditLogger.Actions.PAYMENT_INTENT_FAILED,
      provider: 'stripe',
      error_message: error.message?.substring(0, 200) || 'Unknown error', // Limit error message length
      metadata: {
        amount: paymentData?.amount ? paymentData.amount / 100 : undefined,
        currency: paymentData?.currency,
        error_code: secureError.code,
      },
      ...requestInfo,
    });

    return createErrorResponse({
      success: false,
      error: {
        ...secureError,
        details: {
          errorId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          retryable: secureError.httpStatus < 500,
        },
      },
    });
  }
});

/**
 * USAGE EXAMPLES:
 * 
 * 1. Authenticated user payment:
 * POST /functions/v1/create-payment-intent
 * Headers: Authorization: Bearer <jwt_token>
 * Body: {
 *   "amount": 2500,
 *   "currency": "usd",
 *   "description": "Event registration fee",
 *   "eventId": "uuid-here",
 *   "metadata": { "eventName": "Car Audio Championship 2025" }
 * }
 * 
 * 2. Anonymous membership purchase:
 * POST /functions/v1/create-payment-intent
 * Body: {
 *   "amount": 3500,
 *   "currency": "usd",
 *   "email": "admin@caraudioevents.com",
 *   "description": "Annual membership",
 *   "metadata": { "membershipType": "premium" }
 * }
 * 
 * 3. Response format:
 * Success: {
 *   "success": true,
 *   "data": {
 *     "client_secret": "pi_xxx_secret_xxx",
 *     "payment_intent_id": "pi_xxx",
 *     "provider": "stripe",
 *     "mode": "test",
 *     "amount": 2500,
 *     "currency": "usd",
 *     "status": "requires_payment_method"
 *   }
 * }
 * 
 * Error: {
 *   "success": false,
 *   "error": {
 *     "code": "EDGE_VAL_001",
 *     "message": "Invalid request data",
 *     "httpStatus": 400,
 *     "details": {
 *       "validationErrors": ["amount: Must be greater than zero"]
 *     }
 *   }
 * }
 */