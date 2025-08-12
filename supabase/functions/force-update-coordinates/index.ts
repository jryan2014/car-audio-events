import { createClient } from 'npm:@supabase/supabase-js@2';

;

// Simple geocoding function to get coordinates from address
async function geocodeAddress(address: string, city: string, state: string, country: string = 'US') {
  try {
    const query = encodeURIComponent(`${address}, ${city}, ${state}, ${country}`);
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!apiKey) {
      console.error('No Google Maps API key found in environment');
      return null;
    }
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: data.results[0].formatted_address,
        place_id: data.results[0].place_id
      };
    }
    
    console.warn('Geocoding API returned no results:', data);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: corsHeaders 
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: corsHeaders 
        }
      );
    }

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: corsHeaders 
        }
      );
    }

    // Parse request body
    const { eventId } = await req.json();
    
    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'Missing event ID' }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }

    // Get the event details first
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('id, address, city, state, country')
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
    
    // Try to geocode with Google Maps API first
    let coordinates = null;
    try {
      coordinates = await geocodeAddress(
        event.address,
        event.city,
        event.state,
        event.country || 'US'
      );
      
      if (coordinates) {
        console.log('Google Maps geocoding successful:', coordinates);
        
        // Update the event with the new coordinates
        const { error: updateError } = await supabaseClient
          .from('events')
          .update({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            updated_at: new Date().toISOString()
          })
          .eq('id', eventId);
          
        if (updateError) {
          throw updateError;
        }
        
       // Force a direct update to ensure the coordinates are properly set
       // This is a workaround for potential type conversion issues
       await supabaseClient.rpc('force_update_event_coordinates', { 
         event_uuid: eventId 
       });
       
        // Update the event_locations table
        const { error: locationError } = await supabaseClient
          .from('event_locations')
          .upsert({
            event_id: eventId,
            raw_address: `${event.address}, ${event.city}, ${event.state}, ${event.country || 'US'}`,
            city: event.city,
            state: event.state,
            country: event.country || 'US',
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            geocoding_status: 'success',
            geocoding_provider: 'google_maps_api',
            geocoding_accuracy: 'rooftop',
            formatted_address: coordinates.formatted_address,
            place_id: coordinates.place_id,
            geocoded_at: new Date().toISOString()
          }, { onConflict: 'event_id' });
          
        if (locationError) {
          console.error('Failed to update event location:', locationError);
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Coordinates updated successfully with Google Maps API',
            coordinates,
            source: 'google_maps_api'
          }),
          { 
            headers: corsHeaders 
          }
        );
      }
    } catch (googleError) {
      console.error('Google Maps geocoding error:', googleError);
      // Continue to fallback method
    }

    // Call the database function to force update coordinates
    const { data: result, error: updateError } = await supabaseClient
      .rpc('force_update_event_coordinates', { event_uuid: eventId });
      
    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update coordinates', details: updateError.message }),
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }

    // After updating coordinates, also update the event record directly to ensure it has the latest values
    // This is a safeguard in case the RPC function didn't update the event table properly
    if (result && result.latitude && result.longitude) {
     console.log('Directly updating event coordinates to ensure they are set correctly:', result.latitude, result.longitude);
     
      const { error: directUpdateError } = await supabaseClient
        .from('events')
        .update({
          latitude: result.latitude,
          longitude: result.longitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);
        
      if (directUpdateError) {
        console.error('Failed to directly update event coordinates:', directUpdateError);
      }
     
     // Double-check that the update was successful
     const { data: updatedEvent } = await supabaseClient
       .from('events')
       .select('latitude, longitude')
       .eq('id', eventId)
       .single();
       
     console.log('Coordinates after direct update:', updatedEvent);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Coordinates updated successfully using database function',
        result 
      }),
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