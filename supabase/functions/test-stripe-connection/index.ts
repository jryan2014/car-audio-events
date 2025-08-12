import { serve } from "https://deno.land/std@0.168.0/http/server.ts"



serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { publishable_key, secret_key, test_mode } = await req.json()

    // Basic validation
    if (!publishable_key || !secret_key) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required keys' 
        }),
        { headers: corsHeaders }
      )
    }

    // Validate key formats
    if (!publishable_key.startsWith('pk_')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid publishable key format' 
        }),
        { headers: corsHeaders }
      )
    }

    if (!secret_key.startsWith('sk_')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid secret key format' 
        }),
        { headers: corsHeaders }
      )
    }

    // Check if keys match test/live mode
    const isPublishableTest = publishable_key.includes('_test_')
    const isSecretTest = secret_key.includes('_test_')
    
    if (test_mode && (!isPublishableTest || !isSecretTest)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Test mode enabled but keys appear to be live keys' 
        }),
        { headers: corsHeaders }
      )
    }

    if (!test_mode && (isPublishableTest || isSecretTest)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Live mode enabled but keys appear to be test keys' 
        }),
        { headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Stripe keys validated successfully (${test_mode ? 'test' : 'live'} mode)`
      }),
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Test stripe connection error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to test connection' 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
}) 