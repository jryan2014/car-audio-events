import React, { useState, useEffect } from 'react';
import { Bell, Send, Users, User, Trash2, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../NotificationSystem';

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
    link: ''
  });
  
  const [target, setTarget] = useState<NotificationTarget>({
    type: 'all'
  });

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
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      // Fetch user details separately
      const userIds = [...new Set(data.map(n => n.user_id))];
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds);

      // Map user details to notifications
      const notificationsWithUsers = data.map(notif => {
        const user = users?.find(u => u.id === notif.user_id);
        return {
          ...notif,
          users: user
        };
      });

      setRecentNotifications(notificationsWithUsers);
    }
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

      // Create notifications for all target users
      const notifications = targetUsers.map(userId => ({
        user_id: userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link || null,
        read: false,
        created_by: createdBy
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      showSuccess(
        'Notifications Sent',
        `Successfully sent notification to ${targetUsers.length} user${targetUsers.length > 1 ? 's' : ''}`
      );

      // Reset form
      setNotification({
        title: '',
        message: '',
        type: 'info',
        link: ''
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

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Delete Failed', error.message);
    } else {
      showSuccess('Deleted', 'Notification deleted successfully');
      loadRecentNotifications();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Bell className="h-6 w-6 text-electric-500" />
        <h2 className="text-2xl font-bold text-white">Notification Manager</h2>
      </div>

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
        <h3 className="text-lg font-semibold text-white mb-4">Recent Notifications</h3>
        
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
                        Sent to: {notif.users?.name || notif.users?.email || 'Unknown'} • 
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteNotification(notif.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
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