// Auto-generated version file - DO NOT EDIT MANUALLY
// Generated at: 2025-06-19T19:20:04.380Z
// Source: package.json v1.5.5

export const VERSION = {
  MAJOR: 1,
  MINOR: 5,
  PATCH: 5,
  VERSION_STRING: '1.5.5',
  BUILD: 1750360804381, // Build timestamp
  RELEASE_DATE: '2025-01-17',
  CODENAME: 'Security Fortress'
} as const;

export const getVersionString = (): string => {
  return VERSION.VERSION_STRING;
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
    version: '1.5.5',
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
      '🔗 Enforced HTTPS with upgrade-insecure-requests policy',
      '📱 Fixed mobile menu memory leaks and infinite loops',
      '🔧 Made version system dynamic to prevent version mismatches',
      '🤖 Implemented automatic version control system'
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
  }
] as const;

// Utility to get the current version
export const getCurrentVersion = () => VERSION.VERSION_STRING;

// Utility to check if we're running the latest version
export const getVersionStatus = () => {
  const currentVersion = getCurrentVersion();
  const latestInHistory = VERSION_HISTORY[0].version;
  
  return {
    current: currentVersion,
    latest: latestInHistory,
    isLatest: currentVersion === latestInHistory,
    needsUpdate: isNewerVersion(currentVersion, latestInHistory)
  };
};
