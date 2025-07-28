# Redeploy Payment Edge Functions

After setting environment variables, redeploy these functions to pick up the new variables:

## Payment-Related Functions to Redeploy:

```bash
# Stripe webhook handler
npx supabase functions deploy stripe-webhook

# Payment intent creation
npx supabase functions deploy create-payment-intent

# Payment confirmation
npx supabase functions deploy confirm-payment

# If you have PayPal functions
npx supabase functions deploy paypal-webhook
npx supabase functions deploy create-paypal-payment
```

## Or redeploy all at once:
```bash
npx supabase functions deploy stripe-webhook && npx supabase functions deploy create-payment-intent && npx supabase functions deploy confirm-payment
```

These functions will now use the environment variables instead of database values for secret keys.