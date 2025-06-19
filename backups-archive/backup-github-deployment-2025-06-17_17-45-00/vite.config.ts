import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Car Audio Competition Platform',
        short_name: 'CAC Platform',
        description: 'Professional car audio competition management platform',
        theme_color: '#1f2937',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  define: {
    // Environment variables for both development and production
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://nqvisvranvjaghvrdaaz.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmlzdnJhbnZqYWdodnJkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDY2NzcsImV4cCI6MjA2NTE4MjY3N30.OWwP8kH9qTKxgEHCC6ru0QSAJ5KhOupCxMUyxHuYWVY'),
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBYMbq6u4tmOJKRnLww28MGe-7QOGmhjyM'),
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js'
    ]
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild', // Use esbuild for faster minification
    target: 'es2015', // Modern browser target for better optimization
    chunkSizeWarningLimit: 500, // Reduced from 1600 to encourage smaller chunks
    cssCodeSplit: true, // Enable CSS code splitting
    rollupOptions: {
      // Enable tree shaking
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false
      },
      output: {
        // Add timestamp to filenames for cache busting
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`,
        manualChunks: (id) => {
          // React and core dependencies
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react';
          }
          
          // Supabase
          if (id.includes('@supabase') || id.includes('supabase')) {
            return 'supabase';
          }
          
          // Lucide icons - separate chunk for better caching
          if (id.includes('lucide-react') || id.includes('components/icons')) {
            return 'icons';
          }
          
          // Admin pages - group together since they're used by admin users
          if (id.includes('pages/Admin') || 
              id.includes('pages/SystemConfiguration') ||
              id.includes('pages/UserDetails') ||
              id.includes('pages/EditUser') ||
              id.includes('pages/NavigationManager') ||
              id.includes('pages/DirectoryManager') ||
              id.includes('pages/CMSPages')) {
            return 'admin-pages';
          }
          
          // Public pages - frequently accessed
          if (id.includes('pages/Home') || 
              id.includes('pages/Events') ||
              id.includes('pages/EventDetails') ||
              id.includes('pages/Dashboard') ||
              id.includes('pages/Directory')) {
            return 'public-pages';
          }
          
          // Authentication pages
          if (id.includes('pages/Login') || 
              id.includes('pages/Register') ||
              id.includes('pages/ForgotPassword') ||
              id.includes('pages/ResetPassword')) {
            return 'auth-pages';
          }
          
          // AI and Configuration pages
          if (id.includes('pages/AIConfiguration') ||
              id.includes('pages/SystemConfigurationDemo') ||
              id.includes('components/BannerAICreator') ||
              id.includes('components/WebScraperModal')) {
            return 'ai-features';
          }
          
          // Backup and management utilities
          if (id.includes('utils/backup') ||
              id.includes('services/backup') ||
              id.includes('components/BackupManager')) {
            return 'backup-utils';
          }
          
          // Date/time libraries
          if (id.includes('date-fns') || id.includes('moment')) {
            return 'date-utils';
          }
          
          // Charts and visualization
          if (id.includes('chart') || id.includes('recharts') || id.includes('d3')) {
            return 'charts';
          }
          
          // Form libraries
          if (id.includes('react-hook-form') || id.includes('formik')) {
            return 'forms';
          }
          
          // Text editor
          if (id.includes('react-quill') || id.includes('quill')) {
            return 'editor';
          }
          
          // Other vendor libraries
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true, // Allow external connections
    strictPort: true, // Exit if port is already in use
    // Force browser to not cache during development
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    // WebSocket configuration for better compatibility
    hmr: {
      port: 5173,
      // Fallback to polling if WebSocket fails
      overlay: true
    },
    // Enable CORS for development
    cors: true
  },
  preview: {
    // Handle SPA routing for preview mode
    open: true
  },
  // Handle client-side routing - this fixes the refresh issue
  appType: 'spa',
  // Ensure proper base configuration
  base: '/'
});