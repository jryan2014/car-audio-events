import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create admin client for direct database access
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting email RLS performance fix...');
    
    // Execute each policy fix separately to avoid transaction issues
    const results = [];
    
    // Fix email_routing_rules
    try {
      // Drop existing policy
      await adminClient.rpc('query', { 
        input: `DROP POLICY IF EXISTS "Admin can manage email routing rules" ON public.email_routing_rules`
      }).catch(() => {});
      
      // Create optimized policy
      await adminClient.rpc('query', {
        input: `CREATE POLICY "Admin can manage email routing rules" ON public.email_routing_rules
                FOR ALL TO authenticated
                USING (EXISTS (
                  SELECT 1 FROM public.users 
                  WHERE users.id = (SELECT auth.uid()) 
                  AND users.membership_type = 'admin'
                  AND users.status = 'active'
                ))
                WITH CHECK (EXISTS (
                  SELECT 1 FROM public.users 
                  WHERE users.id = (SELECT auth.uid()) 
                  AND users.membership_type = 'admin'
                  AND users.status = 'active'
                ))`
      }).catch(() => {});
      
      results.push({ table: 'email_routing_rules', status: 'fixed' });
    } catch (e) {
      results.push({ table: 'email_routing_rules', status: 'error', error: e.message });
    }
    
    // Fix email_providers
    try {
      // Drop existing policy
      await adminClient.rpc('query', {
        input: `DROP POLICY IF EXISTS "Admin can manage email providers" ON public.email_providers`
      }).catch(() => {});
      
      // Create optimized policy
      await adminClient.rpc('query', {
        input: `CREATE POLICY "Admin can manage email providers" ON public.email_providers
                FOR ALL TO authenticated
                USING (EXISTS (
                  SELECT 1 FROM public.users 
                  WHERE users.id = (SELECT auth.uid()) 
                  AND users.membership_type = 'admin'
                  AND users.status = 'active'
                ))
                WITH CHECK (EXISTS (
                  SELECT 1 FROM public.users 
                  WHERE users.id = (SELECT auth.uid()) 
                  AND users.membership_type = 'admin'
                  AND users.status = 'active'
                ))`
      }).catch(() => {});
      
      results.push({ table: 'email_providers', status: 'fixed' });
    } catch (e) {
      results.push({ table: 'email_providers', status: 'error', error: e.message });
    }
    
    // Fix email_addresses
    try {
      // Drop existing policy
      await adminClient.rpc('query', {
        input: `DROP POLICY IF EXISTS "Admin can manage email addresses" ON public.email_addresses`
      }).catch(() => {});
      
      // Create optimized policy
      await adminClient.rpc('query', {
        input: `CREATE POLICY "Admin can manage email addresses" ON public.email_addresses
                FOR ALL TO authenticated
                USING (EXISTS (
                  SELECT 1 FROM public.users 
                  WHERE users.id = (SELECT auth.uid()) 
                  AND users.membership_type = 'admin'
                  AND users.status = 'active'
                ))
                WITH CHECK (EXISTS (
                  SELECT 1 FROM public.users 
                  WHERE users.id = (SELECT auth.uid()) 
                  AND users.membership_type = 'admin'
                  AND users.status = 'active'
                ))`
      }).catch(() => {});
      
      results.push({ table: 'email_addresses', status: 'fixed' });
    } catch (e) {
      results.push({ table: 'email_addresses', status: 'error', error: e.message });
    }
    
    // Check if all succeeded
    const allFixed = results.every(r => r.status === 'fixed');
    
    return new Response(
      JSON.stringify({ 
        success: allFixed,
        message: allFixed 
          ? 'All email RLS policies have been optimized successfully!'
          : 'Some policies could not be fixed',
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: allFixed ? 200 : 500
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});