// Version utility for the Car Audio Events Platform
// This file manages version information and provides utilities for version display

export const VERSION = {
  MAJOR: 1,
  MINOR: 5,
  PATCH: 0,
  BUILD: Date.now(), // Build timestamp
  RELEASE_DATE: '2025-01-17',
  CODENAME: 'Security Fortress'
} as const;

export const getVersionString = (): string => {
  return `${VERSION.MAJOR}.${VERSION.MINOR}.${VERSION.PATCH}`;
};

export const getFullVersionString = (): string => {
  return `v${getVersionString()} (${VERSION.CODENAME})`;
};

export const getBuildInfo = (): string => {
  const buildDate = new Date(VERSION.BUILD);
  return `Build ${VERSION.BUILD} - ${buildDate.toLocaleDateString()}`;
};

export const getVersionInfo = () => {
  return {
    version: getVersionString(),
    fullVersion: getFullVersionString(),
    major: VERSION.MAJOR,
    minor: VERSION.MINOR,
    patch: VERSION.PATCH,
    build: VERSION.BUILD,
    releaseDate: VERSION.RELEASE_DATE,
    codename: VERSION.CODENAME,
    buildInfo: getBuildInfo()
  };
};

// Version comparison utilities
export const isNewerVersion = (currentVersion: string, newVersion: string): boolean => {
  const current = currentVersion.split('.').map(Number);
  const newer = newVersion.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (newer[i] > current[i]) return true;
    if (newer[i] < current[i]) return false;
  }
  
  return false;
};

// Development environment detection
export const isDevelopment = (): boolean => {
  return import.meta.env.MODE === 'development';
};

export const isProduction = (): boolean => {
  return import.meta.env.MODE === 'production';
};

