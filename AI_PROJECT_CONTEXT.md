# AI Assistant Project Context - Extended Documentation

## Quick Recovery Instructions
If you're an AI assistant picking up this project, start here:
1. Read `CLAUDE.md` for technical context
2. Check `.env` file exists with required keys
3. Test database connection: `node test-admin.js`
4. Review recent changes in git log

## Detailed Context from Current Session

### What We Accomplished Today

1. **Database Security Audit**
   - Identified and fixed 2 RLS errors on `refunds` and `payment_provider_configs` tables
   - Fixed 7 function search_path warnings
   - All Supabase security warnings are now resolved

2. **Created Database Administration System**
   - Built `src/utils/supabaseAdmin.js` - a reusable utility for database operations
   - This allows the AI to directly manage the database without manual SQL entry
   - Uses the service role key for full admin access

3. **Environment Setup**
   - Configured proper environment variables
   - Removed hardcoded API keys from source control
   - Set up secure key management

### Key Technical Decisions

1. **Why We Use `exec_sql`**
   - The database has a custom function `exec_sql(sql_command text)`
   - This function allows arbitrary SQL execution with proper permissions
   - Always use `sql_command` as the parameter name, not `sql`

2. **RLS Policy Design**
   - Users can only see their own data (using `auth.uid() = user_id`)
   - Admins can see/modify everything (checking `membership_type = 'admin'`)
   - Payment configs are readable by all (needed for checkout) but only editable by admins

3. **Function Search Path Fix**
   - All functions must have `SET search_path = 'public', 'pg_catalog', 'pg_temp'`
   - This prevents security vulnerabilities from search path manipulation
   - Use `SECURITY DEFINER` for functions that need elevated privileges

### Common Issues & Solutions

1. **"Invalid API key" Error**
   - Check that `SUPABASE_SERVICE_ROLE_KEY` is in `.env`
   - Ensure it's the service role key, not the anon key

2. **Function Search Path Warnings Persist**
   - Drop all overloaded versions of the function
   - Recreate with explicit `SET search_path`
   - May need to include `pg_catalog` and `pg_temp` in the path

3. **RLS Policies Not Working**
   - Ensure RLS is enabled on the table first
   - Check that policies use proper auth functions
   - Remember service role bypasses all RLS

### Database Schema Notes

Key tables with RLS:
- `users` - User profiles, RLS enabled
- `events` - Competition events, RLS enabled
- `transactions` - Payment records, RLS enabled
- `refunds` - Refund records, RLS enabled (we fixed this)
- `payment_provider_configs` - Payment settings, RLS enabled (we fixed this)

Key functions with search_path:
- All `update_*_updated_at()` trigger functions
- `is_refund_eligible()` - Checks if transaction can be refunded
- `check_refund_eligibility()` - Similar refund check
- `set_refund_eligibility()` - Trigger function

### Working Patterns

1. **Making Database Changes**
   ```javascript
   import { supabaseAdmin } from './src/utils/supabaseAdmin.js';
   
   // Always test connection first
   const test = await supabaseAdmin.executeSQL('SELECT 1');
   if (!test.success) {
     console.error('Database connection failed');
     return;
   }
   
   // Then make your changes
   await supabaseAdmin.executeSQL('YOUR SQL HERE');
   ```

2. **Fixing Security Warnings**
   - For RLS: Enable RLS, then create policies
   - For search_path: Drop function, recreate with SET search_path
   - Always verify fixes with a final check query

3. **Safe Operations**
   - Always backup before major changes
   - Test in a transaction when possible
   - Use the `silent: true` option to suppress logs when needed

### Integration Points

1. **Supabase Dashboard**
   - URL: https://app.supabase.com/project/nqvisvranvjaghvrdaaz
   - Security Advisor shows warnings we fixed
   - SQL Editor for manual verification

2. **Netlify Deployment**
   - Environment variables set in Netlify dashboard
   - Auto-deploys from main branch
   - Domain: caraudioevents.com

3. **Local Development**
   - Uses `.env` file for configuration
   - Supabase CLI available via `npx supabase`
   - MCP server in `src/mcp/server.ts` (requires service role key)

### File Locations

Critical files for context:
- `/CLAUDE.md` - Quick reference for AI
- `/AI_PROJECT_CONTEXT.md` - This detailed context
- `/src/utils/supabaseAdmin.js` - Database admin utility
- `/.env` - Environment variables (not in git)
- `/fix-*.js` - Various fix scripts we created
- `/database-maintenance.js` - Comprehensive maintenance script

### Commands to Remember

```bash
# Test database connection
node test-admin.js

# Run database maintenance
node database-maintenance.js

# Start MCP server (if needed)
npm run mcp:start

# Check Supabase status
npx supabase status
```

---

## For Future AI Sessions

When you (or another AI) return to this project:

1. Start by reading both `CLAUDE.md` and this file
2. Verify the database connection works
3. Check for any new warnings in Supabase dashboard
4. Use the established patterns and utilities
5. Maintain the security practices we've implemented

The goal is to allow seamless continuation of work without losing the context of what's been built and why certain decisions were made.