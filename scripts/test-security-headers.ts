#!/usr/bin/env -S deno run --allow-net

/**
 * Security Headers Test Suite
 * 
 * This script tests the security headers implementation across the platform.
 * It validates that all required security headers are present and correctly configured.
 */

interface SecurityHeaderTest {
  name: string;
  url: string;
  expectedHeaders: Record<string, string | RegExp>;
  requiredHeaders: string[];
  allowedMissingHeaders?: string[];
}

interface TestResult {
  test: string;
  url: string;
  passed: boolean;
  issues: string[];
  headers: Record<string, string>;
}

/**
 * Test configurations for different endpoints
 */
const SECURITY_TESTS: SecurityHeaderTest[] = [
  {
    name: 'Homepage',
    url: 'https://caraudioevents.com/',
    expectedHeaders: {
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'x-xss-protection': '1; mode=block',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'strict-transport-security': /max-age=31536000/,
      'content-security-policy': /default-src 'self'/,
      'permissions-policy': /camera=\(\)/
    },
    requiredHeaders: [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'referrer-policy',
      'strict-transport-security',
      'content-security-policy',
      'permissions-policy'
    ]
  },
  {
    name: 'API Endpoint',
    url: 'https://caraudioevents.com/api/health',
    expectedHeaders: {
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'cache-control': /no-cache/,
      'content-type': 'application/json'
    },
    requiredHeaders: [
      'x-frame-options',
      'x-content-type-options',
      'cache-control'
    ]
  },
  {
    name: 'Payment Page',
    url: 'https://caraudioevents.com/payment/membership',
    expectedHeaders: {
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow',
      'cache-control': /private/,
      'content-security-policy': /script-src.*stripe/
    },
    requiredHeaders: [
      'x-frame-options',
      'x-content-type-options',
      'x-robots-tag',
      'cache-control'
    ]
  },
  {
    name: 'Admin Page',
    url: 'https://caraudioevents.com/admin',
    expectedHeaders: {
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': /noindex.*nofollow/,
      'cache-control': /private/,
      'content-security-policy': /default-src 'self'/
    },
    requiredHeaders: [
      'x-frame-options',
      'x-content-type-options',
      'x-robots-tag',
      'cache-control',
      'content-security-policy'
    ]
  },
  {
    name: 'Static Assets',
    url: 'https://caraudioevents.com/assets/style.css',
    expectedHeaders: {
      'x-content-type-options': 'nosniff',
      'cache-control': /public.*max-age/
    },
    requiredHeaders: [
      'x-content-type-options'
    ],
    allowedMissingHeaders: ['x-xss-protection', 'referrer-policy']
  }
];

/**
 * Development/localhost tests
 */
const DEV_TESTS: SecurityHeaderTest[] = [
  {
    name: 'Dev Server',
    url: 'http://localhost:5173',
    expectedHeaders: {
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'x-dev-environment': 'true',
      'content-security-policy': /localhost/
    },
    requiredHeaders: [
      'x-frame-options',
      'x-content-type-options',
      'content-security-policy'
    ],
    allowedMissingHeaders: ['strict-transport-security'] // No HTTPS in dev
  }
];

/**
 * Test a single endpoint for security headers
 */
async function testSecurityHeaders(test: SecurityHeaderTest): Promise<TestResult> {
  const result: TestResult = {
    test: test.name,
    url: test.url,
    passed: false,
    issues: [],
    headers: {}
  };

  try {
    console.log(`🔍 Testing: ${test.name} (${test.url})`);
    
    const response = await fetch(test.url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Security-Headers-Test/1.0'
      }
    });

    // Extract headers (case-insensitive)
    response.headers.forEach((value, key) => {
      result.headers[key.toLowerCase()] = value;
    });

    // Check required headers
    for (const requiredHeader of test.requiredHeaders) {
      const headerValue = result.headers[requiredHeader];
      
      if (!headerValue) {
        if (test.allowedMissingHeaders?.includes(requiredHeader)) {
          console.log(`  ⚠️  Optional header missing: ${requiredHeader}`);
        } else {
          result.issues.push(`Missing required header: ${requiredHeader}`);
        }
        continue;
      }

      // Check expected values
      const expectedValue = test.expectedHeaders[requiredHeader];
      if (expectedValue) {
        if (expectedValue instanceof RegExp) {
          if (!expectedValue.test(headerValue)) {
            result.issues.push(`Header ${requiredHeader} doesn't match pattern: expected ${expectedValue}, got ${headerValue}`);
          }
        } else if (typeof expectedValue === 'string') {
          if (headerValue.toLowerCase() !== expectedValue.toLowerCase()) {
            result.issues.push(`Header ${requiredHeader} mismatch: expected ${expectedValue}, got ${headerValue}`);
          }
        }
      }
    }

    // Check for security anti-patterns
    checkSecurityAntiPatterns(result);

    result.passed = result.issues.length === 0;
    
    if (result.passed) {
      console.log(`  ✅ ${test.name} - All security headers valid`);
    } else {
      console.log(`  ❌ ${test.name} - Issues found:`);
      result.issues.forEach(issue => console.log(`     - ${issue}`));
    }

  } catch (error) {
    result.issues.push(`Test failed: ${error.message}`);
    console.log(`  🚨 ${test.name} - Test error: ${error.message}`);
  }

  return result;
}

