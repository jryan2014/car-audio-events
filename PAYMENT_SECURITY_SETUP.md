# Payment Security Setup Guide

## 🔒 Critical Security Change: Payment Credentials

We've removed all payment secret keys from the database for security. Secret keys must now be stored in environment variables only.

## Required Environment Variables

### For Netlify (Production Frontend)
Add these in Netlify Dashboard > Site Settings > Environment Variables:

```bash
# Public keys (safe for frontend)
VITE_STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...
VITE_PAYPAL_TEST_CLIENT_ID=ATest...
VITE_PAYPAL_LIVE_CLIENT_ID=ALive...
```

### For Supabase Edge Functions (Backend)
Add these in Supabase Dashboard > Settings > Edge Functions:

```bash
# Secret keys (NEVER expose to frontend)
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_LIVE_SECRET_KEY=sk_live_...
STRIPE_TEST_WEBHOOK_SECRET=whsec_test_...
STRIPE_LIVE_WEBHOOK_SECRET=whsec_live_...
PAYPAL_TEST_CLIENT_SECRET=ETest...
PAYPAL_LIVE_CLIENT_SECRET=ELive...

# Add payment mode
PAYMENT_MODE=test  # or 'live' for production
```

## Migration Steps

### 1. Backup Current Keys
Before running the migration, save your current keys:

```sql
-- Run this in Supabase SQL editor to see current keys
SELECT key, value 
FROM admin_settings 
WHERE category = 'payment' 
AND key LIKE '%secret%' OR key LIKE '%key%';
```

### 2. Set Environment Variables
1. Copy the keys from step 1
2. Add them to Netlify and Supabase as shown above
3. Deploy the Edge Functions to pick up new env vars

### 3. Run the Migration
```sql
-- This will remove secret keys from database
-- Run the migration file: 20250128_secure_payment_credentials.sql
```

### 4. Update Your Code
Replace imports in your code:
```typescript
// OLD
import { getPaymentConfig } from './services/paymentConfigService';

// NEW - Use secure version
import { getPaymentConfig } from './services/securePaymentConfigService';
```

### 5. Verify Security
Check that secrets are removed:
```sql
SELECT check_payment_security_status();
-- Should return: 'SECURE' | 'Payment secrets are properly stored in environment variables only.'
```

## What Changed?

### Before (Insecure)
- Secret keys stored in database (plain text)
- Database breach = payment system compromised
- Keys visible in admin panel

### After (Secure)
- Secret keys only in environment variables
- Database breach doesn't expose payment credentials
- Admin panel only shows public keys
- Edge Functions read secrets from environment

## Rollback Plan

If you need to rollback:
1. Restore from backup table:
```sql
INSERT INTO admin_settings 
SELECT * FROM admin_settings_backup_20250128;
```

2. Revert to old paymentConfigService.ts

## Best Practices Going Forward

1. **Never commit secret keys** to git
2. **Use different keys** for test/production
3. **Rotate keys regularly** (every 90 days)
4. **Monitor for exposed keys** using GitHub secret scanning
5. **Use webhook signatures** to verify requests

## Testing

After migration:
1. Test payment in test mode
2. Verify webhooks still work
3. Check admin panel shows only public info
4. Ensure no console logs contain secrets

---

**Important**: After confirming everything works, delete the backup table:
```sql
DROP TABLE admin_settings_backup_20250128;
```