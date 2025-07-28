# How to Set EMAIL_QUEUE_CRON_SECRET in Supabase

## Step-by-Step Guide

### Step 1: Generate a Secure Secret
First, you need to generate a secure random string. Here are a few ways:

**Option A - Using Node.js (Recommended):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option B - Using OpenSSL:**
```bash
openssl rand -base64 32
```

**Option C - Using an online generator:**
Visit https://passwordsgenerator.net/ and generate a 32+ character random string with letters, numbers, and symbols.

**Example output:** `7Kg9mN3pQ8rS2tV5wX6yZ1aB4cD0eF`

### Step 2: Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Select your project: **car-audio-events** (or nqvisvranvjaghvrdaaz)

### Step 3: Navigate to Edge Functions Settings

1. In the left sidebar, look for **Edge Functions** (it's under the "Develop" section)
2. Click on **Edge Functions**
3. You'll see a list of your deployed functions

### Step 4: Access Function Secrets

1. Find `process-email-queue` in the list of functions
2. Click on the function name to open its details
3. Look for a tab or section called **"Secrets"** or **"Environment Variables"**
   - If you don't see it immediately, look for a "Settings" or "Configuration" tab

### Step 5: Add the Environment Variable

1. Click on **"Add Secret"** or **"New Secret"** button
2. Fill in the form:
   - **Name:** `EMAIL_QUEUE_CRON_SECRET`
   - **Value:** Paste the secure string you generated in Step 1
3. Click **"Save"** or **"Add"**

### Step 6: Update Your Cron Job URL

Now you need to update your cron job to include this secret. The cron job URL should look like:

```
https://nqvisvranvjaghvrdaaz.supabase.co/functions/v1/process-email-queue?cron_secret=YOUR_SECRET_HERE
```

Replace `YOUR_SECRET_HERE` with the same secret you just added.

### Step 7: Update the Cron Job

If you're using Supabase's built-in cron (pg_cron):

1. Go to **SQL Editor** in your Supabase dashboard
2. Run this query to see your current cron jobs:
   ```sql
   SELECT * FROM cron.job;
   ```
3. Update the job with your new URL:
   ```sql
   SELECT cron.schedule(
     'process-email-queue',
     '*/2 * * * *', -- every 2 minutes
     $$
     SELECT net.http_post(
       url := 'https://nqvisvranvjaghvrdaaz.supabase.co/functions/v1/process-email-queue?cron_secret=YOUR_SECRET_HERE',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb
     ) AS request_id;
     $$
   );
   ```

### Alternative: Using External Cron Service

If using an external cron service (like cron-job.org, EasyCron, etc.):

1. Log into your cron service
2. Find the job for processing emails
3. Update the URL to include `?cron_secret=YOUR_SECRET_HERE`
4. Save the changes

## Verification

### Test the Edge Function

You can test if the secret is working by making a curl request:

```bash
curl -X POST https://nqvisvranvjaghvrdaaz.supabase.co/functions/v1/process-email-queue?cron_secret=YOUR_SECRET_HERE
```

You should get a successful response if the secret matches.

### Check Function Logs

1. In Supabase Dashboard, go to **Edge Functions**
2. Click on `process-email-queue`
3. Click on **"Logs"** tab
4. You should see successful executions

## Troubleshooting

### If the secret doesn't work:

1. **Check for typos** - Make sure the secret in the environment variable matches exactly what's in your cron URL
2. **Check logs** - Look at the Edge Function logs for any authentication errors
3. **Restart function** - Sometimes you need to redeploy the function after adding secrets:
   ```bash
   npx supabase functions deploy process-email-queue
   ```

### Common Issues:

- **401 Unauthorized**: The secret doesn't match or isn't set
- **Function timeout**: Normal if there are no emails to process
- **CORS errors**: These are handled in the function, shouldn't be an issue

## Security Notes

- **Never commit the secret** to your code repository
- **Use a different secret** for production vs development
- **Rotate the secret** periodically (every 3-6 months)
- **Monitor logs** for unauthorized access attempts

## Next Steps

Once you've set this up:
1. Monitor the email queue to ensure emails are being processed
2. Check that your cron job is running at the expected intervals
3. Set up alerts for failed email processing if needed

---

Need help? Check the Edge Function logs in your Supabase dashboard for detailed error messages.