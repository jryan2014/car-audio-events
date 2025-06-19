import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Heart, Calendar, Eye, DollarSign, Target, Star, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface AnalyticsData {
  totalEvents: number;
  totalUsers: number;
  totalFavorites: number;
  totalAttendance: number;
  totalViews: number;
  adRevenue: number;
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
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    loadAnalytics();
  }, [selectedTimeRange]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (selectedTimeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Fetch analytics data
      const [
        eventsResult,
        usersResult,
        favoritesResult,
        attendanceResult,
        analyticsResult,
        adsResult
      ] = await Promise.all([
        // Total events
        supabase
          .from('events')
          .select('id, title, metadata')
          .gte('created_at', startDate.toISOString()),
        
        // Total users
        supabase
          .from('users')
          .select('id')
          .gte('created_at', startDate.toISOString()),
        
        // Total favorites
        supabase
          .from('event_favorites')
          .select('id')
          .gte('created_at', startDate.toISOString()),
        
        // Total attendance
        supabase
          .from('event_attendance')
          .select('id')
          .eq('attendance_status', 'attended')
          .gte('created_at', startDate.toISOString()),
        
        // Analytics events
        supabase
          .from('event_analytics')
          .select('*')
          .gte('created_at', startDate.toISOString()),
        
        // Ad revenue
        supabase
          .from('advertisements')
          .select('budget_amount, click_count, impression_count')
          .eq('status', 'active')
      ]);

      // Process the data
      const events = eventsResult.data || [];
      const totalViews = analyticsResult.data?.filter(a => a.metric_type === 'view').length || 0;
      const adRevenue = adsResult.data?.reduce((sum, ad) => sum + (ad.budget_amount || 0), 0) || 0;

      // Top events by engagement
      const topEvents = events
        .map(event => ({
          id: event.id,
          title: event.title,
          favorites_count: event.metadata?.favorites_count || 0,
          attendance_count: event.metadata?.attendance_count || 0,
          view_count: event.metadata?.view_count || 0
        }))
        .sort((a, b) => (b.favorites_count + b.attendance_count + b.view_count) - (a.favorites_count + a.attendance_count + a.view_count))
        .slice(0, 10);

      // Season statistics
      const seasonStats = events.reduce((acc: any[], event) => {
        const seasonYear = event.metadata?.season_year || new Date().getFullYear();
        const existing = acc.find(s => s.season_year === seasonYear);
        if (existing) {
          existing.event_count++;
          existing.total_attendance += event.metadata?.attendance_count || 0;
        } else {
          acc.push({
            season_year: seasonYear,
            event_count: 1,
            total_attendance: event.metadata?.attendance_count || 0
          });
        }
        return acc;
      }, []).sort((a, b) => b.season_year - a.season_year);

      setAnalytics({
        totalEvents: events.length,
        totalUsers: usersResult.data?.length || 0,
        totalFavorites: favoritesResult.data?.length || 0,
        totalAttendance: attendanceResult.data?.length || 0,
        totalViews,
        adRevenue,
        topEvents,
        userEngagement: [], // Would implement daily/weekly breakdown
        seasonStats
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                <p className="text-gray-400 text-sm">Engagement Rate</p>
                <p className="text-2xl font-bold text-white">
                  {analytics?.totalEvents ? 
                    ((analytics.totalFavorites + analytics.totalAttendance) / analytics.totalEvents * 100).toFixed(1) + '%'
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
              {analytics?.topEvents.map((event, index) => (
                <div key={event.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-electric-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">{event.title}</p>
                      <p className="text-gray-400 text-sm">
                        {event.favorites_count} favorites • {event.attendance_count} attended
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{event.view_count}</p>
                    <p className="text-gray-400 text-sm">views</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Season Statistics */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-electric-500" />
              <span>Season Statistics</span>
            </h2>
            
            <div className="space-y-4">
              {analytics?.seasonStats.map((season) => (
                <div key={season.season_year} className="p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-medium">{season.season_year} Season</h3>
                    <span className="text-electric-400 font-bold">{season.event_count} events</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Total Attendance</span>
                    <span className="text-white">{season.total_attendance} competitors</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors">
              Export Data
            </button>
            <button className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
              Generate Report
            </button>
            <button className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
              Manage Ads
            </button>
            <button className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
              View Detailed Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 