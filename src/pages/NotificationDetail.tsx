import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Clock, CheckCircle, AlertCircle, AlertTriangle, Info, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { simpleNotificationService, SimpleNotification } from '../services/simpleNotificationService';
import { notificationService } from '../services/notificationService';

export default function NotificationDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;

    loadNotification();
  }, [user, id]);

  const loadNotification = async () => {
    if (!user || !id) return;

    setLoading(true);
    setError(null);

    try {
      // Try to load from simple notifications first
      if (id.startsWith('simple_')) {
        const simpleId = id.replace('simple_', '');
        const notifications = await simpleNotificationService.getUserNotifications(user.id, false, 100);
        const found = notifications.find(n => n.id === simpleId);
        
        if (found) {
          setNotification({
            ...found,
            displayId: id,
            source: 'simple'
          });
          
          // Mark as read if not already
          if (!found.read) {
            await simpleNotificationService.markAsRead(simpleId);
          }
        } else {
          setError('Notification not found');
        }
      } else if (id.startsWith('complex_')) {
        const complexId = Number(id.replace('complex_', ''));
        const notifications = await notificationService.getUserNotifications(user.id, false, 100, 0);
        const found = notifications.find(n => n.id === complexId);
        
        if (found) {
          setNotification({
            ...found,
            displayId: id,
            source: 'complex'
          });
          
          // Mark as read if not already
          if (!found.is_read) {
            await notificationService.markAsRead(complexId, user.id);
          }
        } else {
          setError('Notification not found');
        }
      } else {
        // Try simple notifications with direct ID
        const notifications = await simpleNotificationService.getUserNotifications(user.id, false, 100);
        const found = notifications.find(n => n.id === id);
        
        if (found) {
          setNotification({
            ...found,
            displayId: id,
            source: 'simple'
          });
          
          // Mark as read if not already
          if (!found.read) {
            await simpleNotificationService.markAsRead(id);
          }
        } else {
          setError('Notification not found');
        }
      }
    } catch (err) {
      console.error('Error loading notification:', err);
      setError('Failed to load notification');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    if (!notification) return null;

    if (notification.source === 'simple') {
      switch (notification.type) {
        case 'success':
          return <CheckCircle className="h-8 w-8 text-green-400" />;
        case 'warning':
          return <AlertTriangle className="h-8 w-8 text-yellow-400" />;
        case 'error':
          return <AlertCircle className="h-8 w-8 text-red-400" />;
        default:
          return <Info className="h-8 w-8 text-blue-400" />;
      }
    }

    // For complex notifications, you'd handle the icon mapping here
    return <Info className="h-8 w-8 text-blue-400" />;
  };

  const getNotificationColor = () => {
    if (!notification) return '#3b82f6';

    if (notification.source === 'simple') {
      switch (notification.type) {
        case 'success': return '#10b981';
        case 'warning': return '#f59e0b';
        case 'error': return '#ef4444';
        default: return '#3b82f6';
      }
    }

    return notification.notification_color || '#6366f1';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleDelete = async () => {
    if (!notification || !user) return;

    if (confirm('Are you sure you want to delete this notification?')) {
      try {
        if (notification.source === 'simple') {
          const simpleId = notification.displayId.includes('simple_') 
            ? notification.displayId.replace('simple_', '') 
            : notification.id;
          await simpleNotificationService.deleteNotification(simpleId);
        } else {
          const complexId = Number(notification.displayId.replace('complex_', ''));
          await notificationService.dismissNotification(complexId, user.id);
        }
        navigate('/notifications');
      } catch (error) {
        console.error('Error deleting notification:', error);
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-400">Please log in to view this notification.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-electric-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Notification Not Found</h2>
            <p className="text-gray-400 mb-6">{error || 'The notification you are looking for could not be found.'}</p>
            <Link
              to="/notifications"
              className="inline-flex items-center space-x-2 text-electric-400 hover:text-electric-300"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Notifications</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const notificationLink = notification.link || notification.action_url;
  const isRead = notification.source === 'simple' ? notification.read : notification.is_read;
  const createdAt = notification.created_at || notification.sent_at;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/notifications"
            className="inline-flex items-center space-x-2 text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Notifications</span>
          </Link>
        </div>

        {/* Notification Detail */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden">
          {/* Notification Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-start space-x-4">
              <div 
                className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: `${getNotificationColor()}20`, 
                  color: getNotificationColor()
                }}
              >
                {getIcon()}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white mb-2">{notification.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(createdAt)}</span>
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    isRead ? 'bg-gray-700 text-gray-300' : 'bg-electric-500/20 text-electric-400'
                  }`}>
                    {isRead ? 'Read' : 'Unread'}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs text-black ${
                    notification.type === 'error' ? 'bg-red-500' :
                    notification.type === 'warning' ? 'bg-yellow-500' :
                    notification.type === 'success' ? 'bg-green-500' :
                    'bg-blue-500'
                  } bg-opacity-20`}>
                    {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Body */}
          <div className="p-6">
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
                {notification.message}
              </p>
            </div>

            {/* Action Link */}
            {notificationLink && (
              <div className="mt-6 p-4 bg-gray-700/30 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Related Link:</p>
                <a
                  href={notificationLink}
                  className="inline-flex items-center space-x-2 text-electric-400 hover:text-electric-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>{notificationLink}</span>
                </a>
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={handleDelete}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete Notification
              </button>
              
              <div className="flex items-center space-x-4">
                {!isRead && notification.source === 'simple' && (
                  <button
                    onClick={() => {
                      simpleNotificationService.markAsRead(notification.id);
                      setNotification({ ...notification, read: true });
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    <span>Mark as Read</span>
                  </button>
                )}
                
                {notificationLink && (
                  <a
                    href={notificationLink}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-electric-500 hover:bg-electric-600 text-white rounded-lg transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Go to Link</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}