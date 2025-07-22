# AI Assistant Project Context - Extended Documentation

## Quick Recovery Instructions
If you're an AI assistant picking up this project, start here:
1. Read `CLAUDE.md` for technical context
2. Check `.env` file exists with required keys
3. Test database connection: `node test-admin.js`
4. Review recent changes in git log

## Detailed Context from Current Session

### Project Version
Current version: 1.20.0 (from 1.19.5)

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
   - Fixed in v1.19.4-v1.19.5: Use parseLocalDate() for all date displays to prevent timezone shifts

7. **Geocoding Accuracy Issues**
   - Geocoding was only using city/state, getting city center coordinates
   - Now passes full street address for accurate results
   - Check for existing coordinates before geocoding to prevent overwrites

### Database Schema Notes

Key tables with RLS:
- `users` - User profiles, RLS enabled
- `events` - Competition events, RLS enabled
  - Added `image_position` column (integer, default 50)
  - Fixed falsy value handling in v1.19.3 for position 0 display
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
- `/src/components/EventForm/sections/ContactSection.tsx` - Contact info with useEffect fix (v1.20.0)
- `/src/components/EventForm/sections/PricingSection.tsx` - Member/non-member pricing (v1.20.0)
- `/src/components/CookieConsent.tsx` - Cookie consent banner (v1.20.0)
- `/src/pages/EventDetails.tsx` - Event details with mobile optimization (fixed falsy value handling in v1.19.3)
- `/src/pages/EditEvent.tsx` - Event editing with validation fixes
- `/src/pages/CreateEvent.tsx` - Event creation with competition classes
- `/src/pages/Events.tsx` - Events listing (fixed date display in v1.20.0)
- `/src/pages/PrivacyPolicy.tsx` - Privacy policy page (v1.20.0)
- `/src/types/event.ts` - Event type definitions
- `/src/utils/dateHelpers.ts` - Date formatting utilities (added parseLocalDate in v1.19.4)
- `/src/utils/cookieConsent.ts` - Cookie consent management (v1.20.0)
- `/src/schemas/eventValidation.ts` - Event validation with admin support (v1.20.0)
- `/src/services/geocoding.ts` - Geocoding service with full address support
- `/src/hooks/useAnalytics.ts` - Consent-aware analytics tracking (v1.20.0)

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

### Recent Updates (January 2025)

1. **Worldwide Event Support (v1.19.0)**
   - Expanded country support from 8 to 75+ countries
   - Removed geocoding service restrictions (Nominatim, Mapbox)
   - Updated Google Maps default view to world-centered
   - Added proper country code to name conversion
   - Special focus on Caribbean and Pacific territories

2. **Directory System Improvements**
   - Fixed admin navigation in CreateDirectoryListing
   - Admins now properly route to /admin/directory-manager
   - Fixed infinite loop in Directory component with useCallback

3. **Event Flier Image Position Fix (v1.19.3)**
   - Fixed JavaScript falsy value handling for position 0
   - Issue: `event.imagePosition || 50` was treating 0 as false
   - Solution: Changed to explicit null/undefined checks
   - `objectPosition: \`center ${event.imagePosition !== null && event.imagePosition !== undefined ? event.imagePosition : 50}%\``
   - Now correctly displays position 0 images at the top of the header

4. **Date Display Timezone Fixes (v1.19.4-v1.19.5)**
   - Fixed dates showing one day earlier than selected
   - Issue: JavaScript `new Date()` was parsing date-only strings as UTC midnight
   - Created `parseLocalDate()` helper function in dateHelpers.ts
   - Updated all date displays in EventDetails.tsx to use parseLocalDate()
   - Fixed 7 instances of registration_deadline showing incorrect dates
   - Ensures date-only strings are parsed as local midnight, preventing timezone shifts

5. **Bug Fixes and Performance**
   - Fixed TypeScript build errors in AdminUsers component
   - Resolved event form validation for numeric IDs
   - Fixed infinite render loops with proper React hooks
   - Removed debug console.log statements from production code

