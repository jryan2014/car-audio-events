import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NewTemplate {
  name: string;
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

    // 2. Get the template from the request body
    const template: NewTemplate = await req.json();
    if (!template.name || !template.subject || !template.body) {
        return new Response(JSON.stringify({ error: 'Missing required fields: name, subject, body.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 3. Insert the new template into the database
    const { data: newTemplate, error: insertError } = await supabaseAdmin
      .from('email_templates')
      .insert({
        name: template.name,
        subject: template.subject,
        body: template.body,
      })
      .select()
      .single();

    if (insertError) {
      // Handle potential unique constraint violation gracefully
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ error: 'A template with this name already exists.' }), {
            status: 409, // Conflict
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw insertError;
    }

    return new Response(JSON.stringify(newTemplate), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 