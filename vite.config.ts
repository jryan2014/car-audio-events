import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { SecurityHeadersMiddleware, SecurityHeadersUtils } from './src/middleware/security-headers';

// Get environment-aware security headers
const environment = SecurityHeadersUtils.getEnvironment();
const securityHeaders = SecurityHeadersMiddleware.getHeaders({ 
  environment,
  includeDevHeaders: environment === 'development'
});

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
    headers: securityHeaders
  },
  preview: {
    port: 4173,
    host: true,
    // Security headers for preview/staging
    headers: securityHeaders
  }
});