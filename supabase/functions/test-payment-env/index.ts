import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCors } from '../_shared/cors.ts'

/**
 * Test function to verify payment environment variables are properly set
 * This only returns masked values for security
 */

function maskValue(value: string | undefined): string {
  if (!value) return 'NOT SET';
  if (value.length < 12) return `${value.substring(0, 4)}...`;
  return `${value.substring(0, 8)}...${value.substring(value.length - 4)} (length: ${value.length})`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }
  
  // Get secure CORS headers for this request
  const corsHeaders = getCorsHeaders(req);

  try {
    // Only allow admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { 
        status: 401,
        headers: corsHeaders
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response('Invalid token', { 
        status: 401,
        headers: corsHeaders
      });
    }

    // Check if user is admin
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('membership_type')
      .eq('id', user.id)
      .single();

    if (dbError || userData?.membership_type !== 'admin') {
      return new Response('Admin access required', { 
        status: 403,
        headers: corsHeaders
      });
    }

    // Check environment variables (masked for security)
    const envCheck = {
      payment_mode: {
        PAYMENT_MODE: Deno.env.get('PAYMENT_MODE') || 'NOT SET'
      },
      stripe_test: {
        STRIPE_TEST_SECRET_KEY: maskValue(Deno.env.get('STRIPE_TEST_SECRET_KEY')),
        STRIPE_TEST_WEBHOOK_SECRET: maskValue(Deno.env.get('STRIPE_TEST_WEBHOOK_SECRET'))
      },
      stripe_live: {
        STRIPE_LIVE_SECRET_KEY: maskValue(Deno.env.get('STRIPE_LIVE_SECRET_KEY')),
        STRIPE_LIVE_WEBHOOK_SECRET: maskValue(Deno.env.get('STRIPE_LIVE_WEBHOOK_SECRET'))
      },
      stripe_current: {
        STRIPE_SECRET_KEY: maskValue(Deno.env.get('STRIPE_SECRET_KEY')),
        STRIPE_WEBHOOK_SECRET: maskValue(Deno.env.get('STRIPE_WEBHOOK_SECRET'))
      },
      paypal_test: {
        PAYPAL_TEST_CLIENT_SECRET: maskValue(Deno.env.get('PAYPAL_TEST_CLIENT_SECRET'))
      },
      paypal_live: {
        PAYPAL_LIVE_CLIENT_SECRET: maskValue(Deno.env.get('PAYPAL_LIVE_CLIENT_SECRET'))
      }
    };

    // Check database configuration
    const { data: dbConfig, error: configError } = await supabase
      .from('admin_settings')
      .select('key, value')
      .eq('category', 'payment')
      .in('key', ['mode', 'stripe_active', 'paypal_active']);

    const dbConfigMap = dbConfig?.reduce((acc: any, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {}) || {};

    const response = {
      status: 'Environment variables check',
      environment_variables: envCheck,
      database_config: {
        mode: dbConfigMap.mode || 'NOT SET',
        stripe_active: dbConfigMap.stripe_active || 'NOT SET',
        paypal_active: dbConfigMap.paypal_active || 'NOT SET'
      },
      recommendations: []
    };

    // Add recommendations
    if (!Deno.env.get('PAYMENT_MODE')) {
      response.recommendations.push('Set PAYMENT_MODE to match your database mode setting');
    }

    if (Deno.env.get('PAYMENT_MODE') !== dbConfigMap.mode) {
      response.recommendations.push(`PAYMENT_MODE (${Deno.env.get('PAYMENT_MODE')}) doesn't match database mode (${dbConfigMap.mode})`);
    }

    const paymentMode = Deno.env.get('PAYMENT_MODE') || dbConfigMap.mode || 'test';
    const isTestMode = paymentMode === 'test';

    // Check if current mode keys are set
    if (isTestMode) {
      if (!Deno.env.get('STRIPE_SECRET_KEY') && Deno.env.get('STRIPE_TEST_SECRET_KEY')) {
        response.recommendations.push('Set STRIPE_SECRET_KEY to match STRIPE_TEST_SECRET_KEY for test mode');
      }
      if (!Deno.env.get('STRIPE_WEBHOOK_SECRET') && Deno.env.get('STRIPE_TEST_WEBHOOK_SECRET')) {
        response.recommendations.push('Set STRIPE_WEBHOOK_SECRET to match STRIPE_TEST_WEBHOOK_SECRET for test mode');
      }
    } else {
      if (!Deno.env.get('STRIPE_SECRET_KEY') && Deno.env.get('STRIPE_LIVE_SECRET_KEY')) {
        response.recommendations.push('Set STRIPE_SECRET_KEY to match STRIPE_LIVE_SECRET_KEY for live mode');
      }
      if (!Deno.env.get('STRIPE_WEBHOOK_SECRET') && Deno.env.get('STRIPE_LIVE_WEBHOOK_SECRET')) {
        response.recommendations.push('Set STRIPE_WEBHOOK_SECRET to match STRIPE_LIVE_WEBHOOK_SECRET for live mode');
      }
    }

    return new Response(JSON.stringify(response, null, 2), {
      headers: corsHeaders,
      status: 200
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: corsHeaders,
      status: 500
    });
  }
});