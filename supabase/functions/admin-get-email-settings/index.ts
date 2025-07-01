import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
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
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('membership_type')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.membership_type !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: User is not an admin.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get email settings from admin_settings table
    const { data: emailSettings, error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .select('key, value')
      .in('key', [
        'email_provider',
        'mailgun_api_key',
        'mailgun_domain',
        'mailgun_from_email',
        'mailgun_from_name'
      ]);

    if (settingsError) {
      console.error('Error fetching email settings:', settingsError);
      throw new Error('Failed to fetch email settings');
    }

    // 3. Build settings object
    const settingsMap: { [key: string]: string } = {};
    emailSettings?.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });

    const settings = {
      provider: settingsMap.email_provider || 'mailgun',
      apiKey: settingsMap.mailgun_api_key || '',
      domain: settingsMap.mailgun_domain || '',
      fromEmail: settingsMap.mailgun_from_email || 'noreply@caraudioevents.com',
      fromName: settingsMap.mailgun_from_name || 'Car Audio Events',
      isConfigured: !!(settingsMap.mailgun_api_key && settingsMap.mailgun_domain)
    };

    return new Response(JSON.stringify(settings), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check function logs for more information'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 