import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'



serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get query parameters
    const url = new URL(req.url)
    const type = url.searchParams.get('type')

    // Build query - filter out plans that are hidden on frontend
    let query = supabaseClient
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .eq('hidden_on_frontend', false)
      .order('display_order', { ascending: true })

    // Filter by type if provided
    if (type) {
      // Since the existing schema doesn't have a type column, we'll filter by name pattern
      if (type === 'competitor') {
        query = query.or('name.ilike.%competitor%')
      } else if (type === 'retailer') {
        query = query.or('name.ilike.%retailer%')
      } else if (type === 'organization') {
        query = query.or('name.ilike.%organization%')
      }
    }

    const { data: plans, error } = await query

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch membership plans', details: error.message }),
        { 
          status: 500, 
          headers: corsHeaders 
        }
      )
    }

    // Transform the data to match expected format
    const transformedPlans = plans?.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      billing_period: plan.billing_cycle, // Map billing_cycle to billing_period for frontend compatibility
      features: plan.features || [],
      max_events: plan.max_events,
      max_participants: plan.max_participants,
      is_active: plan.is_active,
      is_featured: plan.name.toLowerCase().includes('pro'), // Mark Pro plans as featured
      hidden_on_frontend: plan.hidden_on_frontend || false,
      display_order: plan.display_order,
      created_at: plan.created_at,
      updated_at: plan.updated_at
    })) || []

    return new Response(
      JSON.stringify({ 
        plans: transformedPlans,
        count: transformedPlans.length 
      }),
      { 
        headers: corsHeaders 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    )
  }
})