import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get membership type from URL if provided
    const url = new URL(req.url);
    const membershipType = url.searchParams.get('type');

    // Fetch membership plans
    let query = supabaseClient
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    // Filter by membership type if provided
    if (membershipType) {
      query = query.eq('type', membershipType);
    }

    const { data: plans, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch membership plans', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Format the plans for better frontend consumption
    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      type: plan.type,
      price: plan.price,
      formattedPrice: `$${plan.price.toFixed(2)}`,
      period: plan.billing_period,
      description: plan.description,
      features: Array.isArray(plan.features) ? plan.features : [],
      permissions: Array.isArray(plan.permissions) ? plan.permissions : [],
      limits: plan.limits || {},
      isFeatured: plan.is_featured,
      displayOrder: plan.display_order
    }));

    return new Response(
      JSON.stringify({ plans: formattedPlans }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});