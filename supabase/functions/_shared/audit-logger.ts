import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AuditLogEntry {
  user_id?: string;
  event_id?: string;
  transaction_id?: string;
  action: string;
  provider?: string;
  payment_intent_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  error_message?: string;
}

export class AuditLogger {
  private supabase: any;

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Call the log_payment_event function
      const { error } = await this.supabase.rpc('log_payment_event', {
        p_user_id: entry.user_id || null,
        p_event_id: entry.event_id || null,
        p_transaction_id: entry.transaction_id || null,
        p_action: entry.action,
        p_provider: entry.provider || null,
        p_payment_intent_id: entry.payment_intent_id || null,
        p_amount: entry.amount || null,
        p_currency: entry.currency || 'USD',
        p_status: entry.status || null,
        p_metadata: entry.metadata || {},
        p_ip_address: entry.ip_address || null,
        p_user_agent: entry.user_agent || null,
        p_error_message: entry.error_message || null
      });

      if (error) {
        console.error('Failed to log audit entry:', error);
      }
    } catch (err) {
      console.error('Audit logging error:', err);
      // Don't throw - audit logging should not break the main flow
    }
  }

  // Helper method to extract request info
  getRequestInfo(req: Request): { ip_address?: string; user_agent?: string } {
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('cf-connecting-ip') || 
                      req.headers.get('x-real-ip') ||
                      undefined;
                      
    const user_agent = req.headers.get('user-agent') || undefined;
    
    return { ip_address, user_agent };
  }

  // Common audit actions
  static Actions = {
    // Payment intent actions
    PAYMENT_INTENT_CREATED: 'payment_intent_created',
    PAYMENT_INTENT_CONFIRMED: 'payment_intent_confirmed',
    PAYMENT_INTENT_FAILED: 'payment_intent_failed',
    PAYMENT_INTENT_CANCELED: 'payment_intent_canceled',
    
    // Webhook actions
    WEBHOOK_RECEIVED: 'webhook_received',
    WEBHOOK_PROCESSED: 'webhook_processed',
    WEBHOOK_FAILED: 'webhook_failed',
    
    // Refund actions
    REFUND_REQUESTED: 'refund_requested',
    REFUND_PROCESSED: 'refund_processed',
    REFUND_FAILED: 'refund_failed',
    
    // Payout actions
    PAYOUT_CREATED: 'payout_created',
    PAYOUT_COMPLETED: 'payout_completed',
    
    // Verification actions
    VERIFICATION_STARTED: 'verification_started',
    VERIFICATION_COMPLETED: 'verification_completed',
    
    // Security actions
    RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
    SECURITY_ALERT: 'security_alert',
    INVALID_SIGNATURE: 'invalid_signature',
    UNAUTHORIZED_ACCESS: 'unauthorized_access'
  };
}