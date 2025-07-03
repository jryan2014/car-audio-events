import { supabase } from './supabase';

// Use the main client instead of creating a separate one
// This prevents "Multiple GoTrueClient instances" warnings
export { supabase as supabaseServiceRole }; 