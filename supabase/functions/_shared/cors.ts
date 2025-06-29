// supabase/functions/_shared/cors.ts

// Standard CORS headers for Supabase functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  // 'Access-Control-Allow-Credentials': 'true', // Uncomment if you use credentials
}; 