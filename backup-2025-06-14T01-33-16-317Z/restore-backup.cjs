const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function restoreBackup() {
  const supabaseUrl = 'https://nqvisvranvjaghvrdaaz.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmlzdnJhbnZqYWdodnJkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDY2NzcsImV4cCI6MjA2NTE4MjY3N30.OWwP8kH9qTKxgEHCC6ru0QSAJ5KhOupCxMUyxHuYWVY';
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('🔄 Restoring database from backup: 2025-06-14T01-33-16-317Z');

  const manifest = JSON.parse(fs.readFileSync('backup-manifest.json', 'utf8'));
  
  for (const [tableName, tableInfo] of Object.entries(manifest.tables)) {
    if (!tableInfo.exists || !tableInfo.data || tableInfo.data.length === 0) {
      console.log(`⏭️  Skipping ${tableName} (no data)`);
      continue;
    }

    try {
      console.log(`📥 Restoring ${tableName} (${tableInfo.count} rows)...`);
      
      // Clear existing data (optional - comment out if you want to preserve)
      // await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Insert backed up data
      const { error } = await supabase.from(tableName).insert(tableInfo.data);
      
      if (error) throw error;
      console.log(`✅ ${tableName} restored successfully`);
      
    } catch (error) {
      console.log(`❌ Error restoring ${tableName}:`, error.message);
    }
  }
  
  console.log('🎉 Backup restore completed!');
}

restoreBackup();