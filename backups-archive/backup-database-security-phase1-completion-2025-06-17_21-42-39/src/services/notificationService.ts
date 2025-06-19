import { supabase } from '../lib/supabase';

// ================================
// TYPES & INTERFACES
// ================================

export interface NotificationType {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  default_enabled: boolean;
  created_at: string;
}

export interface UserNotification {
  id: number;
  user_id: string;
  notification_type_id: number;
  title: string;
  message: string;
  action_url?: string;
  metadata: Record<string, any>;
  is_read: boolean;
  is_dismissed: boolean;
  priority: number;
  scheduled_for?: string;
  sent_at: string;
  read_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface NotificationWithType {
  id: number;
  title: string;
  message: string;
  action_url?: string;
  metadata: Record<string, any>;
  is_read: boolean;
  priority: number;
  sent_at: string;
  notification_type: string;
  notification_icon: string;
  notification_color: string;
}

export interface NotificationPreference {
  id: number;
  user_id: string;
  notification_type_id: number;
  enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationOptions {
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  priority?: number;
  expiresAt?: Date;
}

// ================================
// NOTIFICATION SERVICE CLASS
// ================================

class NotificationService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheExpiry = 2 * 60 * 1000; // 2 minutes

  /**
   * Create a new notification for a user
   */
  async createNotification(userId: string, options: CreateNotificationOptions): Promise<number | null> {
    try {
      const { data, error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_notification_type: options.type,
        p_title: options.title,
        p_message: options.message,
        p_action_url: options.actionUrl || null,
        p_metadata: options.metadata || {},
        p_priority: options.priority || 1,
        p_expires_at: options.expiresAt?.toISOString() || null
      });

      if (error) throw error;

      // Clear relevant caches
      this.clearUserCache(userId);

      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    unreadOnly: boolean = false,
    limit: number = 50,
    offset: number = 0
  ): Promise<NotificationWithType[]> {
    const cacheKey = `notifications_${userId}_${unreadOnly}_${limit}_${offset}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_user_id: userId,
        p_unread_only: unreadOnly,
        p_limit: limit,
        p_offset: offset
      });

      if (error) throw error;

      const results = data || [];
      
      // Cache results
      this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
      
      return results;
    } catch (error) {
      console.error('Error loading notifications:', error);
      return [];
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: number, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
        p_user_id: userId
      });

      if (error) throw error;

      // Clear user caches
      this.clearUserCache(userId);

      return !!data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('mark_all_notifications_read', {
        p_user_id: userId
      });

      if (error) throw error;

      // Clear user caches
      this.clearUserCache(userId);

      return data || 0;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return 0;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const cacheKey = `unread_count_${userId}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase.rpc('get_unread_notification_count', {
        p_user_id: userId
      });

      if (error) throw error;

      const count = data || 0;
      
      // Cache result
      this.cache.set(cacheKey, { data: count, timestamp: Date.now() });
      
      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Dismiss a notification
   */
  async dismissNotification(notificationId: number, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_dismissed: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;

      // Clear user caches
      this.clearUserCache(userId);

      return true;
    } catch (error) {
      console.error('Error dismissing notification:', error);
      return false;
    }
  }

  /**
   * Get notification types
   */
  async getNotificationTypes(): Promise<NotificationType[]> {
    const cacheKey = 'notification_types';
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry * 5) { // Longer cache
      return cached.data;
    }

    try {
      const { data, error } = await supabase
        .from('notification_types')
        .select('*')
        .order('name');

      if (error) throw error;

      const results = data || [];
      
      // Cache results
      this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
      
      return results;
    } catch (error) {
      console.error('Error loading notification types:', error);
      return [];
    }
  }

