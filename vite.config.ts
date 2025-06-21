import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Security headers configuration
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=(self)'
};

// Content Security Policy
const csp = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' 
    https://js.stripe.com 
    https://maps.googleapis.com 
    https://www.google.com
    https://maps.gstatic.com;
  style-src 'self' 'unsafe-inline' 
    https://fonts.googleapis.com;
  font-src 'self' 
    https://fonts.gstatic.com 
    https://fonts.googleapis.com;
  img-src 'self' data: blob: https: http:;
  connect-src 'self' 
    https://nqvisvranvjaghvrdaaz.supabase.co 
    wss://nqvisvranvjaghvrdaaz.supabase.co
    https://api.stripe.com
    https://maps.googleapis.com
    https://maps.gstatic.com
    https://fonts.googleapis.com
    https://fonts.gstatic.com
    https://api.openai.com;
  frame-src 'self' 
    https://www.google.com 
    https://maps.google.com
    https://js.stripe.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self' https://api.stripe.com;
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s+/g, ' ').trim();

// Minimal configuration without PWA/service worker for stable production
export default defineConfig({
  plugins: [
    react()
    // PWA disabled to prevent service worker interference
  ],
  define: {
    // Environment variables for both development and production
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://nqvisvranvjaghvrdaaz.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmlzdnJhbnZqYWdodnJkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDY2NzcsImV4cCI6MjA2NTE4MjY3N30.OWwP8kH9qTKxgEHCC6ru0QSAJ5KhOupCxMUyxHuYWVY'),
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBYMbq6u4tmOJKRnLww28MGe-7QOGmhjyM'),
    'import.meta.env.VITE_HCAPTCHA_SITE_KEY': JSON.stringify(process.env.VITE_HCAPTCHA_SITE_KEY || 'acc27e90-e7ae-451e-bbfa-c738c53420fe'),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Simple filenames without chunking to prevent errors
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        // Minimal chunking to prevent errors
        manualChunks: undefined
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    // Security headers for development
    headers: {
      ...securityHeaders,
      'Content-Security-Policy': csp
    }
  },
  preview: {
    port: 4173,
    host: true,
    // Security headers for preview/staging
    headers: {
      ...securityHeaders,
      'Content-Security-Policy': csp
    }
  }
});