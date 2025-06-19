#!/usr/bin/env node

/**
 * Version Bump Script
 * Automatically bumps version in package.json and regenerates version.ts
 * Usage: npm run version:bump [patch|minor|major]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root directory
const projectRoot = path.resolve(__dirname, '..');

// Get bump type from command line argument
const bumpType = process.argv[2] || 'patch';

if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('❌ Invalid bump type. Use: patch, minor, or major');
  process.exit(1);
}

try {
  console.log(`🚀 Bumping ${bumpType} version...`);
  
  // Read current package.json
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;
  
  console.log(`📦 Current version: ${currentVersion}`);
  
  // Use npm version to bump the version
  const newVersion = execSync(`npm version ${bumpType} --no-git-tag-version`, { 
    cwd: projectRoot, 
    encoding: 'utf8' 
  }).trim().replace('v', '');
  
  console.log(`📦 New version: ${newVersion}`);
  
  // Generate new version file
  console.log('🔄 Generating version file...');
  execSync('npm run version:generate', { cwd: projectRoot, stdio: 'inherit' });
  
  console.log('✅ Version bump complete!');
  console.log(`📝 Next steps:`);
  console.log(`   1. Review changes: git diff`);
  console.log(`   2. Commit changes: git add . && git commit -m "chore: bump version to ${newVersion}"`);
  console.log(`   3. Create tag: git tag v${newVersion}`);
  console.log(`   4. Push changes: git push && git push --tags`);
  
} catch (error) {
  console.error('❌ Error bumping version:', error.message);
  process.exit(1);
} 