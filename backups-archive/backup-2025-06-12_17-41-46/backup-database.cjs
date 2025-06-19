const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function backupDatabase() {
  const supabaseUrl = 'https://nqvisvranvjaghvrdaaz.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmlzdnJhbnZqYWdodnJkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDY2NzcsImV4cCI6MjA2NTE4MjY3N30.OWwP8kH9qTKxgEHCC6ru0QSAJ5KhOupCxMUyxHuYWVY';
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('🗄️ Starting database backup...');
  console.log('📡 Database URL:', supabaseUrl);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `backup-${timestamp}`;
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const backup = {
    timestamp,
    database_url: supabaseUrl,
    tables: {}
  };

  try {
    // List of tables to backup
    const tablesToBackup = [
      'users',
      'profiles', 
      'cms_pages',
      'events',
      'organizations',
      'teams',
      'registrations',
      'payments',
      'system_configurations'
    ];

    console.log('\n📊 Backing up tables...');

    for (const tableName of tablesToBackup) {
      try {
        console.log(`📥 Backing up ${tableName}...`);
        
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' });

        if (error) {
          if (error.code === '42P01') {
            console.log(`⚠️  Table ${tableName} does not exist - skipping`);
            backup.tables[tableName] = {
              exists: false,
              error: 'Table does not exist'
            };
            continue;
          }
          throw error;
        }

        backup.tables[tableName] = {
          exists: true,
          count: count || 0,
          data: data || [],
          backed_up_at: new Date().toISOString()
        };

        console.log(`✅ ${tableName}: ${count || 0} rows backed up`);

        // Save individual table backup
        const tableFile = path.join(backupDir, `${tableName}.json`);
        fs.writeFileSync(tableFile, JSON.stringify({
          table: tableName,
          count: count || 0,
          data: data || [],
          backed_up_at: new Date().toISOString()
        }, null, 2));

      } catch (tableError) {
        console.log(`❌ Error backing up ${tableName}:`, tableError.message);
        backup.tables[tableName] = {
          exists: false,
          error: tableError.message
        };
      }
    }

    // Save complete backup manifest
    const manifestFile = path.join(backupDir, 'backup-manifest.json');
    fs.writeFileSync(manifestFile, JSON.stringify(backup, null, 2));

    // Create restore script
    const restoreScript = `const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function restoreBackup() {
  const supabaseUrl = '${supabaseUrl}';
  const supabaseAnonKey = '${supabaseAnonKey}';
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('🔄 Restoring database from backup: ${timestamp}');

  const manifest = JSON.parse(fs.readFileSync('backup-manifest.json', 'utf8'));
  
  for (const [tableName, tableInfo] of Object.entries(manifest.tables)) {
    if (!tableInfo.exists || !tableInfo.data || tableInfo.data.length === 0) {
      console.log(\`⏭️  Skipping \${tableName} (no data)\`);
      continue;
    }

    try {
      console.log(\`📥 Restoring \${tableName} (\${tableInfo.count} rows)...\`);
      
      // Clear existing data (optional - comment out if you want to preserve)
      // await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Insert backed up data
      const { error } = await supabase.from(tableName).insert(tableInfo.data);
      
      if (error) throw error;
      console.log(\`✅ \${tableName} restored successfully\`);
      
    } catch (error) {
      console.log(\`❌ Error restoring \${tableName}:\`, error.message);
    }
  }
  
  console.log('🎉 Backup restore completed!');
}

restoreBackup();`;

    fs.writeFileSync(path.join(backupDir, 'restore-backup.cjs'), restoreScript);

    // Create summary
    const summary = {
      backup_completed_at: new Date().toISOString(),
      backup_directory: backupDir,
      total_tables: Object.keys(backup.tables).length,
      tables_with_data: Object.values(backup.tables).filter(t => t.exists && t.count > 0).length,
      total_rows: Object.values(backup.tables).reduce((sum, t) => sum + (t.count || 0), 0),
      files_created: [
        'backup-manifest.json',
        'restore-backup.cjs',
        ...Object.keys(backup.tables).filter(t => backup.tables[t].exists).map(t => `${t}.json`)
      ]
    };

    fs.writeFileSync(path.join(backupDir, 'backup-summary.json'), JSON.stringify(summary, null, 2));

    console.log('\n🎉 Backup completed successfully!');
    console.log('📁 Backup directory:', backupDir);
    console.log('📊 Summary:');
    console.log(`   • Total tables: ${summary.total_tables}`);
    console.log(`   • Tables with data: ${summary.tables_with_data}`);
    console.log(`   • Total rows: ${summary.total_rows}`);
    console.log('\n📄 Files created:');
    summary.files_created.forEach(file => {
      console.log(`   • ${file}`);
    });
    console.log(`\n🔄 To restore this backup later, run:`);
    console.log(`   cd ${backupDir} && node restore-backup.cjs`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
  }
}

backupDatabase(); 