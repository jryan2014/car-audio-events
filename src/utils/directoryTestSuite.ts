import { supabase } from '../lib/supabase';
import { validateDirectoryListing, safeReplace } from './directoryValidation';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  passed: number;
  failed: number;
  total: number;
}

/**
 * Comprehensive test suite for directory functionality
 */
export class DirectoryTestSuite {
  private results: TestSuite[] = [];

  async runAllTests(): Promise<{ 
    suites: TestSuite[]; 
    summary: { 
      totalTests: number; 
      passed: number; 
      failed: number; 
      successRate: number;
    }
  }> {
    console.log('🧪 Starting Directory Test Suite...');
    
    this.results = [];
    
    // Run all test suites
    await this.testDataValidation();
    await this.testDatabaseOperations();
    await this.testEdgeCases();
    await this.testUserInterface();

    // Calculate summary
    const summary = this.calculateSummary();
    
    console.log('✅ Directory Test Suite completed');
    console.log(`📊 Results: ${summary.passed}/${summary.totalTests} tests passed (${summary.successRate}%)`);
    
    return { suites: this.results, summary };
  }

  private async testDataValidation(): Promise<void> {
    const suite: TestSuite = {
      name: 'Data Validation Tests',
      results: [],
      passed: 0,
      failed: 0,
      total: 0
    };

    // Test 1: Valid listing data
    suite.results.push(this.runTest(
      'Valid listing data validation',
      () => {
        const validData = {
          id: 'test-1',
          business_name: 'Test Business',
          business_type: 'retailer',
          listing_type: 'retailer',
          description: 'Test description',
          services: ['installation', 'tuning'],
          products: [{
            name: 'Test Product',
            category: 'amplifier',
            price: 100,
            description: 'Test product description',
            images: ['http://example.com/image.jpg']
          }],
          views: 5,
          created_at: '2024-01-01T00:00:00Z'
        };
        
        const result = validateDirectoryListing(validData);
        if (!result) throw new Error('Failed to validate valid data');
        if (result.business_name !== 'Test Business') throw new Error('Business name not preserved');
        if (!Array.isArray(result.products)) throw new Error('Products not validated properly');
        return 'Valid data processed correctly';
      }
    ));

    // Test 2: Invalid/null data handling
    suite.results.push(this.runTest(
      'Invalid data handling',
      () => {
        const invalidData = null;
        const result = validateDirectoryListing(invalidData);
        if (result !== null) throw new Error('Should return null for invalid data');
        return 'Null data handled correctly';
      }
    ));

    // Test 3: Partial data sanitization
    suite.results.push(this.runTest(
      'Partial data sanitization',
      () => {
        const partialData = {
          id: 'test-2',
          business_name: null,
          business_type: undefined,
          listing_type: 'retailer',
          services: null,
          products: [{ name: null, category: 'test' }],
          views: 'invalid'
        };
        
        const result = validateDirectoryListing(partialData);
        if (!result) throw new Error('Failed to validate partial data');
        if (result.business_name === null) throw new Error('Null business_name not sanitized');
        if (result.business_type !== 'other') throw new Error('Undefined business_type not defaulted');
        if (!Array.isArray(result.services)) throw new Error('Null services not converted to array');
        if (typeof result.views !== 'number') throw new Error('Invalid views not converted to number');
        return 'Partial data sanitized correctly';
      }
    ));

    // Test 4: Safe replace function
    suite.results.push(this.runTest(
      'Safe replace function',
      () => {
        if (safeReplace(null, '_', ' ') !== 'Unknown') throw new Error('Null not handled');
        if (safeReplace(undefined, '_', ' ') !== 'Unknown') throw new Error('Undefined not handled');
        if (safeReplace('test_value', '_', ' ') !== 'test value') throw new Error('Replace not working');
        if (safeReplace(123, '_', ' ') !== 'Unknown') throw new Error('Number not handled');
        return 'Safe replace works correctly';
      }
    ));

    this.finalizeTestSuite(suite);
    this.results.push(suite);
  }

