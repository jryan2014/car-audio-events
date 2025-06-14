// Version utility for the Car Audio Events Platform
// This file manages version information and provides utilities for version display

export const VERSION = {
  MAJOR: 1,
  MINOR: 0,
  PATCH: 0,
  BUILD: Date.now(), // Build timestamp
  RELEASE_DATE: '2025-06-14',
  CODENAME: 'Foundation'
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