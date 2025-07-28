# Netlify Environment Variables to Add

Add these in Netlify Dashboard > Site configuration > Environment variables:

## Stripe Public Keys
VITE_STRIPE_TEST_PUBLISHABLE_KEY = [Your pk_test_... key from database]
VITE_STRIPE_LIVE_PUBLISHABLE_KEY = [Your pk_live_... key from database]

## PayPal Public Keys  
VITE_PAYPAL_TEST_CLIENT_ID = [Your PayPal test client ID from database]
VITE_PAYPAL_LIVE_CLIENT_ID = [Your PayPal live client ID from database]

## Important Notes:
- Only add PUBLISHABLE keys and CLIENT IDs (not secrets!)
- The VITE_ prefix is required for Vite to expose them to the frontend
- These will be visible in your built JavaScript (that's OK - they're public keys)