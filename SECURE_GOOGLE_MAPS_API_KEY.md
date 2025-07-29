# Securing Your Google Maps API Key

## Overview
Google Maps API keys are meant to be used in frontend code, but they must be properly restricted to prevent abuse. This guide shows you how to secure your API key in Google Cloud Console.

## Step 1: Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Find your Google Maps API key or create a new one

## Step 2: Set HTTP Referrer Restrictions

This is the most important security measure:

1. Click on your API key name
2. Under **Application restrictions**, select **HTTP referrers (websites)**
3. Add these referrers:
   ```
   https://caraudioevents.com/*
   https://www.caraudioevents.com/*
   http://localhost:5173/*
   ```
   
   **Important**: 
   - Use exact domain names
   - Include both www and non-www versions
   - Add localhost only for development keys
   - Use wildcards (*) to cover all paths

## Step 3: Restrict API Access

1. Under **API restrictions**, select **Restrict key**
2. Enable only these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API (if needed)
   
3. Click **Save**

## Step 4: Set Usage Quotas

Prevent unexpected charges:

1. Go to **APIs & Services** → **Enabled APIs**
2. Click on **Maps JavaScript API**
3. Go to **Quotas** tab
4. Set daily request limits:
   - Map loads per day: 10,000 (adjust based on your needs)
   - Map loads per minute: 100
   
5. Repeat for other enabled APIs

## Step 5: Monitor Usage

1. Set up billing alerts:
   - Go to **Billing** → **Budgets & alerts**
   - Create a budget with alerts at 50%, 90%, and 100%

2. Enable API monitoring:
   - Go to **APIs & Services** → **Metrics**
   - Create dashboards for API usage
   - Set up anomaly detection

## Step 6: Best Practices

### Development vs Production Keys
- Use separate API keys for development and production
- Development keys should have localhost restrictions
- Production keys should only allow your production domains

### Environment Variables
Keep your API key in environment variables:

```bash
# .env.local (development)
VITE_GOOGLE_MAPS_API_KEY=your_dev_api_key_here

# Production environment (Netlify/Vercel)
VITE_GOOGLE_MAPS_API_KEY=your_prod_api_key_here
```

### Key Rotation
- Rotate API keys every 90 days
- Keep a key rotation schedule
- Update environment variables when rotating

## Step 7: Test Your Restrictions

1. Try to use your API key from an unauthorized domain:
   ```javascript
   // This should fail from unauthorized domains
   fetch(`https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY`)
   ```

2. Check the console for errors like:
   ```
   Google Maps JavaScript API error: RefererNotAllowedMapError
   ```

## Security Checklist

- [ ] HTTP referrer restrictions configured
- [ ] API restrictions enabled (only necessary APIs)
- [ ] Usage quotas set
- [ ] Billing alerts configured
- [ ] Separate dev/prod keys
- [ ] Monitoring enabled
- [ ] Key stored in environment variables
- [ ] Regular key rotation scheduled

## What This Prevents

1. **Unauthorized Usage**: Only your domains can use the key
2. **API Abuse**: Quotas prevent excessive usage
3. **Unexpected Charges**: Billing alerts notify you of unusual activity
4. **Key Theft**: Even if someone gets your key, they can't use it from their domain

## Important Notes

- Google Maps API keys are designed to be public (in frontend code)
- Security comes from restrictions, not from hiding the key
- Monitor your usage regularly
- Respond quickly to any security alerts

## Troubleshooting

### "RefererNotAllowedMapError"
- Check that your domain is in the allowed referrers list
- Ensure you included both http and https versions if needed
- Verify wildcards are properly placed

### Maps not loading in development
- Add `http://localhost:5173/*` to allowed referrers
- Check that your development port matches

### Quota exceeded errors
- Review your quota settings
- Check for unusual usage patterns
- Consider implementing caching

---

**Remember**: The security of Google Maps API keys relies on proper restrictions in Google Cloud Console, not on keeping the key secret.