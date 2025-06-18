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
    ],
    // Force optimization of commonly used packages
    force: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild', // Use esbuild for faster minification
    target: 'es2020', // Modern browser target for better optimization
    chunkSizeWarningLimit: 300, // Reduced from 500 to encourage smaller chunks
    cssCodeSplit: true, // Enable CSS code splitting
    
    rollupOptions: {
      // Enable aggressive tree shaking
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
        
        // Advanced manual chunks for optimal loading
        manualChunks: (id) => {
          // React core (keep small and separate)
          if (id.includes('react/') && !id.includes('react-dom')) {
            return 'react-core';
          }
          
          // React DOM (separate from core)
          if (id.includes('react-dom')) {
            return 'react-dom';
          }
          
          // React Router (separate chunk)
          if (id.includes('react-router')) {
            return 'react-router';
          }
          
          // Supabase client
          if (id.includes('@supabase') || id.includes('supabase')) {
            return 'supabase';
          }
          
          // Lucide icons - separate chunk for better caching
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // OpenAI and AI-related packages
          if (id.includes('openai') || id.includes('ai')) {
            return 'ai-vendor';
          }
          
          // Editor packages (Quill)
          if (id.includes('quill') || id.includes('react-quill')) {
            return 'editor';
          }
          
          // Google Maps
          if (id.includes('@googlemaps') || id.includes('google-maps')) {
            return 'maps';
          }
          
          // Stripe
          if (id.includes('@stripe') || id.includes('stripe')) {
            return 'stripe';
          }
          
          // Split admin pages into smaller chunks
          
          // Admin user management
          if (id.includes('pages/AdminUsers') || 
              id.includes('pages/UserDetails') ||
              id.includes('pages/EditUser') ||
              id.includes('pages/AdminMembership')) {
            return 'admin-users';
          }
          
          // Admin content management
          if (id.includes('pages/AdminEvents') || 
              id.includes('pages/CreateEvent') ||
              id.includes('pages/EditEvent') ||
              id.includes('pages/CMSPages') ||
              id.includes('pages/NavigationManager')) {
            return 'admin-content';
          }
          
          // Admin system management
          if (id.includes('pages/AdminSettings') ||
              id.includes('pages/SystemConfiguration') ||
              id.includes('pages/AdminBackup') ||
              id.includes('pages/AdminDashboard')) {
            return 'admin-system';
          }
          
          // Admin analytics and advanced features
          if (id.includes('pages/AdminAnalytics') ||
              id.includes('pages/DirectoryManager') ||
              id.includes('pages/OrganizationManager') ||
              id.includes('pages/CompetitionManagement')) {
            return 'admin-analytics';
          }
          
          // Advertisement management (large feature)
          if (id.includes('pages/AdManagement') ||
              id.includes('pages/AdvertisePage') ||
              id.includes('pages/MemberAdDashboard')) {
            return 'ad-management';
          }
          
          // AI Configuration (separate from other AI features)
          if (id.includes('pages/AIConfiguration') ||
              id.includes('components/BannerAICreator') ||
              id.includes('components/WebScraperModal')) {
            return 'ai-config';
          }
          
          // Public pages - core user experience
          if (id.includes('pages/Home') || 
              id.includes('pages/Dashboard') ||
              id.includes('pages/Events') ||
              id.includes('pages/EventDetails')) {
            return 'public-core';
          }
          
          // Public pages - secondary
          if (id.includes('pages/Directory') ||
              id.includes('pages/Resources') ||
              id.includes('pages/Pricing') ||
              id.includes('pages/SearchResults')) {
            return 'public-secondary';
          }
          
          // Authentication pages
          if (id.includes('pages/Login') || 
              id.includes('pages/Register') ||
              id.includes('pages/ForgotPassword') ||
              id.includes('pages/ResetPassword')) {
            return 'auth-pages';
          }
          
          // User profile and personal features
          if (id.includes('pages/Profile') ||
              id.includes('pages/NotificationHistory') ||
              id.includes('pages/ClaimOrganization') ||
              id.includes('pages/CreateDirectoryListing')) {
            return 'user-features';
          }
          
          // Competition and scoring
          if (id.includes('components/JudgeScoring') ||
              id.includes('components/Competition')) {
            return 'competition';
          }
          
          // Backup and management utilities
          if (id.includes('utils/backup') ||
              id.includes('services/backup') ||
              id.includes('components/BackupManager')) {
            return 'backup-utils';
          }
          
          // Utility packages
          if (id.includes('date-fns') || id.includes('moment')) {
            return 'date-utils';
          }
          
          // Charts and visualization
          if (id.includes('chart') || id.includes('recharts') || id.includes('d3')) {
            return 'charts';
          }
          
          // Large vendor packages that should be separate
          if (id.includes('node_modules') && id.length > 1000) {
            return 'vendor-large';
          }
          
          // Default vendor chunk for remaining node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  
  // Performance optimizations for development
  server: {
    hmr: {
      overlay: false // Disable overlay for better performance
    },
    host: true
  },
  
  // Experimental features for better performance
  experimental: {
    renderBuiltUrl(filename) {
      // Use relative URLs for better caching
      return `./${filename}`;
    }
  }
});