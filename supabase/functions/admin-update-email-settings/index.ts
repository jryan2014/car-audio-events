import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MailgunSettings {
  apiKey: string;
  domain: string;
  fromEmail: string;
  fromName: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a client with the user's auth context to verify they are an admin
    const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError) throw userError;

    // Now, create the admin client to perform elevated actions
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

    // 2. Get the settings from the request body
    const settings: MailgunSettings = await req.json();
    if (!settings.apiKey || !settings.domain || !settings.fromEmail || !settings.fromName) {
      return new Response(JSON.stringify({ error: 'Missing required fields: apiKey, domain, fromEmail, fromName.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Set the secrets using the Management API
    // The service_role key is required for this action.
    const managementApiUrl = `https://api.supabase.com/v1/projects/${Deno.env.get('SUPABASE_PROJECT_REF')}/secrets`;
    const accessToken = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const secretsPayload = {
      secrets: [
        { name: 'MAILGUN_API_KEY', value: settings.apiKey },
        { name: 'MAILGUN_DOMAIN', value: settings.domain },
        { name: 'MAILGUN_FROM_EMAIL', value: settings.fromEmail },
        { name: 'MAILGUN_FROM_NAME', value: settings.fromName },
      ],
    };

    const response = await fetch(managementApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'apikey': accessToken
      },
      body: JSON.stringify(secretsPayload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to set secrets: ${response.statusText} - ${errorBody}`);
    }

    return new Response(JSON.stringify({ message: 'Mailgun settings saved successfully.' }), {
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