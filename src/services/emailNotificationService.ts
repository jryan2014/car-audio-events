import { supabase } from '../lib/supabase';

export interface EmailNotificationData {
  // Common fields
  name: string;
  email: string;
  website_url: string;
  support_url: string;
  
  // Payment specific
  amount?: string;
  payment_method?: string;
  payment_date?: string;
  retry_payment_url?: string;
  
  // Renewal specific
  plan_name?: string;
  renewal_amount?: string;
  renewal_date?: string;
  billing_url?: string;
  
  // Cancellation specific
  access_end_date?: string;
  reactivate_url?: string;
  feedback_url?: string;
  
  // Plan change specific
  user_name?: string;
  new_plan_name?: string;
  billing_period?: string;
}

export class EmailNotificationService {
  private static readonly BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://car-audio-events.netlify.app' 
    : 'http://localhost:5176';

  /**
   * Queue an email notification to be sent
   */
  private static async queueEmail(
    templateId: string, 
    toEmail: string, 
    templateData: EmailNotificationData,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ) {
    try {
      const { error } = await supabase
        .from('email_queue')
        .insert({
          to_email: toEmail,
          template_id: templateId,
          template_data: templateData,
          priority,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error queueing email:', error);
        throw error;
      }

      console.log(`✓ Queued ${templateId} email for ${toEmail}`);
    } catch (error) {
      console.error(`Failed to queue ${templateId} email:`, error);
      throw error;
    }
  }

  /**
   * Send successful payment notification
   */
  static async sendPaymentSuccessNotification(
    userId: string, 
    transactionData: {
      amount: number;
      paymentMethod: string;
      transactionId: string;
    }
  ) {
    try {
      // Get user data
      const { data: user } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .single();

      if (!user) throw new Error('User not found');

      const templateData: EmailNotificationData = {
        name: user.name || user.email.split('@')[0],
        email: user.email,
        amount: (transactionData.amount / 100).toFixed(2), // Convert cents to dollars
        payment_method: transactionData.paymentMethod,
        payment_date: new Date().toLocaleDateString(),
        website_url: this.BASE_URL,
        support_url: `${this.BASE_URL}/contact`
      };

      await this.queueEmail('payment_success', user.email, templateData, 'high');
    } catch (error) {
      console.error('Error sending payment success notification:', error);
      throw error;
    }
  }

  /**
   * Send failed payment notification
   */
  static async sendPaymentFailedNotification(
    userId: string, 
    transactionData: {
      amount: number;
      paymentMethod: string;
      transactionId: string;
      failureReason?: string;
    }
  ) {
    try {
      // Get user data
      const { data: user } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .single();

      if (!user) throw new Error('User not found');

      const templateData: EmailNotificationData = {
        name: user.name || user.email.split('@')[0],
        email: user.email,
        payment_method: transactionData.paymentMethod,
        retry_payment_url: `${this.BASE_URL}/billing?retry=${transactionData.transactionId}`,
        website_url: this.BASE_URL,
        support_url: `${this.BASE_URL}/contact`
      };

      await this.queueEmail('payment_failed', user.email, templateData, 'high');
    } catch (error) {
      console.error('Error sending payment failed notification:', error);
      throw error;
    }
  }

  /**
   * Send upcoming renewal notification
   */
  static async sendUpcomingRenewalNotification(
    userId: string, 
    subscriptionData: {
      planName: string;
      renewalAmount: number;
      renewalDate: string;
      paymentMethod: string;
    }
  ) {
    try {
      // Get user data
      const { data: user } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .single();

      if (!user) throw new Error('User not found');

      const templateData: EmailNotificationData = {
        name: user.name || user.email.split('@')[0],
        email: user.email,
        plan_name: subscriptionData.planName,
        renewal_amount: (subscriptionData.renewalAmount / 100).toFixed(2),
        renewal_date: new Date(subscriptionData.renewalDate).toLocaleDateString(),
        payment_method: subscriptionData.paymentMethod,
        billing_url: `${this.BASE_URL}/billing`,
        website_url: this.BASE_URL,
        support_url: `${this.BASE_URL}/contact`
      };

      await this.queueEmail('upcoming_renewal', user.email, templateData, 'normal');
    } catch (error) {
      console.error('Error sending upcoming renewal notification:', error);
      throw error;
    }
  }

  /**
   * Send subscription cancelled notification
   */
  static async sendSubscriptionCancelledNotification(
    userId: string, 
    cancellationData: {
      accessEndDate: string;
      reason?: string;
      immediately: boolean;
    }
  ) {
    try {
      // Get user data
      const { data: user } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .single();

      if (!user) throw new Error('User not found');

      const templateData: EmailNotificationData = {
        name: user.name || user.email.split('@')[0],
        email: user.email,
        access_end_date: new Date(cancellationData.accessEndDate).toLocaleDateString(),
        reactivate_url: `${this.BASE_URL}/pricing`,
        feedback_url: `${this.BASE_URL}/feedback`,
        website_url: this.BASE_URL,
        support_url: `${this.BASE_URL}/contact`
      };

      await this.queueEmail('subscription_cancelled', user.email, templateData, 'normal');
    } catch (error) {
      console.error('Error sending subscription cancelled notification:', error);
      throw error;
    }
  }

  /**
   * Send plan changed notification
   */
  static async sendPlanChangedNotification(
    userId: string, 
    planChangeData: {
      newPlanName: string;
      billingPeriod: string;
      previousPlanName?: string;
    }
  ) {
    try {
      // Get user data
      const { data: user } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .single();

      if (!user) throw new Error('User not found');

      const templateData: EmailNotificationData = {
        name: user.name || user.email.split('@')[0],
        user_name: user.name || user.email.split('@')[0],
        email: user.email,
        new_plan_name: planChangeData.newPlanName,
        billing_period: planChangeData.billingPeriod,
        website_url: this.BASE_URL,
        support_url: `${this.BASE_URL}/contact`
      };

      await this.queueEmail('plan_changed', user.email, templateData, 'normal');
    } catch (error) {
      console.error('Error sending plan changed notification:', error);
      throw error;
    }
  }

  /**
   * Send bulk renewal reminders (for cron job)
   */
  static async sendBulkRenewalReminders() {
    try {
      // Get subscriptions that renew in 3 days
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(0, 0, 0, 0);

      const fourDaysFromNow = new Date(threeDaysFromNow);
      fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 1);

      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select(`
          *,
          users (name, email),
          membership_plans (name, price),
          payment_methods (brand, last4)
        `)
        .eq('status', 'active')
        .gte('current_period_end', threeDaysFromNow.toISOString())
        .lt('current_period_end', fourDaysFromNow.toISOString());

      if (!subscriptions || subscriptions.length === 0) {
        console.log('No upcoming renewals found');
        return;
      }

      console.log(`Processing ${subscriptions.length} renewal reminders`);

      for (const subscription of subscriptions) {
        try {
          await this.sendUpcomingRenewalNotification(
            subscription.user_id,
            {
              planName: (subscription as any).membership_plans?.name || 'Unknown Plan',
              renewalAmount: (subscription as any).membership_plans?.price || 0,
              renewalDate: subscription.current_period_end,
              paymentMethod: `${(subscription as any).payment_methods?.brand || 'Card'} ending in ${(subscription as any).payment_methods?.last4 || '****'}`
            }
          );
        } catch (error) {
          console.error(`Failed to send renewal reminder for subscription ${subscription.id}:`, error);
        }
      }

      console.log(`✓ Processed ${subscriptions.length} renewal reminders`);
    } catch (error) {
      console.error('Error sending bulk renewal reminders:', error);
      throw error;
    }
  }
}

export default EmailNotificationService; 