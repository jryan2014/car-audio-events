import { createClient } from '@supabase/supabase-js'
import { isDevelopment } from '../utils/version'

// Get environment variables with hardcoded fallbacks for production
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Edge browser compatibility fix - sometimes Edge doesn't load env vars properly
if ((!supabaseUrl || !supabaseAnonKey) && isDevelopment()) {
  console.warn('⚠️ Edge browser detected missing env vars, attempting fallback...');
  
  // Development fallback values (only in development)
  // These should match your .env file values
  supabaseUrl = supabaseUrl || 'https://nqvisvranvjaghvrdaaz.supabase.co';
  supabaseAnonKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmlzdnJhbnZqYWdodnJkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDY2NzcsImV4cCI6MjA2NTE4MjY3N30.OWwP8kH9qTKxgEHCC6ru0QSAJ5KhOupCxMUyxHuYWVY';
  
  console.warn('🔄 Using development fallback values for Edge browser compatibility');
}

// Debug configuration in development only
if (isDevelopment()) {
  console.log('🔍 Supabase Configuration Debug:', {
    url: supabaseUrl?.substring(0, 30) + '...',
    keyLength: supabaseAnonKey?.length,
    keyStart: supabaseAnonKey?.substring(0, 20) + '...',
    environment: import.meta.env.MODE,
    allEnvKeys: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')).length,
    browser: navigator.userAgent.includes('Edg') ? 'Edge' : navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other',
    rawUrl: import.meta.env.VITE_SUPABASE_URL,
    rawKeyDefined: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    importMetaEnv: import.meta.env
  })
}

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 Missing Supabase configuration. Please check your .env file.');
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  console.error('Current values:', { supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
  
  if (isDevelopment()) {
    console.error('🔧 Development troubleshooting:', {
      envFileExists: 'Check if .env file exists in project root',
      restartServer: 'Try restarting the dev server with: npm run dev',
      browser: 'Try clearing browser cache and refreshing',
      allEnvVars: Object.keys(import.meta.env)
    });
  }
}

// Create the Supabase client with error handling
let supabase: any = null;
try {
  supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
  
  if (isDevelopment()) {
    console.log('✅ Supabase client created successfully');
  }
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error);
}

export { supabase };

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabase);
}