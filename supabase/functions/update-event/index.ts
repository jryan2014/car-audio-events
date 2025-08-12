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

// Fallback geocoding based on city and state
function getFallbackCoordinates(city: string, state: string): { latitude: number, longitude: number } | null {
  // City-level coordinates for major cities
  const cityCoordinates: Record<string, Record<string, [number, number]>> = {
    'FL': {
      'orlando': [28.5383, -81.3792],
      'miami': [25.7617, -80.1918],
      'tampa': [27.9506, -82.4572],
      'jacksonville': [30.3322, -81.6557],
      'tallahassee': [30.4383, -84.2807],
      'fort lauderdale': [26.1224, -80.1373],
      'st. petersburg': [27.7676, -82.6403],
      'clearwater': [27.9659, -82.8001],
      'gainesville': [29.6516, -82.3248],
      'pensacola': [30.4213, -87.2169],
      'daytona beach': [29.2108, -81.0228],
      'fort myers': [26.6406, -81.8723],
      'sarasota': [27.3364, -82.5307],
      'key west': [24.5551, -81.7800],
      'panama city': [30.1588, -85.6602]
    },
    'CA': {
      'los angeles': [34.0522, -118.2437],
      'san francisco': [37.7749, -122.4194],
      'san diego': [32.7157, -117.1611],
      'sacramento': [38.5816, -121.4944],
      'san jose': [37.3382, -121.8863],
      'fresno': [36.7378, -119.7871],
      'long beach': [33.7701, -118.1937],
      'oakland': [37.8044, -122.2711],
      'bakersfield': [35.3733, -119.0187],
      'anaheim': [33.8366, -117.9143]
    },
    'TX': {
      'houston': [29.7604, -95.3698],
      'dallas': [32.7767, -96.7970],
      'austin': [30.2672, -97.7431],
      'san antonio': [29.4241, -98.4936],
      'fort worth': [32.7555, -97.3308],
      'el paso': [31.7619, -106.4850],
      'arlington': [32.7357, -97.1081],
      'corpus christi': [27.8006, -97.3964],
      'plano': [33.0198, -96.6989],
      'lubbock': [33.5779, -101.8552]
    },
    'NY': {
      'new york': [40.7128, -74.0060],
      'buffalo': [42.8864, -78.8784],
      'rochester': [43.1566, -77.6088],
      'yonkers': [40.9312, -73.8987],
      'syracuse': [43.0481, -76.1474],
      'albany': [42.6526, -73.7562]
    },
    'IL': {
      'chicago': [41.8781, -87.6298],
      'springfield': [39.7817, -89.6501],
      'aurora': [41.7606, -88.3201],
      'naperville': [41.7508, -88.1535],
      'peoria': [40.6936, -89.5890],
      'rockford': [42.2711, -89.0937]
    },
    'AZ': {
      'phoenix': [33.4484, -112.0740],
      'tucson': [32.2226, -110.9747],
      'mesa': [33.4152, -111.8315],
      'chandler': [33.3062, -111.8413],
      'scottsdale': [33.4942, -111.9261],
      'glendale': [33.5387, -112.1860]
    },
    'GA': {
      'atlanta': [33.7490, -84.3880],
      'savannah': [32.0809, -81.0912],
      'athens': [33.9519, -83.3576],
      'augusta': [33.4735, -82.0105],
      'columbus': [32.4610, -84.9877],
      'macon': [32.8407, -83.6324]
    },
    'NV': {
      'las vegas': [36.1699, -115.1398],
      'reno': [39.5296, -119.8138],
      'henderson': [36.0395, -115.0430]
    },
    'CO': {
      'denver': [39.7392, -104.9903],
      'colorado springs': [38.8339, -104.8214],
      'aurora': [39.7294, -104.8319]
    },
    'WA': {
      'seattle': [47.6062, -122.3321],
      'spokane': [47.6588, -117.4260],
      'tacoma': [47.2529, -122.4443]
    },
    'OR': {
      'portland': [45.5051, -122.6750],
      'eugene': [44.0521, -123.0868],
      'salem': [44.9429, -123.0351]
    },
    'MA': {
      'boston': [42.3601, -71.0589],
      'worcester': [42.2626, -71.8023],
      'springfield': [42.1015, -72.5898]
    },
    'PA': {
      'philadelphia': [39.9526, -75.1652],
      'pittsburgh': [40.4406, -79.9959],
      'allentown': [40.6084, -75.4902]
    },
    'DC': {
      'washington': [38.9072, -77.0369]
    },
    'TN': {
      'nashville': [36.1627, -86.7816],
      'memphis': [35.1495, -90.0490],
      'knoxville': [35.9606, -83.9207]
    },
    'LA': {
      'new orleans': [29.9511, -90.0715],
      'baton rouge': [30.4515, -91.1871],
      'shreveport': [32.5252, -93.7502]
    },
    'MI': {
      'detroit': [42.3314, -83.0458],
      'grand rapids': [42.9634, -85.6681],
      'ann arbor': [42.2808, -83.7430]
    },
    'MN': {
      'minneapolis': [44.9778, -93.2650],
      'st. paul': [44.9537, -93.0900],
      'rochester': [44.0121, -92.4802]
    }
  };
  
  // State-level coordinates
  const stateCoordinates: Record<string, [number, number]> = {
    'AL': [32.7794, -86.8287],
    'AK': [64.0685, -152.2782],
    'AZ': [34.2744, -111.6602],
    'AR': [34.8938, -92.4426],
    'CA': [37.1841, -119.4696],
    'CO': [38.9972, -105.5478],
    'CT': [41.6219, -72.7273],
    'DE': [38.9896, -75.5050],
    'FL': [28.6305, -82.4497],
    'GA': [32.6415, -83.4426],
    'HI': [20.2927, -156.3737],
    'ID': [44.3509, -114.6130],
    'IL': [40.0417, -89.1965],
    'IN': [39.8942, -86.2816],
    'IA': [42.0751, -93.4960],
    'KS': [38.4937, -98.3804],
    'KY': [37.5347, -85.3021],
    'LA': [31.0689, -91.9968],
    'ME': [45.3695, -69.2428],
    'MD': [39.0550, -76.7909],
    'MA': [42.2596, -71.8083],
    'MI': [44.3467, -85.4102],
    'MN': [46.2807, -94.3053],
    'MS': [32.7364, -89.6678],
    'MO': [38.3566, -92.4580],
    'MT': [47.0527, -109.6333],
    'NE': [41.5378, -99.7951],
    'NV': [39.3289, -116.6312],
    'NH': [43.6805, -71.5811],
    'NJ': [40.1907, -74.6728],
    'NM': [34.4071, -106.1126],
    'NY': [42.9538, -75.5268],
    'NC': [35.5557, -79.3877],
    'ND': [47.4501, -100.4659],
    'OH': [40.2862, -82.7937],
    'OK': [35.5889, -97.4943],
    'OR': [43.9336, -120.5583],
    'PA': [40.8781, -77.7996],
    'RI': [41.6762, -71.5562],
    'SC': [33.9169, -80.8964],
    'SD': [44.4443, -100.2263],
    'TN': [35.8580, -86.3505],
    'TX': [31.4757, -99.3312],
    'UT': [39.3055, -111.6703],
    'VT': [44.0687, -72.6658],
    'VA': [37.5215, -78.8537],
    'WA': [47.3826, -120.4472],
    'WV': [38.6409, -80.6227],
    'WI': [44.6243, -89.9941],
    'WY': [42.9957, -107.5512],
    'DC': [38.9072, -77.0369]
  };
  
  const stateCode = state.toUpperCase();
  const cityName = city.toLowerCase();
  
  // First try city-level coordinates
  if (cityCoordinates[stateCode] && cityCoordinates[stateCode][cityName]) {
    const [lat, lng] = cityCoordinates[stateCode][cityName];
    console.log(`Using city-level coordinates for ${city}, ${state}: ${lat}, ${lng}`);
    return { latitude: lat, longitude: lng };
  }
  
  // Fall back to state-level coordinates
  if (stateCoordinates[stateCode]) {
    const [lat, lng] = stateCoordinates[stateCode];
    console.log(`Using state-level coordinates for ${state}: ${lat}, ${lng}`);
    return { latitude: lat, longitude: lng };
  }
  
  // Default to center of US if state not recognized
  console.log(`No coordinates found for ${city}, ${state}, using US center`);
  return { latitude: 39.8283, longitude: -98.5795 };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow PUT requests
    if (req.method !== 'PUT') {
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
    const eventData = await req.json();
    
    // Validate required fields
    if (!eventData.id) {
      return new Response(
        JSON.stringify({ error: 'Missing event ID' }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }
    
    const requiredFields = ['title', 'start_date', 'end_date', 'venue_name', 'address', 'city', 'state'];
    for (const field of requiredFields) {
      if (!eventData[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { 
            status: 400, 
            headers: corsHeaders 
          }
        );
      }
    }
    
    // Check if user is admin or the event organizer
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('membership_type')
      .eq('id', user.id)
      .single();
      
    if (userError) {
      return new Response(
        JSON.stringify({ error: 'Failed to get user data' }),
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }
    
    const isAdmin = userData.membership_type === 'admin';
    
    // Get the current event to check permissions
    const { data: currentEvent, error: eventError } = await supabaseClient
      .from('events')
      .select('organizer_id, address, city, state, country, latitude, longitude')
      .eq('id', eventData.id)
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
    
    // Check if user has permission to update this event
    if (!isAdmin && currentEvent.organizer_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to update this event' }),
        { 
          status: 403, 
          headers: corsHeaders 
        }
      );
    }
    
    // Check if address was changed or coordinates are missing/invalid
    const addressChanged = 
      eventData.address !== currentEvent.address || 
      eventData.city !== currentEvent.city || 
      eventData.state !== currentEvent.state || 
      eventData.country !== currentEvent.country;
      
    const needsGeocoding = 
      addressChanged || 
      !currentEvent.latitude || 
      !currentEvent.longitude || 
      currentEvent.latitude === 0 || 
      currentEvent.longitude === 0;
    
    // If address changed or coordinates are missing, geocode the address
    if (needsGeocoding) {
      console.log('Geocoding needed:', { 
        addressChanged, 
        currentLat: currentEvent.latitude, 
        currentLng: currentEvent.longitude,
        newAddress: eventData.address,
        newCity: eventData.city,
        newState: eventData.state
      });
      
      // Try Google Maps geocoding first
      const geocodeResult = await geocodeAddress(
        eventData.address,
        eventData.city,
        eventData.state,
        eventData.country || 'US'
      );
      
      if (geocodeResult) {
        eventData.latitude = geocodeResult.latitude;
        eventData.longitude = geocodeResult.longitude;
        
        console.log('Google geocoded coordinates:', geocodeResult.latitude, geocodeResult.longitude);
        
        // Update event_location record
        const locationData = {
          event_id: eventData.id,
          raw_address: `${eventData.address}, ${eventData.city}, ${eventData.state}, ${eventData.country || 'US'}`,
          city: eventData.city,
          state: eventData.state,
          zip_code: eventData.zip_code,
          country: eventData.country || 'US',
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          geocoding_status: 'success',
          geocoding_provider: 'google',
          geocoding_accuracy: 'rooftop',
          formatted_address: geocodeResult.formatted_address,
          place_id: geocodeResult.place_id,
          geocoded_at: new Date().toISOString()
        };
        
        const { error: locationError } = await supabaseClient
          .from('event_locations')
          .upsert(locationData, { onConflict: 'event_id' });
          
        if (locationError) {
          console.error('Failed to update event location:', locationError);
          // Don't fail the whole request if just the location update fails
        }
      } else {
        console.warn('Google geocoding failed, using fallback method');
        
        // Use our fallback geocoding function
        const fallbackCoords = getFallbackCoordinates(eventData.city, eventData.state);
        
        if (fallbackCoords) {
          eventData.latitude = fallbackCoords.latitude;
          eventData.longitude = fallbackCoords.longitude;
          
          console.log('Using fallback coordinates:', fallbackCoords.latitude, fallbackCoords.longitude);
          
          // Update event_location record with fallback coordinates
          const locationData = {
            event_id: eventData.id,
            raw_address: `${eventData.address}, ${eventData.city}, ${eventData.state}, ${eventData.country || 'US'}`,
            city: eventData.city,
            state: eventData.state,
            zip_code: eventData.zip_code,
            country: eventData.country || 'US',
            latitude: fallbackCoords.latitude,
            longitude: fallbackCoords.longitude,
            geocoding_status: 'manual',
            geocoding_provider: 'fallback',
            geocoding_accuracy: 'city_or_state',
            formatted_address: `${eventData.city}, ${eventData.state}, ${eventData.country || 'US'}`,
            geocoded_at: new Date().toISOString()
          };
          
          await supabaseClient
            .from('event_locations')
            .upsert(locationData, { onConflict: 'event_id' });
        }
      }
    } else {
      // Even if address didn't change, we should still update coordinates if they're invalid
      if (!currentEvent.latitude || !currentEvent.longitude || 
          currentEvent.latitude === 0 || currentEvent.longitude === 0) {
        console.log('Coordinates missing or invalid, geocoding needed');
        
        // Try Google Maps geocoding first
        const geocodeResult = await geocodeAddress(
          eventData.address,
          eventData.city,
          eventData.state,
          eventData.country || 'US'
        );
        
        if (geocodeResult) {
          eventData.latitude = geocodeResult.latitude;
          eventData.longitude = geocodeResult.longitude;
          console.log('Google geocoded coordinates:', geocodeResult.latitude, geocodeResult.longitude);
        } else {
          // Use fallback geocoding
          const fallbackCoords = getFallbackCoordinates(eventData.city, eventData.state);
          if (fallbackCoords) {
            eventData.latitude = fallbackCoords.latitude;
            eventData.longitude = fallbackCoords.longitude;
            console.log('Using fallback coordinates:', fallbackCoords.latitude, fallbackCoords.longitude);
          }
        }
      } else {
        console.log('No geocoding needed, using existing coordinates');
        // Keep existing coordinates
        eventData.latitude = currentEvent.latitude;
        eventData.longitude = currentEvent.longitude;
      }
    }
    
    // Set updated_at timestamp
    eventData.updated_at = new Date().toISOString();
    
    // If admin is approving the event, set approved_by and approved_at
    if (isAdmin && eventData.approval_status === 'approved' && currentEvent.approval_status !== 'approved') {
      eventData.approved_by = user.id;
      eventData.approved_at = new Date().toISOString();
    }
    
    // Update the event
    const { data: updatedEvent, error: updateError } = await supabaseClient
      .from('events')
      .update(eventData)
      .eq('id', eventData.id)
      .select()
      .single();
      
    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update event', details: updateError.message }),
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }
    
    // Try to force update coordinates using the database function
    try {
      const { data: forceUpdateResult, error: forceUpdateError } = await supabaseClient
        .rpc('force_update_event_coordinates', { event_uuid: eventData.id });
        
      if (!forceUpdateError && forceUpdateResult) {
        console.log('Force updated coordinates:', forceUpdateResult);
      }
    } catch (forceUpdateError) {
      console.warn('Failed to force update coordinates:', forceUpdateError);
      // Don't fail the whole request if this fails
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        event: updatedEvent,
        message: 'Event updated successfully',
        geocoded: needsGeocoding,
        coordinates: {
          latitude: updatedEvent.latitude,
          longitude: updatedEvent.longitude,
          source: needsGeocoding ? 'updated' : 'existing'
        }
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