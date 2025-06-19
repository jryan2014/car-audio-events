#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analyzes the built application for optimization opportunities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '..', 'dist', 'assets');
const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');

function analyzeBundle() {
  console.log('🔍 Analyzing bundle...\n');

  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  const dependencies = Object.keys(packageJson.dependencies || {});
  const devDependencies = Object.keys(packageJson.devDependencies || {});

  console.log(`📦 Total dependencies: ${dependencies.length}`);
  console.log(`🛠️  Dev dependencies: ${devDependencies.length}\n`);

  // Analyze dist folder if it exists
  if (!fs.existsSync(DIST_DIR)) {
    console.log('❌ Build directory not found. Run `npm run build` first.');
    return;
  }

  const files = fs.readdirSync(DIST_DIR);
  const jsFiles = files.filter(file => file.endsWith('.js'));
  const cssFiles = files.filter(file => file.endsWith('.css'));

  console.log('📊 Bundle Analysis Results:');
  console.log('=' .repeat(50));

  // Analyze JavaScript files
  let totalJSSize = 0;
  console.log('\n📜 JavaScript Chunks:');
  jsFiles.forEach(file => {
    const filePath = path.join(DIST_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    totalJSSize += stats.size;
    
    // Determine chunk type from filename
    let chunkType = 'Unknown';
    if (file.includes('index-')) chunkType = 'Main Entry';
    else if (file.includes('react-')) chunkType = 'React Core';
    else if (file.includes('supabase-')) chunkType = 'Database';
    else if (file.includes('admin-pages-')) chunkType = 'Admin Pages';
    else if (file.includes('public-pages-')) chunkType = 'Public Pages';
    else if (file.includes('auth-pages-')) chunkType = 'Auth Pages';
    else if (file.includes('ai-features-')) chunkType = 'AI Features';
    else if (file.includes('icons-')) chunkType = 'Icons';
    else if (file.includes('vendor-')) chunkType = 'Vendor Libs';
    else if (file.includes('backup-utils-')) chunkType = 'Backup Utils';
    else if (file.includes('editor-')) chunkType = 'Text Editor';
    
    console.log(`  ${chunkType.padEnd(15)} ${file.padEnd(40)} ${sizeKB.padStart(8)} KB`);
  });

  // Analyze CSS files
  let totalCSSSize = 0;
  console.log('\n🎨 CSS Files:');
  cssFiles.forEach(file => {
    const filePath = path.join(DIST_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    totalCSSSize += stats.size;
    
    let fileType = 'Styles';
    if (file.includes('react-')) fileType = 'React CSS';
    else if (file.includes('index-')) fileType = 'Main CSS';
    
    console.log(`  ${fileType.padEnd(15)} ${file.padEnd(40)} ${sizeKB.padStart(8)} KB`);
  });

  console.log('\n📈 Summary:');
  console.log('=' .repeat(50));
  console.log(`Total JavaScript: ${(totalJSSize / 1024).toFixed(2)} KB`);
  console.log(`Total CSS:        ${(totalCSSSize / 1024).toFixed(2)} KB`);
  console.log(`Total Bundle:     ${((totalJSSize + totalCSSSize) / 1024).toFixed(2)} KB`);

  // Optimization recommendations
  console.log('\n💡 Optimization Recommendations:');
  console.log('=' .repeat(50));
  
  const mainChunk = jsFiles.find(f => f.includes('index-'));
  if (mainChunk) {
    const mainSize = fs.statSync(path.join(DIST_DIR, mainChunk)).size / 1024;
    if (mainSize > 100) {
      console.log('⚠️  Main chunk is large (>100KB). Consider more aggressive code splitting.');
    } else {
      console.log('✅ Main chunk size is optimized (<100KB).');
    }
  }

  const vendorChunk = jsFiles.find(f => f.includes('vendor-'));
  if (vendorChunk) {
    const vendorSize = fs.statSync(path.join(DIST_DIR, vendorChunk)).size / 1024;
    if (vendorSize > 200) {
      console.log('⚠️  Vendor chunk is large (>200KB). Consider excluding unused libraries.');
    } else {
      console.log('✅ Vendor chunk size is reasonable (<200KB).');
    }
  }

  const iconChunk = jsFiles.find(f => f.includes('icons-'));
  if (iconChunk) {
    console.log('✅ Icons are properly separated into their own chunk.');
  } else {
    console.log('💡 Consider separating icons into their own chunk for better caching.');
  }

  console.log('\n🚀 Performance Tips:');
  console.log('- Lazy load non-critical components');
  console.log('- Use dynamic imports for large libraries');
  console.log('- Implement service worker for caching');
  console.log('- Consider preloading critical chunks');
}

// Run the analysis
analyzeBundle(); 