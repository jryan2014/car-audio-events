# Netlify Environment Variables

This file documents all environment variables that need to be set in Netlify for production deployment.

## Required Environment Variables

### Supabase Configuration
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Google Maps
- `VITE_GOOGLE_MAPS_API_KEY` - Your Google Maps API key (restricted to your domain)

### hCaptcha
- `VITE_HCAPTCHA_SITE_KEY` - Your hCaptcha site key

### TinyMCE Editor (Optional)
- `VITE_TINYMCE_API_KEY` - Your TinyMCE API key
  - Note: This is optional as we have a fallback hardcoded in `src/config/tinymce.ts`
  - The hardcoded key is: `2l8fxsmp22j75yhpuwrv2rbm6ygm83mk72jr7per4x4j77hl`
  - TinyMCE keys are domain-restricted and safe to be public

### Payment Providers (Optional)
- `VITE_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `VITE_PAYPAL_CLIENT_ID` - Your PayPal client ID

## Setting Environment Variables in Netlify

1. Go to your Netlify dashboard
2. Select your site
3. Go to Site settings → Environment variables
4. Add each variable with its value
5. Deploy your site - the variables will be available during the build

## Notes

- All environment variables prefixed with `VITE_` are exposed to the client-side code
- Never put sensitive keys (like Supabase service role key) in VITE_ variables
- The TinyMCE API key is hardcoded as a fallback to prevent issues when agents overwrite the .env file