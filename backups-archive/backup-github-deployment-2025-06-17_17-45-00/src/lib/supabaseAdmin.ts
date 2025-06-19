import { createClient } from '@supabase/supabase-js';

// Service role client for admin operations that bypass RLS
const supabaseServiceRole = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  // Note: This should be the service role key, but for now we'll use the same client
  import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export { supabaseServiceRole }; 