6. **Cookie Consent Implementation (v1.20.0)**
   - Built comprehensive cookie consent system for GDPR/CCPA compliance
   - Created CookieConsent component with granular category controls
   - Categories: necessary, analytics, advertising, functional
   - Scripts only load after user consent via loadConsentedScripts()
   - Created privacy policy page with detailed cookie information
   - Integrated consent-aware analytics tracking (useAnalytics hook)

7. **Event Form Improvements (v1.20.0)**
   - Changed pricing from early bird to member/non-member structure
   - Updated PricingSection component with new pricing fields
   - Made contact information optional for administrators only
   - Created createEventFormSchema() with isAdmin parameter
   - Fixed phone number persistence bug with useEffect cleanup
   - Fixed date timezone issue on Events page using parseLocalDate

8. **Validation System Updates (v1.20.0)**
   - Created conditional validation based on user role
   - Non-admin users must provide contact information
   - Admin users have all contact fields optional
   - Updated validateEventForm() to accept isAdmin parameter
   - Both CreateEvent and EditEvent pass correct isAdmin prop

### Database Schema Updates
- `events.image_position` column confirmed working (integer type, default 50)
- No RLS policies blocking updates
- exec_sql RPC function available for schema cache workarounds

### Testing Notes
- When debugging image position: check browser console for transformation
- Country selection now supports global events
- Geocoding should work for any country (not just US)

### Version 1.24.0 Updates (January 2025)

#### Advertisement Display Fix Session
**Problem**: Ads were not displaying even after clearing frequency caps. Console showed ads loading but being filtered out.

**Root Cause Analysis**:
1. Ads were loading successfully from database (3 ads found)
2. All ads had frequency caps and had reached their daily limits
3. The impression tracking `useEffect` was firing immediately when ads became eligible
4. This caused ads to immediately hit their caps again after clearing

**Solution Implemented**:
1. Added 1-second delay before tracking impressions
2. Implemented impression deduplication using a Set to track already-counted impressions
3. Created `FrequencyCapManager` component for admin interface
4. Added debug mode with `?debug=bypass-caps` URL parameter

**Key Code Changes**:
- `src/components/AdDisplay.tsx`: Added `trackedImpressions` ref and delayed tracking
- `src/components/admin-settings/FrequencyCapManager.tsx`: New admin tool
- `src/pages/AdManagement.tsx`: Integrated frequency cap manager

**Deployment Issue**: Initial deployment failed because `AdRotationSettings.tsx` wasn't added to git. Fixed in follow-up commit.

#### Home Page Hero Section Redesign
**Problem**: Hero card overlaying the map looked like a "big black box" and felt disconnected from the site design.

**Changes Made**:
1. Separated map and hero content into distinct sections
2. Map now displays alone at top without overlays
3. Hero content moved below the ad section
4. Redesigned with integrated styling:
   - Removed heavy black background and borders
   - Added subtle gradient background
   - Center-aligned text with decorative elements
   - Consistent button styling with site theme

**Key Files Modified**:
- `src/pages/Home.tsx`: Complete restructure of hero section

