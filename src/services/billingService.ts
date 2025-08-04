import { supabase } from '../lib/supabase';
import EmailNotificationService from './emailNotificationService';

export interface Transaction {
  id: string;
  user_id: string;
  type: 'payment' | 'refund' | 'credit' | 'debit' | 'subscription' | 'one_time';
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled';
  amount: number;
  currency: string;
  payment_provider: 'stripe' | 'paypal' | 'manual' | 'system';
  provider_transaction_id?: string;
  provider_customer_id?: string;
  payment_method_type?: string;
  payment_method_last4?: string;
  payment_method_brand?: string;
  description?: string;
  metadata?: any;
  invoice_id?: string;
  subscription_id?: string;
  refund_reason?: string;
  refunded_amount?: number;
  fee_amount?: number;
  net_amount?: number;
  tax_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  membership_plan_id?: string;
  status: 'active' | 'cancelled' | 'past_due' | 'paused' | 'trialing' | 'expired';
  payment_provider: 'stripe' | 'paypal' | 'manual';
  provider_subscription_id?: string;
  provider_customer_id?: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at?: string;
  cancellation_reason?: string;
  trial_start?: string;
  trial_end?: string;
  billing_cycle_anchor?: string;
  promo_code_id?: string;
  discount_percentage?: number;
  discount_amount?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
  // Extended with plan details
  membership_plan?: {
    id: string;
    name: string;
    price: number;
    billing_period: string;
    features: string[];
  };
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  type: 'card' | 'paypal' | 'bank_account';
  provider: 'stripe' | 'paypal';
  provider_payment_method_id: string;
  is_default: boolean;
  last4?: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
  billing_address?: any;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  user_id: string;
  subscription_id?: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  due_date?: string;
  paid_at?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  currency: string;
  payment_provider?: string;
  provider_invoice_id?: string;
  provider_invoice_url?: string;
  pdf_url?: string;
  line_items: any[];
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'trial_extension';
  value: number;
  applies_to?: {
    membership_types?: string[];
    plan_ids?: string[];
  };
  usage_limit?: number;
  usage_count: number;
  minimum_amount?: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  created_by?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface BillingStats {
  total_revenue: number;
  active_subscriptions: number;
  failed_payments: number;
  upcoming_renewals: number;
  revenue_by_plan: Array<{
    plan_name: string;
    revenue: number;
    subscriber_count: number;
  }>;
  recent_transactions: Transaction[];
}

class BillingService {
  // User Billing Methods
  
  async getUserBillingOverview(userId: string) {
    try {
      // First check if subscriptions table exists and get subscription data
      let subscription = null;
      let membershipPlan = null;
      
      try {
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        if (subError) {
          console.log('Subscriptions table query failed, using user membership data:', subError.message);
          // Fallback to user membership data
          const { data: userData } = await supabase
            .from('users')
            .select('membershipType, membershipExpires')
            .eq('id', userId)
            .single();
          
          if (userData?.membershipType && userData.membershipType !== 'free') {
            // Create a mock subscription from user data
            subscription = {
              id: 'user-membership',
              user_id: userId,
              membership_plan_id: userData.membershipType,
              status: 'active',
              payment_provider: 'stripe',
              current_period_start: new Date().toISOString(),
              current_period_end: userData.membershipExpires || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              cancel_at_period_end: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }
        } else {
          subscription = subData;
        }

        // Get membership plan separately if subscription exists
        if (subscription?.membership_plan_id) {
          const { data: planData } = await supabase
            .from('membership_plans')
            .select('id, name, price, billing_period, features')
            .eq('id', subscription.membership_plan_id)
            .single();
          
          membershipPlan = planData;
        }
      } catch (error) {
        console.error('Error in subscription query:', error);
        // Continue with null subscription
      }

      // Combine subscription with plan data
      const subscriptionWithPlan = subscription ? {
        ...subscription,
        membership_plan: membershipPlan
      } : null;

      // Get recent transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get payment methods
      const { data: paymentMethods } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false });

      // Get upcoming invoice if any
      let upcomingInvoice = null;
      if (subscriptionWithPlan) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'open')
          .maybeSingle();
        
        upcomingInvoice = invoice;
      }

      // Get all invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          *,
          subscriptions!subscription_id (
            membership_plans (
              name,
              billing_period
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      return {
        subscription: subscriptionWithPlan,
        transactions: transactions || [],
        paymentMethods: paymentMethods || [],
        upcomingInvoice,
        invoices: invoices || []
      };
    } catch (error) {
      console.error('Error fetching billing overview:', error);
      throw error;
    }
  }

