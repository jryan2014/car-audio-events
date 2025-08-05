import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const hasServiceKey = !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const hasUrl = !!Deno.env.get('SUPABASE_URL');
    const hasHcaptcha = !!Deno.env.get('HCAPTCHA_SECRET_KEY');
    
    return new Response(
      JSON.stringify({ 
        hasServiceKey,
        hasUrl,
        hasHcaptcha,
        urlStart: Deno.env.get('SUPABASE_URL')?.substring(0, 30) + '...'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});