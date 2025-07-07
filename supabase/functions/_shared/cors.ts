// supabase/functions/_shared/cors.ts

// Standard CORS headers for Supabase functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

// Helper function to handle CORS preflight requests
export function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }
  return null;
} 