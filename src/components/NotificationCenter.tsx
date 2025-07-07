import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  X,
  Check,
  Settings,
  Trash2,
  Clock,
  AlertCircle,
  Calendar,
  Heart,
  MessageSquare,
  Award,
  Megaphone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  notificationService, 
  NotificationWithType 
} from '../services/notificationService';

// ================================
// TYPES & INTERFACES
// ================================

// ================================
// NOTIFICATION CENTER COMPONENT
// ================================

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationWithType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications and unread count
  const loadNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [notificationsData, count] = await Promise.all([
        notificationService.getUserNotifications(user.id, false, 20, 0),
        notificationService.getUnreadCount(user.id)
      ]);

      setNotifications(notificationsData);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && isOpen) {
      loadNotifications();
    }
  }, [user, isOpen, loadNotifications]);

  // Real-time notification subscription
  useEffect(() => {
    if (!user) return;

    let subscription: any;
    let isSubscribed = true;

    const setupSubscription = async () => {
      try {
        subscription = notificationService.subscribeToNotifications(
          user.id,
          (newNotification) => {
            if (isSubscribed) {
              setNotifications(prev => [newNotification, ...prev]);
              setUnreadCount(prev => prev + 1);
            }
          }
        );
      } catch (error) {
        console.error('Error setting up notification subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      isSubscribed = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      Megaphone,
      Calendar,
      Heart,
      MessageSquare,
      Award,
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

  const handleMarkAsRead = async (notificationId: number) => {
    if (!user) return;

    const success = await notificationService.markAsRead(notificationId, user.id);
    if (success) {
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    const count = await notificationService.markAllAsRead(user.id);
    if (count > 0) {
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    if (!user) return;

    const success = await notificationService.dismissNotification(notificationId, user.id);
    if (success) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  const handleNotificationClick = (notification: NotificationWithType) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
    
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-electric-400 hover:text-electric-300 flex items-center space-x-1"
                  >
                    <Check className="h-3 w-3" />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-gray-400 hover:text-white"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 border-b border-gray-700 bg-gray-700/30">
              <h4 className="text-white text-sm font-medium mb-3">Notification Settings</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-gray-300 text-sm">System announcements</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-gray-300 text-sm">Event reminders</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-gray-300 text-sm">Activity likes</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-gray-300 text-sm">Achievement unlocks</span>
                </label>
              </div>
            </div>
          )}

                     {/* Notifications List */}
           <div className="max-h-64 overflow-y-auto">
             {isLoading ? (
               <div className="p-8 text-center">
                 <div className="animate-spin h-6 w-6 border-2 border-electric-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                 <p className="text-gray-400 text-sm">Loading notifications...</p>
               </div>
             ) : notifications.length === 0 ? (
               <div className="p-8 text-center">
                 <Bell className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                 <p className="text-gray-400">No notifications</p>
                 <p className="text-gray-500 text-sm">You're all caught up!</p>
               </div>
             ) : (
              <div className="divide-y divide-gray-700/50">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                                         className={`p-4 hover:bg-gray-700/30 transition-colors cursor-pointer group ${
                       !notification.is_read ? 'bg-gray-700/20' : ''
                     }`}
                     onClick={() => handleNotificationClick(notification)}
                   >
                     <div className="flex items-start space-x-3">
                       {/* Icon */}
                       <div 
                         className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                         style={{ backgroundColor: `${notification.notification_color}20`, color: notification.notification_color }}
                       >
                         {getIcon(notification.notification_icon)}
                       </div>

                       {/* Content */}
                       <div className="flex-1 min-w-0">
                         <div className="flex items-start justify-between">
                           <div className="flex-1">
                             <h4 className={`text-sm font-medium ${
                               notification.is_read ? 'text-gray-300' : 'text-white'
                             }`}>
                               {notification.title}
                               {!notification.is_read && (
                                 <span className="inline-block w-2 h-2 bg-electric-500 rounded-full ml-2"></span>
                               )}
                             </h4>
                             <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                               {notification.message}
                             </p>
                             <div className="flex items-center justify-between mt-2">
                               <span className="text-gray-500 text-xs">
                                 {formatTimeAgo(notification.sent_at)}
                               </span>
                               {notification.priority > 3 && (
                                 <span className="text-red-400 text-xs flex items-center space-x-1">
                                   <AlertCircle className="h-3 w-3" />
                                   <span>High Priority</span>
                                 </span>
                               )}
                             </div>
                           </div>

                           {/* Actions */}
                           <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             {!notification.is_read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                                className="text-gray-500 hover:text-electric-400 p-1"
                                title="Mark as read"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(notification.id);
                              }}
                              className="text-gray-500 hover:text-red-400 p-1"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
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

                     {/* Footer */}
           {notifications.length > 0 && (
             <div className="p-3 border-t border-gray-700 text-center">
               <a 
                 href="/notifications"
                 onClick={() => setIsOpen(false)}
                 className="text-electric-400 hover:text-electric-300 text-sm"
               >
                 View all notifications
               </a>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter; 