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
}

export const simpleNotificationService = new SimpleNotificationService();