// Version history for reference
export const VERSION_HISTORY = [
  {
    version: '1.5.0',
    date: '2025-01-17',
    codename: 'Security Fortress',
    description: 'Major security overhaul with comprehensive protection while maintaining full functionality',
    features: [
      '🔒 Implemented comprehensive Content Security Policy (CSP) protection',
      '🛡️ Added security headers: HSTS, XSS Protection, Clickjacking Prevention',
      '🚨 Fixed critical production failures with emergency site restoration',
      '⚡ Resolved PWA/Service Worker conflicts causing site outages',
      '🔧 Eliminated JavaScript bundle errors from aggressive code splitting',
      '🔍 Added CSP violation monitoring and security event logging',
      '📋 Created comprehensive security documentation (SECURITY.md)',
      '✅ Protected against XSS, Clickjacking, MITM, and Data Injection attacks',
      '🌐 Secured external connections to only trusted domains (Stripe, Google, Supabase)',
      '🚀 Maintained full functionality while achieving robust security posture',
      '⚠️ Strategically disabled PWA to eliminate service worker attack vectors',
      '🔗 Enforced HTTPS with upgrade-insecure-requests policy'
    ]
  },
  {
    version: '1.4.1',
    date: '2025-01-30',
    codename: 'Security Console Log Protection',
    description: 'Critical security patch to protect sensitive API information from console exposure in production',
    features: [
      'Protected Supabase configuration debug logs from production console exposure',
      'Secured Google Maps API key information with development-only visibility',
      'Protected Postmark email service configuration from end user visibility',
      'Prevented cron job and backup scheduling information from appearing in console',
      'Added isDevelopment() checks to all sensitive debug logging',
      'Fixed Google Maps async loading with proper callback mechanism',
      'Resolved advertisement system 403 Forbidden errors',
      'Restored admin activity tracking functions (log_activity, get_recent_activity)',
      'Enhanced Google Maps performance with loading=async optimization',
      'Improved platform security posture for production deployment'
    ]
  },
  {
    version: '1.4.0',
    date: '2025-06-17',
    codename: 'Stripe Payment Integration',
    description: 'Complete Stripe payment system implementation for event registration and monetization',
    features: [
      'Implemented Supabase Edge Functions for Stripe payment processing',
      'Created create-payment-intent function with user authentication and validation',
      'Built confirm-payment function with database integration and event registration',
      'Developed stripe-webhook handler for payment status synchronization',
      'Created comprehensive payments database table with RLS security policies',
      'Integrated payment system with existing event registration workflow',
      'Built payment history view with event details and user information',
      'Created secure payment processing with proper error handling',
      'Added deployment script for automated Stripe integration setup',
      'Implemented comprehensive testing and validation framework',
      'Enhanced PaymentForm component with modern Stripe Elements integration',
      'Added admin payment management and monitoring capabilities'
    ]
  },
  {
    version: '1.3.3',
    date: '2025-06-17',
    codename: 'Professional Notification System',
    description: 'Implemented comprehensive toast notification system replacing browser alerts',
    features: [
      'Built NotificationSystem.tsx with React Context and TypeScript support',
      'Implemented 4 notification types: success, error, warning, info',
      'Added professional styling with animations and backdrop blur effects',
      'Created auto-dismiss functionality with progress bars',
      'Integrated NotificationProvider at app level in App.tsx',
      'Replaced all alert() calls in CMSPages.tsx with contextual messages',
      'Enhanced user experience with non-blocking professional notifications',
      'Fixed button type conflicts that were causing form submission issues'
    ]
  },
  {
    version: '1.3.2',
    date: '2025-06-15',
    codename: 'Connection Status Restoration',
    description: 'Restored missing connection status badges and improved status display logic',
    features: [
      'Restored connection status badges on Configuration tab',
      'Restored connection status badges on Writing Assistant tab',
      'Fixed connection status display logic to always show status',
      'Improved status text: "Not Configured" for missing API keys',
      'Enhanced status accuracy: "Connected", "Error", "Testing", "Checking..."',
      'Fixed missing functionality that was accidentally removed',
      'Consistent status display across all AI configuration tabs'
    ]
  },
  {
    version: '1.3.1',
    date: '2025-06-15',
    codename: 'Admin Analytics Fixes',
    description: 'Fixed admin analytics theming, removed mock data, and improved consistency',
    features: [
      'Fixed AI Access Control Status red text to match site theming',
      'Changed Usage Alerts Configured from orange to green status',
      'Removed all mock data from admin analytics',
      'Updated all section headers to use consistent electric-400 theming',
      'Removed unconfigured providers (Midjourney, Adobe Firefly) from display',
      'Set realistic user counts and cost data to zero for fresh installation',
      'Improved admin analytics visual consistency across all sections'
    ]
  },
  {
    version: '1.1.0',
    date: '2025-06-14',
    codename: 'Advertisement System with AI Integration',
    description: 'Major advertisement system overhaul with AI-powered features',
    features: [
      'Complete advertisement system overhaul',
      'Modal-based editing system with tooltips',
      'AI chat assistant for banner creation',
      'Frontend selling page for advertisers',
      'Member advertising dashboard',
      'Enhanced database schema with billing integration',
      'Advanced targeting and placement options',
      'Real-time analytics and performance tracking',
      'Integration with membership and payment systems'
    ]
  },
  {
    version: '1.0.1',
    date: '2025-06-14',
    codename: 'Foundation',
    description: 'Logo fix patch release',
    features: [
      'Fixed broken logo display in production',
      'Added missing CAE_Logo_V3.png asset',
      'Resolved 404 error for logo file'
    ]
  },
  {
    version: '1.0.0',
    date: '2025-06-14',
    codename: 'Foundation',
    description: 'Initial production release with core platform features',
    features: [
      'User authentication and registration',
      'Admin dashboard and management',
      'Event management system',
      'CMS and content management',
      'Logo management system',
      'Dynamic navigation',
      'Email integration',
      'Payment foundation'
    ]
  }
] as const; 