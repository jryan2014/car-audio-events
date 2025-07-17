# ⚠️ IMPORTANT WARNINGS & GOTCHAS

## Critical Things to Remember

### 1. **NO STAGING ENVIRONMENT**
- **YOU ARE ALWAYS WORKING ON PRODUCTION DATABASE**
- There is no dev/staging database - all changes affect live data
- Always be extra careful with DELETE, DROP, or data modifications
- Consider wrapping risky operations in transactions

### 2. **Service Role Key Security**
- The service role key in `.env` bypasses ALL Row Level Security
- NEVER expose this key in client-side code
- NEVER commit the `.env` file to git
- This key has FULL database access - treat it like a password

### 3. **Database Function Quirks**
- `exec_sql` expects parameter named `sql_command` NOT `sql`
- Some functions have overloaded versions - may need to drop all variants
- Search path must include `pg_temp` for some operations
- Functions marked SECURITY DEFINER run with elevated privileges

### 4. **Known Issues**
- The Supabase dashboard may cache warnings - wait a few minutes after fixes
- The `exec_sql` function only returns row counts, not actual data
- Some RLS policies may conflict if not carefully designed
- PayPal/Stripe keys are managed via admin panel, not env vars

### 5. **DO NOT MODIFY**
- `users` table structure (auth system depends on it)
- `auth` schema (managed by Supabase)
- Core authentication functions
- Payment webhook endpoints without testing

### 6. **Windows-Specific Issues**
- File paths use backslashes (E:\2025-car-audio-events\...)
- Some bash commands may not work as expected
- Use `node` directly instead of shell scripts when possible

### 7. **Memory Optimization System**
- There's a comprehensive memory management system in place
- Don't disable it without understanding the implications
- See `src/utils/memoryManager.ts` for details

### 8. **API Keys Status**
- Google Maps API key: Needs domain restrictions
- Supabase keys: Anon key is public, service key is secret
- Payment keys: Managed through database, not env vars
- All keys removed from source control

### 9. **If Things Break**
1. First check: `node test-admin.js`
2. Check Supabase dashboard for errors
3. Verify `.env` file has all required keys
4. Check Netlify deployment logs
5. Run `database-maintenance.js` for automatic fixes

### 10. **Contact/Recovery**
- Production URL: https://caraudioevents.com
- Supabase Project: nqvisvranvjaghvrdaaz
- Database connection works via service role key
- All fix scripts are in root directory (fix-*.js)

---
⚠️ **REMEMBER**: Every database change is LIVE. There's no undo button except backups!