#### Google Maps Component Improvements
**Problems Addressed**:
1. White borders on map pins
2. Pins too large
3. Map not interactive (couldn't drag or zoom)
4. Info windows not displaying on click
5. Hover and click windows overlapping

**Solutions**:
1. **Pin Styling**:
   - Changed stroke color from white to match pin color
   - Reduced pin scale from 12 to 8
   - Added stroke opacity for subtle effect

2. **Map Interactivity**:
   - Removed `overflow-hidden` from map container
   - Removed `z-0` class that was blocking interactions
   - Map already had `gestureHandling: 'greedy'` for full control

3. **Info Window Management**:
   - Implemented `activeClickWindow` and `activeHoverWindow` tracking
   - Hover windows don't show if click window is active on same pin
   - Map click closes all windows
   - Proper cleanup on mouseout

4. **Button Styling in Info Windows**:
   - Reduced padding and font size
   - Made both category badge and button same shape (rounded rectangles)
   - Simplified styling without gradients

**Key Files Modified**:
- `src/components/GoogleMap.tsx`: Comprehensive updates to marker and window management

### Technical Patterns Established

#### Frequency Cap Management Pattern
```javascript
// Check for debug mode
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('debug') === 'bypass-caps') {
  return false; // Bypass caps
}

// Track impressions with deduplication
const trackedImpressions = useRef<Set<string>>(new Set());
if (!trackedImpressions.current.has(ad.id)) {
  trackImpression(ad.id);
  trackedImpressions.current.add(ad.id);
}
```

#### Google Maps Window Management Pattern
```javascript
// Track active windows
let activeClickWindow: google.maps.InfoWindow | null = null;
let activeHoverWindow: google.maps.InfoWindow | null = null;

// Prevent overlap
if (activeClickWindow && activeClickWindow === infoWindow) {
  return; // Don't show hover on clicked pin
}
```

### Admin Tools Structure
The admin interface now includes collapsible accordion sections:
1. Ad Rotation Settings - Control rotation interval
2. Frequency Cap Manager - Debug and clear frequency data

Both use consistent accordion UI with expand/collapse functionality.

The goal is to allow seamless continuation of work without losing the context of what's been built and why certain decisions were made.

### Version 1.25.0 and Beyond - Future Considerations

#### Areas for Potential Enhancement
1. **Performance Monitoring**:
   - Consider implementing performance metrics for ad display
   - Track frequency cap effectiveness
   - Monitor map loading times and marker rendering performance

2. **User Experience**:
   - Mobile map interactions could be enhanced with touch gestures
   - Info window content could be made more responsive
   - Consider lazy loading for map markers with many events

3. **Admin Tools**:
   - Frequency cap analytics dashboard
   - Ad performance metrics
   - Map event density visualization

4. **Technical Debt**:
   - Consider migrating window management to React state
   - Evaluate marker clustering for high-density areas
   - Review impression tracking for edge cases

### Development Environment Notes

#### Key Commands
```bash
# Development
npm run dev              # Start development server
npm run dev:memory       # Start with memory optimization flags

# Building
npm run build            # Production build
npm run build:analyze    # Build with bundle analysis

# Version Management
npm run version:bump:patch  # Bump patch version (1.24.0 -> 1.24.1)
npm run version:bump:minor  # Bump minor version (1.24.0 -> 1.25.0)
npm run version:bump:major  # Bump major version (1.24.0 -> 2.0.0)
```

#### Project Structure Updates
```
src/
├── components/
│   ├── admin-settings/
│   │   ├── AdRotationSettings.tsx      # Timer-based rotation settings
│   │   └── FrequencyCapManager.tsx     # Frequency cap management tool
│   ├── AdDisplay.tsx                   # Core ad display with frequency tracking
│   └── GoogleMap.tsx                   # Enhanced map with window management
├── pages/
│   ├── Home.tsx                        # Redesigned with separated hero section
│   └── AdManagement.tsx                # Integrated admin tools
└── utils/
    └── version.ts                      # Auto-generated version info
```

### Deployment Checklist
1. ✅ Ensure all files are added to git (`git add .`)
2. ✅ Check for TypeScript errors (`npm run build`)
3. ✅ Update version number (`npm run version:bump:minor`)
4. ✅ Commit with descriptive message
5. ✅ Push to GitHub
6. ✅ Monitor Netlify deployment
7. ✅ Test production site functionality

### Known Issues and Resolutions
- **Issue**: Ads not showing due to frequency caps
  - **Resolution**: Added 1-second delay and deduplication in impression tracking
  - **Debug**: Use `?debug=bypass-caps` URL parameter

- **Issue**: Deployment failures due to missing files
  - **Resolution**: Always run `git status` before deploying
  - **Prevention**: Add all new files immediately after creation

- **Issue**: Map info windows overlapping
  - **Resolution**: Implemented window management system
  - **Pattern**: Track activeClickWindow and activeHoverWindow

### Contact Points
- **Repository**: GitHub (car-audio-events)
- **Deployment**: Netlify (caraudioevents.com)
- **Database**: Supabase (nqvisvranvjaghvrdaaz.supabase.co)
- **Version**: Currently at 1.24.0