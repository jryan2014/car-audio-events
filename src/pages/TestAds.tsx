import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function TestAds() {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    try {
      console.log('[TestAds] Starting to load ads...');
      
      const today = new Date().toISOString().split('T')[0];
      console.log('[TestAds] Today\'s date:', today);
      
      // First, let's get ALL ads without any filters
      console.log('[TestAds] Query 1: Getting ALL ads...');
      const { data: allAds, error: allError } = await supabase
        .from('advertisements')
        .select('*');
        
      if (allError) {
        console.error('[TestAds] Error loading all ads:', allError);
      } else {
        console.log('[TestAds] ALL ads in database:', allAds);
      }
      
      // Now let's try with just status filter
      console.log('[TestAds] Query 2: Getting active/approved ads...');
      const { data: activeAds, error: activeError } = await supabase
        .from('advertisements')
        .select('*')
        .in('status', ['active', 'approved']);
        
      if (activeError) {
        console.error('[TestAds] Error loading active ads:', activeError);
      } else {
        console.log('[TestAds] Active/approved ads:', activeAds);
      }
      
      // Now with date filters
      console.log('[TestAds] Query 3: Getting ads with date filters...');
      const { data: dateFilteredAds, error: dateError } = await supabase
        .from('advertisements')
        .select('*')
        .in('status', ['active', 'approved'])
        .lte('start_date', today)
        .gte('end_date', today);
        
      if (dateError) {
        console.error('[TestAds] Error loading date-filtered ads:', dateError);
      } else {
        console.log('[TestAds] Date-filtered ads:', dateFilteredAds);
      }
      
      // Finally, with placement filter
      console.log('[TestAds] Query 4: Getting header placement ads...');
      const { data: headerAds, error: headerError } = await supabase
        .from('advertisements')
        .select('*')
        .eq('placement_type', 'header')
        .in('status', ['active', 'approved'])
        .lte('start_date', today)
        .gte('end_date', today);
        
      if (headerError) {
        console.error('[TestAds] Error loading header ads:', headerError);
      } else {
        console.log('[TestAds] Header placement ads:', headerAds);
      }
      
      setAds(allAds || []);
      
    } catch (err) {
      console.error('[TestAds] Exception:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Advertisement Database Test</h1>
        
        {loading ? (
          <div className="text-white">Loading ads...</div>
        ) : error ? (
          <div className="text-red-500">Error: {JSON.stringify(error)}</div>
        ) : (
          <div className="space-y-4">
            <div className="text-white">
              <h2 className="text-xl font-semibold mb-2">Total Ads in Database: {ads.length}</h2>
              <p className="text-gray-400 mb-4">Check the browser console for detailed logs</p>
            </div>
            
            {ads.map((ad) => (
              <div key={ad.id} className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white">{ad.title}</h3>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-gray-300">
                  <div>
                    <span className="text-gray-500">Status:</span> {ad.status}
                  </div>
                  <div>
                    <span className="text-gray-500">Placement:</span> {ad.placement_type}
                  </div>
                  <div>
                    <span className="text-gray-500">Start Date:</span> {ad.start_date}
                  </div>
                  <div>
                    <span className="text-gray-500">End Date:</span> {ad.end_date}
                  </div>
                  <div>
                    <span className="text-gray-500">Priority:</span> {ad.priority}
                  </div>
                  <div>
                    <span className="text-gray-500">Size:</span> {ad.size}
                  </div>
                </div>
                {ad.image_url && (
                  <div className="mt-2">
                    <img src={ad.image_url} alt={ad.title} className="h-20 object-cover rounded" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}