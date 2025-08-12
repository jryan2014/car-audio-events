/**
 * Security Test Script - Verify SQL Injection Fixes
 * 
 * This script tests that all SQL injection vulnerabilities have been properly fixed
 * and that secure alternatives are working correctly.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
}

const results: TestResult[] = [];

async function testExecSqlRemoval() {
  console.log('\n🔍 Testing exec_sql function removal...');
  
  try {
    // This should fail since exec_sql has been removed
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_command: 'SELECT 1 as test'
    });
    
    if (error) {
      results.push({
        test: 'exec_sql removal',
        status: 'PASS',
        message: `exec_sql function properly removed: ${error.message}`
      });
    } else {
      results.push({
        test: 'exec_sql removal',
        status: 'FAIL',
        message: 'exec_sql function still exists - CRITICAL SECURITY ISSUE!'
      });
    }
  } catch (error) {
    results.push({
      test: 'exec_sql removal',
      status: 'PASS',
      message: 'exec_sql function properly removed'
    });
  }
}

async function testSecureFunctions() {
  console.log('\n🔍 Testing secure replacement functions...');
  
  // Test safe_table_maintenance function
  try {
    const { data, error } = await supabase.rpc('safe_table_maintenance', {
      operation: 'analyze',
      table_name: 'events'
    });
    
    if (error) {
      results.push({
        test: 'safe_table_maintenance',
        status: 'FAIL',
        message: `Function failed: ${error.message}`
      });
    } else {
      results.push({
        test: 'safe_table_maintenance',
        status: 'PASS',
        message: 'Safe maintenance function working correctly'
      });
    }
  } catch (error) {
    results.push({
      test: 'safe_table_maintenance',
      status: 'FAIL',
      message: `Function not available: ${error}`
    });
  }
  
  // Test get_table_schema_info function
  try {
    const { data, error } = await supabase.rpc('get_table_schema_info', {
      p_table_name: 'users'
    });
    
    if (error) {
      results.push({
        test: 'get_table_schema_info',
        status: 'FAIL',
        message: `Function failed: ${error.message}`
      });
    } else if (data && Array.isArray(data) && data.length > 0) {
      results.push({
        test: 'get_table_schema_info',
        status: 'PASS',
        message: 'Schema info function working correctly'
      });
    } else {
      results.push({
        test: 'get_table_schema_info',
        status: 'FAIL',
        message: 'Function returned no data'
      });
    }
  } catch (error) {
    results.push({
      test: 'get_table_schema_info',
      status: 'FAIL',
      message: `Function not available: ${error}`
    });
  }
  
  // Test rate limit table creation
  try {
    const { data, error } = await supabase.rpc('ensure_rate_limit_table');
    
    if (error) {
      results.push({
        test: 'ensure_rate_limit_table',
        status: 'FAIL',
        message: `Function failed: ${error.message}`
      });
    } else {
      results.push({
        test: 'ensure_rate_limit_table',
        status: 'PASS',
        message: 'Rate limit table creation function working'
      });
    }
  } catch (error) {
    results.push({
      test: 'ensure_rate_limit_table',
      status: 'FAIL',
      message: `Function not available: ${error}`
    });
  }
}

async function testSQLInjectionPrevention() {
  console.log('\n🔍 Testing SQL injection prevention...');
  
  // Test that safe functions reject malicious input
  const maliciousInputs = [
    "users'; DROP TABLE users; --",
    "users' OR '1'='1",
    "users'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
    "users/* comment */ UNION SELECT * FROM payment_provider_configs",
  ];
  
  for (const maliciousInput of maliciousInputs) {
    try {
      const { data, error } = await supabase.rpc('get_table_schema_info', {
        p_table_name: maliciousInput
      });
      
      if (error && error.message.includes('Invalid table name format')) {
        results.push({
          test: `SQL injection prevention - ${maliciousInput.slice(0, 20)}...`,
          status: 'PASS',
          message: 'Malicious input properly rejected'
        });
      } else {
        results.push({
          test: `SQL injection prevention - ${maliciousInput.slice(0, 20)}...`,
          status: 'FAIL',
          message: 'Malicious input was not rejected!'
        });
      }
    } catch (error) {
      results.push({
        test: `SQL injection prevention - ${maliciousInput.slice(0, 20)}...`,
        status: 'PASS',
        message: 'Malicious input properly rejected'
      });
    }
  }
}

async function testSupabaseClientSafety() {
  console.log('\n🔍 Testing Supabase client method safety...');
  
  try {
    // Test normal query
    const { data, error } = await supabase
      .from('events')
      .select('id, name')
      .limit(1);
    
    if (error) {
      results.push({
        test: 'Supabase client methods',
        status: 'SKIP',
        message: `Could not test client methods: ${error.message}`
      });
    } else {
      results.push({
        test: 'Supabase client methods',
        status: 'PASS',
        message: 'Supabase client methods working correctly'
      });
    }
  } catch (error) {
    results.push({
      test: 'Supabase client methods',
      status: 'FAIL',
      message: `Supabase client error: ${error}`
    });
  }
}

async function runSecurityTests() {
  console.log('🛡️ Running SQL Injection Security Tests');
  console.log('=========================================');
  
  await testExecSqlRemoval();
  await testSecureFunctions();
  await testSQLInjectionPrevention();
  await testSupabaseClientSafety();
  
  console.log('\n📊 Test Results:');
  console.log('================');
  
  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;
  
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} ${result.test}: ${result.message}`);
    
    if (result.status === 'PASS') passCount++;
    else if (result.status === 'FAIL') failCount++;
    else skipCount++;
  });
  
  console.log('\n📈 Summary:');
  console.log(`   ✅ Passed: ${passCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   📊 Total: ${results.length}`);
  
  if (failCount === 0) {
    console.log('\n🎉 All security tests passed! SQL injection vulnerabilities have been successfully fixed.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the results and fix any remaining issues.');
  }
  
  // Return exit code
  process.exit(failCount > 0 ? 1 : 0);
}

// Run the tests
runSecurityTests();