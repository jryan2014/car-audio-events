import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Environment variables for both development and production
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://nqvisvranvjaghvrdaaz.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmlzdnJhbnZqYWdodnJkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDY2NzcsImV4cCI6MjA2NTE4MjY3N30.OWwP8kH9qTKxgEHCC6ru0QSAJ5KhOupCxMUyxHuYWVY'),
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBYMbq6u4tmOJKRnLww28MGe-7QOGmhjyM'),
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: []
        }
      }
    }
  }
});