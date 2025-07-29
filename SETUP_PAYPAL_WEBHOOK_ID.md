# Setting up PayPal Webhook ID for Signature Verification

## Overview
To secure your PayPal webhooks against forgery, you must configure the webhook ID in your Supabase environment variables. This ID is used to verify that webhook events are genuinely from PayPal.

## Step 1: Get Your PayPal Webhook ID

### For Sandbox Environment:
1. Log in to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Navigate to **Apps & Credentials**
3. Select your sandbox app
4. Click on **Webhooks** in the left sidebar
5. If you don't have a webhook yet:
   - Click **Add Webhook**
   - Enter webhook URL: `https://nqvisvranvjaghvrdaaz.supabase.co/functions/v1/paypal-webhook`
   - Select these event types:
     - `PAYMENT.CAPTURE.COMPLETED`
     - `PAYMENT.CAPTURE.DENIED`
     - `PAYMENT.CAPTURE.REFUNDED`
     - `BILLING.SUBSCRIPTION.CREATED`
     - `BILLING.SUBSCRIPTION.ACTIVATED`
     - `BILLING.SUBSCRIPTION.CANCELLED`
     - `BILLING.SUBSCRIPTION.SUSPENDED`
     - `BILLING.SUBSCRIPTION.EXPIRED`
     - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
   - Click **Save**
6. Copy the **Webhook ID** (it looks like: `1A2B3C4D5E6F7G8H9I0J`)

### For Production Environment:
1. Log in to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Navigate to **Apps & Credentials**
3. Switch to **Live** mode (toggle at top)
4. Select your live app
5. Follow steps 5-6 above with your production webhook URL

## Step 2: Add Webhook ID to Supabase Edge Functions

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **car-audio-events**
3. Navigate to **Edge Functions** in the sidebar
4. Click on **paypal-webhook** function
5. Go to the **Secrets** or **Environment Variables** tab
6. Add these environment variables:

   ```
   PAYPAL_WEBHOOK_ID=your_webhook_id_here
   PAYPAL_CLIENT_ID=your_client_id_here
   PAYPAL_CLIENT_SECRET=your_client_secret_here
   PAYPAL_ENVIRONMENT=sandbox_or_production
   ```

   **Important**: Make sure you're using the correct values for your environment (sandbox vs production)

## Step 3: Verify Configuration

Test your webhook configuration:

```bash
# Test webhook (replace with actual PayPal webhook headers and body)
curl -X POST https://nqvisvranvjaghvrdaaz.supabase.co/functions/v1/paypal-webhook \
  -H "paypal-transmission-id: test-id" \
  -H "paypal-transmission-time: 2024-01-01T00:00:00Z" \
  -H "paypal-transmission-sig: test-signature" \
  -H "paypal-cert-url: https://api.paypal.com/cert" \
  -H "paypal-auth-algo: SHA256withRSA" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"PAYMENT.CAPTURE.COMPLETED","id":"test-event"}'
```

You should receive a 401 error with "Invalid webhook signature" - this confirms signature verification is working.

## Security Notes

1. **Never share your webhook ID or secrets**
2. **Use different webhook IDs for sandbox and production**
3. **Rotate your webhook ID if you suspect it's been compromised**
4. **Monitor webhook logs for suspicious activity**

## Troubleshooting

### Common Issues:

1. **"Webhook configuration error" (500)**
   - Ensure all PayPal environment variables are set
   - Check that PAYPAL_WEBHOOK_ID is not empty

2. **"Invalid webhook signature" (401)**
   - Verify webhook ID matches PayPal dashboard
   - Ensure you're using the correct environment (sandbox vs production)
   - Check that PayPal headers are being passed correctly

3. **Rate limiting (429)**
   - Normal if receiving many webhooks
   - Implement retry logic with exponential backoff

### Viewing Logs:

```bash
npx supabase functions logs paypal-webhook --tail
```

## Next Steps

1. Test with real PayPal sandbox payments
2. Monitor webhook logs in Supabase dashboard
3. Set up alerts for webhook failures
4. Configure production webhook when ready

---

**Security Note**: This webhook now verifies signatures, preventing forged webhook attacks. Always keep your webhook ID and credentials secure.