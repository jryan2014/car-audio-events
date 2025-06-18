import { createClient } from '@supabase/supabase-js'
import { isDevelopment } from '../utils/version'

// Get environment variables with hardcoded fallbacks for production
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug configuration in development only
if (isDevelopment()) {
  console.log('🔍 Supabase Configuration Debug:', {
    url: supabaseUrl?.substring(0, 30) + '...',
    keyLength: supabaseAnonKey?.length,
    keyStart: supabaseAnonKey?.substring(0, 20) + '...',
    environment: import.meta.env.MODE,
    allEnvKeys: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')).length
  })
}

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
}

// Create the Supabase client with minimal configuration for testing
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabase);
}