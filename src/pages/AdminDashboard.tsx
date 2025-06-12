import React, { useState, useEffect } from 'react';
import { Users, Calendar, DollarSign, TrendingUp, Activity, Shield, AlertTriangle, CheckCircle, UserCheck, FileText, Target, Settings, Archive, Mail, Building2, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ActivityLogger } from '../utils/activityLogger';

interface DashboardStats {
  totalUsers: number;
  activeEvents: number;
  totalRevenue: number;
  newRegistrations: number;
  pendingVerifications: number;
  systemAlerts: number;
  pendingApprovals: number;
  totalPages: number;
  publishedPages: number;
}

interface RecentActivity {
  id: string;
  type: 'user_registration' | 'event_created' | 'payment_received' | 'admin_action';
  description: string;
  timestamp: string;
  user?: string;
  severity?: 'info' | 'warning' | 'error';
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeEvents: 0,
    totalRevenue: 0,
    newRegistrations: 0,
    pendingVerifications: 0,
    systemAlerts: 0,
    pendingApprovals: 0,
    totalPages: 0,
    publishedPages: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    console.log('AdminDashboard: Redirecting non-admin user:', user?.membershipType);
    return <Navigate to="/\" replace />;
  }

  console.log('AdminDashboard: Admin user detected:', user.email, user.membershipType);

  useEffect(() => {
    loadDashboardData();
    // Log dashboard access
    ActivityLogger.adminDashboardAccess();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Try to load real dashboard data
      const [usersResult, eventsResult, revenueResult] = await Promise.allSettled([
        supabase.from('users').select('id, status, created_at').limit(1000),
        supabase.from('events').select('id, status, created_at').limit(1000),
        // Add revenue queries when payment system is implemented
        Promise.resolve({ data: null, error: null })
      ]);

      let realStats: Partial<DashboardStats> = {};
      
      if (usersResult.status === 'fulfilled' && usersResult.value.data) {
        const users = usersResult.value.data;
        realStats.totalUsers = users.length;
        realStats.newRegistrations = users.filter(user => {
          const createdAt = new Date(user.created_at);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return createdAt >= thirtyDaysAgo;
        }).length;
      }

      if (eventsResult.status === 'fulfilled' && eventsResult.value.data) {
        const events = eventsResult.value.data;
        realStats.activeEvents = events.filter(event => event.status === 'published').length;
      }

      // Try to load CMS pages
      const { data: pagesData } = await supabase.from('cms_pages').select('id, status');
      if (pagesData) {
        realStats.totalPages = pagesData.length;
        realStats.publishedPages = pagesData.filter(page => page.status === 'published').length;
      }

      // Set real stats or defaults for missing data
      const finalStats: DashboardStats = {
        totalUsers: realStats.totalUsers ?? 0,
        activeEvents: realStats.activeEvents ?? 0,
        totalRevenue: realStats.totalRevenue ?? 0, // Will be 0 until payment system is implemented
        newRegistrations: realStats.newRegistrations ?? 0,
        pendingVerifications: 0, // TODO: Implement verification system
        pendingApprovals: 0, // TODO: Implement approval system  
        systemAlerts: 0, // TODO: Implement alert system
        totalPages: realStats.totalPages ?? 0,
        publishedPages: realStats.publishedPages ?? 0
      };

      setStats(finalStats);

      // Load recent activity from audit logs
      try {
        const { data: activityData, error: activityError } = await supabase
          .rpc('get_recent_activity', { limit_count: 10 });
        
        if (activityError) {
          console.error('Failed to load activity data:', activityError);
          setRecentActivity([]);
        } else if (activityData) {
          // Transform the data to match our interface
          const transformedActivity: RecentActivity[] = activityData.map((activity: any) => ({
            id: activity.id,
            type: activity.activity_type,
            description: activity.description,
            timestamp: activity.created_at,
            user: activity.user_name || activity.user_email || 'Unknown User',
            severity: getSeverityFromType(activity.activity_type)
          }));
          setRecentActivity(transformedActivity);
        } else {
          setRecentActivity([]);
        }
      } catch (activityLoadError) {
        console.error('Failed to load recent activity:', activityLoadError);
        setRecentActivity([]);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set empty/default stats instead of mock data
      setStats({
        totalUsers: 0,
        activeEvents: 0,
        totalRevenue: 0,
        newRegistrations: 0,
        pendingVerifications: 0,
        pendingApprovals: 0,
        systemAlerts: 0,
        totalPages: 0,
        publishedPages: 0
      });
      setRecentActivity([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <Users className="h-4 w-4" />;
      case 'event_created':
        return <Calendar className="h-4 w-4" />;
      case 'payment_received':
        return <DollarSign className="h-4 w-4" />;
      case 'admin_action':
        return <Shield className="h-4 w-4" />;
      case 'cms_page_created':
      case 'cms_page_updated':
        return <FileText className="h-4 w-4" />;
      case 'system_startup':
      case 'system_maintenance':
        return <Settings className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_registration':
        return 'text-blue-400';
      case 'event_created':
        return 'text-green-400';
      case 'payment_received':
        return 'text-electric-400';
      case 'admin_action':
        return 'text-purple-400';
      case 'cms_page_created':
      case 'cms_page_updated':
        return 'text-orange-400';
      case 'system_startup':
      case 'system_maintenance':
        return 'text-cyan-400';
      default:
        return 'text-gray-400';
    }
  };

  const getSeverityFromType = (type: string): 'info' | 'warning' | 'error' => {
    switch (type) {
      case 'system_startup':
      case 'system_maintenance':
      case 'user_registration':
      case 'event_created':
      case 'cms_page_created':
      case 'cms_page_updated':
        return 'info';
      case 'admin_action':
        return 'warning';
      case 'payment_received':
        return 'info';
      default:
        return 'info';
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-electric-500 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-400">Welcome back, {user.name}</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-electric-500/10 to-purple-500/10 border border-electric-500/20 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-green-400 font-medium">System Status: All systems operational</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Events</p>
                <p className="text-2xl font-bold text-white">{stats.activeEvents}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-electric-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">New Registrations</p>
                <p className="text-2xl font-bold text-white">{stats.newRegistrations}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Approvals</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pendingApprovals}</p>
              </div>
              <UserCheck className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Verifications</p>
                <p className="text-2xl font-bold text-red-400">{stats.pendingVerifications}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">CMS Pages</p>
                <p className="text-2xl font-bold text-white">{stats.totalPages}</p>
                <p className="text-xs text-gray-500">{stats.publishedPages} published</p>
              </div>
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link
            to="/admin/users"
            className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-6 hover:from-blue-500/30 hover:to-blue-600/30 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-blue-400 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="text-white font-semibold">Manage Users</h3>
                <p className="text-gray-400 text-sm">View and manage user accounts</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/users?status=pending"
            className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-xl p-6 hover:from-yellow-500/30 hover:to-yellow-600/30 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <UserCheck className="h-8 w-8 text-yellow-400 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="text-white font-semibold">Approve Users</h3>
                <p className="text-gray-400 text-sm">Review and approve new registrations</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/settings"
            className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-6 hover:from-purple-500/30 hover:to-purple-600/30 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-purple-400 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="text-white font-semibold">System Settings</h3>
                <p className="text-gray-400 text-sm">Configure platform settings</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/membership"
            className="bg-gradient-to-br from-electric-500/20 to-electric-600/20 border border-electric-500/30 rounded-xl p-6 hover:from-electric-500/30 hover:to-electric-600/30 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-electric-400 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="text-white font-semibold">Membership Plans</h3>
                <p className="text-gray-400 text-sm">Manage subscription plans</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/events"
            className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-6 hover:from-green-500/30 hover:to-green-600/30 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-green-400 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="text-white font-semibold">Manage Events</h3>
                <p className="text-gray-400 text-sm">Review and manage events</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/cms-pages"
            className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl p-6 hover:from-orange-500/30 hover:to-orange-600/30 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-orange-400 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="text-white font-semibold">CMS Pages</h3>
                <p className="text-gray-400 text-sm">{stats.publishedPages} published, {stats.totalPages - stats.publishedPages} drafts</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/ad-management"
            className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 border border-pink-500/30 rounded-xl p-6 hover:from-pink-500/30 hover:to-pink-600/30 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <Target className="h-8 w-8 text-pink-400 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="text-white font-semibold">Advertisement Management</h3>
                <p className="text-gray-400 text-sm">Create and manage ad campaigns</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/system-configuration"
            className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 border border-indigo-500/30 rounded-xl p-6 hover:from-indigo-500/30 hover:to-indigo-600/30 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <Settings className="h-8 w-8 text-indigo-400 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="text-white font-semibold">System Configuration</h3>
                <p className="text-gray-400 text-sm">Manage configurable options and form fields</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/backup"
            className="bg-gradient-to-br from-gray-500/20 to-gray-600/20 border border-gray-500/30 rounded-xl p-6 hover:from-gray-500/30 hover:to-gray-600/30 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <Archive className="h-8 w-8 text-gray-400 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="text-white font-semibold">Backup Management</h3>
                <p className="text-gray-400 text-sm">Create and manage database backups</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/contact-settings"
            className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 rounded-xl p-6 hover:from-cyan-500/30 hover:to-cyan-600/30 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <Mail className="h-8 w-8 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="text-white font-semibold">Contact Settings</h3>
                <p className="text-gray-400 text-sm">Configure footer contact information</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/organizations"
            className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-xl p-6 hover:from-emerald-500/30 hover:to-emerald-600/30 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="text-white font-semibold">Organizations</h3>
                <p className="text-gray-400 text-sm">Manage platform organizations</p>
              </div>
            </div>
          </Link>

          <Link
            to="/admin/navigation-manager"
            className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 border border-indigo-500/30 rounded-xl p-6 hover:from-indigo-500/30 hover:to-indigo-600/30 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <Menu className="h-8 w-8 text-indigo-400 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="text-white font-semibold">Navigation Manager</h3>
                <p className="text-gray-400 text-sm">Manage website navigation and menus</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading activity...</p>
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-4 bg-gray-700/30 rounded-lg">
                  <div className={`${getActivityColor(activity.type)} mt-1`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.description}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-gray-400 text-xs">{formatDate(activity.timestamp)}</span>
                      {activity.user && (
                        <span className="text-gray-500 text-xs">{activity.user}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No recent activity</h3>
              <p className="text-gray-500 text-sm">
                Activity will appear here as users interact with your platform.
                <br />
                Start by creating some test events or inviting users to register.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}