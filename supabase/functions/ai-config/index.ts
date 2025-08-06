import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Environment variables for AI service API keys
const AI_API_KEYS = {
  'openai-dalle': Deno.env.get('OPENAI_API_KEY') || '',
  'stability-ai': Deno.env.get('STABILITY_AI_API_KEY') || '',
  'midjourney': Deno.env.get('MIDJOURNEY_API_KEY') || '',
  'adobe-firefly': Deno.env.get('ADOBE_FIREFLY_API_KEY') || '',
  'openai-gpt': Deno.env.get('OPENAI_API_KEY') || '',
  'anthropic-claude': Deno.env.get('ANTHROPIC_API_KEY') || '',
  'google-gemini': Deno.env.get('GOOGLE_GEMINI_API_KEY') || ''
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('membership_type')
      .eq('id', user.id)
      .single();

    if (userError || userData?.membership_type !== 'admin') {
      throw new Error('Only admins can access AI configurations');
    }

    const { pathname } = new URL(req.url);
    const pathParts = pathname.split('/');
    const action = pathParts[pathParts.length - 1];

    if (req.method === 'GET') {
      if (action === 'configs') {
        // Get all configurations
        const { data: configs, error } = await supabase
          .from('ai_service_configs')
          .select('*')
          .order('provider');

        if (error) throw error;

        // Merge with environment variable API keys
        const mergedConfigs = configs?.map(config => ({
          ...config,
          api_key: AI_API_KEYS[config.provider as keyof typeof AI_API_KEYS] || config.api_key,
          has_env_key: !!AI_API_KEYS[config.provider as keyof typeof AI_API_KEYS]
        }));

        return new Response(
          JSON.stringify({ configs: mergedConfigs }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (action === 'test-connection') {
        const provider = new URL(req.url).searchParams.get('provider');
        if (!provider) {
          throw new Error('Provider parameter required');
        }

        // Get configuration
        const { data: config, error } = await supabase
          .from('ai_service_configs')
          .select('*')
          .eq('provider', provider)
          .single();

        if (error) throw error;

        const apiKey = AI_API_KEYS[provider as keyof typeof AI_API_KEYS] || config?.api_key;
        
        if (!apiKey) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'No API key configured' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Test the API connection based on provider
        let testResult = { success: false, message: 'Unknown provider' };

        if (provider === 'openai-dalle' || provider === 'openai-gpt') {
          // Test OpenAI API
          const testResponse = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`
            }
          });
          
          testResult = {
            success: testResponse.ok,
            message: testResponse.ok ? 'Connection successful' : 'Invalid API key or connection error'
          };
        } else if (provider === 'stability-ai') {
          // Test Stability AI API
          const testResponse = await fetch('https://api.stability.ai/v1/user/account', {
            headers: {
              'Authorization': `Bearer ${apiKey}`
            }
          });
          
          testResult = {
            success: testResponse.ok,
            message: testResponse.ok ? 'Connection successful' : 'Invalid API key or connection error'
          };
        } else if (provider === 'anthropic-claude') {
          // Test Anthropic API
          const testResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              messages: [{ role: 'user', content: 'test' }],
              max_tokens: 1
            })
          });
          
          // Anthropic returns 200 for valid key even with minimal request
          testResult = {
            success: testResponse.status === 200 || testResponse.status === 400,
            message: testResponse.status === 401 ? 'Invalid API key' : 'Connection successful'
          };
        } else if (provider === 'google-gemini') {
          // Test Google Gemini API
          const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
          
          testResult = {
            success: testResponse.ok,
            message: testResponse.ok ? 'Connection successful' : 'Invalid API key or connection error'
          };
        }

        return new Response(
          JSON.stringify(testResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (req.method === 'POST' || req.method === 'PUT') {
      const body = await req.json();
      const { provider, config } = body;

      if (!provider || !config) {
        throw new Error('Provider and config required');
      }

      // Don't save API keys if they're in environment variables
      if (AI_API_KEYS[provider as keyof typeof AI_API_KEYS]) {
        delete config.api_key;
      }

      // Update configuration in database
      const { data, error } = await supabase
        .from('ai_service_configs')
        .upsert({
          provider,
          ...config,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ 
          success: true, 
          config: data,
          has_env_key: !!AI_API_KEYS[provider as keyof typeof AI_API_KEYS]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('AI Config Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});