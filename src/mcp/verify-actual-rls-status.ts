import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyActualRLSStatus() {
  console.log('🚨 VERIFYING ACTUAL RLS STATUS');
  console.log('===============================================');
  console.log('🎯 Goal: Double-check which tables REALLY need RLS fixes');
  console.log('🔍 Method: Cross-reference multiple sources');
  console.log('');

  try {
    // Method 1: Check pg_class directly for RLS status
    console.log('🔍 Method 1: Checking pg_class for RLS status...');
    const { data: method1Data, error: method1Error } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            c.relname as table_name,
            c.relrowsecurity as rls_enabled,
            CASE 
              WHEN c.relrowsecurity = true THEN 'RLS ENABLED'
              ELSE 'NO RLS'
            END as rls_status,
            n.nspname as schema_name
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relname NOT LIKE 'pg_%'
          AND c.relname NOT LIKE '_realtime_%'
          ORDER BY c.relrowsecurity, c.relname
        ` 
      });

    if (method1Error) {
      console.log('❌ Method 1 failed:', method1Error.message);
    } else if (method1Data && method1Data.success && method1Data.data) {
      const tables = method1Data.data;
      const noRLS = tables.filter(t => !t.rls_enabled);
      const withRLS = tables.filter(t => t.rls_enabled);
      
      console.log(`📊 Method 1 Results: ${tables.length} total tables`);
      console.log(`   ✅ With RLS: ${withRLS.length}`);
      console.log(`   ❌ Without RLS: ${noRLS.length}`);
      
      if (noRLS.length > 0) {
        console.log('');
        console.log('❌ TABLES WITHOUT RLS (Method 1):');
        noRLS.forEach(table => {
          console.log(`   ❌ ${table.table_name}`);
        });
      }
    }

    console.log('');
    
    // Method 2: Check information_schema
    console.log('🔍 Method 2: Checking information_schema...');
    const { data: method2Data, error: method2Error } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            table_name,
            CASE 
              WHEN table_name IN (
                SELECT c.relname 
                FROM pg_class c 
                JOIN pg_namespace n ON c.relnamespace = n.oid 
                WHERE n.nspname = 'public' 
                AND c.relkind = 'r' 
                AND c.relrowsecurity = true
              ) THEN 'RLS ENABLED'
              ELSE 'NO RLS'
            END as rls_status
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name NOT LIKE 'pg_%'
          AND table_name NOT LIKE '_realtime_%'
          ORDER BY rls_status, table_name
        ` 
      });

    if (method2Error) {
      console.log('❌ Method 2 failed:', method2Error.message);
    } else if (method2Data && method2Data.success && method2Data.data) {
      const tables = method2Data.data;
      const noRLS = tables.filter(t => t.rls_status === 'NO RLS');
      const withRLS = tables.filter(t => t.rls_status === 'RLS ENABLED');
      
      console.log(`📊 Method 2 Results: ${tables.length} total tables`);
      console.log(`   ✅ With RLS: ${withRLS.length}`);
      console.log(`   ❌ Without RLS: ${noRLS.length}`);
      
      if (noRLS.length > 0) {
        console.log('');
        console.log('❌ TABLES WITHOUT RLS (Method 2):');
        noRLS.forEach(table => {
          console.log(`   ❌ ${table.table_name}`);
        });
        
        console.log('');
        console.log('🎯 TABLES THAT NEED RLS FIXES:');
        const highRiskPatterns = [
          'user', 'profile', 'event', 'advertisement', 'payment', 'subscription',
          'notification', 'email', 'session', 'activity', 'log', 'backup',
          'organization', 'team', 'member', 'directory', 'listing', 'review',
          'rating', 'competition', 'registration', 'cms', 'admin'
        ];
        
        const tablesToFix = noRLS.filter(table => {
          const tableName = table.table_name.toLowerCase();
          return highRiskPatterns.some(pattern => tableName.includes(pattern));
        });
        
        if (tablesToFix.length > 0) {
          console.log('🔴 HIGH PRIORITY TABLES TO FIX:');
          tablesToFix.forEach(table => {
            console.log(`   🔴 ${table.table_name} - NEEDS RLS`);
          });
          
          console.log('');
          console.log('📋 READY FOR PHASE 3 EXECUTION:');
          console.log(JSON.stringify(tablesToFix.map(t => t.table_name), null, 2));
        } else {
          console.log('✅ All high-risk tables already have RLS!');
        }
        
        const lowRiskTables = noRLS.filter(table => {
          const tableName = table.table_name.toLowerCase();
          return !highRiskPatterns.some(pattern => tableName.includes(pattern));
        });
        
        if (lowRiskTables.length > 0) {
          console.log('');
          console.log('🟡 LOWER PRIORITY TABLES:');
          lowRiskTables.forEach(table => {
            console.log(`   🟡 ${table.table_name} - Consider RLS`);
          });
        }
      } else {
        console.log('');
        console.log('🎉 ALL TABLES HAVE RLS ENABLED!');
        console.log('Phase 3 is already complete!');
      }
    }

  } catch (e) {
    console.log('❌ Exception:', e);
  }
}

// Execute the verification
verifyActualRLSStatus(); 