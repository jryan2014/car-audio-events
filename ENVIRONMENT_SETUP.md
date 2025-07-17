# Environment Variable Setup Guide

## Overview
This project uses environment variables to manage sensitive configuration like API keys. These should never be hardcoded in the source code.

## Local Development Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your development API keys in the `.env` file
3. The `.env` file is gitignored and should NEVER be committed

## Production Setup (Netlify)

Set the following environment variables in your Netlify dashboard:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_GOOGLE_MAPS_API_KEY` - Your Google Maps API key (restricted to your domains)
- `VITE_HCAPTCHA_SITE_KEY` - Your hCaptcha site key
- `VITE_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (if using Stripe)
- `VITE_PAYPAL_CLIENT_ID` - Your PayPal client ID (if using PayPal)

## Security Best Practices

1. **Google Maps API Key**:
   - Create separate keys for development and production
   - Restrict production key to your domain(s)
   - Restrict development key to localhost

2. **Supabase Keys**:
   - The anon key is safe to expose (it's designed for client-side use)
   - NEVER expose the service role key in client-side code

3. **Regular Key Rotation**:
   - Rotate API keys periodically
   - Immediately rotate any key that may have been exposed

## Troubleshooting

If you see "Missing Supabase configuration" errors:
1. Ensure `.env` file exists in the project root
2. Check that all required variables are set
3. Restart the dev server after creating/modifying `.env`

## Important Notes

- Vite automatically loads `.env` files - no special configuration needed
- Environment variables must start with `VITE_` to be exposed to the client
- The `netlify.toml` file should NOT contain any API keys