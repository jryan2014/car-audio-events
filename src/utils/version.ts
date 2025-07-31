// Auto-generated version file - DO NOT EDIT MANUALLY
// Generated at: 2025-07-31T00:59:39.981Z
// Source: package.json v1.26.68

export const VERSION = {
  MAJOR: 1,
  MINOR: 26,
  PATCH: 68,
  VERSION_STRING: '1.26.68',
  BUILD: 1753923579982, // Build timestamp
  RELEASE_DATE: '2025-06-06',
  CODENAME: 'Blood Brothers'
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
