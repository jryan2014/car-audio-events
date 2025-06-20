#!/usr/bin/env node

/**
 * Automatic Version Generator
 * This script generates a TypeScript file with version information from package.json
 * Run this before build to ensure version consistency
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root directory
const projectRoot = path.resolve(__dirname, '..');

// Read package.json
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Parse version
const version = packageJson.version;
const [major, minor, patch] = version.split('.').map(Number);

// Generate the version file content
const versionFileContent = `// Auto-generated version file - DO NOT EDIT MANUALLY
// Generated at: ${new Date().toISOString()}
// Source: package.json v${version}

export const VERSION = {
  MAJOR: ${major},
  MINOR: ${minor},
  PATCH: ${patch},
  VERSION_STRING: '${version}',
  BUILD: ${Date.now()}, // Build timestamp
  RELEASE_DATE: '2025-01-17',
  CODENAME: 'Blood Brothers'
} as const;

export const getVersionString = (): string => {
  return VERSION.VERSION_STRING;
};

export const getFullVersionString = (): string => {
  return \`v\${getVersionString()} (\${VERSION.CODENAME})\`;
};

export const getBuildInfo = (): string => {
  const buildDate = new Date(VERSION.BUILD);
  return \`Build \${VERSION.BUILD} - \${buildDate.toLocaleDateString()}\`;
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
`;

// Write the version file
const versionFilePath = path.join(projectRoot, 'src', 'utils', 'version.ts');
fs.writeFileSync(versionFilePath, versionFileContent);

console.log(`✅ Version file generated successfully!`);
console.log(`📦 Package version: ${version}`);
console.log(`📁 Generated: ${versionFilePath}`);
console.log(`🕐 Build timestamp: ${Date.now()}`);