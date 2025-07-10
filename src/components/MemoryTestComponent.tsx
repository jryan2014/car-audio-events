import React, { useState, useEffect, useRef } from 'react';
import { memoryManager } from '../utils/memoryManager';

interface MemoryTestComponentProps {
  onClose: () => void;
}

export const MemoryTestComponent: React.FC<MemoryTestComponentProps> = ({ onClose }) => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const testIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runMemoryTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      // Test 1: Basic memory info
      setCurrentTest('Testing basic memory info...');
      const initialMemory = memoryManager.getMemoryInfo();
      if (initialMemory) {
        addResult(`✅ Memory monitoring working - Initial: ${(initialMemory.used / 1024 / 1024).toFixed(2)}MB`);
      } else {
        addResult('❌ Memory monitoring not available');
      }

      // Test 2: Force garbage collection
      setCurrentTest('Testing garbage collection...');
      memoryManager.forceGarbageCollection();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const afterGC = memoryManager.getMemoryInfo();
      if (afterGC && initialMemory) {
        const difference = (afterGC.used - initialMemory.used) / 1024 / 1024;
        addResult(`✅ Garbage collection test - Memory change: ${difference.toFixed(2)}MB`);
      }

      // Test 3: Large object creation and cleanup
      setCurrentTest('Testing large object cleanup...');
      const largeObjects: any[] = [];
      for (let i = 0; i < 100; i++) {
        largeObjects.push(new Array(10000).fill(`test-data-${i}`));
      }
      
      const afterLargeObjects = memoryManager.getMemoryInfo();
      if (afterLargeObjects && afterGC) {
        const increase = (afterLargeObjects.used - afterGC.used) / 1024 / 1024;
        addResult(`📈 Large objects created - Memory increase: ${increase.toFixed(2)}MB`);
      }

      // Clear the objects
      largeObjects.length = 0;
      memoryManager.forceGarbageCollection();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const afterCleanup = memoryManager.getMemoryInfo();
      if (afterCleanup && afterLargeObjects) {
        const decrease = (afterLargeObjects.used - afterCleanup.used) / 1024 / 1024;
        addResult(`📉 Objects cleared - Memory decrease: ${decrease.toFixed(2)}MB`);
      }

      // Test 4: Event listener cleanup test
      setCurrentTest('Testing event listener cleanup...');
      const testElement = document.createElement('div');
      const listeners: (() => void)[] = [];
      
      for (let i = 0; i < 50; i++) {
        const listener = () => console.log(`Listener ${i}`);
        testElement.addEventListener('click', listener);
        listeners.push(() => testElement.removeEventListener('click', listener));
      }

      addResult(`✅ Created 50 event listeners`);
      
      // Clean up listeners
      listeners.forEach(cleanup => cleanup());
      addResult(`✅ Cleaned up all event listeners`);

      // Test 5: Memory history
      setCurrentTest('Testing memory history...');
      const history = memoryManager.getMemoryHistory();
      addResult(`✅ Memory history contains ${history.length} entries`);

      // Test 6: Simulate Google Maps cleanup
      setCurrentTest('Testing Google Maps cleanup simulation...');
      const mockMarkers: any[] = [];
      const mockInfoWindows: any[] = [];
      
      for (let i = 0; i < 10; i++) {
        const marker = { setMap: () => {}, remove: () => {} };
        const infoWindow = { close: () => {} };
        mockMarkers.push(marker);
        mockInfoWindows.push(infoWindow);
        (window as any)[`marker${i}`] = marker;
        (window as any)[`infoWindow${i}`] = infoWindow;
      }
      
      addResult(`✅ Created 10 mock Google Maps objects`);
      
      // Clean up mock objects
      mockMarkers.forEach(marker => marker.remove());
      mockInfoWindows.forEach(window => window.close());
      
      for (let i = 0; i < 10; i++) {
        delete (window as any)[`marker${i}`];
        delete (window as any)[`infoWindow${i}`];
      }
      
      addResult(`✅ Cleaned up mock Google Maps objects`);

      // Final memory check
      const finalMemory = memoryManager.getMemoryInfo();
      if (finalMemory && initialMemory) {
        const totalChange = (finalMemory.used - initialMemory.used) / 1024 / 1024;
        addResult(`📊 Final memory change: ${totalChange.toFixed(2)}MB`);
        
        if (Math.abs(totalChange) < 10) {
          addResult(`✅ Memory test PASSED - Good memory management`);
        } else {
          addResult(`⚠️ Memory test WARNING - Significant memory change detected`);
        }
      }

      setCurrentTest('Tests completed successfully!');
      
    } catch (error) {
      addResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const startContinuousMonitoring = () => {
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
    }
    
    addResult('📊 Starting continuous memory monitoring...');
    
    testIntervalRef.current = setInterval(() => {
      const memInfo = memoryManager.getMemoryInfo();
      if (memInfo) {
        addResult(`📈 Memory: ${(memInfo.used / 1024 / 1024).toFixed(2)}MB (${memInfo.percentage.toFixed(1)}%)`);
      }
    }, 5000);
  };

  const stopContinuousMonitoring = () => {
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
      addResult('⏹️ Stopped continuous monitoring');
    }
  };

  useEffect(() => {
    return () => {
      if (testIntervalRef.current) {
        clearInterval(testIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Memory Optimization Test</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="flex gap-4 mb-4">
          <button
            onClick={runMemoryTests}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? 'Running Tests...' : 'Run Memory Tests'}
          </button>
          
          <button
            onClick={startContinuousMonitoring}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Start Monitoring
          </button>
          
          <button
            onClick={stopContinuousMonitoring}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Stop Monitoring
          </button>
          
          <button
            onClick={() => memoryManager.forceGarbageCollection()}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Force GC
          </button>
          
          <button
            onClick={() => memoryManager.logMemoryStats()}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Log Stats
          </button>
        </div>

        {currentTest && (
          <div className="mb-4 p-2 bg-blue-900 text-blue-200 rounded">
            Current Test: {currentTest}
          </div>
        )}

        <div className="bg-gray-900 rounded p-4 max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold text-white mb-2">Test Results:</h3>
          <div className="space-y-1 text-sm">
            {testResults.length === 0 ? (
              <div className="text-gray-400">No tests run yet. Click "Run Memory Tests" to start.</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-gray-300 font-mono">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 