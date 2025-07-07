# Email System Architecture - Car Audio Events

## Current Email System Status (as of 2025-07-07)

### ✅ What's Still In Place (NOT REMOVED):

1. **Mailgun Email Service** - FULLY OPERATIONAL
   - Location: `supabase/functions/_shared/mailgun-email-service.ts`
   - Purpose: Sends actual emails via Mailgun API
   - Status: **ACTIVE AND UNCHANGED**

2. **Email Queue System** - FULLY OPERATIONAL
   - Table: `email_queue` in database
   - Processor: `supabase/functions/process-email-queue/index.ts`
   - Status: **ACTIVE AND UNCHANGED**

3. **Email Templates System** - FULLY OPERATIONAL
   - Table: `email_templates` in database
   - 60+ existing templates + 6 new payment templates
   - Admin UI: Still works at `/admin/settings` → Email Settings

### ❌ What Was Removed:

1. **Zoho Email Service**
   - Deleted: `supabase/functions/send-zoho-email/index.ts`
   - Reason: Redundant, not being used

2. **Postmark References**
   - Updated: `supabase/functions/_shared/edge-email-service.ts`
   - Removed Postmark SDK, now uses database queue instead
   - UI text updated to be generic

### 📧 How Email Sending Works Now:

```
1. Event Occurs (payment, subscription, etc.)
   ↓
2. Webhook/Function loads email template from database
   ↓
3. Template variables replaced ({{name}}, {{amount}}, etc.)
   ↓
4. Email queued in `email_queue` table
   ↓
5. Queue processor picks it up (runs periodically)
   ↓
6. MAILGUN sends the actual email
   ↓
7. Status updated in queue
```

### 🔧 Mailgun Configuration:

Your Mailgun service expects these environment variables:
- `MAILGUN_API_KEY` - Your Mailgun API key
- `MAILGUN_DOMAIN` - Your Mailgun domain
- `MAILGUN_FROM_EMAIL` - Default from email
- `MAILGUN_FROM_NAME` - Default from name

These should be set in your Supabase Edge Function environment.

### 📝 Email Templates Added:

1. `subscription_created` - Welcome email for new subscriptions
2. `subscription_cancelled` - Confirmation of cancellation
3. `subscription_expired` - Notification of expiration
4. `invoice_created` - New invoice notification
5. `membership_upgrade` - Upgrade congratulations
6. `membership_downgrade` - Downgrade confirmation

### 🎯 What You Can Do:

1. **Edit Templates**: Go to Admin → Settings → Email Settings
2. **Monitor Queue**: Check `email_queue` table for pending/sent emails
3. **Test Emails**: Templates can be tested from the admin UI
4. **View Logs**: Check `email_logs` table for history

### ⚠️ Important Notes:

- Your existing Mailgun integration is UNCHANGED
- All emails still go through Mailgun
- The only change is HOW emails get to Mailgun (via queue now)
- This provides better reliability and template management

## TinyMCE CSP Fix Applied

The Content Security Policy has been updated in:
1. `index.html` - Added TinyMCE domains to style-src and connect-src
2. `vite.config.ts` - Added TinyMCE domains to CSP
3. `netlify.toml` - Added TinyMCE domains to headers

This should resolve the TinyMCE editor display issues. 