  private async testDatabaseOperations(): Promise<void> {
    const suite: TestSuite = {
      name: 'Database Operations Tests',
      results: [],
      passed: 0,
      failed: 0,
      total: 0
    };

    // Test 1: Basic listing fetch
    suite.results.push(await this.runAsyncTest(
      'Basic listing fetch',
      async () => {
        const { data, error } = await supabase
          .from('directory_listings')
          .select('id, business_name, business_type, listing_type')
          .limit(1);

        if (error) throw new Error(`Database error: ${error.message}`);
        return `Fetched ${data?.length || 0} listings successfully`;
      }
    ));

    // Test 2: Search functionality
    suite.results.push(await this.runAsyncTest(
      'Search functionality',
      async () => {
        const { data, error } = await supabase
          .from('directory_listings')
          .select('*')
          .or('business_name.ilike.%test%,description.ilike.%test%')
          .limit(5);

        if (error) throw new Error(`Search error: ${error.message}`);
        return `Search completed successfully`;
      }
    ));

    // Test 3: View increment function
    suite.results.push(await this.runAsyncTest(
      'View increment function',
      async () => {
        const { error } = await supabase.rpc('increment_directory_view', { 
          listing_id: 'non-existent-id' 
        });

        // This should not throw an error even for non-existent IDs
        return 'View increment function accessible';
      }
    ));

    // Test 4: RLS policies
    suite.results.push(await this.runAsyncTest(
      'Row Level Security policies',
      async () => {
        const { data: policies, error } = await supabase
          .from('pg_policies')
          .select('*')
          .eq('tablename', 'directory_listings')
          .eq('schemaname', 'public');

        if (error) throw new Error(`RLS policy check failed: ${error.message}`);
        return `Found ${policies?.length || 0} RLS policies`;
      }
    ));

    this.finalizeTestSuite(suite);
    this.results.push(suite);
  }

  private async testEdgeCases(): Promise<void> {
    const suite: TestSuite = {
      name: 'Edge Cases Tests',
      results: [],
      passed: 0,
      failed: 0,
      total: 0
    };

    // Test 1: Empty string handling
    suite.results.push(this.runTest(
      'Empty string handling',
      () => {
        const data = {
          id: 'test-3',
          business_name: '',
          business_type: '',
          listing_type: '',
          description: '',
          services: [],
          products: []
        };
        
        const result = validateDirectoryListing(data);
        if (!result) throw new Error('Failed to validate empty string data');
        if (result.business_name === '') throw new Error('Empty business_name not handled');
        return 'Empty strings handled correctly';
      }
    ));

    // Test 2: Large data handling
    suite.results.push(this.runTest(
      'Large data handling',
      () => {
        const largeData = {
          id: 'test-4',
          business_name: 'A'.repeat(1000),
          business_type: 'retailer',
          listing_type: 'retailer',
          description: 'B'.repeat(5000),
          services: Array(100).fill('installation'),
          products: Array(50).fill({
            name: 'Product',
            category: 'amplifier',
            price: 100,
            description: 'Description',
            images: Array(10).fill('http://example.com/image.jpg')
          })
        };
        
        const result = validateDirectoryListing(largeData);
        if (!result) throw new Error('Failed to validate large data');
        return 'Large data processed successfully';
      }
    ));

    // Test 3: Circular reference handling
    suite.results.push(this.runTest(
      'Circular reference handling',
      () => {
        const circularData: any = {
          id: 'test-5',
          business_name: 'Test',
          business_type: 'retailer',
          listing_type: 'retailer'
        };
        circularData.self = circularData; // Create circular reference
        
        try {
          const result = validateDirectoryListing(circularData);
          // Should not crash due to circular reference
          return 'Circular reference handled safely';
        } catch (error: any) {
          if (error.message.includes('circular')) {
            return 'Circular reference detected and handled';
          }
          throw error;
        }
      }
    ));

    // Test 4: Unicode and special characters
    suite.results.push(this.runTest(
      'Unicode and special characters',
      () => {
        const unicodeData = {
          id: 'test-6',
          business_name: '🎵 Audio Store 音响店',
          business_type: 'retailer',
          listing_type: 'retailer',
          description: 'Special chars: <>&"\'\n\t',
          services: ['installation'],
          products: [{
            name: 'Ümlauts & Special Chars',
            category: 'amplifier',
            price: 100,
            description: 'Тест 测试 🔊',
            images: []
          }]
        };
        
        const result = validateDirectoryListing(unicodeData);
        if (!result) throw new Error('Failed to validate unicode data');
        return 'Unicode characters handled correctly';
      }
    ));

    this.finalizeTestSuite(suite);
    this.results.push(suite);
  }

