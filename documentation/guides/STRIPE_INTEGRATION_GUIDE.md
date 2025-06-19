# 💳 Stripe Payment Integration Guide

## 🎯 Overview

The Car Audio Events Platform now includes a complete **Stripe payment integration** for event registration monetization. This system provides secure, PCI-compliant payment processing with comprehensive transaction management.

## 🏗️ Architecture

### **Frontend Components**
- **PaymentForm.tsx** - Modern Stripe Elements payment interface
- **Event Registration Flow** - Integrated payment collection
- **Payment History** - User transaction dashboard

### **Backend Infrastructure**
- **Supabase Edge Functions** - Server-side payment processing
- **Database Tables** - Transaction and registration records
- **Webhook Handlers** - Payment status synchronization

### **Security Features**
- **Row Level Security (RLS)** - Database access control
- **User Authentication** - Verified payment authorization
- **Payment Intent Validation** - Secure transaction processing

## 🚀 Quick Start

### **1. Environment Setup**

Create a `.env` file with required variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration (Client-side)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### **2. Supabase Environment Variables**

Set these in your **Supabase Dashboard → Settings → Edge Functions**:

```bash
# Stripe Configuration (Server-side)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Supabase Configuration
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **3. Deploy Integration**

Run the automated deployment script:

```bash
npm run deploy:stripe
```

This script will:
- ✅ Validate environment configuration
- ✅ Deploy Supabase Edge Functions
- ✅ Run database migrations
- ✅ Test payment flow connectivity
- ✅ Generate deployment report

## 📋 Manual Setup

### **Step 1: Database Migration**

Run the payment system migration:

```bash
supabase db push
```

This creates:
- `payments` table with RLS policies
- `event_registrations` payment integration
- `payment_history` view for reporting
- Helper functions for payment management

### **Step 2: Deploy Edge Functions**

Deploy the three payment functions:

```bash
supabase functions deploy create-payment-intent
supabase functions deploy confirm-payment
supabase functions deploy stripe-webhook
```

### **Step 3: Configure Stripe Webhook**

1. Go to **Stripe Dashboard → Webhooks**
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
4. Copy webhook secret to Supabase environment variables

## 🔧 Edge Functions

### **create-payment-intent**

Creates secure payment intents for event registration.

**Endpoint:** `/functions/v1/create-payment-intent`

**Request:**
```json
{
  "amount": 5000,
  "currency": "usd",
  "metadata": {
    "event_id": "uuid",
    "event_title": "Championship Finals"
  }
}
```

**Response:**
```json
{
  "client_secret": "pi_xxx_secret_xxx",
  "payment_intent_id": "pi_xxx"
}
```

### **confirm-payment**

Confirms payment completion and creates event registrations.

**Endpoint:** `/functions/v1/confirm-payment`

**Request:**
```json
{
  "payment_intent_id": "pi_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "payment_intent": {
    "id": "pi_xxx",
    "status": "succeeded",
    "amount": 5000,
    "currency": "usd"
  }
}
```

### **stripe-webhook**

Handles Stripe webhook events for payment synchronization.

**Endpoint:** `/functions/v1/stripe-webhook`

**Events Processed:**
- `payment_intent.succeeded` - Creates payment record and event registration
- `payment_intent.payment_failed` - Updates payment status to failed
- `payment_intent.canceled` - Removes event registration

## 🗄️ Database Schema

### **payments Table**

```sql
CREATE TABLE payments (
  id text PRIMARY KEY,                    -- Stripe Payment Intent ID
  user_id uuid NOT NULL,                 -- User who made payment
  amount integer NOT NULL,               -- Amount in cents
  currency text DEFAULT 'usd',           -- Payment currency
  status text NOT NULL,                  -- Payment status
  metadata jsonb DEFAULT '{}',           -- Additional payment data
  stripe_payment_intent_id text UNIQUE,  -- Stripe reference
  created_at timestamptz DEFAULT now(),  -- Creation timestamp
  updated_at timestamptz DEFAULT now()   -- Last update timestamp
);
```

### **event_registrations Integration**

```sql
ALTER TABLE event_registrations 
ADD COLUMN payment_id text REFERENCES payments(id);

