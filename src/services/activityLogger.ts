import { supabase } from '../lib/supabase';

export type ActivityType = 
  | 'user_login'
  | 'user_logout'
  | 'user_register'
  | 'profile_update'
  | 'event_create'
  | 'event_update'
  | 'event_delete'
  | 'event_register'
  | 'payment_success'
  | 'payment_failed'
  | 'refund_request'
  | 'settings_update'
  | 'membership_change'
  | 'directory_create'
  | 'directory_update'
  | 'system_event'
  | 'error_event'
  | 'page_view'
  | 'event_view'
  | 'directory_view'
  | 'profile_view'
  | 'resource_view'
  | 'dashboard_view';

interface LogActivityParams {
  userId?: string | null;
  activityType: ActivityType;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

class ActivityLogger {
  /**
   * Log an activity to the database
   */
  async log({
    userId,
    activityType,
    description,
    metadata = {},
    ipAddress,
    userAgent
  }: LogActivityParams): Promise<void> {
    try {
      // Get the current user if userId not provided
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
      }

      // Use direct insert since we have policies set up
      const { error } = await supabase
        .from('activity_logs')
        .insert([{
          user_id: userId,
          activity_type: activityType,
          description,
          metadata,
          ip_address: ipAddress,
          user_agent: userAgent || navigator.userAgent
        }]);

      if (error) {
        console.error('Failed to log activity:', error);
        // Don't throw - we don't want logging failures to break the app
      }
    } catch (error) {
      console.error('Error in activity logger:', error);
      // Silent fail - logging should not break app functionality
    }
  }

  /**
   * Log a user login
   */
  async logLogin(userId: string, metadata?: Record<string, any>) {
    await this.log({
      userId,
      activityType: 'user_login',
      description: 'User logged in',
      metadata
    });
  }

  /**
   * Log a user logout
   */
  async logLogout(userId: string) {
    await this.log({
      userId,
      activityType: 'user_logout',
      description: 'User logged out',
      metadata: {}
    });
  }

  /**
   * Log a user registration
   */
  async logRegistration(userId: string, email: string, membershipType: string) {
    await this.log({
      userId,
      activityType: 'user_register',
      description: `New ${membershipType} user registered`,
      metadata: { email, membership_type: membershipType }
    });
  }

  /**
   * Log an event creation
   */
  async logEventCreate(eventId: string, eventName: string) {
    await this.log({
      activityType: 'event_create',
      description: `Created event: ${eventName}`,
      metadata: { event_id: eventId, event_name: eventName }
    });
  }

  /**
   * Log an event update
   */
  async logEventUpdate(eventId: string, eventName: string, changes?: string[]) {
    await this.log({
      activityType: 'event_update',
      description: `Updated event: ${eventName}`,
      metadata: { event_id: eventId, event_name: eventName, changes }
    });
  }

  /**
   * Log a payment
   */
  async logPayment(success: boolean, amount: number, planName: string, paymentId?: string) {
    await this.log({
      activityType: success ? 'payment_success' : 'payment_failed',
      description: success 
        ? `Payment successful for ${planName} ($${amount})`
        : `Payment failed for ${planName} ($${amount})`,
      metadata: { amount, plan_name: planName, payment_id: paymentId }
    });
  }

  /**
   * Log a settings update
   */
  async logSettingsUpdate(section: string, changes?: string[]) {
    await this.log({
      activityType: 'settings_update',
      description: `Updated ${section} settings`,
      metadata: { section, changes }
    });
  }

  /**
   * Log a system event
   */
  async logSystemEvent(description: string, metadata?: Record<string, any>) {
    await this.log({
      userId: null,
      activityType: 'system_event',
      description,
      metadata
    });
  }

  /**
   * Log an error event
   */
  async logError(error: Error | string, context?: string) {
    await this.log({
      activityType: 'error_event',
      description: `Error: ${context || 'Unknown context'}`,
      metadata: {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        context
      }
    });
  }
}

// Export a singleton instance
export const activityLogger = new ActivityLogger();