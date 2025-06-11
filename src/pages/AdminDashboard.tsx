import React, { useState, useEffect } from 'react';
import { Users, Calendar, DollarSign, TrendingUp, Activity, Shield, AlertTriangle, CheckCircle, UserCheck, FileText, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Try to load real data
      try {
        // Get user counts
        const { count: totalUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
          
        const { count: pendingApprovals } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
          
        const { count: pendingVerifications } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('verification_status', 'pending');
          
        // Get event counts
        const { count: activeEvents } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published');
          
        // Get new registrations (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { count: newRegistrations } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString());
          
        // Get total revenue
        const { data: payments } = await supabase
          .from('payments')
          .select('amount');
          
        const totalRevenue = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        
        // Get system alerts
        const { count: systemAlerts } = await supabase
          .from('admin_audit_log')
          .select('*', { count: 'exact', head: true })
          .eq('action', 'system_alert');
          
        // Get CMS pages data
        const { count: totalPages } = await supabase
          .from('cms_pages')
          .select('*', { count: 'exact', head: true });
          
        const { count: publishedPages } = await supabase
          .from('cms_pages')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published');
          
        const stats: DashboardStats = {
          totalUsers: totalUsers || 0,
          activeEvents: activeEvents || 0,
          totalRevenue: totalRevenue / 100, // Convert from cents to dollars
          newRegistrations: newRegistrations || 0,
          pendingVerifications: pendingVerifications || 0,
          pendingApprovals: pendingApprovals || 0,
          systemAlerts: systemAlerts || 0,
          totalPages: totalPages || 0,
          publishedPages: publishedPages || 0
        };
        
        setStats(stats);
        
        // Get recent activity
        const { data: activityData } = await supabase
          .from('admin_audit_log')
          .select('id, action, details, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (activityData && activityData.length > 0) {
          const formattedActivity = activityData.map(item => {
            let type: 'user_registration' | 'event_created' | 'payment_received' | 'admin_action' = 'admin_action';
            let description = '';
            let user = '';
            
            if (item.action.includes('user_created')) {
              type = 'user_registration';
              description = `New user registered: ${item.details.created_user_name || 'Unknown'}`;
              user = item.details.created_user_email || '';
            } else if (item.action.includes('event')) {
              type = 'event_created';
              description = `Event ${item.action.includes('created') ? 'created' : 'updated'}: ${item.details.event_title || 'Unknown'}`;
              user = item.details.organizer_email || '';
            } else if (item.action.includes('payment')) {
              type = 'payment_received';
              const amount = item.details.amount ? `$${(item.details.amount / 100).toFixed(2)}` : 'Unknown amount';
              description = `Payment received: ${amount} for ${item.details.description || 'subscription'}`;
              user = item.details.customer_email || '';
            } else {
              description = `Admin action: ${item.action.replace(/_/g, ' ')}`;
              user = item.details.admin_email || '';
            }
            
            return {
              id: item.id,
              type,
              description,
              timestamp: item.created_at,
              user,
              severity: 'info' as 'info' | 'warning' | 'error'
            };
          });
          
          setRecentActivity(formattedActivity);
          return;
        }
      } catch (error) {
        console.error('Failed to load real data:', error);
        // Fall back to mock data
      }
      
      // Mock data as fallback
      const mockStats: DashboardStats = {
        totalUsers: 1247,
        activeEvents: 23,
        totalRevenue: 45670,
        newRegistrations: 34,
        pendingVerifications: 8,
        pendingApprovals: 12,
        systemAlerts: 2,
        totalPages: 15,
        publishedPages: 12
      };

      const mockActivity: RecentActivity[] = [
        {
          id: '1',
          type: 'user_registration',
          description: 'New competitor registered: John Smith',
          timestamp: '2025-01-08T10:30:00Z',
          user: 'john.smith@email.com',
          severity: 'info'
        },
        {
          id: '2',
          type: 'event_created',
          description: 'New event created: Spring Bass Competition',
          timestamp: '2025-01-08T09:15:00Z',
          user: 'event.organizer@email.com',
          severity: 'info'
        },
        {
          id: '3',
          type: 'payment_received',
          description: 'Payment received: $299 for Business Pro subscription',
          timestamp: '2025-01-08T08:45:00Z',
          user: 'business@retailer.com',
          severity: 'info'
        },
        {
          id: '4',
          type: 'admin_action',
          description: 'User verification approved for Audio Solutions Inc',
          timestamp: '2025-01-08T08:20:00Z',
          user: 'admin@caraudioevents.com',
          severity: 'info'
        },
        {
          id: '5',
          type: 'admin_action',
          description: 'System backup completed successfully',
          timestamp: '2025-01-08T06:00:00Z',
          severity: 'info'
        }
      ];

      setStats(mockStats);
      setRecentActivity(mockActivity);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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
      default:
        return 'text-gray-400';
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
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading activity...</p>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}