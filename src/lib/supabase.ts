import { createClient } from '@supabase/supabase-js'

// Get environment variables with hardcoded fallbacks for production
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mpewqdnoyuutexadhljd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZXdxZG5veXV1dGV4YWRobGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMzUzMjksImV4cCI6MjA2NDkxMTMyOX0.lZGcRCvb62KN95QnAuM6Hed7FKHlipDuBi-usQS_Ico';

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
}

// Create the Supabase client with the latest configuration options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'car-audio-events',
      'x-client-info': `@supabase/supabase-js@${import.meta.env.VITE_SUPABASE_JS_VERSION || '2.39.0'}`
    }
  },
  cookies: {
    name: 'sb-auth',
    lifetime: 60 * 60 * 24 * 7, // 7 days
    domain: '',
    sameSite: 'lax',
    secure: true,
    path: '/'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabase);
}