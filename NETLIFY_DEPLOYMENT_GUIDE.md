# 🚀 Netlify Deployment Guide - Multi-Provider Payment System

## 📋 **COMPLETE NETLIFY SETUP INSTRUCTIONS**

### **STEP 1: NETLIFY ENVIRONMENT VARIABLES**

**James, you need to add these environment variables in your Netlify dashboard:**

1. **Go to**: Netlify Dashboard → Your Site → Site Settings → Environment Variables
2. **Add these variables**:

```bash
# Existing Variables (keep these)
VITE_SUPABASE_URL=https://nqvisvranvjaghvrdaaz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key (for Edge Functions)
STRIPE_WEBHOOK_SECRET=whsec_... # Your Stripe webhook secret

# PayPal Configuration
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id_here
VITE_PAYPAL_ENVIRONMENT=sandbox # or 'production' for live
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id_here

# Frontend Configuration
FRONTEND_URL=https://your-site.netlify.app # Your Netlify site URL
```

### **STEP 2: SUPABASE EDGE FUNCTIONS DEPLOYMENT**

**Deploy the new Edge Functions to Supabase:**

```bash
# Deploy all new payment functions
supabase functions deploy create-paypal-payment
supabase functions deploy confirm-paypal-payment
supabase functions deploy process-refund
supabase functions deploy paypal-webhook

# Set environment variables for Edge Functions
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
supabase secrets set PAYPAL_CLIENT_ID=your_paypal_client_id
supabase secrets set PAYPAL_CLIENT_SECRET=your_paypal_client_secret
supabase secrets set PAYPAL_ENVIRONMENT=sandbox
supabase secrets set PAYPAL_WEBHOOK_ID=your_paypal_webhook_id
supabase secrets set FRONTEND_URL=https://your-site.netlify.app
```

### **STEP 3: STRIPE CONFIGURATION**

1. **Login to Stripe Dashboard**
2. **Go to**: Developers → Webhooks
3. **Create New Webhook**:
   - **URL**: `https://nqvisvranvjaghvrdaaz.supabase.co/functions/v1/stripe-webhook`
   - **Events**: Select these events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

4. **Copy the webhook secret** and add it to your environment variables

### **STEP 4: PAYPAL CONFIGURATION**

1. **Login to PayPal Developer Dashboard**
2. **Create New App**:
   - **App Name**: Car Audio Events
   - **Merchant**: Your business account
   - **Features**: Accept payments, Vault, Subscriptions

3. **Configure Webhooks**:
   - **URL**: `https://nqvisvranvjaghvrdaaz.supabase.co/functions/v1/paypal-webhook`
   - **Events**: Select these events:
     - `CHECKOUT.ORDER.APPROVED`
     - `PAYMENT.CAPTURE.COMPLETED`
     - `PAYMENT.CAPTURE.DENIED`
     - `PAYMENT.CAPTURE.REFUNDED`

4. **Copy Client ID and Secret** to environment variables

### **STEP 5: NETLIFY BUILD CONFIGURATION**

**Update your `netlify.toml` file:**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "https://nqvisvranvjaghvrdaaz.supabase.co/functions/v1/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[functions]
  node_bundler = "esbuild"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### **STEP 6: PACKAGE.JSON UPDATES**

**Add PayPal SDK to your dependencies:**

```json
{
  "dependencies": {
    "@stripe/stripe-js": "^2.4.0",
    "react": "^18.3.1",
    "typescript": "^5.5.3"
  },
  "scripts": {
    "build": "tsc && vite build",
    "preview": "vite preview",
    "deploy": "npm run build && netlify deploy --prod"
  }
}
```

### **STEP 7: DEPLOYMENT COMMANDS**

**Run these commands to deploy:**

```bash
# 1. Build the project
npm run build

# 2. Deploy to Netlify
netlify deploy --prod

# 3. Verify deployment
netlify open
```

## 🔒 **SECURITY CHECKLIST**

- ✅ **Environment Variables**: All sensitive keys stored in Netlify environment variables
- ✅ **HTTPS Only**: All webhook URLs use HTTPS
- ✅ **Webhook Signatures**: Both Stripe and PayPal webhooks verify signatures
- ✅ **RLS Policies**: Database access controlled by Row Level Security
- ✅ **30-Day Policy**: Refund policy automatically enforced by database constraints
- ✅ **User Authentication**: All payment operations require valid user session

## 🧪 **TESTING INSTRUCTIONS**

### **Test Stripe Payments**:
1. Use test card: `4242 4242 4242 4242`
2. Any future expiry date
3. Any 3-digit CVC

### **Test PayPal Payments**:
1. Use PayPal sandbox account
2. Login with test credentials
3. Complete payment flow

### **Test Refunds**:
1. Make a test payment
2. Wait 1 minute for processing
3. Request refund through RefundManager component
4. Verify refund appears in both provider dashboards

## 🔧 **TROUBLESHOOTING**

### **Common Issues**:

1. **PayPal SDK Not Loading**:
   - Check `VITE_PAYPAL_CLIENT_ID` is set
   - Verify client ID is for correct environment

2. **Stripe Elements Not Mounting**:
   - Check `VITE_STRIPE_PUBLISHABLE_KEY` is set
   - Verify key matches environment

3. **Webhook Failures**:
   - Check Edge Function logs in Supabase
   - Verify webhook URLs are accessible
   - Confirm environment variables are set

4. **Refund Policy Issues**:
   - Verify database functions are deployed
   - Check RLS policies are active
   - Confirm 30-day constraint is working

### **Debug Commands**:

```bash
# Check Netlify environment variables
netlify env:list

# View build logs
netlify logs

# Test Edge Functions locally
supabase functions serve

# Check database connection
supabase db reset --linked
```

## 📊 **MONITORING & ANALYTICS**

### **Set up monitoring for**:
- Payment success/failure rates
- Refund request patterns
- Provider performance comparison
- Error tracking and alerts

### **Key Metrics to Track**:
- Conversion rates by provider
- Average payment processing time
- Refund request frequency
- User payment method preferences

## 🎯 **POST-DEPLOYMENT VERIFICATION**

**After deployment, verify these work**:

1. ✅ **Stripe Payments**: Credit card payments process successfully
2. ✅ **PayPal Payments**: PayPal orders create and capture correctly
3. ✅ **Refund Requests**: 30-day policy enforced, refunds process
4. ✅ **Webhook Processing**: Both providers' webhooks update database
5. ✅ **Admin Dashboard**: Refund management interface works
6. ✅ **Mobile Compatibility**: Payment forms work on mobile devices

## 🚨 **EMERGENCY PROCEDURES**

**If payments fail**:
1. Check Netlify function logs
2. Verify Supabase Edge Function status
3. Test webhook endpoints manually
4. Rollback to previous deployment if needed

**If refunds fail**:
1. Process refunds manually in provider dashboards
2. Update database records manually
3. Investigate webhook delivery issues

---

## 📞 **SUPPORT CONTACTS**

- **Stripe Support**: https://support.stripe.com
- **PayPal Developer Support**: https://developer.paypal.com/support
- **Supabase Support**: https://supabase.com/support
- **Netlify Support**: https://www.netlify.com/support

**James, this guide provides everything you need to deploy the multi-provider payment system to Netlify with full security and monitoring capabilities.** 