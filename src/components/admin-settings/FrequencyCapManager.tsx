import React, { useState, useEffect } from 'react';
import { AlertCircle, Trash2, RefreshCw, Shield, Info, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FrequencyCapData {
  [adId: string]: {
    impressions: number;
    lastReset: string;
  };
}

export default function FrequencyCapManager() {
  const [frequencyData, setFrequencyData] = useState<FrequencyCapData>({});
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadFrequencyData();
  }, []);

  const loadFrequencyData = () => {
    try {
      const stored = localStorage.getItem('ad_frequency_caps');
      if (stored) {
        const data = JSON.parse(stored);
        setFrequencyData(data);
      } else {
        setFrequencyData({});
      }
    } catch (err) {
      console.error('Error loading frequency data:', err);
      setMessage({ type: 'error', text: 'Failed to load frequency cap data' });
    }
  };

  const clearFrequencyCaps = () => {
    localStorage.removeItem('ad_frequency_caps');
    setFrequencyData({});
    setShowConfirmClear(false);
    setMessage({ type: 'success', text: 'Frequency cap data cleared successfully!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const clearAllAdData = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('ad') || key.includes('frequency'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    setFrequencyData({});
    setShowConfirmClear(false);
    setMessage({ type: 'success', text: `Cleared ${keysToRemove.length} ad-related keys from localStorage` });
    setTimeout(() => setMessage(null), 3000);
  };

  const testLocalStorage = () => {
    try {
      localStorage.setItem('test', 'value');
      localStorage.removeItem('test');
      
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
      
      setMessage({ 
        type: 'info', 
        text: `LocalStorage is working. Found ${keys.length} keys: ${keys.join(', ')}` 
      });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setMessage({ type: 'error', text: 'LocalStorage test failed' });
    }
  };

  const getAdCount = () => Object.keys(frequencyData).length;
  const getTotalImpressions = () => 
    Object.values(frequencyData).reduce((sum, data) => sum + data.impressions, 0);

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-electric-400 mr-3" />
          <h2 className="text-xl font-semibold text-white">Frequency Cap Management</h2>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-400">
            {getAdCount()} ads tracked
          </span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      <div 
        className={`border-t border-gray-700 transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-6">
          <p className="text-gray-400 text-sm mb-4">
            Manage ad frequency caps and debug display issues
          </p>

          {/* Alert/Message */}
          {message && (
            <div className={`mb-4 p-4 rounded-lg flex items-start space-x-3 ${
              message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
              message.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
              'bg-blue-500/10 border border-blue-500/30 text-blue-400'
            }`}>
              {message.type === 'success' ? <CheckCircle className="h-5 w-5 mt-0.5" /> :
               message.type === 'error' ? <AlertCircle className="h-5 w-5 mt-0.5" /> :
               <Info className="h-5 w-5 mt-0.5" />}
              <div className="flex-1">
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{getAdCount()}</div>
              <div className="text-sm text-gray-400">Ads with frequency data</div>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{getTotalImpressions()}</div>
              <div className="text-sm text-gray-400">Total impressions today</div>
            </div>
          </div>

          {/* Current Frequency Data */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-medium text-white">Current Frequency Cap Data</h4>
              <button
                onClick={loadFrequencyData}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="h-4 w-4 text-gray-300" />
              </button>
            </div>
            {Object.keys(frequencyData).length > 0 ? (
              <div className="bg-gray-900/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-sm text-gray-300 font-mono">
                  {JSON.stringify(frequencyData, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="bg-gray-900/50 rounded-lg p-8 text-center">
                <p className="text-gray-400">No frequency cap data found</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClear(true)}
                className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Trash2 className="h-5 w-5" />
                <span>Clear Frequency Caps</span>
              </button>
              
              <button
                onClick={testLocalStorage}
                className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Shield className="h-5 w-5" />
                <span>Test LocalStorage</span>
              </button>
            </div>

            <button
              onClick={() => setShowConfirmClear(true)}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <AlertCircle className="h-5 w-5" />
              <span>Clear ALL Ad-Related Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">Confirm Clear Data</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to clear the frequency cap data? This will reset all ad impression counts.
            </p>
            <div className="flex gap-3">
              <button
                onClick={clearFrequencyCaps}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Clear Frequency Caps Only
              </button>
              <button
                onClick={clearAllAdData}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Clear ALL Ad Data
              </button>
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}