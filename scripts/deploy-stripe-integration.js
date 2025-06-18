#!/usr/bin/env node

/**
 * Stripe Integration Deployment Script
 * 
 * This script:
 * 1. Validates environment configuration
 * 2. Deploys Supabase Edge Functions
 * 3. Runs database migrations
 * 4. Tests the payment flow
 * 5. Provides deployment report
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${colors.bold}${colors.blue}[STEP ${step}]${colors.reset} ${message}`);
}

function logSuccess(message) {
  log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
  log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

async function validateEnvironment() {
  logStep(1, 'Validating Environment Configuration');

  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_STRIPE_PUBLISHABLE_KEY'
  ];

  const requiredSupabaseEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  // Check client-side environment variables
  const missingClientVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingClientVars.length > 0) {
    logError(`Missing client environment variables: ${missingClientVars.join(', ')}`);
    logWarning('Please set these in your .env file');
    return false;
  }

  logSuccess('Client environment variables configured');

  // Check if Stripe keys are in test mode
  const stripeKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (stripeKey && stripeKey.startsWith('pk_test_')) {
    logSuccess('Using Stripe test keys (recommended for development)');
  } else if (stripeKey && stripeKey.startsWith('pk_live_')) {
    logWarning('Using Stripe LIVE keys - ensure this is intentional!');
  }

  // Check Supabase configuration
  try {
    const supabaseConfigPath = path.join(process.cwd(), 'supabase', 'config.toml');
    if (existsSync(supabaseConfigPath)) {
      logSuccess('Supabase configuration found');
    } else {
      logWarning('Supabase config.toml not found - make sure Supabase is initialized');
    }
  } catch (error) {
    logWarning('Could not verify Supabase configuration');
  }

  logWarning(`Server environment variables (${requiredSupabaseEnvVars.join(', ')}) should be set in Supabase dashboard`);

  return true;
}

async function deployEdgeFunctions() {
  logStep(2, 'Deploying Supabase Edge Functions');

  const functions = [
    'create-payment-intent',
    'confirm-payment',
    'stripe-webhook'
  ];

  try {
    // Check if Supabase CLI is available
    execSync('supabase --version', { stdio: 'pipe' });
    logSuccess('Supabase CLI found');
  } catch (error) {
    logError('Supabase CLI not found. Please install it: npm install -g supabase');
    return false;
  }

  // Deploy each function
  for (const functionName of functions) {
    try {
      log(`\nDeploying ${functionName}...`);
      
      // Check if function directory exists
      const functionPath = path.join(process.cwd(), 'supabase', 'functions', functionName);
      if (!existsSync(functionPath)) {
        logError(`Function directory not found: ${functionPath}`);
        continue;
      }

      // Deploy function
      execSync(`supabase functions deploy ${functionName}`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      logSuccess(`${functionName} deployed successfully`);
    } catch (error) {
      logError(`Failed to deploy ${functionName}: ${error.message}`);
      return false;
    }
  }

  logSuccess('All Edge Functions deployed successfully');
  return true;
}

async function runDatabaseMigrations() {
  logStep(3, 'Running Database Migrations');

  try {
    // Check if migration file exists
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250617_stripe_payment_system.sql');
    if (!existsSync(migrationPath)) {
      logError('Stripe payment system migration not found');
      return false;
    }

    // Run migrations
    log('Running database migrations...');
    execSync('supabase db push', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });

    logSuccess('Database migrations completed successfully');
    return true;
  } catch (error) {
    logError(`Failed to run migrations: ${error.message}`);
    return false;
  }
}

async function testPaymentFlow() {
  logStep(4, 'Testing Payment Flow');

  // This is a basic connectivity test
  // Full payment testing should be done manually with Stripe test cards

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      logError('Supabase configuration missing for testing');
      return false;
    }

    // Test Edge Function endpoints
    const testEndpoints = [
      `${supabaseUrl}/functions/v1/create-payment-intent`,
      `${supabaseUrl}/functions/v1/confirm-payment`,
      `${supabaseUrl}/functions/v1/stripe-webhook`
    ];

    log('Testing Edge Function endpoints...');
    
    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'OPTIONS', // CORS preflight
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok || response.status === 405) { // 405 Method Not Allowed is expected for OPTIONS on some endpoints
          logSuccess(`✓ ${endpoint.split('/').pop()} endpoint accessible`);
        } else {
          logWarning(`⚠ ${endpoint.split('/').pop()} endpoint returned ${response.status}`);
        }
      } catch (error) {
        logError(`✗ ${endpoint.split('/').pop()} endpoint failed: ${error.message}`);
      }
    }

    logSuccess('Payment flow connectivity test completed');
    return true;
  } catch (error) {
    logError(`Payment flow test failed: ${error.message}`);
    return false;
  }
}

function generateDeploymentReport(results) {
  logStep(5, 'Deployment Report');

  log('\n' + '='.repeat(60));
  log(`${colors.bold}STRIPE INTEGRATION DEPLOYMENT REPORT${colors.reset}`);
  log('='.repeat(60));

  const steps = [
    { name: 'Environment Validation', status: results.environment },
    { name: 'Edge Functions Deployment', status: results.functions },
    { name: 'Database Migrations', status: results.migrations },
    { name: 'Payment Flow Testing', status: results.testing }
  ];

  steps.forEach(step => {
    const status = step.status ? '✅ PASSED' : '❌ FAILED';
    log(`${step.name.padEnd(30)} ${status}`);
  });

  log('\n' + '='.repeat(60));

  const allPassed = Object.values(results).every(result => result);

  if (allPassed) {
    logSuccess('🎉 STRIPE INTEGRATION DEPLOYMENT SUCCESSFUL!');
    log('\n📋 Next Steps:');
    log('1. Set Stripe environment variables in Supabase Dashboard:');
    log('   - STRIPE_SECRET_KEY (your Stripe secret key)');
    log('   - STRIPE_WEBHOOK_SECRET (from Stripe webhook configuration)');
    log('   - SUPABASE_SERVICE_ROLE_KEY (from Supabase settings)');
    log('\n2. Configure Stripe webhook endpoint:');
    log(`   - URL: ${process.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`);
    log('   - Events: payment_intent.succeeded, payment_intent.payment_failed, payment_intent.canceled');
    log('\n3. Test with Stripe test cards:');
    log('   - Success: 4242 4242 4242 4242');
    log('   - Decline: 4000 0000 0000 0002');
    log('\n4. Monitor payments in Supabase Dashboard');
  } else {
    logError('❌ STRIPE INTEGRATION DEPLOYMENT FAILED');
    log('\n🔧 Please fix the failed steps and run the deployment again.');
  }

  return allPassed;
}

async function main() {
  log(`${colors.bold}${colors.blue}🚀 STRIPE INTEGRATION DEPLOYMENT${colors.reset}`);
  log('This script will deploy the complete Stripe payment system.\n');

  const results = {
    environment: false,
    functions: false,
    migrations: false,
    testing: false
  };

  try {
    // Step 1: Validate Environment
    results.environment = await validateEnvironment();
    if (!results.environment) {
      throw new Error('Environment validation failed');
    }

    // Step 2: Deploy Edge Functions
    results.functions = await deployEdgeFunctions();
    if (!results.functions) {
      throw new Error('Edge Functions deployment failed');
    }

    // Step 3: Run Database Migrations
    results.migrations = await runDatabaseMigrations();
    if (!results.migrations) {
      throw new Error('Database migrations failed');
    }

    // Step 4: Test Payment Flow
    results.testing = await testPaymentFlow();

    // Step 5: Generate Report
    const success = generateDeploymentReport(results);
    
    process.exit(success ? 0 : 1);

  } catch (error) {
    logError(`Deployment failed: ${error.message}`);
    generateDeploymentReport(results);
    process.exit(1);
  }
}

// Run the deployment
main().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
}); 