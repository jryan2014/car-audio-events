import { createClient } from 'npm:@supabase/supabase-js@2';

;

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

    // Get event ID from URL
    const url = new URL(req.url);
    const eventId = url.searchParams.get('id');

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'Event ID is required' }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }

    // Get auth token if available
    const authHeader = req.headers.get('Authorization');
    let userId = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    // Fetch event details
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select(`
        *,
        event_categories(*),
        organizations(*),
        users!organizer_id(*),
        event_images(*)
      `)
      .eq('id', eventId)
      .single();

    if (eventError) {
      return new Response(
        JSON.stringify({ error: 'Event not found', details: eventError.message }),
        { 
          status: 404, 
          headers: corsHeaders 
        }
      );
    }

    // Check if user is registered for this event
    let isRegistered = false;
    if (userId) {
      const { data: registration } = await supabaseClient
        .from('event_registrations')
        .select('id, payment_status')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();
      
      isRegistered = !!registration;
    }

    // Get participant count
    const { count: participantCount } = await supabaseClient
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    // Format the response
    const formattedEvent = {
      ...event,
      participant_count: participantCount || event.current_participants || 0,
      is_registered: isRegistered,
      primary_image: event.event_images?.find(img => img.is_primary)?.image_url || null,
      images: event.event_images || [],
      category: event.event_categories?.name || 'Event',
      category_color: event.event_categories?.color || '#0ea5e9',
      organizer: {
        name: event.users?.name || 'Unknown',
        email: event.users?.email || '',
        phone: event.users?.phone || event.contact_phone || '',
      },
      organization: event.organizations ? {
        name: event.organizations.name,
        logo: event.organizations.logo_url,
        website: event.organizations.website,
      } : null
    };

    return new Response(
      JSON.stringify({ event: formattedEvent }),
      { 
        headers: corsHeaders 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});