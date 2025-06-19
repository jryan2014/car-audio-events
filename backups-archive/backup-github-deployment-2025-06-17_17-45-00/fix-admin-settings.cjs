const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAdminSettingsTable() {
  console.log('🔧 Fixing admin_settings table column names...');
  
  try {
    // First, check current table structure
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'admin_settings' })
      .catch(() => null);
    
    // Check if table exists with old column names by trying to select
    const { data: testData, error: testError } = await supabase
      .from('admin_settings')
      .select('key_name, key_value')
      .limit(1);
    
    if (!testError) {
      console.log('📋 Found table with old column names (key_name, key_value)');
      console.log('🔄 Renaming columns to (key, value)...');
      
      // Execute the column rename SQL
      const { error: renameError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE admin_settings RENAME COLUMN key_name TO key;
          ALTER TABLE admin_settings RENAME COLUMN key_value TO value;
        `
      });
      
      if (renameError) {
        // Try direct SQL execution
        const { error: directError } = await supabase
          .from('admin_settings')
          .select('*')
          .limit(0); // This will fail if columns don't exist
          
        console.log('⚠️  Could not rename columns via RPC, trying manual approach...');
        
        // Get all existing data first
        const { data: existingData, error: dataError } = await supabase
          .from('admin_settings')
          .select('*');
          
        if (!dataError && existingData) {
          console.log(`📊 Found ${existingData.length} existing settings to preserve`);
          
          // Drop and recreate table with correct structure
          const createTableSQL = `
            DROP TABLE IF EXISTS admin_settings_backup;
            CREATE TABLE admin_settings_backup AS SELECT * FROM admin_settings;
            
            DROP TABLE admin_settings;
            
            CREATE TABLE admin_settings (
              id BIGSERIAL PRIMARY KEY,
              key TEXT UNIQUE NOT NULL,
              value TEXT,
              is_sensitive BOOLEAN DEFAULT FALSE,
              description TEXT,
              updated_by UUID REFERENCES auth.users(id),
              updated_at TIMESTAMPTZ DEFAULT NOW(),
              created_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            -- Migrate data from backup
            INSERT INTO admin_settings (key, value, is_sensitive, description, updated_by, updated_at, created_at)
            SELECT 
              COALESCE(key_name, key) as key,
              COALESCE(key_value, value) as value,
              COALESCE(is_sensitive, false) as is_sensitive,
              description,
              updated_by,
              COALESCE(updated_at, NOW()) as updated_at,
              COALESCE(created_at, NOW()) as created_at
            FROM admin_settings_backup;
            
            -- Create index
            CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);
            
            -- Enable RLS
            ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
            
            -- Create policy
            DROP POLICY IF EXISTS "Admin users can manage admin settings" ON admin_settings;
            CREATE POLICY "Admin users can manage admin settings" ON admin_settings
              FOR ALL USING (
                auth.email() = 'admin@caraudioevents.com' OR
                EXISTS (
                  SELECT 1 FROM users 
                  WHERE users.id = auth.uid() 
                  AND users.membership_type = 'admin'
                )
              );
              
            DROP TABLE admin_settings_backup;
          `;
          
          console.log('🔄 Recreating table with correct structure...');
          // We'll need to execute this via a migration or direct database access
          console.log('📝 SQL to execute:');
          console.log(createTableSQL);
          console.log('\n⚠️  Please run this SQL directly in your Supabase SQL editor or via psql');
        }
      } else {
        console.log('✅ Successfully renamed columns!');
      }
    } else {
      // Check if table exists with new column names
      const { data: newTestData, error: newTestError } = await supabase
        .from('admin_settings')
        .select('key, value')
        .limit(1);
        
      if (!newTestError) {
        console.log('✅ Table already has correct column names (key, value)');
      } else {
        console.log('❌ Table structure issue:', newTestError.message);
        
        // Create table with correct structure
        console.log('🔧 Creating admin_settings table with correct structure...');
        const createSQL = `
          CREATE TABLE IF NOT EXISTS admin_settings (
            id BIGSERIAL PRIMARY KEY,
            key TEXT UNIQUE NOT NULL,
            value TEXT,
            is_sensitive BOOLEAN DEFAULT FALSE,
            description TEXT,
            updated_by UUID REFERENCES auth.users(id),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);
          
          ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
          
          DROP POLICY IF EXISTS "Admin users can manage admin settings" ON admin_settings;
          CREATE POLICY "Admin users can manage admin settings" ON admin_settings
            FOR ALL USING (
              auth.email() = 'admin@caraudioevents.com' OR
              EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.membership_type = 'admin'
              )
            );
        `;
        
        console.log('📝 SQL to create table:');
        console.log(createSQL);
        console.log('\n⚠️  Please run this SQL directly in your Supabase SQL editor');
      }
    }
    
    // Test the final result
    console.log('\n🧪 Testing final table structure...');
    const { data: finalTest, error: finalError } = await supabase
      .from('admin_settings')
      .select('key, value')
      .limit(1);
      
    if (!finalError) {
      console.log('✅ Admin settings table is now working correctly!');
      
      // Show current settings
      const { data: allSettings, error: settingsError } = await supabase
        .from('admin_settings')
        .select('*');
        
      if (!settingsError && allSettings) {
        console.log(`📊 Current settings count: ${allSettings.length}`);
        allSettings.forEach(setting => {
          console.log(`  - ${setting.key}: ${setting.is_sensitive ? '[HIDDEN]' : setting.value}`);
        });
      }
    } else {
      console.log('❌ Table still has issues:', finalError.message);
    }
    
  } catch (error) {
    console.error('❌ Error fixing admin_settings table:', error);
  }
}

fixAdminSettingsTable(); 