# Environment Variables Setup

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://nqvisvranvjaghvrdaaz.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Stripe Configuration (if needed)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
```

## How to Get Your Supabase Anon Key

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `car-audio-events`
3. Go to Settings → API
4. Copy the "anon public" key (NOT the service_role key)
5. Replace `your_anon_key_here` with the actual key

## Netlify Environment Variables

You also need to set these same environment variables in your Netlify dashboard:

1. Go to your Netlify site dashboard
2. Go to Site settings → Environment variables
3. Add each variable with the same names and values

## Security Note

- Never commit the `.env` file to git (it's already in .gitignore)
- Never use the service_role key in frontend code
- Only use the anon key for client-side applications 