  /**
   * Get user notification preferences
   */
  async getNotificationPreferences(userId: string): Promise<NotificationPreference[]> {
    const cacheKey = `preferences_${userId}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry * 2) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const results = data || [];
      
      // Cache results
      this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
      
      return results;
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      return [];
    }
  }

  /**
   * Update notification preference
   */
  async updateNotificationPreference(
    userId: string,
    notificationTypeId: number,
    enabled: boolean,
    emailEnabled?: boolean,
    pushEnabled?: boolean
  ): Promise<boolean> {
    try {
      const updateData: any = { enabled };
      if (emailEnabled !== undefined) updateData.email_enabled = emailEnabled;
      if (pushEnabled !== undefined) updateData.push_enabled = pushEnabled;

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          notification_type_id: notificationTypeId,
          ...updateData
        });

      if (error) throw error;

      // Clear preferences cache
      this.cache.delete(`preferences_${userId}`);

      return true;
    } catch (error) {
      console.error('Error updating notification preference:', error);
      return false;
    }
  }

  /**
   * Initialize default preferences for a user
   */
  async initializeDefaultPreferences(userId: string): Promise<boolean> {
    try {
      const types = await this.getNotificationTypes();
      
      const preferences = types.map(type => ({
        user_id: userId,
        notification_type_id: type.id,
        enabled: type.default_enabled,
        email_enabled: false, // Disabled by default
        push_enabled: type.default_enabled
      }));

      const { error } = await supabase
        .from('notification_preferences')
        .upsert(preferences);

      if (error) throw error;

      // Clear cache
      this.cache.delete(`preferences_${userId}`);

      return true;
    } catch (error) {
      console.error('Error initializing default preferences:', error);
      return false;
    }
  }

  /**
   * Helper methods for common notification types
   */

  // Activity notifications
  async notifyActivityLike(userId: string, likerName: string, activityTitle: string): Promise<void> {
    await this.createNotification(userId, {
      type: 'activity_like',
      title: 'New Like',
      message: `${likerName} liked your activity: "${activityTitle}"`,
      priority: 2
    });
  }

  async notifyActivityComment(userId: string, commenterName: string, activityTitle: string): Promise<void> {
    await this.createNotification(userId, {
      type: 'activity_comment',
      title: 'New Comment',
      message: `${commenterName} commented on your activity: "${activityTitle}"`,
      priority: 3
    });
  }

  // Event notifications
  async notifyEventReminder(userId: string, eventTitle: string, eventDate: string): Promise<void> {
    await this.createNotification(userId, {
      type: 'event_reminder',
      title: 'Event Reminder',
      message: `Don't forget about "${eventTitle}" happening on ${new Date(eventDate).toLocaleDateString()}`,
      priority: 4
    });
  }

  // Competition notifications
  async notifyCompetitionResult(userId: string, eventTitle: string, placement: number): Promise<void> {
    const placement_suffix = placement === 1 ? 'st' : placement === 2 ? 'nd' : placement === 3 ? 'rd' : 'th';
    
    await this.createNotification(userId, {
      type: 'competition_result',
      title: 'Competition Results',
      message: `You placed ${placement}${placement_suffix} in "${eventTitle}"!`,
      priority: 5
    });
  }

  // Team notifications
  async notifyTeamInvitation(userId: string, teamName: string, inviterName: string): Promise<void> {
    await this.createNotification(userId, {
      type: 'team_invitation',
      title: 'Team Invitation',
      message: `${inviterName} invited you to join "${teamName}"`,
      actionUrl: '/teams',
      priority: 3
    });
  }

  // Achievement notifications
  async notifyAchievementUnlock(userId: string, achievementName: string): Promise<void> {
    await this.createNotification(userId, {
      type: 'achievement_unlock',
      title: 'Achievement Unlocked!',
      message: `Congratulations! You've unlocked the "${achievementName}" achievement`,
      priority: 4
    });
  }

  // System notifications
  async notifySystemAnnouncement(userId: string, title: string, message: string): Promise<void> {
    await this.createNotification(userId, {
      type: 'system_announcement',
      title: title,
      message: message,
      priority: 3
    });
  }

  // Business notifications
  async notifyBusinessUpdate(userId: string, businessName: string, status: string): Promise<void> {
    await this.createNotification(userId, {
      type: 'business_update',
      title: 'Business Listing Update',
      message: `Your business listing "${businessName}" has been ${status}`,
      actionUrl: '/directory',
      priority: 3
    });
  }

  /**
   * Broadcast notification to multiple users
   */
  async broadcastNotification(userIds: string[], options: CreateNotificationOptions): Promise<number> {
    try {
      let successCount = 0;

      // Create notifications for all users in batches
      const batchSize = 50;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        const promises = batch.map(userId => this.createNotification(userId, options));
        const results = await Promise.allSettled(promises);
        
        successCount += results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
      }

      return successCount;
    } catch (error) {
      console.error('Error broadcasting notifications:', error);
      return 0;
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_notifications');

      if (error) throw error;

      // Clear all caches since we might have cleaned up notifications
      this.clearAllCache();

      return data || 0;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      return 0;
    }
  }

  /**
   * Cache management
   */
  private clearUserCache(userId: string): void {
    for (const [key] of this.cache) {
      if (key.includes(userId)) {
        this.cache.delete(key);
      }
    }
  }

  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Real-time notification subscription
   */
  subscribeToNotifications(userId: string, callback: (notification: NotificationWithType) => void) {
    return supabase
      .channel(`user_notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          // Fetch the full notification with type information
          const notifications = await this.getUserNotifications(userId, false, 1, 0);
          if (notifications.length > 0) {
            callback(notifications[0]);
          }
        }
      )
      .subscribe();
  }

  /**
   * Get notification statistics for admin dashboard
   */
  async getNotificationStats(): Promise<{
    totalNotifications: number;
    unreadNotifications: number;
    notificationsByType: Record<string, number>;
    deliveryStats: Record<string, number>;
  }> {
    try {
      // This would require additional SQL functions for admin stats
      // For now, return basic stats
      return {
        totalNotifications: 0,
        unreadNotifications: 0,
        notificationsByType: {},
        deliveryStats: {}
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return {
        totalNotifications: 0,
        unreadNotifications: 0,
        notificationsByType: {},
        deliveryStats: {}
      };
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService(); 