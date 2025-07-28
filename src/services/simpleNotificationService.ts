import { supabase } from '../lib/supabase';

export interface SimpleNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  read: boolean;
  created_by?: string;
  created_at: string;
  read_at?: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  preference_type: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const NOTIFICATION_TYPES = {
  EVENT_REMINDERS: 'event_reminders',
  COMPETITION_RESULTS: 'competition_results',
  TEAM_INVITATIONS: 'team_invitations',
  SYSTEM_UPDATES: 'system_updates',
  MARKETING: 'marketing',
  NEWSLETTER: 'newsletter'
} as const;

class SimpleNotificationService {
  private activeSubscriptions = new Map<string, any>();
  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, unreadOnly = false, limit = 20): Promise<SimpleNotification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        query = query.eq('read', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all as read:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(userId: string, callback: (notification: SimpleNotification) => void) {
    const channelName = `notifications:${userId}`;
    
    // Unsubscribe from existing subscription if it exists
    const existingSubscription = this.activeSubscriptions.get(channelName);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.activeSubscriptions.delete(channelName);
    }

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as SimpleNotification);
        }
      )
      .subscribe();

    // Store the subscription
    this.activeSubscriptions.set(channelName, subscription);

    // Return a wrapper that properly cleans up
    return {
      unsubscribe: () => {
        subscription.unsubscribe();
        this.activeSubscriptions.delete(channelName);
      }
    };
  }

  /**
   * Create notification (admin only)
   */
  async createNotification(notification: Omit<SimpleNotification, 'id' | 'created_at' | 'read_at'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert(notification);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating notification:', error);
      return false;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Cleanup all active subscriptions
   */
  cleanupSubscriptions() {
    this.activeSubscriptions.forEach((subscription, channelName) => {
      subscription.unsubscribe();
    });
    this.activeSubscriptions.clear();
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .order('preference_type');

      if (error) {
        // If table doesn't exist, return default preferences
        if (error.code === '42P01') {
          console.warn('notification_preferences table does not exist, returning defaults');
          return Object.values(NOTIFICATION_TYPES).map(type => ({
            id: crypto.randomUUID(),
            user_id: userId,
            preference_type: type,
            enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      // Return default preferences on error
      return Object.values(NOTIFICATION_TYPES).map(type => ({
        id: crypto.randomUUID(),
        user_id: userId,
        preference_type: type,
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    }
  }

  /**
   * Update user notification preference
   */
  async updatePreference(userId: string, preferenceType: string, enabled: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          preference_type: preferenceType,
          enabled: enabled
        }, {
          onConflict: 'user_id,preference_type'
        });

      if (error) {
        // If table doesn't exist, just log and return true
        if (error.code === '42P01') {
          console.warn('notification_preferences table does not exist, cannot update preference');
          return true; // Return true to prevent UI errors
        }
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error updating notification preference:', error);
      return false;
    }
  }

  /**
   * Check if user wants specific notification type
   */
  async checkUserWantsNotification(userId: string, notificationType: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('user_wants_notification', {
          user_id: userId,
          notification_type: notificationType
        });

      if (error) throw error;
      return data ?? true; // Default to true if no preference
    } catch (error) {
      console.error('Error checking notification preference:', error);
      return true; // Default to true on error
    }
  }

  /**
   * Create notification with preference check (admin only)
   */
  async createNotificationWithPreferenceCheck(
    notification: Omit<SimpleNotification, 'id' | 'created_at' | 'read_at'>, 
    notificationType?: string
  ): Promise<boolean> {
    try {
      // If notification type is provided, check user preference
      if (notificationType) {
        const userWants = await this.checkUserWantsNotification(notification.user_id, notificationType);
        if (!userWants) {
          console.log(`User ${notification.user_id} has opted out of ${notificationType} notifications`);
          return true; // Return success but don't create notification
        }
      }

      // Create the notification
      return await this.createNotification(notification);
    } catch (error) {
      console.error('Error creating notification with preference check:', error);
      return false;
    }
  }


  /**
   * Archive old notifications manually
   */
  async archiveOldNotifications(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('archive_old_notifications');

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error archiving old notifications:', error);
      return 0;
    }
  }
}

export const simpleNotificationService = new SimpleNotificationService();