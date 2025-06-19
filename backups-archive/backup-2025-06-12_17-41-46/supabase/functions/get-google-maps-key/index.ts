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
    // Get the Google Maps API key from environment variables
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY') || '';
    
    // Return the API key
    return new Response(
      JSON.stringify({ 
        apiKey: googleMapsApiKey,
        libraries: 'geometry,places'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error retrieving Google Maps API key:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve Google Maps API key' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});