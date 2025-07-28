# Stripe Webhook Configuration

## Important: Webhook URL Format

Due to Supabase Edge Functions requiring authentication, you need to configure your webhook URL with the anon key.

### Step 1: Get Your Webhook URL

Your webhook endpoint URL should be:
```
https://nqvisvranvjaghvrdaaz.supabase.co/functions/v1/stripe-webhook
```

### Step 2: Configure in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter the endpoint URL from Step 1
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

### Step 3: Get the Signing Secret

After creating the endpoint:
1. Click on the webhook endpoint you just created
2. Click "Reveal" under "Signing secret"
3. Copy the secret (starts with `whsec_`)

### Step 4: Add to Supabase Environment Variables

Add this secret to Supabase Edge Functions environment variables:
- **Name**: `STRIPE_WEBHOOK_SECRET`
- **Value**: [Your whsec_ value]

### Alternative: Bypass Supabase Auth (If Needed)

If webhooks still don't work due to auth issues, you may need to:

1. Create a custom webhook handler that doesn't require auth
2. Or add the anon key to your webhook headers in Stripe

For now, the webhook function expects to validate the Stripe signature, which provides security even without Supabase auth.

## Testing Your Webhook

Once configured, you can test from Stripe Dashboard:
1. Go to your webhook endpoint
2. Click "Send test webhook"
3. Select an event type
4. Click "Send test webhook"

Check the webhook logs in both Stripe and Supabase to verify it's working.