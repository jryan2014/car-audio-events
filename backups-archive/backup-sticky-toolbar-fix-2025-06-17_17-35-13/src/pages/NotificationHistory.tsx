import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  Search, 
  Filter, 
  Check, 
  CheckCheck, 
  Trash2, 
  Settings,
  Calendar,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Archive,
  Download,
  MoreVertical
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  notificationService, 
  NotificationWithType 
} from '../services/notificationService';

// ================================
// NOTIFICATION HISTORY PAGE
// ================================

export default function NotificationHistory() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationWithType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const itemsPerPage = 25;

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [notificationsData, count] = await Promise.all([
        notificationService.getUserNotifications(
          user.id, 
          filter === 'unread',
          itemsPerPage,
          (currentPage - 1) * itemsPerPage
        ),
        notificationService.getUnreadCount(user.id)
      ]);

      let filteredData = notificationsData;

      // Apply search filter
      if (searchTerm) {
        filteredData = notificationsData.filter(n => 
          n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          n.message.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply read/unread filter
      if (filter === 'read') {
        filteredData = filteredData.filter(n => n.is_read);
      }

      // Apply sorting
      filteredData.sort((a, b) => {
        switch (sortBy) {
          case 'oldest':
            return new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime();
          case 'priority':
            return b.priority - a.priority;
          default: // newest
            return new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime();
        }
      });

      setNotifications(filteredData);
      setTotalCount(filteredData.length);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, filter, searchTerm, sortBy, currentPage]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const handleSelectOne = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkMarkAsRead = async () => {
    if (!user || selectedIds.size === 0) return;

    const promises = Array.from(selectedIds).map(id => 
      notificationService.markAsRead(id, user.id)
    );

    try {
      await Promise.all(promises);
      setSelectedIds(new Set());
      loadNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedIds.size === 0) return;

    const promises = Array.from(selectedIds).map(id => 
      notificationService.dismissNotification(id, user.id)
    );

    try {
      await Promise.all(promises);
      setSelectedIds(new Set());
      loadNotifications();
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    try {
      await notificationService.markAllAsRead(user.id);
      loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Individual actions
  const handleMarkAsRead = async (id: number) => {
    if (!user) return;

    try {
      await notificationService.markAsRead(id, user.id);
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!user) return;

    try {
      await notificationService.dismissNotification(id, user.id);
      loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Utility functions
  const getIcon = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      Megaphone: Bell,
      Calendar,
      Heart: Bell,
      MessageSquare: Bell,
      Award: Bell,
      Bell,
      Clock,
      AlertCircle
    };
    
    const IconComponent = iconMap[iconName] || Bell;
    return <IconComponent className="h-4 w-4" />;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5: return 'text-red-500';
      case 4: return 'text-orange-500';
      case 3: return 'text-yellow-500';
      case 2: return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 5: return 'Critical';
      case 4: return 'High';
      case 3: return 'Medium';
      case 2: return 'Low';
      default: return 'Info';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-white text-center">
          <Bell className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-400">Please log in to view your notifications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Notification Center</h1>
              <p className="text-gray-400">
                Manage your notifications and preferences
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                    {unreadCount} unread
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
              <button
                onClick={loadNotifications}
                className="px-4 py-2 bg-electric-600 hover:bg-electric-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-500"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-700 rounded-lg p-1">
                {['all', 'unread', 'read'].map((filterOption) => (
                  <button
                    key={filterOption}
                    onClick={() => setFilter(filterOption as any)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      filter === filterOption
                        ? 'bg-electric-500 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                    {filterOption === 'unread' && unreadCount > 0 && (
                      <span className="ml-1 bg-red-500 text-white px-1 rounded-full text-xs">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="bg-electric-500/10 border border-electric-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-electric-300">
                {selectedIds.size} notification{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBulkMarkAsRead}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors flex items-center space-x-1"
                >
                  <Check className="h-3 w-3" />
                  <span>Mark Read</span>
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors flex items-center space-x-1"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <div className="w-4 h-4 border border-gray-500 rounded flex items-center justify-center">
                {selectedIds.size === notifications.length && notifications.length > 0 && (
                  <Check className="h-3 w-3 text-electric-500" />
                )}
              </div>
              <span className="text-sm">Select All</span>
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center space-x-2 text-electric-400 hover:text-electric-300 transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
              <span className="text-sm">Mark All as Read</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-electric-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </h3>
              <p className="text-gray-400">
                {filter === 'unread' 
                  ? 'You\'re all caught up!'
                  : 'Notifications will appear here when you receive them.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-700/30 transition-colors ${
                    !notification.is_read ? 'bg-gray-700/20' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Selection Checkbox */}
                    <button
                      onClick={() => handleSelectOne(notification.id)}
                      className="mt-1 w-4 h-4 border border-gray-500 rounded flex items-center justify-center hover:border-electric-500 transition-colors"
                    >
                      {selectedIds.has(notification.id) && (
                        <Check className="h-3 w-3 text-electric-500" />
                      )}
                    </button>

                    {/* Icon */}
                    <div 
                      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-1"
                      style={{ 
                        backgroundColor: `${notification.notification_color}20`, 
                        color: notification.notification_color 
                      }}
                    >
                      {getIcon(notification.notification_icon)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className={`font-medium ${
                              notification.is_read ? 'text-gray-300' : 'text-white'
                            }`}>
                              {notification.title}
                            </h3>
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-electric-500 rounded-full"></span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(notification.priority)} bg-current bg-opacity-20`}>
                              {getPriorityLabel(notification.priority)}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTimeAgo(notification.sent_at)}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: notification.notification_color }}></span>
                              <span>{notification.notification_type.replace('_', ' ')}</span>
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 ml-4">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-2 text-gray-500 hover:text-green-500 transition-colors"
                              title="Mark as read"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          {notification.action_url && (
                            <a
                              href={notification.action_url}
                              className="p-2 text-gray-500 hover:text-electric-500 transition-colors"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalCount > itemsPerPage && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} to{' '}
              {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} notifications
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                Previous
              </button>
              <span className="text-gray-400 text-sm">
                Page {currentPage} of {Math.ceil(totalCount / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / itemsPerPage), prev + 1))}
                disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 