import React, { useState } from 'react';
import { retrySupabaseOperation, retryInsert } from '../utils/supabaseRetry';
import { supabase } from '../lib/supabase';

export default function TestRetryUtility() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testSchemaCache = async () => {
    addResult('Test 1: Testing retry with simulated schema cache error...');
    
    let attemptCount = 0;
    
    const result = await retrySupabaseOperation(
      async () => {
        attemptCount++;
        addResult(`Attempt ${attemptCount}`);
        
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
        initialDelay: 500,
        onRetry: (attempt, error) => {
          addResult(`Retry callback - Attempt ${attempt}: ${error.message}`);
        }
      }
    );
    
    addResult(`Result: ${result.error ? 'Error - ' + result.error.message : 'Success - ' + JSON.stringify(result.data)}`);
    addResult(`Total attempts: ${attemptCount}`);
  };

  const testNonRetryableError = async () => {
    addResult('Test 2: Testing with non-retryable error...');
    
    let attemptCount = 0;
    
    const result = await retrySupabaseOperation(
      async () => {
        attemptCount++;
        addResult(`Attempt ${attemptCount}`);
        
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
        onRetry: () => {
          addResult(`This shouldn't be called for non-retryable errors`);
        }
      }
    );
    
    addResult(`Result: ${result.error ? 'Error - ' + result.error.message : 'Success'}`);
    addResult(`Total attempts (should be 1): ${attemptCount}`);
  };

  const testActualSelect = async () => {
    addResult('Test 3: Testing with actual Supabase SELECT...');
    
    const result = await retrySupabaseOperation(
      () => supabase.from('users').select('id').limit(1),
      {
        onRetry: (attempt, error) => {
          addResult(`Retry attempt ${attempt}: ${error.message}`);
        }
      }
    );
    
    addResult(`Result: ${result.error ? 'Error - ' + result.error.message : `Success - ${result.data?.length || 0} rows`}`);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      await testSchemaCache();
      addResult('---');
      
      await testNonRetryableError();
      addResult('---');
      
      await testActualSelect();
      addResult('---');
      
      addResult('✅ All tests completed!');
    } catch (error) {
      addResult(`❌ Test failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Supabase Retry Utility Test</h1>
        
        <div className="mb-8">
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="bg-electric-500 hover:bg-electric-600 px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results:</h2>
          
          {testResults.length === 0 ? (
            <p className="text-gray-400">Click "Run All Tests" to start</p>
          ) : (
            <div className="space-y-1 font-mono text-sm">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={
                    result.includes('✅') ? 'text-green-400' :
                    result.includes('❌') ? 'text-red-400' :
                    result.includes('Error') ? 'text-yellow-400' :
                    'text-gray-300'
                  }
                >
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">What This Tests:</h2>
          <ul className="space-y-2 text-gray-300">
            <li>✓ Retry logic with exponential backoff</li>
            <li>✓ Schema cache error detection (PGRST204)</li>
            <li>✓ Non-retryable errors stop immediately</li>
            <li>✓ Actual Supabase operations</li>
            <li>✓ Retry callbacks and logging</li>
          </ul>
        </div>
      </div>
    </div>
  );
}