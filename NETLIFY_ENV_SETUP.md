# Netlify Environment Variables Setup

The following environment variables need to be configured in your Netlify dashboard:

## Required Environment Variables

1. **VITE_SUPABASE_URL**
   - Value: `https://nqvisvranvjaghvrdaaz.supabase.co`
   - Description: Your Supabase project URL

2. **VITE_SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmlzdnJhbnZqYWdodnJkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDY2NzcsImV4cCI6MjA2NTE4MjY3N30.OWwP8kH9qTKxgEHCC6ru0QSAJ5KhOupCxMUyxHuYWVY`
   - Description: Your Supabase anonymous key (public)

3. **VITE_GOOGLE_MAPS_API_KEY**
   - Value: `AIzaSyBYMbq6u4tmOJKRnLww28MGe-7QOGmhjyM`
   - Description: Google Maps API key (remember to restrict to your domain in production)

4. **VITE_HCAPTCHA_SITE_KEY**
   - Value: `acc27e90-e7ae-451e-bbfa-c738c53420fe`
   - Description: hCaptcha site key (public)

## How to Add in Netlify

1. Go to your Netlify dashboard
2. Select your site
3. Go to Site Settings ’ Environment variables
4. Click "Add a variable"
5. For each variable:
   - Add the key (e.g., `VITE_SUPABASE_URL`)
   - Add the value
   - Set scope to "All scopes" (or adjust as needed)
6. Save and deploy

## Security Notes

- These are all public keys (they're exposed to the client anyway)
- The Google Maps API key should be restricted by referrer in the Google Cloud Console for production
- Never add secret keys (like Stripe secret key or Supabase service role key) as VITE_ variables