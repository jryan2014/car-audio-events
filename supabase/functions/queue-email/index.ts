import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts';

interface QueuePayload {
  recipient: string;
  template_name: string;
  variables: { [key: string]: any };
}

// Basic templating function
function renderTemplate(template: string, variables: { [key: string]: any }) {
  let rendered = template;
  for (const key in variables) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, variables[key]);
  }
  return rendered;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // This function can be called by other functions or authenticated users.
    // We will use an admin client to interact with the database.
    const supabaseAdmin = createSupabaseAdminClient();
    
    // 1. Get the payload from the request body
    const payload: QueuePayload = await req.json();
    const { recipient, template_name, variables } = payload;
    if (!recipient || !template_name || !variables) {
      return new Response(JSON.stringify({ error: 'Missing required fields: recipient, template_name, variables.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch the template from the database
    const { data: template, error: templateError } = await supabaseAdmin
      .from('email_templates')
      .select('id, subject, body')
      .eq('name', template_name)
      .single();

    if (templateError || !template) {
      throw new Error(`Template "${template_name}" not found.`);
    }

    // 3. Render the subject and body
    const finalSubject = renderTemplate(template.subject, variables);
    const finalBody = renderTemplate(template.body, variables);

    // 4. Insert the email into the queue
    const { error: queueError } = await supabaseAdmin
      .from('email_queue')
      .insert({
        recipient,
        subject: finalSubject,
        body: finalBody,
        template_id: template.id,
        status: 'pending',
      });

    if (queueError) {
      throw queueError;
    }

    return new Response(JSON.stringify({ message: 'Email queued successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 202, // Accepted
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 