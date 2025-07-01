import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface TemplateUpdate {
  subject: string;
  body: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify user is an admin
    const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError) throw userError;

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: User is not an admin.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get template ID from the URL
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    if (!id) {
        return new Response(JSON.stringify({ error: 'Missing template ID in the URL.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 3. Get the updated data from the request body
    const update: TemplateUpdate = await req.json();
    if (!update.subject || !update.body) {
        return new Response(JSON.stringify({ error: 'Missing required fields: subject, body.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 4. Update the template in the database
    const { data: updatedTemplate, error: updateError } = await supabaseAdmin
      .from('email_templates')
      .update({
        subject: update.subject,
        body: update.body,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify(updatedTemplate), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 