ALTER TABLE event_registrations 
ADD COLUMN registration_date timestamptz DEFAULT now();
```

### **payment_history View**

Comprehensive view combining payments with event and user data:

```sql
SELECT 
  p.id,
  p.amount,
  p.currency,
  p.status,
  e.title as event_title,
  e.date as event_date,
  prof.first_name,
  prof.last_name
FROM payments p
LEFT JOIN event_registrations er ON p.id = er.payment_id
LEFT JOIN events e ON er.event_id = e.id
LEFT JOIN profiles prof ON p.user_id = prof.id;
```

## 🔐 Security

### **Row Level Security (RLS)**

All payment tables use RLS policies:

```sql
-- Users can only view their own payments
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
```

### **Payment Validation**

- User authentication required for all payment operations
- Payment intent ownership verification
- Minimum amount validation ($0.50 USD)
- Metadata validation and sanitization

## 🧪 Testing

### **Test Cards**

Use Stripe test cards for development:

```bash
# Successful Payment
4242 4242 4242 4242

# Declined Payment
4000 0000 0000 0002

# Requires Authentication
4000 0025 0000 3155

# Insufficient Funds
4000 0000 0000 9995
```

### **Test Flow**

1. Navigate to event registration
2. Enter test card details
3. Complete payment process
4. Verify payment record in database
5. Confirm event registration created

### **Webhook Testing**

Use Stripe CLI for local webhook testing:

```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

## 📊 Monitoring

### **Admin Dashboard**

Admins can monitor payments through:
- Payment history view
- Event registration reports
- Revenue analytics
- Failed payment tracking

### **Database Queries**

**Recent Payments:**
```sql
SELECT * FROM payment_history 
ORDER BY created_at DESC 
LIMIT 10;
```

**Revenue by Event:**
```sql
SELECT 
  event_title,
  COUNT(*) as registrations,
  SUM(amount) as total_revenue
FROM payment_history 
WHERE status = 'succeeded'
GROUP BY event_title;
```

**Failed Payments:**
```sql
SELECT * FROM payments 
WHERE status IN ('failed', 'canceled')
ORDER BY created_at DESC;
```

## 🚨 Troubleshooting

### **Common Issues**

**Payment Intent Creation Fails**
- Verify Stripe secret key is set correctly
- Check user authentication token
- Validate amount is at least $0.50

**Webhook Not Receiving Events**
- Verify webhook URL is correct
- Check webhook secret matches Stripe dashboard
- Ensure Edge Function is deployed

**Payment Confirmation Fails**
- Verify payment intent belongs to user
- Check database permissions
- Validate event_registrations table structure

### **Debug Commands**

**Check Edge Function Logs:**
```bash
supabase functions logs create-payment-intent
```

**Test Database Connection:**
```bash
supabase db diff
```

**Verify RLS Policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'payments';
```

## 🔄 Updates & Maintenance

### **Stripe API Updates**

The integration uses Stripe API version `2023-10-16`. To update:

1. Update API version in Edge Functions
2. Test payment flow thoroughly
3. Update webhook event handling if needed

### **Database Migrations**

For schema changes:

1. Create new migration file
2. Test in development environment
3. Run `supabase db push` to apply

### **Security Updates**

Regular security maintenance:

1. Rotate Stripe API keys quarterly
2. Review RLS policies annually
3. Update webhook secrets as needed
4. Monitor for suspicious payment patterns

## 📈 Performance Optimization

### **Database Indexes**

Key indexes for performance:

```sql
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
```

### **Edge Function Optimization**

- Use connection pooling for database queries
- Implement request caching where appropriate
- Monitor function execution time
- Optimize webhook processing speed

## 🎯 Next Steps

After successful deployment:

1. **Configure Stripe Dashboard** - Set up proper business information
2. **Test Payment Flow** - Comprehensive testing with test cards
3. **Monitor Transactions** - Set up alerts and monitoring
4. **User Training** - Train staff on payment management
5. **Go Live** - Switch to live Stripe keys for production

## 📞 Support

For integration support:

- **Documentation**: Review this guide and Stripe documentation
- **Logs**: Check Supabase Edge Function logs
- **Testing**: Use Stripe test environment extensively
- **Community**: Consult Stripe and Supabase communities

---

**🎉 Congratulations!** Your Stripe payment integration is now complete and ready for production use. The platform can now monetize event registrations with secure, professional payment processing. 