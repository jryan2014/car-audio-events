# Setting Up Supabase Edge Functions Environment Variables

## Step 1: Run the SQL Query
First, run the `GET_PAYMENT_KEYS_FOR_ENV.sql` query in your Supabase SQL Editor to retrieve your current payment keys.

## Step 2: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/nqvisvranvjaghvrdaaz
2. Navigate to **Settings** → **Edge Functions**
3. Click on **Manage secrets**

## Step 3: Add Each Environment Variable

Based on your test page results, you need to add these variables:

### Core Payment Mode
- **Name**: `PAYMENT_MODE`
- **Value**: Get from SQL query result (likely "test" or "live")

### Stripe Test Keys (if using test mode)
- **Name**: `STRIPE_TEST_SECRET_KEY`
- **Value**: Your sk_test_... key from SQL query

- **Name**: `STRIPE_TEST_WEBHOOK_SECRET`
- **Value**: Your whsec_... test key from SQL query

### Stripe Live Keys (if using live mode)
- **Name**: `STRIPE_LIVE_SECRET_KEY`
- **Value**: Your sk_live_... key from SQL query

- **Name**: `STRIPE_LIVE_WEBHOOK_SECRET`
- **Value**: Your whsec_... live key from SQL query

### PayPal Keys
- **Name**: `PAYPAL_TEST_CLIENT_SECRET`
- **Value**: Your PayPal test secret from SQL query

- **Name**: `PAYPAL_LIVE_CLIENT_SECRET`
- **Value**: Your PayPal live secret from SQL query

### Current Mode Key (IMPORTANT)
- **Name**: `STRIPE_WEBHOOK_SECRET`
- **Value**: 
  - If PAYMENT_MODE = "test", copy the value from STRIPE_TEST_WEBHOOK_SECRET
  - If PAYMENT_MODE = "live", copy the value from STRIPE_LIVE_WEBHOOK_SECRET

## Step 4: Save and Deploy

1. After adding all variables, click **Save**
2. The variables will be available immediately to your Edge Functions
3. Refresh the test page at `/admin/test-payment-config` to verify

## Step 5: Redeploy Payment Functions

After setting the environment variables, redeploy your payment-related Edge Functions:

```bash
cd E:/2025-car-audio-events/car-audio-events

# Deploy all payment functions
npx supabase functions deploy stripe-webhook
npx supabase functions deploy create-payment-intent
npx supabase functions deploy confirm-payment
npx supabase functions deploy create-checkout-session
```

## Why This Matters

Setting these environment variables:
1. **Removes secrets from your database** - More secure
2. **Prevents exposure** - Secrets never sent to frontend
3. **Easier rotation** - Change secrets without database updates
4. **Environment isolation** - Different secrets for dev/staging/prod

## Troubleshooting

If variables still show as "NOT SET" after adding them:
1. Make sure you clicked "Save" in the Supabase dashboard
2. Try refreshing the Edge Functions page
3. Check that variable names match exactly (case-sensitive)
4. Redeploy the test function: `npx supabase functions deploy test-payment-env`