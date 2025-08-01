import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Security headers configuration
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=*, fullscreen=*'
};

// Content Security Policy
const csp = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' 
    https://js.stripe.com 
    https://maps.googleapis.com 
    https://www.google.com
    https://maps.gstatic.com
    https://cdn.tiny.cloud
    https://*.tinymce.com
    https://js.hcaptcha.com
    https://*.hcaptcha.com;
  style-src 'self' 'unsafe-inline' 
    https://fonts.googleapis.com
    https://cdn.tiny.cloud
    https://*.tinymce.com;
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
    https://api.openai.com
    https://api.stability.ai
    https://cdn.tiny.cloud
    https://*.tinymce.com
    https://hcaptcha.com
    https://*.hcaptcha.com;
  frame-src 'self' 
    https://www.google.com 
    https://maps.google.com
    https://js.stripe.com
    https://hcaptcha.com
    https://*.hcaptcha.com;
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
  // Note: Environment variables are automatically loaded from .env files by Vite
  // For production (Netlify), set these in the Netlify dashboard
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