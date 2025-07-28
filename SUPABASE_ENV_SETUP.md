# Supabase Edge Functions Environment Variables

Add these in Supabase Dashboard > Settings > Functions > Manage secrets:

## Current Payment Mode
PAYMENT_MODE = [test or live - from your database 'mode' value]

## Stripe Secret Keys
STRIPE_TEST_SECRET_KEY = [Your sk_test_... key from database]
STRIPE_LIVE_SECRET_KEY = [Your sk_live_... key from database]
STRIPE_TEST_WEBHOOK_SECRET = [Your whsec_... test key from database]
STRIPE_LIVE_WEBHOOK_SECRET = [Your whsec_... live key from database]

## PayPal Secret Keys
PAYPAL_TEST_CLIENT_SECRET = [Your PayPal test secret from database]
PAYPAL_LIVE_CLIENT_SECRET = [Your PayPal live secret from database]

## Additional Required Variables (if not already set)
STRIPE_SECRET_KEY = [Same as STRIPE_TEST_SECRET_KEY if in test mode, or STRIPE_LIVE_SECRET_KEY if in live mode]
STRIPE_WEBHOOK_SECRET = [Same as STRIPE_TEST_WEBHOOK_SECRET if in test mode, or STRIPE_LIVE_WEBHOOK_SECRET if in live mode]

## Important Notes:
- These are SECRET keys - never expose them in frontend code
- Edge Functions can access these securely
- After adding, you may need to redeploy your Edge Functions