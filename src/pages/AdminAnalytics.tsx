import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Heart, Calendar, Eye, DollarSign, Target, Star, Award, Download, FileText, Settings, BarChart, Brain } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface AnalyticsData {
  totalEvents: number;
  totalUsers: number;
  totalFavorites: number;
  totalAttendance: number;
  totalViews: number;
  adRevenue: number;
  aiCosts: number;
  topEvents: Array<{
    id: string;
    title: string;
    favorites_count: number;
    attendance_count: number;
    view_count: number;
  }>;
  userEngagement: Array<{
    date: string;
    registrations: number;
    favorites: number;
    views: number;
  }>;
  seasonStats: Array<{
    season_year: number;
    event_count: number;
    total_attendance: number;
  }>;
}

export default function AdminAnalytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  useEffect(() => {
    loadAnalytics();
  }, [selectedTimeRange]);

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const handleExportData = () => {
    if (!analytics) return;
    
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Events', analytics.totalEvents],
      ['Total Users', analytics.totalUsers],
      ['Total Favorites', analytics.totalFavorites],
      ['Total Attendance', analytics.totalAttendance],
      ['Page Views', analytics.totalViews],
      ['Ad Revenue', analytics.adRevenue],
      ['AI Costs', analytics.aiCosts],
      ['', ''],
      ['Top Events', ''],
      ...analytics.topEvents.map(event => 
        [event.title, `Favorites: ${event.favorites_count}, Attendance: ${event.attendance_count}, Views: ${event.view_count}`]
      )
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${selectedTimeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleGenerateReport = () => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow || !analytics) return;
    
    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: white; }
          h1 { color: #60a5fa; }
          h2 { color: #93c5fd; margin-top: 30px; }
          .metric { margin: 10px 0; padding: 10px; background: #2a2a2a; border-radius: 5px; }
          .metric-label { color: #9ca3af; }
          .metric-value { font-size: 1.5em; font-weight: bold; color: white; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #3b82f6; padding: 10px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #444; }
        </style>
      </head>
      <body>
        <h1>Car Audio Events - Analytics Report</h1>
        <p>Report Generated: ${new Date().toLocaleString()}</p>
        <p>Time Range: ${selectedTimeRange === '7d' ? 'Last 7 days' : 
                         selectedTimeRange === '30d' ? 'Last 30 days' : 
                         selectedTimeRange === '90d' ? 'Last 90 days' : 'Last year'}</p>
        
        <h2>Key Metrics</h2>
        <div class="metric">
          <span class="metric-label">Total Events:</span> 
          <span class="metric-value">${analytics.totalEvents}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Total Users:</span> 
          <span class="metric-value">${analytics.totalUsers}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Event Favorites:</span> 
          <span class="metric-value">${analytics.totalFavorites}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Event Attendance:</span> 
          <span class="metric-value">${analytics.totalAttendance}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Page Views:</span> 
          <span class="metric-value">${analytics.totalViews}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Ad Revenue:</span> 
          <span class="metric-value">$${analytics.adRevenue.toFixed(2)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">AI Costs:</span> 
          <span class="metric-value">$${analytics.aiCosts.toFixed(2)}</span>
        </div>
        
        <h2>Top Performing Events</h2>
        <table>
          <thead>
            <tr>
              <th>Event Title</th>
              <th>Favorites</th>
              <th>Attendance</th>
              <th>Views</th>
            </tr>
          </thead>
          <tbody>
            ${analytics.topEvents.map(event => `
              <tr>
                <td>${event.title}</td>
                <td>${event.favorites_count}</td>
                <td>${event.attendance_count}</td>
                <td>${event.view_count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <h2>Season Statistics</h2>
        <table>
          <thead>
            <tr>
              <th>Season Year</th>
              <th>Event Count</th>
              <th>Total Attendance</th>
            </tr>
          </thead>
          <tbody>
            ${analytics.seasonStats.map(season => `
              <tr>
                <td>${season.season_year}</td>
                <td>${season.event_count}</td>
                <td>${season.total_attendance}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    reportWindow.document.write(reportHTML);
    reportWindow.document.close();
    reportWindow.print();
  };

  const loadAnalytics = async () => {
    console.log('📊 Loading analytics from database');
    setIsLoading(true);
    
    try {
      // Calculate date range for filtering
      const endDate = new Date();
      const startDate = new Date();
      const daysAgo = selectedTimeRange === '7d' ? 7 : 
                      selectedTimeRange === '30d' ? 30 : 
                      selectedTimeRange === '90d' ? 90 : 365;
      startDate.setDate(endDate.getDate() - daysAgo);
      const startDateStr = startDate.toISOString();

      // Get basic counts
      const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: totalFavorites } = await supabase
        .from('saved_events')
        .select('*', { count: 'exact', head: true })
        .gte('saved_at', startDateStr);

      const { count: totalRegistrations } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDateStr);

      const { count: totalEventAttendance } = await supabase
        .from('event_attendance')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDateStr);

      const totalAttendance = (totalRegistrations || 0) + (totalEventAttendance || 0);

      // Get page views
      const { count: searchViews } = await supabase
        .from('search_analytics')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDateStr);

      const { count: navViews } = await supabase
        .from('navigation_analytics')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDateStr);

      const { count: adImpressions } = await supabase
        .from('advertisement_impressions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDateStr);

      // Skip directory_listing_views - table doesn't exist
      // If you need this table, create it in the database first
      const dirViews = 0;

      const totalViews = (searchViews || 0) + (navViews || 0) + (adImpressions || 0) + dirViews;

      // Get revenue data
      const { data: adBilling } = await supabase
        .from('advertisement_billing')
        .select('total_cost')
        .eq('payment_status', 'paid')
        .gte('created_at', startDateStr);

      const adRevenue = adBilling?.reduce((sum, item) => {
        if (!item || typeof item.total_cost === 'undefined') return sum;
        const cost = parseFloat(item.total_cost);
        return sum + (isNaN(cost) ? 0 : cost);
      }, 0) || 0;

      const { data: aiUsage } = await supabase
        .from('ai_usage_analytics')
        .select('total_cost')
        .gte('created_at', startDateStr);

      const aiCosts = aiUsage?.reduce((sum, item) => {
        if (!item || typeof item.total_cost === 'undefined') return sum;
        const cost = parseFloat(item.total_cost);
        return sum + (isNaN(cost) ? 0 : cost);
      }, 0) || 0;

      // Get top events 
      const { data: events } = await supabase
        .from('events')
        .select('id, title, current_participants')
        .eq('is_active', true)
        .limit(10);

      // Get favorites for events
      const { data: savedEvents } = await supabase
        .from('saved_events')
        .select('event_id')
        .gte('saved_at', startDateStr);

      // Get registrations for events
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('event_id')
        .gte('created_at', startDateStr);

      // Get attendance for events
      const { data: attendance } = await supabase
        .from('event_attendance')
        .select('event_id')
        .gte('created_at', startDateStr);

      // Calculate engagement metrics for each event - safe property access
      const topEvents = events?.map(event => {
        const favCount = savedEvents?.filter(se => se && se.event_id === event.id).length || 0;
        const regCount = registrations?.filter(r => r && r.event_id === event.id).length || 0;
        const attCount = attendance?.filter(a => a && a.event_id === event.id).length || 0;
        const viewCount = Math.round(totalViews / (totalEvents || 1)); // Distribute views evenly for now
        
        return {
          id: (event.id || '').toString(),
          title: event.title || 'Untitled Event',
          favorites_count: favCount,
          attendance_count: attCount + regCount + (event.current_participants || 0),
          view_count: viewCount,
          engagement_score: favCount + attCount + regCount
        };
      })
      .sort((a, b) => b.engagement_score - a.engagement_score)
      .slice(0, 5) || [];

      // Get season statistics
      const { data: seasonEvents } = await supabase
        .from('events')
        .select('season_year, current_participants, id')
        .eq('is_active', true)
        .not('season_year', 'is', null);

      // Group by season year and calculate stats - safe property access
      const seasonMap = new Map();
      if (seasonEvents) {
        for (const event of seasonEvents) {
          if (!event || !event.season_year) continue;
          if (!seasonMap.has(event.season_year)) {
            seasonMap.set(event.season_year, {
              season_year: event.season_year,
              event_count: 0,
              total_attendance: 0
            });
          }
          const season = seasonMap.get(event.season_year);
          if (season) {
            season.event_count++;
            season.total_attendance += event.current_participants || 0;
          }
        }
        
        // Add registrations to attendance - safe property access
        for (const [year, season] of seasonMap) {
          const regCount = registrations?.filter(r => {
            if (!r || !r.event_id) return false;
            const eventId = typeof r.event_id === 'string' ? parseInt(r.event_id) : r.event_id;
            const event = seasonEvents.find(e => e && e.id === eventId);
            return event && event.season_year === year;
          }).length || 0;
          season.total_attendance += regCount;
        }
      }
      
      const seasonData = Array.from(seasonMap.values())
        .sort((a, b) => b.season_year - a.season_year)
        .slice(0, 5);

      // Get user engagement data for the selected time range
      const engagementData = [];
      const today = new Date();
      
      // Generate date series for engagement data
      for (let i = 0; i < Math.min(daysAgo, 30); i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Count registrations for this date - safe property access
        const regCount = registrations?.filter(r => 
          r.created_at && typeof r.created_at === 'string' && r.created_at.startsWith(dateStr)
        ).length || 0;
        
        // Count favorites for this date - safe property access
        const favCount = savedEvents?.filter(se => 
          se.saved_at && typeof se.saved_at === 'string' && se.saved_at.startsWith(dateStr)
        ).length || 0;
        
        // Count views for this date (simplified - would need actual data)
        const viewCount = Math.round((searchViews || 0) / daysAgo);
        
        if (regCount > 0 || favCount > 0 || viewCount > 0) {
          engagementData.push({
            date: dateStr,
            registrations: regCount,
            favorites: favCount,
            views: viewCount
          });
        }
      }

      // Set the final analytics data
      setAnalytics({
        totalEvents: totalEvents || 0,
        totalUsers: totalUsers || 0,
        totalFavorites: totalFavorites || 0,
        totalAttendance: totalAttendance || 0,
        totalViews: totalViews || 0,
        adRevenue: adRevenue || 0,
        aiCosts: aiCosts || 0,
        topEvents: topEvents || [],
        userEngagement: engagementData || [],
        seasonStats: seasonData || []
      });
      
      setIsLoading(false);
      console.log('✅ Analytics loaded from database');
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
      
      // Fallback to basic data if complex queries fail
      try {
        const { count: eventCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        
        const { count: userCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        
        setAnalytics({
          totalEvents: eventCount || 0,
          totalUsers: userCount || 0,
          totalFavorites: 0,
          totalAttendance: 0,
          totalViews: 0,
          adRevenue: 0,
          aiCosts: 0,
          topEvents: [],
          userEngagement: [],
          seasonStats: []
        });
      } catch (fallbackError) {
        console.error('❌ Fallback query also failed:', fallbackError);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-gray-400">Platform performance and user engagement metrics</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Events</p>
                <p className="text-2xl font-bold text-white">{analytics?.totalEvents || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-electric-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-white">{analytics?.totalUsers || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Event Favorites</p>
                <p className="text-2xl font-bold text-white">{analytics?.totalFavorites || 0}</p>
              </div>
              <Heart className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Event Attendance</p>
                <p className="text-2xl font-bold text-white">{analytics?.totalAttendance || 0}</p>
              </div>
              <Award className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Page Views</p>
                <p className="text-2xl font-bold text-white">{analytics?.totalViews || 0}</p>
              </div>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Ad Revenue</p>
                <p className="text-2xl font-bold text-white">${analytics?.adRevenue?.toFixed(2) || '0.00'}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">AI Costs</p>
                <p className="text-2xl font-bold text-white">${analytics?.aiCosts?.toFixed(2) || '0.00'}</p>
              </div>
              <Brain className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Engagement Rate</p>
                <p className="text-2xl font-bold text-white">
                  {analytics?.totalUsers ? 
                    ((analytics.totalFavorites + analytics.totalAttendance + analytics.totalViews) / (analytics.totalUsers * 10) * 100).toFixed(1) + '%'
                    : '0%'
                  }
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Events */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Star className="h-5 w-5 text-electric-500" />
              <span>Top Performing Events</span>
            </h2>
            
            <div className="space-y-4">
              {analytics?.topEvents && analytics.topEvents.length > 0 ? analytics.topEvents.map((event, index) => (
                <div key={event?.id || index} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-electric-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">{event?.title || 'Unknown Event'}</p>
                      <p className="text-gray-400 text-sm">
                        {event?.favorites_count || 0} favorites • {event?.attendance_count || 0} attended
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{event?.view_count || 0}</p>
                    <p className="text-gray-400 text-sm">views</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No event data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Season Statistics */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-electric-500" />
              <span>Season Statistics</span>
            </h2>
            
            <div className="space-y-4">
              {analytics?.seasonStats && analytics.seasonStats.length > 0 ? analytics.seasonStats.map((season) => (
                <div key={season?.season_year || Math.random()} className="p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-medium">{season?.season_year || 'Unknown'} Season</h3>
                    <span className="text-electric-400 font-bold">{season?.event_count || 0} events</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Total Attendance</span>
                    <span className="text-white">{season?.total_attendance || 0} competitors</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No season data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button 
              onClick={handleExportData}
              className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </button>
            <button 
              onClick={handleGenerateReport}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Generate Report</span>
            </button>
            <button 
              onClick={() => navigate('/admin/ad-management')}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Manage Ads</span>
            </button>
            <button 
              onClick={() => navigate('/analytics-settings')}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
            >
              <BarChart className="h-4 w-4" />
              <span>Analytics Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 