import React, { useState, useEffect } from 'react';
import { Activity, Search, Filter, Trash2, Calendar, Users, Shield, Settings, FileText, DollarSign, TrendingUp, Eye, RefreshCw, Download, Clock, User, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ActivityItem {
  id: string;
  activity_type: string;
  description: string;
  user_email: string;
  user_name: string;
  metadata: any;
  created_at: string;
}

interface EnhancedRecentActivityProps {
  limit?: number;
  showControls?: boolean;
  className?: string;
}

export const EnhancedRecentActivity: React.FC<EnhancedRecentActivityProps> = ({ 
  limit = 50, 
  showControls = true,
  className = ""
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');
  const [showPurgeOptions, setShowPurgeOptions] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
  }, [limit]);

  useEffect(() => {
    filterActivities();
  }, [activities, searchTerm, activityTypeFilter, dateFilter, userFilter]);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_recent_activity', { 
        limit_count: limit,
        exclude_admin: true // Exclude admin activities to show real user activity
      });

      if (error) {
        throw error;
      }

      setActivities(data || []);
    } catch (error) {
      console.error('Failed to load activities:', error);
      setError(error instanceof Error ? error.message : 'Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = activities.filter(activity => {
      // Search filter
      const matchesSearch = !searchTerm || 
        activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.activity_type.toLowerCase().includes(searchTerm.toLowerCase());

      // Activity type filter
      const matchesType = activityTypeFilter === 'all' || 
        activity.activity_type === activityTypeFilter;

      // User filter
      const matchesUser = !userFilter ||
        activity.user_name?.toLowerCase().includes(userFilter.toLowerCase()) ||
        activity.user_email?.toLowerCase().includes(userFilter.toLowerCase());

      // Date filter
      const matchesDate = (() => {
        if (dateFilter === 'all') return true;
        
        const activityDate = new Date(activity.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case '1h':
            return now.getTime() - activityDate.getTime() <= 60 * 60 * 1000;
          case '24h':
            return now.getTime() - activityDate.getTime() <= 24 * 60 * 60 * 1000;
          case '7d':
            return now.getTime() - activityDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
          case '30d':
            return now.getTime() - activityDate.getTime() <= 30 * 24 * 60 * 60 * 1000;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesType && matchesUser && matchesDate;
    });

    setFilteredActivities(filtered);
  };

  const purgeOldActivities = async (days: number) => {
    try {
      // Call the function with the days_to_keep parameter
      const { data, error } = await supabase.rpc('purge_old_activity_logs', {
        days_to_keep: days
      });

      if (error) {
        throw error;
      }

      const deletedCount = data?.deleted_count || 0;
      await loadActivities();
      setShowPurgeOptions(false);
      setPurgeConfirm('');
      
      // Show success message
      alert(`Successfully purged ${deletedCount} activity records older than ${days} days.`);
    } catch (error) {
      console.error('Failed to purge activities:', error);
      setError(error instanceof Error ? error.message : 'Failed to purge activities');
    }
  };

  const exportActivities = () => {
    const csvContent = [
      'Date,Time,Activity Type,Description,User Name,User Email',
      ...filteredActivities.map(activity => {
        const date = new Date(activity.created_at);
        return `"${date.toLocaleDateString()}","${date.toLocaleTimeString()}","${activity.activity_type}","${activity.description}","${activity.user_name || ''}","${activity.user_email || ''}"`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_login':
      case 'user_logout':
      case 'user_register':
        return <User className="h-4 w-4" />;
      case 'profile_update':
        return <Users className="h-4 w-4" />;
      case 'event_create':
      case 'event_update':
      case 'event_delete':
      case 'event_register':
        return <Calendar className="h-4 w-4" />;
      case 'payment_success':
      case 'payment_failed':
        return <DollarSign className="h-4 w-4" />;
      case 'refund_request':
        return <RefreshCw className="h-4 w-4" />;
      case 'settings_update':
        return <Settings className="h-4 w-4" />;
      case 'membership_change':
        return <TrendingUp className="h-4 w-4" />;
      case 'directory_create':
      case 'directory_update':
        return <FileText className="h-4 w-4" />;
      case 'system_event':
        return <Shield className="h-4 w-4" />;
      case 'error_event':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_login':
      case 'user_logout':
      case 'user_register':
      case 'profile_update':
        return 'text-blue-400';
      case 'event_create':
      case 'event_update':
      case 'event_delete':
      case 'event_register':
        return 'text-green-400';
      case 'payment_success':
        return 'text-emerald-400';
      case 'payment_failed':
        return 'text-red-400';
      case 'refund_request':
        return 'text-yellow-400';
      case 'settings_update':
        return 'text-orange-400';
      case 'membership_change':
        return 'text-purple-400';
      case 'directory_create':
      case 'directory_update':
        return 'text-cyan-400';
      case 'system_event':
        return 'text-indigo-400';
      case 'error_event':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUniqueActivityTypes = () => {
    const types = [...new Set(activities.map(a => a.activity_type))];
    return types.sort();
  };

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Activity className="h-5 w-5 text-electric-500" />
          <span>Recent Activity</span>
          {filteredActivities.length !== activities.length && (
            <span className="text-sm text-gray-400">({filteredActivities.length} of {activities.length})</span>
          )}
        </h2>
        
        {showControls && (
          <div className="flex items-center space-x-2">
            <button
              onClick={loadActivities}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-gray-300" />
            </button>
            <button
              onClick={exportActivities}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Export CSV"
            >
              <Download className="h-4 w-4 text-gray-300" />
            </button>
            <button
              onClick={() => setShowPurgeOptions(!showPurgeOptions)}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Purge Old Activities"
            >
              <Trash2 className="h-4 w-4 text-gray-300" />
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      {showControls && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 transition-colors text-sm"
            />
          </div>

          {/* Activity Type Filter */}
          <select
            value={activityTypeFilter}
            onChange={(e) => setActivityTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors text-sm"
          >
            <option value="all">All Types</option>
            {getUniqueActivityTypes().map(type => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors text-sm"
          >
            <option value="all">All Time</option>
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* User Filter */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by user..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 transition-colors text-sm"
            />
          </div>
        </div>
      )}

      {/* Purge Options */}
      {showPurgeOptions && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <h3 className="text-red-400 font-semibold mb-3">Purge Old Activities</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => purgeOldActivities(7)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Purge 7+ Days Old
            </button>
            <button
              onClick={() => purgeOldActivities(14)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Purge 14+ Days Old
            </button>
            <button
              onClick={() => purgeOldActivities(30)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Purge 30+ Days Old
            </button>
          </div>
          <p className="text-red-300 text-sm mt-2">
            Warning: This action cannot be undone. Activities will be permanently deleted.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Activity List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading activity...</p>
        </div>
      ) : filteredActivities.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredActivities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
              <div className={`${getActivityColor(activity.activity_type)} mt-1 flex-shrink-0`}>
                {getActivityIcon(activity.activity_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">{activity.description}</p>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-gray-400 text-xs">{formatDate(activity.created_at)}</span>
                  {activity.user_name && (
                    <span className="text-gray-500 text-xs flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{activity.user_name}</span>
                    </span>
                  )}
                                     {activity.activity_type && (
                     <span className="text-gray-300 text-xs px-2 py-0.5 bg-gray-700/50 rounded border border-gray-600/30">
                       {activity.activity_type.replace(/_/g, ' ')}
                     </span>
                   )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No activity found</h3>
          <p className="text-gray-500 text-sm">
            {searchTerm || activityTypeFilter !== 'all' || dateFilter !== 'all' || userFilter
              ? 'Try adjusting your filters to see more results.'
              : 'Activity will appear here as users interact with your platform.'
            }
          </p>
        </div>
      )}
    </div>
  );
}; 