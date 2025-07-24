import React, { useState, useEffect } from 'react';
import AdDisplay from '../components/AdDisplay';
import { supabase } from '../lib/supabase';

export default function AdDebug() {
  const [showAds, setShowAds] = useState(true);
  const [allAds, setAllAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllAds();
  }, []);

  const loadAllAds = async () => {
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading ads:', error);
      } else {
        console.log('All ads in database:', data);
        setAllAds(data || []);
      }
    } catch (err) {
      console.error('Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearFrequencyCaps = () => {
    localStorage.removeItem('ad_frequency_caps');
    console.log('Frequency caps cleared');
    setShowAds(false);
    setTimeout(() => setShowAds(true), 100);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Ad Display Debug Page</h1>
        
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={clearFrequencyCaps}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Clear Frequency Caps
            </button>
            <button
              onClick={() => setShowAds(!showAds)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              {showAds ? 'Hide' : 'Show'} Ads
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Reload Page
            </button>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Database Ads ({allAds.length})</h2>
          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allAds.map(ad => (
                <div key={ad.id} className="text-sm text-gray-300 border-b border-gray-700 pb-2">
                  <div className="font-medium">{ad.title}</div>
                  <div className="text-xs text-gray-500">
                    Status: {ad.status} | Placement: {ad.placement_type} | 
                    Dates: {ad.start_date} to {ad.end_date} | 
                    Priority: {ad.priority} | Freq Cap: {ad.frequency_cap}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Ad Display Component Test</h2>
          <p className="text-gray-400 mb-4">Check browser console for detailed logs</p>
          
          {showAds && (
            <>
              <div className="mb-8">
                <h3 className="text-lg font-medium text-white mb-2">Header Placement</h3>
                <div className="border-2 border-blue-500 p-4 bg-gray-900">
                  <AdDisplay placement="header" pageType="test" />
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-medium text-white mb-2">Sidebar Placement</h3>
                <div className="border-2 border-green-500 p-4 bg-gray-900">
                  <AdDisplay placement="sidebar" pageType="test" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Console Output Guide</h2>
          <div className="text-sm text-gray-400 space-y-1">
            <p>• [AdDisplay] Component rendered - Component initialization</p>
            <p>• [AdDisplay] Loading ads - Starting to fetch from database</p>
            <p>• [AdDisplay] Supabase query successful - Shows loaded ads</p>
            <p>• [AdDisplay] Eligible ads after frequency cap filter - Shows filtered ads</p>
            <p>• [AdDisplay] RENDER START - Shows render state</p>
            <p>• [AdDisplay] Rotation timer fired - Rotation is working</p>
          </div>
        </div>
      </div>
    </div>
  );
}