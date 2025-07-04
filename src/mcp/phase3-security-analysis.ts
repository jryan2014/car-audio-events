import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzePhase3Security() {
  console.log('🚨 PHASE 3: SECURITY ANALYSIS');
  console.log('===============================================');
  console.log('🎯 Goal: Identify remaining high-risk tables without RLS protection');
  console.log('🛡️ Focus: Tables containing sensitive or user data');
  console.log('');

  try {
    // Get all tables and their RLS status
    const { data, error } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            t.tablename as table_name,
            CASE 
              WHEN t.rowsecurity = true THEN 'RLS ENABLED'
              ELSE 'NO RLS (VULNERABLE)'
            END as rls_status,
            COALESCE(pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename)::regclass)), 'Unknown') as table_size,
            obj_description(quote_ident(t.tablename)::regclass, 'pg_class') as table_comment
          FROM pg_tables t
          WHERE t.schemaname = 'public'
          AND t.tablename NOT LIKE 'pg_%'
          AND t.tablename NOT LIKE '_realtime_%'
          ORDER BY 
            CASE WHEN t.rowsecurity = true THEN 1 ELSE 0 END,
            t.tablename
        ` 
      });

    if (error) {
      console.log('❌ Error getting table analysis:', error.message);
      return;
    }

    if (!data || !data.success || !data.data) {
      console.log('❌ No data returned');
      return;
    }

    const tables = data.data;
    console.log(`📊 Found ${tables.length} tables in public schema`);
    console.log('');

    // Categorize tables
    const securedTables: any[] = [];
    const vulnerableTables: any[] = [];
    const systemTables: any[] = [];

    // Define high-risk table patterns (contain sensitive/user data)
    const highRiskPatterns = [
      'user', 'profile', 'event', 'advertisement', 'payment', 'subscription',
      'notification', 'email', 'session', 'activity', 'log', 'backup',
      'organization', 'team', 'member', 'directory', 'listing', 'review',
      'rating', 'competition', 'registration', 'cms', 'admin'
    ];

    // Define system/low-risk table patterns
    const systemPatterns = [
      'migration', 'schema', 'config', 'setting', 'template', 'category',
      'navigation', 'menu', 'scraping', 'cache', 'queue'
    ];

    tables.forEach((table: any) => {
      const tableName = table.table_name.toLowerCase();
      
      if (table.rls_status === 'RLS ENABLED') {
        securedTables.push(table);
      } else {
        // Check if it's a high-risk table
        const isHighRisk = highRiskPatterns.some(pattern => 
          tableName.includes(pattern)
        );
        
        const isSystemTable = systemPatterns.some(pattern => 
          tableName.includes(pattern)
        );

        if (isHighRisk) {
          vulnerableTables.push({...table, risk_level: 'HIGH'});
        } else if (isSystemTable) {
          systemTables.push({...table, risk_level: 'LOW'});
        } else {
          vulnerableTables.push({...table, risk_level: 'MEDIUM'});
        }
      }
    });

    console.log('🔍 SECURITY ANALYSIS RESULTS:');
    console.log('===============================================');
    console.log(`✅ Secured tables (with RLS): ${securedTables.length}`);
    console.log(`❌ Vulnerable tables (no RLS): ${vulnerableTables.length}`);
    console.log(`⚙️ System tables (low risk): ${systemTables.length}`);
    console.log('');

    if (securedTables.length > 0) {
      console.log('✅ SECURED TABLES:');
      securedTables.forEach(table => {
        console.log(`   ✅ ${table.table_name} - ${table.rls_status} (${table.table_size})`);
      });
      console.log('');
    }

    if (vulnerableTables.length > 0) {
      console.log('❌ VULNERABLE TABLES NEEDING RLS:');
      vulnerableTables
        .sort((a, b) => {
          const riskOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
          return riskOrder[a.risk_level] - riskOrder[b.risk_level];
        })
        .forEach(table => {
          const icon = table.risk_level === 'HIGH' ? '🔴' : table.risk_level === 'MEDIUM' ? '🟡' : '🟢';
          console.log(`   ${icon} ${table.table_name} - ${table.rls_status} (${table.risk_level} RISK) - ${table.table_size}`);
        });
      console.log('');
    }

    if (systemTables.length > 0) {
      console.log('⚙️ SYSTEM TABLES (Lower Priority):');
      systemTables.forEach(table => {
        console.log(`   ⚙️ ${table.table_name} - ${table.rls_status} (${table.risk_level} RISK) - ${table.table_size}`);
      });
      console.log('');
    }

    // Generate Phase 3 recommendations
    const highRiskTables = vulnerableTables.filter(t => t.risk_level === 'HIGH');
    const mediumRiskTables = vulnerableTables.filter(t => t.risk_level === 'MEDIUM');

    console.log('🎯 PHASE 3 RECOMMENDATIONS:');
    console.log('===============================================');
    
    if (highRiskTables.length > 0) {
      console.log(`🔴 IMMEDIATE ACTION NEEDED (${highRiskTables.length} high-risk tables):`);
      highRiskTables.forEach(table => {
        console.log(`   - ${table.table_name} (contains sensitive data)`);
      });
      console.log('');
    }

    if (mediumRiskTables.length > 0) {
      console.log(`🟡 RECOMMENDED FOR SECURITY (${mediumRiskTables.length} medium-risk tables):`);
      mediumRiskTables.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
      console.log('');
    }

    console.log('📋 PHASE 3 EXECUTION PLAN:');
    console.log('1. Enable RLS on high-risk tables first');
    console.log('2. Create appropriate policies for each table type');
    console.log('3. Test functionality after each change');
    console.log('4. Address medium-risk tables as needed');

    // Save the results for the next script
    const phase3Data = {
      highRiskTables: highRiskTables.map(t => t.table_name),
      mediumRiskTables: mediumRiskTables.map(t => t.table_name),
      systemTables: systemTables.map(t => t.table_name)
    };

    console.log('');
    console.log('📊 PHASE 3 DATA FOR EXECUTION:');
    console.log(JSON.stringify(phase3Data, null, 2));

  } catch (e) {
    console.log('❌ Exception:', e);
  }
}

// Execute the analysis
analyzePhase3Security(); 