// Version utility for the Car Audio Events Platform
// This file manages version information and provides utilities for version display

export const VERSION = {
  MAJOR: 1,
  MINOR: 3,
  PATCH: 2,
  BUILD: Date.now(), // Build timestamp
  RELEASE_DATE: '2025-06-15',
  CODENAME: 'Connection Status Restoration'
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