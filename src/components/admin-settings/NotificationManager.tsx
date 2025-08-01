import React, { useState, useEffect } from 'react';
import { Bell, Send, Users, User, Trash2, AlertCircle, CheckCircle, Info, AlertTriangle, Archive } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../NotificationSystem';
import { simpleNotificationService, NOTIFICATION_TYPES } from '../../services/simpleNotificationService';
import NotificationRateLimitStatus from './NotificationRateLimitStatus';

interface NotificationTarget {
  type: 'all' | 'user' | 'membership';
  userId?: string;
  membershipType?: string;
}

export default function NotificationManager() {
  const { showSuccess, showError } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  
  const [notification, setNotification] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error',
    link: '',
    notificationType: '' // For preference checking
  });
  
  const [target, setTarget] = useState<NotificationTarget>({
    type: 'all'
  });
  
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadUsers();
    loadRecentNotifications();
  }, []);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, membership_type')
      .order('name');

    if (!error && data) {
      setUsers(data);
    }
  };

  const loadRecentNotifications = async () => {
    try {
      // Get unique notifications with recipient count using RPC function
      const { data, error } = await supabase.rpc('get_admin_recent_notifications', {
        limit_count: 10
      });

      if (error) {
        // Fallback to direct query if RPC doesn't exist
        console.warn('RPC function not available, using fallback query');
        const fallbackData = await loadRecentNotificationsFallback();
        setRecentNotifications(fallbackData);
        return;
      }

      // Get admin details
      const adminIds = [...new Set(data.map(n => n.created_by).filter(Boolean))];
      const { data: admins } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', adminIds);

      // Map admin details to notifications
      const notificationsWithAdmins = data.map(notif => {
        const admin = admins?.find(a => a.id === notif.created_by);
        return {
          ...notif,
          admin: admin
        };
      });

      setRecentNotifications(notificationsWithAdmins);
    } catch (error) {
      console.error('Error loading recent notifications:', error);
      const fallbackData = await loadRecentNotificationsFallback();
      setRecentNotifications(fallbackData);
    }
  };

  const loadRecentNotificationsFallback = async () => {
    // Fallback method - get distinct notifications by title, message, type
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .not('created_by', 'is', null) // Only admin-created notifications
      .order('created_at', { ascending: false })
      .limit(50); // Get more to filter

    if (error || !data) return [];

    // Group by unique content
    const uniqueNotifications = new Map();
    
    for (const notif of data) {
      const key = `${notif.title}|${notif.message}|${notif.type}`;
      const existing = uniqueNotifications.get(key);
      
      if (!existing || new Date(notif.created_at) > new Date(existing.created_at)) {
        uniqueNotifications.set(key, notif);
      }
    }

    // Get recipient counts and admin details
    const results = await Promise.all(
      Array.from(uniqueNotifications.values()).slice(0, 10).map(async (notif) => {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('title', notif.title)
          .eq('message', notif.message)
          .eq('type', notif.type);

        const { data: admin } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', notif.created_by)
          .single();

        return {
          ...notif,
          recipient_count: count || 0,
          admin: admin
        };
      })
    );

    return results;
  };

  const handleSendNotification = async () => {
    if (!notification.title || !notification.message) {
      showError('Validation Error', 'Title and message are required');
      return;
    }

    setLoading(true);
    try {
      let targetUsers: string[] = [];

      // Determine target users based on selection
      if (target.type === 'all') {
        const { data } = await supabase
          .from('users')
          .select('id');
        targetUsers = data?.map(u => u.id) || [];
      } else if (target.type === 'user' && target.userId) {
        targetUsers = [target.userId];
      } else if (target.type === 'membership' && target.membershipType) {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('membership_type', target.membershipType);
        targetUsers = data?.map(u => u.id) || [];
      }

      if (targetUsers.length === 0) {
        showError('No Recipients', 'No users match the selected criteria');
        return;
      }

      // Get current user ID first
      const { data: currentUserData } = await supabase.auth.getUser();
      const createdBy = currentUserData.user?.id;

      // Create notifications for all target users with preference checking
      let sentCount = 0;
      let skippedCount = 0;

      for (const userId of targetUsers) {
        const notificationData = {
          user_id: userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          link: notification.link || null,
          read: false,
          created_by: createdBy
        };

        if (notification.notificationType) {
          // Check user preference before sending
          const userWants = await simpleNotificationService.checkUserWantsNotification(
            userId,
            notification.notificationType
          );
          
          if (!userWants) {
            skippedCount++;
            continue;
          }
        }

        const { error } = await supabase
          .from('notifications')
          .insert(notificationData);

        if (!error) {
          sentCount++;
        }
      }

      let message = `Sent to ${sentCount} user${sentCount !== 1 ? 's' : ''}`;
      if (skippedCount > 0) {
        message += ` (${skippedCount} opted out)`;
      }
      
      showSuccess('Notifications Sent', message);

      // Reset form
      setNotification({
        title: '',
        message: '',
        type: 'info',
        link: '',
        notificationType: ''
      });
      setTarget({ type: 'all' });
      
      // Reload recent notifications
      loadRecentNotifications();
    } catch (error: any) {
      showError('Failed to Send', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (notif: any) => {
    const recipientText = notif.recipient_count > 1 
      ? `all ${notif.recipient_count} copies of this notification`
      : 'this notification';
    
    if (!confirm(`Are you sure you want to delete ${recipientText}?`)) return;

    try {
      // Delete all notifications with the same title, message, type, and created_by
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('title', notif.title)
        .eq('message', notif.message)
        .eq('type', notif.type)
        .eq('created_by', notif.created_by);

      if (error) {
        showError('Delete Failed', error.message);
      } else {
        const deletedText = notif.recipient_count > 1 
          ? `Deleted ${notif.recipient_count} notifications`
          : 'Deleted notification';
        showSuccess('Deleted', deletedText);
        loadRecentNotifications();
      }
    } catch (error: any) {
      showError('Delete Failed', error.message);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-400" />;
      default: return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const handleArchiveOldNotifications = async () => {
    setArchiveLoading(true);
    try {
      const archivedCount = await simpleNotificationService.archiveOldNotifications();
      showSuccess(
        'Archive Complete',
        `Archived ${archivedCount} old notification${archivedCount !== 1 ? 's' : ''}`
      );
      loadRecentNotifications();
    } catch (error: any) {
      showError('Archive Failed', error.message);
    } finally {
      setArchiveLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Bell className="h-6 w-6 text-electric-500" />
        <h2 className="text-2xl font-bold text-white">Notification Manager</h2>
      </div>

      {/* Rate Limit Status */}
      <NotificationRateLimitStatus />

      {/* Create Notification Form */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Send Notification</h3>
        
        <div className="space-y-4">
          {/* Target Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Send To</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={target.type === 'all'}
                  onChange={() => setTarget({ type: 'all' })}
                  className="text-electric-500"
                />
                <span className="text-gray-300">All Users</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={target.type === 'user'}
                  onChange={() => setTarget({ type: 'user' })}
                  className="text-electric-500"
                />
                <span className="text-gray-300">Specific User</span>
              </label>
              
              {target.type === 'user' && (
                <select
                  value={target.userId || ''}
                  onChange={(e) => setTarget({ ...target, userId: e.target.value })}
                  className="ml-6 w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Select a user...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email} ({user.membership_type})
                    </option>
                  ))}
                </select>
              )}
              
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={target.type === 'membership'}
                  onChange={() => setTarget({ type: 'membership' })}
                  className="text-electric-500"
                />
                <span className="text-gray-300">By Membership Type</span>
              </label>
              
              {target.type === 'membership' && (
                <select
                  value={target.membershipType || ''}
                  onChange={(e) => setTarget({ ...target, membershipType: e.target.value })}
                  className="ml-6 w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Select membership type...</option>
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="admin">Admin</option>
                </select>
              )}
            </div>
          </div>

          {/* Notification Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <select
              value={notification.type}
              onChange={(e) => setNotification({ ...notification, type: e.target.value as any })}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
            <input
              type="text"
              value={notification.title}
              onChange={(e) => setNotification({ ...notification, title: e.target.value })}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Notification title..."
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Message *</label>
            <textarea
              value={notification.message}
              onChange={(e) => setNotification({ ...notification, message: e.target.value })}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              rows={3}
              placeholder="Notification message..."
            />
          </div>

          {/* Link */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Link (optional)</label>
            <input
              type="text"
              value={notification.link}
              onChange={(e) => setNotification({ ...notification, link: e.target.value })}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="/events/123"
            />
            <p className="text-xs text-gray-400 mt-1">
              Add a link for users to click. Use relative paths like /events or /profile
            </p>
          </div>

          {/* Notification Category (for preferences) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notification Category (optional)</label>
            <select
              value={notification.notificationType}
              onChange={(e) => setNotification({ ...notification, notificationType: e.target.value })}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="">No category (always send)</option>
              <option value={NOTIFICATION_TYPES.EVENT_REMINDERS}>Event Reminders</option>
              <option value={NOTIFICATION_TYPES.COMPETITION_RESULTS}>Competition Results</option>
              <option value={NOTIFICATION_TYPES.TEAM_INVITATIONS}>Team Invitations</option>
              <option value={NOTIFICATION_TYPES.SYSTEM_UPDATES}>System Updates</option>
              <option value={NOTIFICATION_TYPES.MARKETING}>Marketing</option>
              <option value={NOTIFICATION_TYPES.NEWSLETTER}>Newsletter</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              If selected, only users who have opted in to this category will receive the notification
            </p>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendNotification}
            disabled={loading || !notification.title || !notification.message}
            className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>{loading ? 'Sending...' : 'Send Notification'}</span>
          </button>
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Notifications</h3>
          <button
            onClick={handleArchiveOldNotifications}
            disabled={archiveLoading}
            className="bg-gray-700 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
          >
            <Archive className="h-4 w-4" />
            <span>{archiveLoading ? 'Archiving...' : 'Archive Old'}</span>
          </button>
        </div>
        
        {recentNotifications.length > 0 ? (
          <div className="space-y-3">
            {recentNotifications.map((notif) => (
              <div key={notif.id} className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getTypeIcon(notif.type)}
                    <div>
                      <h4 className="text-white font-medium">{notif.title}</h4>
                      <p className="text-gray-300 text-sm mt-1">{notif.message}</p>
                      {notif.link && (
                        <p className="text-electric-400 text-sm mt-1">Link: {notif.link}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-2">
                        Sent to: {notif.recipient_count} user{notif.recipient_count !== 1 ? 's' : ''} • 
                        By: {notif.admin?.name || notif.admin?.email || 'Unknown Admin'} • 
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteNotification(notif)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                    title={`Delete notification sent to ${notif.recipient_count} user${notif.recipient_count !== 1 ? 's' : ''}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No recent notifications</p>
        )}
      </div>
    </div>
  );
}