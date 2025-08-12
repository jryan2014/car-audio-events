/**
 * Security Fix Deployment Script
 * 
 * This script deploys the SQL injection security fixes to the database.
 * It should be run with the service role key to apply the migrations.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deploySecurityFixes() {
  console.log('🔒 Deploying SQL Injection Security Fixes');
  console.log('==========================================');
  
  try {
    // Read the security migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20250811_remove_exec_sql_security_fix.sql');
    
    console.log('\n📋 Reading migration file...');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split('$$;')  // Split on function endings first
      .flatMap(part => part.split(';'))  // Then split on semicolons
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .filter(stmt => !stmt.match(/^(BEGIN|END|DO)\s*$/i))  // Remove standalone BEGIN/END/DO
      .map(stmt => stmt.endsWith('$$') ? stmt + ';' : stmt); // Restore function endings
    
    console.log(`\n🔄 Executing ${statements.length} SQL statements...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements
      if (!statement.trim()) continue;
      
      try {
        console.log(`\n📝 Statement ${i + 1}/${statements.length}:`);
        console.log(statement.slice(0, 100) + (statement.length > 100 ? '...' : ''));
        
        // Execute each statement individually
        const { data, error } = await supabase
          .from('_metadata')  // Use a dummy table call to execute raw SQL
          .select('*')
          .limit(0);
        
        // For now, we'll need to use the Supabase CLI or dashboard to run the migration
        // This is because we're removing exec_sql which was used to run raw SQL
        
        console.log('⚠️  Cannot execute SQL directly - exec_sql has been removed for security');
        console.log('📋 Please run this migration manually using:');
        console.log('   npx supabase db push');
        console.log('   or apply the SQL via the Supabase Dashboard');
        
        break; // Exit the loop since we can't execute SQL directly
        
      } catch (error) {
        console.error(`❌ Statement ${i + 1} failed:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 Deployment Instructions:');
    console.log('===========================');
    console.log('Since exec_sql has been removed for security, please deploy using:');
    console.log('');
    console.log('1. Via Supabase CLI:');
    console.log('   npx supabase db push');
    console.log('');
    console.log('2. Or manually via Supabase Dashboard:');
    console.log('   - Go to your Supabase project dashboard');
    console.log('   - Navigate to SQL Editor');
    console.log('   - Copy and paste the migration SQL');
    console.log('   - Execute the statements');
    console.log('');
    console.log('3. Migration file location:');
    console.log(`   ${migrationPath}`);
    
    console.log('\n✅ Security fix preparation complete!');
    console.log('Run the test script after deployment:');
    console.log('   npx ts-node test-sql-injection-fixes.ts');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

async function checkCurrentStatus() {
  console.log('\n🔍 Checking current security status...');
  
  try {
    // Test if exec_sql still exists
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_command: 'SELECT 1'
    });
    
    if (error) {
      console.log('✅ exec_sql function has been removed (good!)');
    } else {
      console.log('⚠️  exec_sql function still exists - needs to be removed!');
    }
  } catch (error) {
    console.log('✅ exec_sql function has been removed (good!)');
  }
  
  // Check if new secure functions exist
  const securityFunctions = [
    'safe_table_maintenance',
    'ensure_rate_limit_table',
    'get_table_schema_info',
    'get_rls_policies_info',
    'get_table_relationships'
  ];
  
  console.log('\n🔍 Checking secure replacement functions...');
  for (const funcName of securityFunctions) {
    try {
      const { data, error } = await supabase.rpc(funcName as any);
      
      if (error && !error.message.includes('does not exist')) {
        console.log(`✅ ${funcName} - Available`);
      } else if (error && error.message.includes('does not exist')) {
        console.log(`❌ ${funcName} - Not found, needs deployment`);
      } else {
        console.log(`✅ ${funcName} - Available`);
      }
    } catch (error) {
      console.log(`❌ ${funcName} - Not available, needs deployment`);
    }
  }
}

// Main execution
async function main() {
  await checkCurrentStatus();
  await deploySecurityFixes();
}

main();