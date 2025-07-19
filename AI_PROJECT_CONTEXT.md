# AI Assistant Project Context - Extended Documentation

## Quick Recovery Instructions
If you're an AI assistant picking up this project, start here:
1. Read `CLAUDE.md` for technical context
2. Check `.env` file exists with required keys
3. Test database connection: `node test-admin.js`
4. Review recent changes in git log

## Detailed Context from Current Session

### What We Accomplished Recently

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

4. **Event Form Improvements**
   - Fixed validation error "expected string, received number" for ID fields
   - Converted organization_id, category_id, organizer_id to strings when loading
   - Implemented workaround for Supabase schema cache delays using exec_sql RPC

5. **Event Image System**
   - Created ImageSection component for event flier uploads
   - Integrated Supabase Storage with event-images bucket
   - Added image position control (0-100%) for header display customization
   - Support for both file upload and URL input methods
   - Implemented lightbox view for full-size image display

6. **Mobile UX Enhancements**
   - Fixed header text overlay issues on mobile devices
   - Moved event info to separate section below image on mobile
   - Created responsive design: overlay on desktop, clean layout on mobile
   - Added mobile-specific event info bar with key details

7. **Social Features**
   - Implemented social sharing dropdown (Facebook, Twitter, LinkedIn, WhatsApp)
   - Added "Copy Link" functionality for easy sharing
   - Integrated share buttons into main event action card

8. **Registration Updates**
   - Smart fee display - only shows for events with pre-registration
   - Clear "Pre-Registration Fee" labeling when applicable
   - Updated login prompts to emphasize member benefits
   - Consolidated save/favorite functionality in main card

9. **Competition Classes Selection System**
   - Created `event_competition_classes` junction table with proper RLS policies
   - Built `CompetitionClassesSection.tsx` component with multi-select checkboxes
   - Color-coded classes by type (SPL=red, SQ=green, SQC=purple, etc.)
   - Integrated with EventForm, CreateEvent, and EditEvent pages
   - Only selected classes display on event details page
   - Fixed organization ID type mismatch (number vs string comparison)

10. **Data Persistence Fixes**
    - Fixed EventForm rendering before data loaded (key={eventData ? 'loaded' : 'loading'})
    - Created date helper functions for proper formatting
    - Fixed coordinate inputs to handle null/0 values properly
    - Prevented display dates from auto-calculating over manual edits
    - Fixed date/time fields showing 12:00 AM due to date-only database columns

11. **Geocoding System Improvements**
    - Updated geocoding service to accept full street address
    - Fixed incorrect coordinate lookups (was using city center instead of exact address)
    - Prevented automatic geocoding from overriding saved coordinates
    - Added proper null checks before geocoding
    - Updated from city/state only to full address geocoding

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

4. **Schema Cache Not Updating**
   - Supabase schema cache can take time to refresh after adding columns
   - Use `exec_sql` RPC as a workaround for immediate updates
   - Example: `await supabase.rpc('exec_sql', { sql_command: 'UPDATE ...' })`

5. **Validation Errors: "expected string, received number"**
   - Database IDs may be numbers but form expects strings
   - Convert numeric fields to strings when loading: `String(value)`
   - Common fields: organization_id, category_id, organizer_id

6. **Date/Time Display Issues**
   - Database uses date-only columns but forms expect datetime
   - Use formatDateForInput() to add noon time for consistency
   - Display dates auto-calculate only when empty, not on every change

7. **Geocoding Accuracy Issues**
   - Geocoding was only using city/state, getting city center coordinates
   - Now passes full street address for accurate results
   - Check for existing coordinates before geocoding to prevent overwrites

### Database Schema Notes

Key tables with RLS:
- `users` - User profiles, RLS enabled
- `events` - Competition events, RLS enabled
  - Added `image_position` column (integer, default 50)
- `event_competition_classes` - Junction table for event classes, RLS enabled
  - Columns: event_id, competition_class, created_at
  - Public read, authenticated write policies
- `transactions` - Payment records, RLS enabled
- `refunds` - Refund records, RLS enabled (we fixed this)
- `payment_provider_configs` - Payment settings, RLS enabled (we fixed this)

Storage buckets:
- `event-images` - Public bucket for event flier images
  - Max file size: 10MB
  - Allowed types: image/jpeg, image/png, image/webp

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

Key component files:
- `/src/components/EventForm/sections/ImageSection.tsx` - Event image upload
- `/src/components/EventForm/sections/CompetitionClassesSection.tsx` - Competition class selection
- `/src/pages/EventDetails.tsx` - Event details with mobile optimization
- `/src/pages/EditEvent.tsx` - Event editing with validation fixes
- `/src/pages/CreateEvent.tsx` - Event creation with competition classes
- `/src/types/event.ts` - Event type definitions
- `/src/utils/dateHelpers.ts` - Date formatting utilities
- `/src/services/geocoding.ts` - Geocoding service with full address support

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

### Recent UI/UX Patterns Established

1. **Mobile-First Considerations**
   - Always test header overlays on mobile devices
   - Provide alternative layouts for small screens
   - Keep touch targets at least 44px

2. **Image Handling**
   - Use Supabase Storage for user uploads
   - Provide both upload and URL options
   - Include position controls for header images

3. **Social Integration**
   - Dropdown menus for share options
   - Include major platforms + copy link
   - Use proper URL encoding for share links

4. **Registration Logic**
   - Only show fees when applicable
   - Clear labeling for pre-registration vs day-of
   - Login prompts should emphasize value

The goal is to allow seamless continuation of work without losing the context of what's been built and why certain decisions were made.