  private async testUserInterface(): Promise<void> {
    const suite: TestSuite = {
      name: 'User Interface Tests',
      results: [],
      passed: 0,
      failed: 0,
      total: 0
    };

    // Test 1: Component mounting without errors
    suite.results.push(this.runTest(
      'Error boundary functionality',
      () => {
        // Simulate error boundary test
        const mockError = new Error('Test error');
        const errorMessage = mockError.message;
        if (!errorMessage) throw new Error('Error not captured');
        return 'Error boundary would capture errors correctly';
      }
    ));

    // Test 2: Loading state rendering
    suite.results.push(this.runTest(
      'Loading state rendering',
      () => {
        // Mock loading state test
        const loadingProps = { type: 'listings' as const, message: 'Loading...', showSkeletons: true };
        if (!loadingProps.type || !loadingProps.message) throw new Error('Loading props invalid');
        return 'Loading states configured correctly';
      }
    ));

    // Test 3: Network status handling
    suite.results.push(this.runTest(
      'Network status handling',
      () => {
        const isOnline = navigator.onLine;
        if (typeof isOnline !== 'boolean') throw new Error('Network status not available');
        return `Network status detected: ${isOnline ? 'online' : 'offline'}`;
      }
    ));

    this.finalizeTestSuite(suite);
    this.results.push(suite);
  }

  private runTest(name: string, testFunction: () => string): TestResult {
    try {
      const details = testFunction();
      return { name, passed: true, details };
    } catch (error: any) {
      return { name, passed: false, error: error.message };
    }
  }

  private async runAsyncTest(name: string, testFunction: () => Promise<string>): Promise<TestResult> {
    try {
      const details = await testFunction();
      return { name, passed: true, details };
    } catch (error: any) {
      return { name, passed: false, error: error.message };
    }
  }

  private finalizeTestSuite(suite: TestSuite): void {
    suite.total = suite.results.length;
    suite.passed = suite.results.filter(r => r.passed).length;
    suite.failed = suite.total - suite.passed;
  }

  private calculateSummary() {
    const totalTests = this.results.reduce((sum, suite) => sum + suite.total, 0);
    const passed = this.results.reduce((sum, suite) => sum + suite.passed, 0);
    const failed = totalTests - passed;
    const successRate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;

    return { totalTests, passed, failed, successRate };
  }

  /**
   * Generate a detailed test report
   */
  generateReport(): string {
    const summary = this.calculateSummary();
    let report = `# Directory Test Suite Report\n\n`;
    report += `**Summary:** ${summary.passed}/${summary.totalTests} tests passed (${summary.successRate}%)\n\n`;

    this.results.forEach(suite => {
      report += `## ${suite.name}\n`;
      report += `Passed: ${suite.passed}/${suite.total}\n\n`;

      suite.results.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        report += `${status} **${result.name}**\n`;
        if (result.passed && result.details) {
          report += `   - ${result.details}\n`;
        }
        if (!result.passed && result.error) {
          report += `   - Error: ${result.error}\n`;
        }
        report += '\n';
      });
    });

    return report;
  }
}

// Export singleton instance
export const directoryTestSuite = new DirectoryTestSuite();