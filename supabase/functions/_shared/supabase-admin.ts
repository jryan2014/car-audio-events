import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// This is the proper way to create a Supabase client with admin privileges.
// It uses the SERVICE_ROLE_KEY to bypass RLS.
export const createSupabaseAdminClient = (): SupabaseClient => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}; 