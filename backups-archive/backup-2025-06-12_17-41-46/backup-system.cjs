#!/usr/bin/env node

/**
 * BACKUP SYSTEM FOR CAR AUDIO EVENTS PLATFORM
 * 
 * This script creates automatic backups of the database to prevent future data loss.
 * Run this BEFORE making any risky database changes.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKUP_DIR = path.join(__dirname, 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function createBackup() {
  console.log('🔄 Creating database backup...');
  
  try {
    // Create timestamp-based backup filename
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);
    
    // Check if PostgreSQL tools are available
    try {
      execSync('pg_dump --version', { stdio: 'pipe' });
    } catch (error) {
      console.log('⚠️  pg_dump not found. Using alternative backup method...');
      return await createSupabaseBackup();
    }
    
    // Export the full database using pg_dump
    const dumpCommand = `pg_dump "postgresql://postgres:postgres@127.0.0.1:54322/postgres" > "${backupFile}"`;
    
    console.log('📁 Exporting database to:', backupFile);
    execSync(dumpCommand, { stdio: 'inherit' });
    
    // Also create a JSON export of key tables for redundancy
    await createJsonBackup();
    
    console.log('\n🎉 Backup completed successfully!');
    console.log(`📁 SQL Backup: ${backupFile}`);
    
    // Clean up old backups (keep last 10)
    cleanupOldBackups();
    
    return backupFile;
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    console.log('🔄 Trying alternative backup method...');
    return await createSupabaseBackup();
  }
}

async function createSupabaseBackup() {
  console.log('📁 Creating Supabase backup...');
  
  const backupFile = path.join(BACKUP_DIR, `supabase-backup-${timestamp}.sql`);
  
  try {
    // Use Supabase CLI to create backup
    const command = `npx supabase db dump --local > "${backupFile}"`;
    execSync(command, { stdio: 'inherit' });
    
    await createJsonBackup();
    
    console.log('\n🎉 Supabase backup completed!');
    console.log(`📁 Backup: ${backupFile}`);
    
    return backupFile;
  } catch (error) {
    console.error('❌ Supabase backup also failed:', error.message);
    console.log('📄 Creating JSON-only backup as fallback...');
    return await createJsonBackup();
  }
}

async function createJsonBackup() {
  const jsonBackup = path.join(BACKUP_DIR, `backup-data-${timestamp}.json`);
  
  console.log('📄 Creating JSON backup for critical data...');
  
  const tableQueries = {
    organizations: 'SELECT * FROM organizations',
    events: 'SELECT * FROM events', 
    configuration_categories: 'SELECT * FROM configuration_categories',
    configuration_options: 'SELECT * FROM configuration_options',
    rules_templates: 'SELECT * FROM rules_templates',
    form_field_configurations: 'SELECT * FROM form_field_configurations'
  };
  
  const backupData = {};
  
  for (const [table, query] of Object.entries(tableQueries)) {
    try {
      // Try using psql first
      let result;
      try {
        result = execSync(`psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -t -c "${query}" --csv`, 
          { encoding: 'utf8' });
      } catch (psqlError) {
        // If psql fails, try supabase CLI
        try {
          result = execSync(`npx supabase db sql --local --csv -c "${query}"`, 
            { encoding: 'utf8' });
        } catch (supabaseError) {
          console.log(`⚠️  Could not backup ${table}: ${supabaseError.message}`);
          backupData[table] = [];
          continue;
        }
      }
      
      backupData[table] = result.trim().split('\n').filter(line => line.length > 0);
      console.log(`✅ Backed up ${table}: ${backupData[table].length} records`);
    } catch (error) {
      console.log(`⚠️  Could not backup ${table}: ${error.message}`);
      backupData[table] = [];
    }
  }
  
  fs.writeFileSync(jsonBackup, JSON.stringify(backupData, null, 2));
  console.log(`📄 JSON Backup: ${jsonBackup}`);
  
  return jsonBackup;
}

function cleanupOldBackups() {
  console.log('\n🧹 Cleaning up old backups...');
  
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup-') && (file.endsWith('.sql') || file.endsWith('.json')))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        stat: fs.statSync(path.join(BACKUP_DIR, file))
      }))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);
    
    // Keep the 10 most recent backups
    const filesToDelete = files.slice(20); // Keep 10 SQL + 10 JSON files
    
    filesToDelete.forEach(file => {
      fs.unlinkSync(file.path);
      console.log(`🗑️  Deleted old backup: ${file.name}`);
    });
    
    console.log(`📊 Keeping ${Math.min(files.length, 20)} most recent backup files`);
  } catch (error) {
    console.log('⚠️  Could not clean up old backups:', error.message);
  }
}

async function restoreBackup(backupFile) {
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }
  
  console.log(`🔄 Restoring database from: ${backupFile}`);
  
  try {
    // Reset database first
    console.log('🔄 Resetting database...');
    execSync('npx supabase db reset --no-seed', { stdio: 'inherit' });
    
    // Restore the backup
    console.log('📥 Restoring backup...');
    if (backupFile.endsWith('.sql')) {
      const restoreCommand = `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" < "${backupFile}"`;
      execSync(restoreCommand, { stdio: 'inherit' });
    } else {
      throw new Error('Only SQL backups can be restored automatically');
    }
    
    console.log('✅ Database restored successfully!');
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    throw error;
  }
}

function listBackups() {
  console.log('\n📋 Available backups:');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('❌ No backups directory found');
    return [];
  }
  
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.includes('backup-') && (file.endsWith('.sql') || file.endsWith('.json')))
    .map(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stat = fs.statSync(filePath);
      return {
        file,
        path: filePath,
        size: (stat.size / 1024 / 1024).toFixed(2) + ' MB',
        date: stat.mtime.toLocaleString(),
        type: file.endsWith('.sql') ? 'SQL' : 'JSON'
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (backups.length === 0) {
    console.log('❌ No backups found');
    return [];
  }
  
  backups.forEach((backup, index) => {
    console.log(`${index + 1}. ${backup.file} (${backup.type})`);
    console.log(`   📅 Created: ${backup.date}`);
    console.log(`   📦 Size: ${backup.size}\n`);
  });
  
  return backups;
}

// CLI handling
const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  try {
    switch (command) {
      case 'create':
      case 'backup':
        await createBackup();
        break;
        
      case 'restore':
        if (!arg) {
          console.log('❌ Please specify a backup file to restore');
          console.log('Usage: node backup-system.cjs restore <backup-file>');
          listBackups();
          process.exit(1);
        }
        await restoreBackup(arg);
        break;
        
      case 'list':
        listBackups();
        break;
        
      default:
        console.log('🚀 Car Audio Events Platform - Backup System');
        console.log('\nUsage:');
        console.log('  node backup-system.cjs create          - Create a new backup');
        console.log('  node backup-system.cjs list            - List all available backups');
        console.log('  node backup-system.cjs restore <file>  - Restore from backup');
        console.log('\nExamples:');
        console.log('  node backup-system.cjs create');
        console.log('  node backup-system.cjs restore backups/backup-2025-06-11T20-30-00-000Z.sql');
        console.log('\n⚠️  ALWAYS CREATE A BACKUP BEFORE MAKING DATABASE CHANGES!');
        console.log('\n🔧 Pro tip: Add this to your workflow:');
        console.log('     1. node backup-system.cjs create');
        console.log('     2. Make your changes');
        console.log('     3. If something goes wrong: node backup-system.cjs restore <backup-file>');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createBackup, restoreBackup, listBackups }; 