  async getTransactionHistory(userId: string, limit = 50, offset = 0) {
    try {
      const { data, error, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        transactions: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  async getInvoices(userId: string) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }

  async downloadInvoice(invoiceId: string, userId: string) {
    try {
      // First verify the invoice belongs to the user
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !invoice) {
        throw new Error('Invoice not found');
      }

      // If we have a Stripe invoice, return the stored PDF URL
      if (invoice.pdf_url) {
        return invoice.pdf_url;
      }

      // Otherwise, return the provider URL if available
      return invoice.provider_invoice_url;
    } catch (error) {
      console.error('Error downloading invoice:', error);
      throw error;
    }
  }

  // Subscription Management
  
  async updateSubscription(
    userId: string, 
    planId: string, 
    billingPeriod: 'monthly' | 'yearly'
  ) {
    try {
      const { data, error } = await supabase.functions.invoke('update-subscription', {
        body: {
          userId,
          planId,
          billingPeriod
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to update subscription');
      }

      // Send plan change email notification
      try {
        // Get the new plan details
        const { data: newPlan } = await supabase
          .from('membership_plans')
          .select('name')
          .eq('id', planId)
          .single();

        if (newPlan) {
          await EmailNotificationService.sendPlanChangedNotification(userId, {
            newPlanName: newPlan.name,
            billingPeriod
          });
        }
      } catch (emailError) {
        console.error('Failed to send plan change email:', emailError);
        // Don't fail the update if email fails
      }

      return data;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  async cancelSubscription(
    userId: string, 
    reason?: string, 
    immediately = false
  ) {
    try {
      // Get active subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Update our database
      await supabase
        .from('subscriptions')
        .update({
          status: immediately ? 'cancelled' : 'active',
          cancel_at_period_end: !immediately,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      // Send cancellation email notification
      try {
        const accessEndDate = immediately ? new Date().toISOString() : subscription.current_period_end;
        await EmailNotificationService.sendSubscriptionCancelledNotification(userId, {
          accessEndDate,
          reason,
          immediately
        });
      } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError);
        // Don't fail the cancellation if email fails
      }

      return { success: true, cancelled: true };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  async pauseSubscription(userId: string, resumeDate?: string) {
    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Update status to paused
      await supabase
        .from('subscriptions')
        .update({
          status: 'paused',
          metadata: { resume_date: resumeDate },
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      return { success: true, paused: true };
    } catch (error) {
      console.error('Error pausing subscription:', error);
      throw error;
    }
  }

  async resumeSubscription(userId: string) {
    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'paused')
        .single();

      if (!subscription) {
        throw new Error('No paused subscription found');
      }

      // Calculate new billing period based on pause duration
      const pausedAt = new Date(subscription.updated_at);
      const now = new Date();
      const pauseDuration = now.getTime() - pausedAt.getTime();
      
      // Extend the current period end by the pause duration
      const currentPeriodEnd = new Date(subscription.current_period_end);
      const newPeriodEnd = new Date(currentPeriodEnd.getTime() + pauseDuration);

      // Update status back to active
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_end: newPeriodEnd.toISOString(),
          metadata: { ...subscription.metadata, resumed_at: now.toISOString() },
          updated_at: now.toISOString()
        })
        .eq('id', subscription.id);

      // If using Stripe, resume the subscription there too
      if (subscription.provider_subscription_id && subscription.payment_provider === 'stripe') {
        await supabase.functions.invoke('resume-stripe-subscription', {
          body: { 
            subscriptionId: subscription.provider_subscription_id,
            userId 
          }
        });
      }

      return { success: true, resumed: true };
    } catch (error) {
      console.error('Error resuming subscription:', error);
      throw error;
    }
  }

  // Payment Methods
  
  async addPaymentMethod(
    userId: string, 
    paymentMethodId: string, 
    type: 'card' | 'paypal',
    setAsDefault = false
  ) {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('stripe_customer_id, email')
        .eq('id', userId)
        .single();

      if (!user) throw new Error('User not found');

      // For now, just save a mock payment method
      // In production, this would integrate with Stripe/PayPal
      
      if (setAsDefault) {
        await supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', userId);
      }

      // Save to our database
      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: userId,
          type: type,
          provider: type === 'card' ? 'stripe' : 'paypal',
          provider_payment_method_id: paymentMethodId,
          is_default: setAsDefault,
          last4: '4242', // Mock data
          brand: 'Visa', // Mock data
          exp_month: 12,
          exp_year: 2025,
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  }

  async removePaymentMethod(userId: string, paymentMethodId: string) {
    try {
      // Get the payment method
      const { data: paymentMethod } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('id', paymentMethodId)
        .eq('user_id', userId)
        .single();

      if (!paymentMethod) {
        throw new Error('Payment method not found');
      }

      // Remove from Stripe if it's a Stripe method
      if (paymentMethod.provider === 'stripe' && paymentMethod.provider_payment_method_id) {
        await supabase.functions.invoke('stripe-detach-payment-method', {
          body: {
            paymentMethodId: paymentMethod.provider_payment_method_id,
          }
        });
      }

      // Remove from database
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', paymentMethodId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error removing payment method:', error);
      throw error;
    }
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    try {
      // Get the payment method
      const { data: paymentMethod } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('id', paymentMethodId)
        .eq('user_id', userId)
        .single();

      if (!paymentMethod) {
        throw new Error('Payment method not found');
      }

      // Update all methods to not default
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Set this one as default
      await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', paymentMethodId);

      // Update Stripe default if applicable
      if (paymentMethod.provider === 'stripe') {
        const { data: user } = await supabase
          .from('users')
          .select('stripe_customer_id')
          .eq('id', userId)
          .single();

        if (user?.stripe_customer_id) {
          await supabase.functions.invoke('stripe-update-customer-default-payment-method', {
            body: {
              customerId: user.stripe_customer_id,
              paymentMethodId: paymentMethod.provider_payment_method_id,
            }
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }

  // Payment Retry
  
  async retryFailedPayment(
    transactionId: string, 
    userId: string, 
    paymentMethodId?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('retry-payment', {
        body: { 
          transactionId, 
          userId,
          paymentMethodId 
        }
      });

      if (error) throw error;

      return data || { success: false, message: 'Failed to retry payment' };
    } catch (error) {
      console.error('Error retrying payment:', error);
      throw error;
    }
  }

  // Promo Codes
  
  async validatePromoCode(code: string, userId: string, planId?: string) {
    try {
      const { data: promo, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !promo) {
        return { valid: false, message: 'Invalid promo code' };
      }

      // Check expiration
      if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
        return { valid: false, message: 'Promo code has expired' };
      }

      // Check usage limit
      if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
        return { valid: false, message: 'Promo code usage limit reached' };
      }

      // Check if applies to this plan
      if (planId && promo.applies_to?.plan_ids && 
          !promo.applies_to.plan_ids.includes(planId)) {
        return { valid: false, message: 'Promo code does not apply to this plan' };
      }

      // Check if user already used this code
      const { data: existingUsage } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('promo_code_id', promo.id);

      if (existingUsage && existingUsage.length > 0) {
        return { valid: false, message: 'You have already used this promo code' };
      }

      return {
        valid: true,
        promo: {
          id: promo.id,
          type: promo.type,
          value: promo.value,
          description: promo.description
        }
      };
    } catch (error) {
      console.error('Error validating promo code:', error);
      return { valid: false, message: 'Error validating promo code' };
    }
  }

  async applyPromoCode(userId: string, promoCode: string): Promise<{ success: boolean; message?: string; discount?: any }> {
    try {
      // First validate the promo code
      const validation = await this.validatePromoCode(promoCode, userId);
      
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Get user's active subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Apply the promo code to the subscription
      const updates: any = {
        promo_code_id: validation.promo.id,
        updated_at: new Date().toISOString()
      };

      if (validation.promo.type === 'percentage') {
        updates.discount_percentage = validation.promo.value;
      } else if (validation.promo.type === 'fixed_amount') {
        updates.discount_amount = validation.promo.value;
      }

      await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', subscription.id);

      // Increment usage count
      await supabase
        .from('promo_codes')
        .update({ 
          usage_count: (validation.promo as any).usage_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', validation.promo.id);

      return { 
        success: true,
        message: `Promo code applied! ${validation.promo.description || 'Discount active on your subscription.'}`,
        discount: validation.promo
      };
    } catch (error: any) {
      console.error('Error applying promo code:', error);
      throw error;
    }
  }

  // Admin Methods
  
  async getAdminBillingStats() {
    try {
      // Get total revenue
      const { data: revenueData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'payment')
        .eq('status', 'succeeded');

      const totalRevenue = revenueData?.reduce((sum, t) => sum + t.amount, 0) || 0;

      // Get active subscriptions count
      const { count: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get failed payments count (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: failedPayments } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get upcoming renewals (next 7 days)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      const { count: upcomingRenewals } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lte('current_period_end', sevenDaysFromNow.toISOString())
        .gte('current_period_end', new Date().toISOString());

      // Get revenue by plan
      const { data: planRevenue } = await supabase
        .from('transactions')
        .select(`
          amount,
          subscriptions!inner (
            membership_plans (
              name
            )
          )
        `)
        .eq('type', 'payment')
        .eq('status', 'succeeded');

      const revenueByPlan: { [key: string]: { revenue: number, count: number } } = {};
      
      planRevenue?.forEach((transaction: any) => {
        const planName = transaction.subscriptions?.membership_plans?.name || 'Unknown';
        if (!revenueByPlan[planName]) {
          revenueByPlan[planName] = { revenue: 0, count: 0 };
        }
        revenueByPlan[planName].revenue += transaction.amount;
        revenueByPlan[planName].count += 1;
      });

      // Get recent transactions
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        total_revenue: totalRevenue,
        active_subscriptions: activeSubscriptions || 0,
        failed_payments: failedPayments || 0,
        upcoming_renewals: upcomingRenewals || 0,
        revenue_by_plan: Object.entries(revenueByPlan).map(([plan_name, data]) => ({
          plan_name,
          revenue: data.revenue,
          subscriber_count: data.count
        })),
        recent_transactions: recentTransactions || []
      };
    } catch (error) {
      console.error('Error fetching admin billing stats:', error);
      throw error;
    }
  }

  async searchBillingRecords(filters: {
    userId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    planId?: string;
    provider?: string;
  }) {
    try {
      let query = supabase
        .from('subscriptions')
        .select(`
          *,
          users (
            id,
            name,
            email
          ),
          membership_plans (
            id,
            name,
            price,
            billing_period
          )
        `);

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.planId) {
        query = query.eq('membership_plan_id', filters.planId);
      }
      if (filters.provider) {
        query = query.eq('payment_provider', filters.provider);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching billing records:', error);
      throw error;
    }
  }

  async processRefund(
    transactionId: string, 
    amount: number, 
    reason: string,
    adminId: string
  ) {
    try {
      // Get transaction details
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .maybeSingle();

      if (!transaction) throw new Error('Transaction not found');

      // For now, just create a refund transaction record
      // In production, this would process the actual refund through Stripe/PayPal
      
      // Create refund transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: transaction.user_id,
          type: 'refund',
          status: 'succeeded',
          amount: amount,
          currency: transaction.currency,
          payment_provider: transaction.payment_provider,
          description: `Refund for ${transaction.description}`,
          metadata: {
            original_transaction_id: transactionId,
            refund_reason: reason,
            processed_by: adminId
          }
        });

      // Update original transaction
      await supabase
        .from('transactions')
        .update({
          status: amount >= transaction.amount ? 'refunded' : 'partially_refunded',
          refunded_amount: (transaction.refunded_amount || 0) + amount,
          refund_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      // Log admin action
      await supabase
        .from('billing_audit_log')
        .insert({
          admin_id: adminId,
          target_user_id: transaction.user_id,
          action: 'process_refund',
          entity_type: 'transaction',
          entity_id: transactionId,
          old_values: { refunded_amount: transaction.refunded_amount || 0 },
          new_values: { refunded_amount: (transaction.refunded_amount || 0) + amount },
          reason: reason
        });

      return { success: true, refunded: true };
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  async exportBillingData(filters: any) {
    try {
      // Get filtered data
      const subscriptions = await this.searchBillingRecords(filters);
      
      // Format for CSV
      const csvData = subscriptions.map(sub => ({
        'User ID': sub.user_id,
        'User Name': sub.users?.name || '',
        'User Email': sub.users?.email || '',
        'Plan': sub.membership_plans?.name || '',
        'Status': sub.status,
        'Provider': sub.payment_provider,
        'Started': new Date(sub.created_at).toLocaleDateString(),
        'Current Period End': new Date(sub.current_period_end).toLocaleDateString(),
        'Cancel at Period End': sub.cancel_at_period_end ? 'Yes' : 'No',
        'Monthly/Yearly': sub.membership_plans?.billing_period || '',
        'Price': sub.membership_plans?.price || 0
      }));

      return csvData;
    } catch (error) {
      console.error('Error exporting billing data:', error);
      throw error;
    }
  }
}

export const billingService = new BillingService(); 