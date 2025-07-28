/**
 * Test file for QA of supabaseRetry utility
 * Run this in your browser console or a test component
 */

import { retrySupabaseOperation, retryInsert } from './supabaseRetry';
import { supabase } from '../lib/supabase';

// Test 1: Test retry with simulated schema cache error
export async function testRetryWithSchemaCache() {
  console.log('Test 1: Testing retry with schema cache error...');
  
  let attemptCount = 0;
  
  const result = await retrySupabaseOperation(
    async () => {
      attemptCount++;
      console.log(`Attempt ${attemptCount}`);
      
      // Simulate schema cache error for first 2 attempts
      if (attemptCount < 3) {
        return {
          data: null,
          error: {
            code: 'PGRST204',
            message: 'Schema cache mismatch',
            details: '',
            hint: ''
          }
        };
      }
      
      // Success on 3rd attempt
      return {
        data: { id: '123', name: 'Test Success' },
        error: null
      };
    },
    {
      maxRetries: 5,
      initialDelay: 100, // Fast for testing
      onRetry: (attempt, error) => {
        console.log(`Retry callback - Attempt ${attempt}: ${error.message}`);
      }
    }
  );
  
  console.log('Result:', result);
  console.log('Total attempts:', attemptCount);
  console.log('Test 1 complete!\n');
}

// Test 2: Test with non-retryable error
export async function testNonRetryableError() {
  console.log('Test 2: Testing with non-retryable error...');
  
  let attemptCount = 0;
  
  const result = await retrySupabaseOperation(
    async () => {
      attemptCount++;
      console.log(`Attempt ${attemptCount}`);
      
      // Return a non-schema cache error
      return {
        data: null,
        error: {
          code: '23505',
          message: 'Unique constraint violation',
          details: '',
          hint: ''
        }
      };
    },
    {
      maxRetries: 5,
      onRetry: (attempt, error) => {
        console.log(`This shouldn't be called for non-retryable errors`);
      }
    }
  );
  
  console.log('Result:', result);
  console.log('Total attempts (should be 1):', attemptCount);
  console.log('Test 2 complete!\n');
}

// Test 3: Test actual Supabase operation (safe - just a select)
export async function testActualSupabaseOperation() {
  console.log('Test 3: Testing with actual Supabase operation...');
  
  const result = await retrySupabaseOperation(
    () => supabase.from('users').select('id').limit(1),
    {
      onRetry: (attempt, error) => {
        console.log(`Retry attempt ${attempt}:`, error.message);
      }
    }
  );
  
  console.log('Result:', result);
  console.log('Test 3 complete!\n');
}

// Run all tests
export async function runAllTests() {
  console.log('Starting retry utility QA tests...\n');
  
  try {
    await testRetryWithSchemaCache();
    await testNonRetryableError();
    await testActualSupabaseOperation();
    
    console.log('✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Instructions for QA:
console.log(`
To run these tests:

1. Open your browser DevTools console
2. Import and run the tests:
   
   import { runAllTests } from './src/utils/testRetryUtility';
   runAllTests();

3. Or run individual tests:
   
   import { testRetryWithSchemaCache } from './src/utils/testRetryUtility';
   testRetryWithSchemaCache();
`);