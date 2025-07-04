import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLSPolicies() {
  console.log('🚨 CHECKING RLS POLICIES');
  console.log('===============================================');
  console.log('🎯 Goal: Verify tables have ACTUAL policies, not just RLS enabled');
  console.log('🔍 Issue: RLS enabled without policies = NO ACCESS (broken functionality)');
  console.log('');

  try {
    // Check which tables have RLS enabled but NO policies
    const { data, error } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            c.relname as table_name,
            c.relrowsecurity as rls_enabled,
            COUNT(p.polname) as policy_count,
            CASE 
              WHEN c.relrowsecurity = true AND COUNT(p.polname) = 0 THEN 'RLS ENABLED BUT NO POLICIES (BROKEN)'
              WHEN c.relrowsecurity = true AND COUNT(p.polname) > 0 THEN 'RLS ENABLED WITH POLICIES (GOOD)'
              WHEN c.relrowsecurity = false THEN 'NO RLS (VULNERABLE)'
              ELSE 'UNKNOWN'
            END as security_status
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          LEFT JOIN pg_policy p ON p.polrelid = c.oid
          WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relname NOT LIKE 'pg_%'
          AND c.relname NOT LIKE '_realtime_%'
          GROUP BY c.relname, c.relrowsecurity
          ORDER BY 
            CASE 
              WHEN c.relrowsecurity = true AND COUNT(p.polname) = 0 THEN 0
              WHEN c.relrowsecurity = false THEN 1
              ELSE 2
            END,
            c.relname
        ` 
      });

    if (error) {
      console.log('❌ Error checking policies:', error.message);
      return;
    }

    if (!data || !data.success || !data.data) {
      console.log('❌ No data returned');
      return;
    }

    const tables = data.data;
    console.log(`📊 Analyzed ${tables.length} tables`);
    console.log('');

    // Categorize tables by security status
    const brokenTables = tables.filter(t => t.security_status.includes('NO POLICIES (BROKEN)'));
    const goodTables = tables.filter(t => t.security_status.includes('WITH POLICIES (GOOD)'));
    const vulnerableTables = tables.filter(t => t.security_status.includes('NO RLS (VULNERABLE)'));

    console.log('🔍 SECURITY ANALYSIS RESULTS:');
    console.log('===============================================');
    console.log(`🔴 Broken (RLS enabled, no policies): ${brokenTables.length}`);
    console.log(`✅ Secure (RLS enabled with policies): ${goodTables.length}`);
    console.log(`❌ Vulnerable (no RLS): ${vulnerableTables.length}`);
    console.log('');

    if (brokenTables.length > 0) {
      console.log('🔴 CRITICAL: TABLES WITH RLS BUT NO POLICIES (BROKEN FUNCTIONALITY):');
      brokenTables.forEach(table => {
        console.log(`   🔴 ${table.table_name} - RLS enabled but ${table.policy_count} policies`);
      });
      console.log('');
      console.log('⚠️ These tables will BLOCK ALL ACCESS because RLS is enabled but no policies exist!');
      console.log('');
    }

    if (vulnerableTables.length > 0) {
      console.log('❌ VULNERABLE TABLES (NO RLS):');
      vulnerableTables.forEach(table => {
        console.log(`   ❌ ${table.table_name} - No RLS protection`);
      });
      console.log('');
    }

    if (goodTables.length > 0) {
      console.log('✅ PROPERLY SECURED TABLES:');
      goodTables.slice(0, 10).forEach(table => {
        console.log(`   ✅ ${table.table_name} - ${table.policy_count} policies`);
      });
      if (goodTables.length > 10) {
        console.log(`   ... and ${goodTables.length - 10} more properly secured tables`);
      }
      console.log('');
    }

    // Generate Phase 3 action plan
    console.log('🎯 PHASE 3 ACTION PLAN:');
    console.log('===============================================');
    
    if (brokenTables.length > 0) {
      console.log('🔴 IMMEDIATE ACTION REQUIRED:');
      console.log('1. Create policies for tables with RLS but no policies');
      console.log('2. Test functionality after each policy creation');
      console.log('');
      
      console.log('📋 TABLES NEEDING POLICIES:');
      console.log(JSON.stringify(brokenTables.map(t => t.table_name), null, 2));
    }
    
    if (vulnerableTables.length > 0) {
      console.log('❌ SECONDARY ACTION:');
      console.log('1. Enable RLS on vulnerable tables');
      console.log('2. Create appropriate policies');
      console.log('');
    }
    
    if (brokenTables.length === 0 && vulnerableTables.length === 0) {
      console.log('🎉 ALL TABLES ARE PROPERLY SECURED!');
      console.log('No Phase 3 action required - security is complete!');
    }

  } catch (e) {
    console.log('❌ Exception:', e);
  }
}

// Execute the policy check
checkRLSPolicies(); 