/**
 * Check for common security anti-patterns
 */
function checkSecurityAntiPatterns(result: TestResult) {
  const { headers } = result;

  // Check for overly permissive CORS
  if (headers['access-control-allow-origin'] === '*') {
    result.issues.push('Overly permissive CORS: Access-Control-Allow-Origin is *');
  }

  // Check for missing HTTPS enforcement
  if (!headers['strict-transport-security'] && result.url.startsWith('https://')) {
    result.issues.push('Missing HTTPS enforcement (HSTS header)');
  }

  // Check for weak CSP
  if (headers['content-security-policy']) {
    const csp = headers['content-security-policy'];
    
    if (csp.includes("'unsafe-eval'") && !csp.includes('script-src')) {
      result.issues.push('CSP allows unsafe-eval without explicit script-src');
    }
    
    if (csp.includes('*') && !csp.includes('img-src')) {
      result.issues.push('CSP uses wildcards in unexpected directives');
    }
  }

  // Check for information disclosure
  if (headers['server']) {
    result.issues.push(`Server header reveals information: ${headers['server']}`);
  }

  if (headers['x-powered-by']) {
    result.issues.push(`X-Powered-By header reveals information: ${headers['x-powered-by']}`);
  }
}

/**
 * Test CSP policy syntax
 */
function testCSPSyntax(cspHeader: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Basic structure validation
  if (!cspHeader.includes('default-src')) {
    issues.push('CSP should include default-src directive');
  }

  // Check for potential issues
  const directives = cspHeader.split(';').map(d => d.trim());
  
  for (const directive of directives) {
    if (directive.includes('unsafe-inline') && directive.startsWith('script-src')) {
      issues.push('Script-src allows unsafe-inline - consider using nonces');
    }
    
    if (directive.includes('unsafe-eval')) {
      issues.push('CSP allows unsafe-eval - potential XSS risk');
    }
    
    if (directive.includes('data:') && !directive.startsWith('img-src')) {
      issues.push('Data URIs allowed in non-image directive');
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Generate security report
 */
function generateSecurityReport(results: TestResult[]) {
  console.log('\n📊 SECURITY HEADERS REPORT\n');
  console.log('================================\n');

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

  if (failedTests > 0) {
    console.log('📋 FAILED TESTS:\n');
    results.filter(r => !r.passed).forEach(result => {
      console.log(`❌ ${result.test} (${result.url})`);
      result.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
      console.log();
    });
  }

  // Security recommendations
  console.log('🔒 SECURITY RECOMMENDATIONS:\n');
  
  const allIssues = results.flatMap(r => r.issues);
  const uniqueIssues = [...new Set(allIssues)];
  
  if (uniqueIssues.length === 0) {
    console.log('✅ No security issues detected!');
  } else {
    uniqueIssues.forEach(issue => {
      console.log(`• ${issue}`);
    });
  }
}

/**
 * Main test execution
 */
async function main() {
  console.log('🔒 SECURITY HEADERS TEST SUITE');
  console.log('==============================\n');

  const allResults: TestResult[] = [];

  // Determine which tests to run
  const isProduction = Deno.args.includes('--production');
  const isDevelopment = Deno.args.includes('--dev');
  
  let testsToRun: SecurityHeaderTest[] = [];
  
  if (isDevelopment) {
    console.log('🔧 Running development tests...\n');
    testsToRun = DEV_TESTS;
  } else if (isProduction) {
    console.log('🌐 Running production tests...\n');
    testsToRun = SECURITY_TESTS;
  } else {
    console.log('🔍 Running all tests...\n');
    testsToRun = [...SECURITY_TESTS, ...DEV_TESTS];
  }

  // Run tests sequentially to avoid rate limiting
  for (const test of testsToRun) {
    const result = await testSecurityHeaders(test);
    allResults.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Generate final report
  generateSecurityReport(allResults);

  // Exit with error code if tests failed
  const hasFailures = allResults.some(r => !r.passed);
  if (hasFailures) {
    console.log('\n❌ Some security tests failed. Please review and fix the issues above.');
    Deno.exit(1);
  } else {
    console.log('\n✅ All security header tests passed!');
    Deno.exit(0);
  }
}

// Show usage information
if (Deno.args.includes('--help') || Deno.args.includes('-h')) {
  console.log(`
Security Headers Test Suite

Usage:
  deno run --allow-net scripts/test-security-headers.ts [options]

Options:
  --production     Test production endpoints only
  --dev           Test development endpoints only
  --help, -h      Show this help message

Examples:
  # Test all endpoints
  deno run --allow-net scripts/test-security-headers.ts
  
  # Test production only
  deno run --allow-net scripts/test-security-headers.ts --production
  
  # Test development server
  deno run --allow-net scripts/test-security-headers.ts --dev
`);
  Deno.exit(0);
}

// Run the tests
if (import.meta.main) {
  main().catch(console.error);
}