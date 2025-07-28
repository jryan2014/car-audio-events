# Payment Audit Logging Documentation

## Overview

The payment audit logging system provides comprehensive tracking of all payment-related activities in the Car Audio Events platform. This system helps with security monitoring, debugging, compliance, and customer support.

## Architecture

### Database Schema

The audit logs are stored in the `payment_audit_logs` table:

```sql
CREATE TABLE payment_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  action text NOT NULL,
  provider text CHECK (provider IN ('stripe', 'paypal', 'system')),
  payment_intent_id text,
  amount decimal(10,2),
  currency text DEFAULT 'USD',
  status text,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  error_message text,
  created_at timestamp with time zone DEFAULT NOW()
);
```

### Audit Actions

The system tracks the following actions:

- **Payment Intent Actions**
  - `payment_intent_created` - Payment intent created
  - `payment_intent_confirmed` - Payment successfully confirmed
  - `payment_intent_failed` - Payment failed
  - `payment_intent_canceled` - Payment canceled by user

- **Webhook Actions**
  - `webhook_received` - Webhook event received from provider
  - `webhook_processed` - Webhook successfully processed
  - `webhook_failed` - Webhook processing failed

- **Refund Actions**
  - `refund_requested` - Refund requested by user
  - `refund_processed` - Refund completed
  - `refund_failed` - Refund failed

- **Security Actions**
  - `rate_limit_exceeded` - Rate limit hit
  - `security_alert` - Security issue detected
  - `invalid_signature` - Invalid webhook signature
  - `unauthorized_access` - Unauthorized access attempt

### Edge Function Integration

The audit logging is integrated into the following Edge Functions:

1. **create-payment-intent**
   - Logs payment intent creation
   - Logs rate limit violations
   - Logs payment failures

2. **stripe-webhook**
   - Logs webhook receipt and processing
   - Logs payment confirmations and failures
   - Logs refund processing
   - Logs security events

3. **paypal-webhook**
   - Logs webhook receipt and processing
   - Logs payment captures and denials
   - Logs refund processing

### Security Features

1. **Row Level Security (RLS)**
   - Admin users can read all audit logs
   - Regular users can read their own payment audit logs
   - Only service role can insert audit logs

2. **IP Address Tracking**
   - Captures IP address from X-Forwarded-For, CF-Connecting-IP headers
   - Helps identify suspicious patterns

3. **User Agent Tracking**
   - Records browser/client information
   - Useful for debugging integration issues

## Usage

### Database Function

Use the `log_payment_event` function to log payment events:

```sql
SELECT log_payment_event(
  p_user_id => 'user-uuid',
  p_event_id => 'event-uuid',
  p_transaction_id => 'transaction-uuid',
  p_action => 'payment_intent_created',
  p_provider => 'stripe',
  p_payment_intent_id => 'pi_1234567890',
  p_amount => 99.99,
  p_currency => 'USD',
  p_status => 'pending',
  p_metadata => '{"additional": "data"}',
  p_ip_address => '192.168.1.1',
  p_user_agent => 'Mozilla/5.0...',
  p_error_message => NULL
);
```

### Querying Audit Logs

**Find all failed payments for a user:**
```sql
SELECT * FROM payment_audit_logs
WHERE user_id = 'user-uuid'
AND action IN ('payment_intent_failed', 'payment_intent_canceled')
ORDER BY created_at DESC;
```

**Monitor rate limit violations:**
```sql
SELECT 
  ip_address,
  COUNT(*) as violation_count,
  MAX(created_at) as last_violation
FROM payment_audit_logs
WHERE action = 'rate_limit_exceeded'
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
ORDER BY violation_count DESC;
```

**Track payment success rate:**
```sql
SELECT 
  provider,
  COUNT(CASE WHEN action = 'payment_intent_confirmed' THEN 1 END) as successful,
  COUNT(CASE WHEN action = 'payment_intent_failed' THEN 1 END) as failed,
  ROUND(
    COUNT(CASE WHEN action = 'payment_intent_confirmed' THEN 1 END)::numeric / 
    NULLIF(COUNT(CASE WHEN action IN ('payment_intent_confirmed', 'payment_intent_failed') THEN 1 END), 0) * 100, 
    2
  ) as success_rate
FROM payment_audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider;
```

**Find webhook processing errors:**
```sql
SELECT * FROM payment_audit_logs
WHERE action = 'webhook_failed'
AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

### Admin Dashboard Integration

The audit logs can be viewed in the admin dashboard by querying the `payment_audit_logs` table. Consider creating views for common queries:

```sql
-- Daily payment summary
CREATE VIEW payment_daily_summary AS
SELECT 
  DATE(created_at) as date,
  provider,
  COUNT(CASE WHEN action = 'payment_intent_created' THEN 1 END) as attempts,
  COUNT(CASE WHEN action = 'payment_intent_confirmed' THEN 1 END) as successful,
  COUNT(CASE WHEN action = 'payment_intent_failed' THEN 1 END) as failed,
  SUM(CASE WHEN action = 'payment_intent_confirmed' THEN amount END) as total_revenue
FROM payment_audit_logs
GROUP BY DATE(created_at), provider
ORDER BY date DESC;
```

## Monitoring & Alerts

Set up monitoring for:

1. **High failure rates** - Alert if success rate drops below 90%
2. **Rate limit violations** - Alert on repeated violations from same IP
3. **Webhook failures** - Alert on consistent webhook processing errors
4. **Security events** - Immediate alerts for invalid signatures or unauthorized access

## Data Retention

Consider implementing a data retention policy:

```sql
-- Archive logs older than 1 year
INSERT INTO payment_audit_logs_archive
SELECT * FROM payment_audit_logs
WHERE created_at < NOW() - INTERVAL '1 year';

-- Delete archived logs
DELETE FROM payment_audit_logs
WHERE created_at < NOW() - INTERVAL '1 year';
```

## Compliance

The audit logging system helps with:

- **PCI Compliance** - Track all payment-related activities
- **GDPR** - User data access tracking
- **Financial Audits** - Complete payment history
- **Dispute Resolution** - Evidence for chargebacks

## Best Practices

1. **Never log sensitive data** - Don't log full card numbers, CVV codes
2. **Use structured metadata** - Store additional data in JSONB metadata field
3. **Monitor performance** - Add indexes as needed for common queries
4. **Regular backups** - Ensure audit logs are included in backup strategy
5. **Access control** - Limit who can view audit logs to authorized personnel