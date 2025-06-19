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

    // Get map bounds from URL if provided
    const url = new URL(req.url);
    const north = url.searchParams.get('north') ? parseFloat(url.searchParams.get('north')!) : null;
    const south = url.searchParams.get('south') ? parseFloat(url.searchParams.get('south')!) : null;
    const east = url.searchParams.get('east') ? parseFloat(url.searchParams.get('east')!) : null;
    const west = url.searchParams.get('west') ? parseFloat(url.searchParams.get('west')!) : null;

    // Fetch events with location data
    let query = supabaseClient
      .from('events')
      .select(`
        id,
        title,
        start_date,
        venue_name,
        city,
        state,
        latitude,
        longitude,
        pin_color,
        current_participants,
        max_participants,
        event_categories!inner(name, color, icon),
        organizations(name, logo_url)
      `)
      .eq('status', 'published')
      .eq('is_public', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    // Apply bounds filtering if provided
    if (north !== null && south !== null && east !== null && west !== null) {
      query = query
        .lte('latitude', north)
        .gte('latitude', south)
        .lte('longitude', east)
        .gte('longitude', west);
    }

    const { data: events, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch events', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Transform the data for the frontend
    const transformedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      category_name: event.event_categories?.name || 'Event',
      category_color: event.event_categories?.color || '#0ea5e9',
      category_icon: event.event_categories?.icon || 'calendar',
      start_date: event.start_date,
      venue_name: event.venue_name,
      city: event.city,
      state: event.state,
      latitude: event.latitude,
      longitude: event.longitude,
      pin_color: event.pin_color || '#0ea5e9',
      organization_name: event.organizations?.name,
      organization_logo: event.organizations?.logo_url,
      participant_count: event.current_participants || 0,
      max_participants: event.max_participants
    }));

    return new Response(
      JSON.stringify({ events: transformedEvents }),
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