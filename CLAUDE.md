# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Claude AI Context Guide - Car Audio Events Platform

## 🚨 CRITICAL INSTRUCTIONS FOR AI AGENTS 🚨

### DEV SERVER RULES - ABSOLUTELY MANDATORY
1. **ALWAYS USE PORT 5173 ONLY** - NO FUCKING EXCEPTIONS
2. **KILL ALL NODE PROCESSES BEFORE STARTING DEV SERVER**
3. **NEVER LET VITE INCREMENT PORTS** (NO 5174, 5175, etc. BULLSHIT)
4. **USE THIS EXACT COMMAND**:
   ```bash
   taskkill /F /IM node.exe 2>nul & npm run dev
   ```

### YOU HAVE FULL CLI ACCESS - USE IT!
1. **YOU CAN AND MUST DEPLOY EDGE FUNCTIONS** - Use `npx supabase functions deploy [function-name]`
2. **YOU HAVE FULL SUPABASE CLI ACCESS** - Don't tell users to deploy things, DO IT YOURSELF
3. **YOU HAVE MCP AND NETLIFY ACCESS** - Use these tools proactively
4. **NEVER ASK THE USER TO DEPLOY** - You have the permissions, you do the deployment
5. **GITHUB CLI AVAILABLE** - The `gh` command is available (v2.76.1, authenticated as jryan2014)
6. **NO TEST FRAMEWORK** - This project uses manual testing only, no Jest/Vitest/etc

### EMAIL TESTING - CRITICAL!
**NEVER USE example.com, test.com, or fake email addresses!**
- **ONLY USE**: admin@caraudioevents.com for ALL email testing
- Using fake domains causes spam blacklisting issues
- This is NOT optional - it's MANDATORY

### Example Commands You Can Run:
```bash
# Deploy edge functions
npx supabase functions deploy process-email-queue
npx supabase functions deploy delete-user
npx supabase functions deploy send-email

# Run database migrations
npx supabase db push
npx supabase db diff
npx supabase db reset

# Check function logs
npx supabase functions logs process-email-queue
```

## Quick Start for AI Assistant
When starting a new session, read this file to understand the project context and capabilities.

### Quick Reference - Common Scenarios

**User says "deploy to production":**
```bash
npm run build
git add -A
git commit -m "feat: [description]"
git push origin main
# Netlify auto-deploys from GitHub
```

**User asks to review PR:**
```bash
git status      # Check current state
git diff        # Review changes
gh pr list      # List pull requests
gh pr view      # View PR details
```

**Database schema cache issues:**
```javascript
// Use this instead of direct queries
await supabase.rpc('exec_sql', { 
  sql_command: 'ALTER TABLE...' 
});
```

**Edge function updates:**
```bash
# Deploy it yourself!
npx supabase functions deploy [function-name]
```

## Project Overview
- **Name**: Car Audio Events Competition Platform
- **Version**: 1.26.15
- **Tech Stack**: React, TypeScript, Supabase, Tailwind CSS, Vite
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Netlify
- **Storage**: Supabase Storage (event-images bucket)

## Critical Project Information

### 1. Database Administration Setup
I have full database administration capabilities through a custom utility:

```javascript
import { supabaseAdmin } from './src/utils/supabaseAdmin.js';

// Execute SQL
await supabaseAdmin.executeSQL('SELECT * FROM users LIMIT 1');

// Enable RLS
await supabaseAdmin.enableRLS('table_name');

// Create policies
await supabaseAdmin.createPolicy({
  name: 'policy_name',
  table: 'table_name',
  operation: 'SELECT',
  using: 'auth.uid() = user_id'
});
```

**Important**: The utility uses the service role key from `.env`:
- `VITE_SUPABASE_URL` - The Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin access

### 2. Key Database Functions
The database has a custom `exec_sql` function that accepts a `sql_command` parameter (NOT `sql`):
```javascript
await supabase.rpc('exec_sql', { sql_command: 'YOUR SQL HERE' });
```

### 3. Working with Schema Cache Issues

When Supabase PostgREST schema cache doesn't update:
```javascript
// Use exec_sql RPC function instead of direct queries
await supabase.rpc('exec_sql', { 
  sql_command: 'YOUR SQL HERE'  // Note: parameter is sql_command, not sql
});
```

### 4. Recent Security & Performance Fixes Implemented

#### RLS (Row Level Security)
- ✅ Enabled RLS on `refunds` and `payment_provider_configs` tables
- ✅ Created policies for user access control
- ✅ Admin users (membership_type = 'admin') have elevated privileges
- ✅ Fixed 180+ RLS performance issues by wrapping auth functions in SELECT statements
- ✅ Optimized all policies to prevent re-evaluation of auth functions per row

#### Function Search Path Security
Fixed search_path warnings for these functions:
- `update_transactions_updated_at`
- `is_refund_eligible`
- `set_refund_eligibility`
- `update_updated_at_column`
- `update_refunds_updated_at`
- `update_provider_configs_updated_at`
- `check_refund_eligibility`

All functions now have `SET search_path = 'public', 'pg_catalog', 'pg_temp'`

#### Database Cleanup
- ✅ Removed 37 functions referencing non-existent tables/columns
- ✅ Cleaned up orphaned database objects
- ✅ Fixed user deletion to properly remove from both users table and auth system

### 4. Environment Configuration

#### Local Development (.env file)
```
VITE_SUPABASE_URL=https://nqvisvranvjaghvrdaaz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
VITE_HCAPTCHA_SITE_KEY=acc27e90...
```

#### Production (Netlify)
Environment variables are set in Netlify dashboard, NOT in code.

### 5. Key Features & Systems

#### Payment System
- Integrated with Stripe and PayPal
- Payment configuration stored in database
- Admin panel at `/admin/settings` for payment configuration

#### User Roles
- `admin` - Full system access
- `organizer` - Can create/manage events
- `competitor` - Regular users
- `sponsor` - Business sponsors

#### Event Management
- Event flier image upload with Supabase Storage
- Image position control (0-100%) for header display
- Mobile-optimized event details view
- Social sharing integration
- Pre-registration vs day-of-event pricing

#### Memory Management
- Comprehensive memory optimization system in place
- See `src/utils/memoryManager.ts`

### 6. Common Tasks

#### Fix Database Warnings
```javascript
// Use the database maintenance script
node database-maintenance.js
```

#### Check RLS Status
```javascript
const result = await supabaseAdmin.getRLSStatus();
```

#### Execute Migrations
```javascript
const sqlContent = fs.readFileSync('migration-file.sql', 'utf8');
await supabaseAdmin.runSQLFile(sqlContent);
```

#### Add Database Columns
```javascript
// When schema cache issues occur, use exec_sql RPC
await supabase.rpc('exec_sql', {
  sql_command: 'ALTER TABLE events ADD COLUMN image_position integer DEFAULT 50'
});
```

### 7. Database Operations Best Practices

#### For AI Agents - Use These Methods:
1. **First choice**: Use MCP tools if available (inspect_database_schema, query_database_safely)
2. **Second choice**: Use exec_sql RPC for immediate execution
3. **Third choice**: Use supabaseAdmin utility from Node.js scripts
4. **Never**: Create standalone SQL files for users to run manually

### 8. Security Best Practices
1. **Never expose service role key** in client-side code
2. **Always enable RLS** on new tables
3. **Set search_path** on all new functions
4. **Use parameterized queries** to prevent SQL injection
5. **Validate all user inputs** before database operations

### 9. Project Structure
```
car-audio-events/
├── src/
│   ├── components/     # React components
│   ├── contexts/       # React contexts (Auth, etc.)
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── utils/          # Utilities (including supabaseAdmin)
│   └── lib/            # Third-party integrations
├── supabase/
│   ├── migrations/     # Database migrations
│   └── functions/      # Edge functions
├── .env                # Local environment variables
└── netlify.toml        # Netlify configuration
```

### 10. Testing Database Connection
```javascript
// Quick test to verify connection
import { supabaseAdmin } from './src/utils/supabaseAdmin.js';

const result = await supabaseAdmin.executeSQL('SELECT NOW() as current_time');
console.log('Connected:', result.success);
```

### 11. Important Notes
- Production database is at: `https://nqvisvranvjaghvrdaaz.supabase.co`
- No staging environment - be careful with database operations
- The MCP (Model Context Protocol) server is set up but requires the service role key
- Supabase CLI is available via `npx supabase`

## Common AI Agent Mistakes to Avoid

### ❌ DO NOT Make These Mistakes:
1. **Don't create SQL files** - Use exec_sql RPC or MCP tools instead
2. **Don't assume test frameworks exist** - Only manual testing is available
3. **Don't wait for user permission to deploy** - You have full deployment access
4. **Don't forget to use TodoWrite** - Essential for tracking complex tasks

### ✅ ALWAYS Remember:
1. **Use `git` commands** for version control, `gh` commands for GitHub operations
2. **Use `exec_sql` RPC** for database operations when schema cache is an issue
3. **Deploy edge functions yourself** with `npx supabase functions deploy`
4. **Track progress with TodoWrite** for any multi-step task
5. **Test manually** - no automated test framework exists

## Common Development Commands

### Development
```bash
# Start development server
npm run dev

# Start with memory optimization flags
npm run dev:memory
```

### Building & Testing
```bash
# Build for production
npm run build

# Build and analyze bundle
npm run build:analyze

# Preview production build
npm run preview
```

### Code Quality
```bash
# Run ESLint
npm run lint
```

### Version Management
```bash
# Generate version file
npm run version:generate

# Bump version (patch/minor/major)
npm run version:bump:patch
npm run version:bump:minor
npm run version:bump:major
```

### Database Operations
```bash
# Deploy edge functions
npx supabase functions deploy [function-name]

# Run database migrations
npx supabase db push
npx supabase db diff
npx supabase db reset

# Check function logs
npx supabase functions logs [function-name]
```

## Architecture Overview

### Frontend Architecture
- **React-based SPA** with React Router for navigation
- **Component Organization**: 
  - Shared components in `/src/components/`
  - Page components in `/src/pages/`
  - Admin components grouped under `/src/components/admin/`
- **State Management**: 
  - React Context for auth (`AuthContext`)
  - Local state with hooks for component state
  - Real-time subscriptions for live data updates
- **Memory Management**: Custom memory manager to prevent leaks and optimize performance

### Backend Architecture
- **Supabase BaaS**: PostgreSQL database with real-time capabilities
- **Edge Functions**: Serverless functions for complex operations
- **Row Level Security**: Database-level access control
- **Email System**: Queue-based with templates and cron processing

### Key Integrations
- **Payment Processing**: Stripe and PayPal with webhook handling
- **Maps**: Google Maps for event locations and geocoding
- **AI Services**: OpenAI (DALL-E, GPT), Stability AI for content generation
- **Email**: Edge functions process email queue with template support
- **Storage**: Supabase Storage for images and documents

### Security Architecture
- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Role-based (admin, organizer, competitor, sponsor)
- **RLS Policies**: Every table has appropriate Row Level Security
- **API Security**: Service role key never exposed to client
- **Input Validation**: Zod schemas for form validation

## How to Restore Context
When starting a new session, tell the AI:
1. "Read the CLAUDE.md file for project context"
2. "I need help with the car audio events platform"
3. "Use the supabaseAdmin utility for database operations"

## Recent Work Completed
- Fixed all Supabase security warnings (RLS and search_path)
- Optimized 180+ RLS policies for better query performance
- Removed 37 problematic database functions
- Created reusable database administration utility
- Set up secure environment variable handling
- Implemented comprehensive security policies
- Fixed event form validation errors for numeric ID fields
- Restored and enhanced event flier image functionality
- Added image upload to Supabase storage with position control
- Improved mobile UX for event details page
- Implemented social sharing features (Facebook, Twitter, LinkedIn, WhatsApp)
- Updated registration fee display logic for better clarity
- Fixed user deletion to actually delete users (created Edge Function)
- Cleaned up orphaned auth users from incomplete deletions
- **Competition Classes System**:
  - Created event_competition_classes junction table with RLS
  - Built CompetitionClassesSection component for multi-select
  - Integrated with EventForm, CreateEvent, and EditEvent pages
  - Only selected classes display on event details page
- **Data Persistence Fixes**:
  - Fixed EventForm rendering before data loaded issue
  - Added proper date/time formatting helpers
  - Fixed coordinate inputs to handle null/0 values
  - Prevented display dates from auto-calculating over manual edits
- **Geocoding Improvements**:
  - Updated geocoding to use full street address (not just city/state)
  - Fixed incorrect coordinate lookups
  - Prevented automatic geocoding from overriding saved coordinates
- **Worldwide Event Support (v1.19.0)**:
  - Expanded country list from 8 to 75+ countries globally
  - Removed US-only restrictions from geocoding services
  - Updated Google Maps to world-centered view
  - Added Caribbean and Pacific territories (including US Virgin Islands)
  - Country code to name conversion for accurate geocoding
- **Directory Navigation Fixes**:
  - Fixed admin navigation from CreateDirectoryListing
  - Admin users now redirect to /admin/directory-manager
  - Regular users continue to /directory as before
- **Bug Fixes (v1.18.1 - v1.20.0)**:
  - Fixed infinite loop in Directory component (useCallback)
  - Fixed TypeScript errors in AdminUsers (delete action)
  - Corrected admin directory navigation routes
  - Fixed image position display issue (v1.19.3) - falsy value handling
  - Fixed date timezone display issues (v1.19.4-v1.19.5) - dates no longer show one day earlier
- **Cookie Consent & Privacy (v1.20.0)**:
  - Implemented comprehensive cookie consent system
  - Added granular consent categories (necessary, analytics, advertising, functional)
  - Created privacy policy page with GDPR/CCPA compliance
  - Integrated consent-aware analytics tracking
  - Scripts only load after user consent
- **Event Form Improvements (v1.20.0)**:
  - Changed pricing structure from early bird to member/non-member pricing
  - Made contact information optional for administrators only
  - Fixed phone number persistence bug in ContactSection
  - Fixed date display timezone issue on Events page using parseLocalDate helper
  - Added conditional validation based on user role (admin vs non-admin)
- **Advertisement System (v1.21.0-v1.25.1)**:
  - Implemented banner AI creator with DALL-E integration
  - Added ad image upload system via Supabase Edge Function
  - Fixed mobile ad overlap issues with map components
  - Created member ad dashboard for managing advertisements
  - Added ad rotation and frequency cap settings
- **Audio System Profile Feature (v1.26.0)**:
  - Created comprehensive audio system management in member profiles
  - Supports components: amplifiers, subwoofers, speakers, head units, processors, etc.
  - Dynamic component forms with category-specific fields
  - System links feature for showcasing builds with external URLs
  - Competitions section displaying event results and statistics
  - Fixed session settings persistence issues in admin panel
- **Manual Notification System (v1.26.0)**:
  - Created new simplified notifications table with RLS policies
  - Built NotificationManager for admins to send targeted notifications
  - Implemented NotificationBell component with real-time updates
  - Created individual notification detail pages (/notifications/:id)
  - Updated /notifications page to combine both notification systems
  - Fixed notification subscription errors and improved cleanup
  - Added proper UX flow: bell → notification list → notification detail → optional link
  - Differentiated action icons: ✓ for mark as read, 👁️ for view details

### 11. Recently Fixed Issues (v1.19.3 - v1.20.0)

#### Event Flier Image Position Display (Fixed in v1.19.3)
**Issue**: Image position slider value was saving but not displaying correctly
**Root Cause**: JavaScript falsy value handling - position 0 was being treated as falsy and defaulting to 50
**Solution**: Changed from `event.imagePosition || 50` to proper null/undefined checks
**Status**: ✅ FIXED - Image positions now save and display correctly at all values (0-100)

#### Date Display Timezone Issue (Fixed in v1.19.4-v1.20.0)
**Issue**: Dates showing one day earlier (e.g., 07/26/2025 displaying as 07/25/2025)
**Root Cause**: JavaScript's `new Date()` interprets date-only strings as UTC midnight, causing timezone shifts
**Solution**: Created `parseLocalDate()` helper function to handle date-only strings as local dates
**Status**: ✅ FIXED - All dates now display correctly without timezone shifts (v1.20.0 fix applied to Events page)

#### Phone Number Persistence Issue (Fixed in v1.20.0)
**Issue**: Phone numbers from previous events persisting when "use organizer contact" unchecked
**Root Cause**: Missing useEffect cleanup when checkbox state changed
**Solution**: Added useEffect hook in ContactSection to clear fields when checkbox is unchecked
**Status**: ✅ FIXED - Phone fields now properly clear when toggling the checkbox

#### Contact Information Validation (Fixed in v1.20.0)
**Issue**: Contact information was optional for all users instead of just administrators
**Root Cause**: Validation schema didn't differentiate between admin and non-admin users
**Solution**: Created `createEventFormSchema` function that accepts `isAdmin` parameter for conditional validation
**Status**: ✅ FIXED - Non-admin users must provide contact info, admin users have it optional

### 12. Common Development Patterns

#### Competition Classes
```javascript
// Load classes for an event
const { data: competitionClasses } = await supabase
  .from('event_competition_classes')
  .select('competition_class')
  .eq('event_id', eventId);

// Save classes (delete then insert)
await supabase.from('event_competition_classes').delete().eq('event_id', eventId);
await supabase.from('event_competition_classes').insert(classesData);
```

#### Date Handling
```javascript
// Database stores date-only, show as noon for consistency
import { formatDateForInput, formatDateForDateInput, parseLocalDate } from './utils/dateHelpers';

// For datetime inputs
start_date: formatDateForInput(event.start_date),
// For date inputs
display_start_date: formatDateForDateInput(event.display_start_date),
// For display formatting (prevents timezone issues)
const displayDate = parseLocalDate(event.start_date).toLocaleDateString();
```

#### Geocoding with Full Address
```javascript
// Always pass full address for accurate coordinates
await geocodingService.geocodeAddress(
  city, state, country, 
  streetAddress, // Include street address
  zipCode       // Include zip code
);
```

#### Event Form Validation
```javascript
// Use admin-specific validation
import { validateEventForm, createEventFormSchema } from './schemas/eventValidation';

// For validation
const validation = validateEventForm(formData, isAdmin);

// For direct schema usage
const schema = createEventFormSchema(isAdmin);
```

#### Cookie Consent Management
```javascript
// Check if category is allowed
import { isCategoryAllowed } from './utils/cookieConsent';

if (isCategoryAllowed('analytics')) {
  // Track analytics event
}

// Load scripts based on consent
import { loadConsentedScripts } from './utils/cookieConsent';
loadConsentedScripts();
```

### 13. Recent Updates (v1.24.0 - January 2025)

#### Advertisement System Fixes
- **Fixed frequency cap issues** preventing ads from displaying
- **Added 1-second delay** before tracking impressions to ensure ads are visible
- **Implemented impression deduplication** to prevent immediate re-capping
- **Created FrequencyCapManager component** for admin interface
  - Shows current frequency cap data
  - Clear frequency caps button
  - Clear ALL ad-related data option
  - Test localStorage functionality
- **Debug mode added**: Append `?debug=bypass-caps` to URL for testing

#### Home Page Redesign
- **Moved hero card** from overlaying the map to below the ad section
- **Redesigned hero section** with integrated design (no more black box)
- **Updated heading sizes** to match site consistency
- **Improved button styling** with consistent sizes and colors

#### Google Maps Improvements
- **Fixed map pin styling**:
  - Removed white borders (now uses pin color for stroke)
  - Reduced pin size from scale 12 to 8
  - Hover state scale reduced from 18 to 10
- **Fixed map interactivity**:
  - Removed z-index and overflow issues
  - Map is now fully draggable and zoomable
- **Improved info window management**:
  - Only one window displays at a time
  - Hover windows don't show when click window is active
  - Click on map background closes all windows
- **Updated info window styling**:
  - Smaller, consistent button shapes
  - Simplified design with matching colors

### 14. Newsletter System Implementation (v1.26.1)

#### Overview
Implemented a complete newsletter system with email confirmation, template support, and automated sending via Supabase Edge Functions.

#### Key Components
1. **Newsletter Subscribers Management**:
   - Full CRUD operations in AdminNewsletterManager
   - Checkbox selection for bulk operations
   - Status management (pending, confirmed, unsubscribed)
   - Resend confirmation functionality
   - Uses toast notifications (useNotifications hook)

2. **Email Queue System**:
   - Integrated with existing email_queue table
   - Template-based email sending
   - Automated processing via cron job (every 2 minutes)
   - Supports both Supabase pg_cron and Netlify scheduled functions

3. **Email Templates**:
   - Database stores 86 email templates
   - Newsletter templates: newsletter_confirmation, newsletter_welcome, newsletter_unsubscribe
   - Templates use variables like {{confirmationUrl}}, {{unsubscribeUrl}}
   - HTML templates stored in `html_body` column (NOT `html_content`)

#### Critical Issues & Solutions

##### Newsletter Template Display Issue
**Problem**: Newsletter emails showing plain text instead of formatted HTML with logo/header/footer
**Root Cause**: 
- Email templates table uses `html_body` column, not `html_content`
- Edge function was looking for wrong column name
- Template had plain text instead of full HTML

**Solution Applied**:
1. Updated newsletter_confirmation template with full HTML including:
   - Car Audio Events logo: `https://caraudioevents.com/assets/logos/CAE_Logo_V2-email-logo.png`
   - Professional header with dark blue (#1a1a2e) background
   - Electric blue (#00D4FF) accent colors
   - Footer with unsubscribe link, privacy policy, and physical address

2. Fixed edge function (process-email-queue/index.ts):
   - Changed line 114 to select `html_body, text_body`
   - Changed line 121 to use `template.html_body`

3. Updated subscribe_to_newsletter function to include both:
   - `confirmationUrl` variable for confirmation link
   - `unsubscribeUrl` variable for unsubscribe link

##### Function Overloading Errors
**Problem**: Multiple versions of subscribe_to_newsletter function causing PGRST203 errors
**Solution**: Dropped all versions and created single clean function with 2 parameters

##### Token Generation Issues
**Problem**: gen_random_bytes() function not found, then uuid_generate_v4() not found
**Solution**: Enabled pgcrypto and uuid-ossp extensions, function now uses gen_random_uuid()

##### Schema Cache Issues
**Problem**: PostgREST not recognizing updated functions (PGRST202 errors)
**Solution**: 
- Used exec_sql to create functions
- Forced schema reload with NOTIFY pgrst
- Functions exist but PostgREST cache can be slow to update

#### Email Processing Configuration
1. **Cron Job Settings** (Admin Panel):
   - Located in Email Settings under "Email Processing Scheduler"
   - Default: Runs every 2 minutes
   - Can be configured with custom cron expressions
   - Shows last run time and next scheduled run

2. **Email Queue Management**:
   - Filter now defaults to "pending" instead of "all"
   - Shows status, recipient, subject, attempts
   - Process Queue button for manual processing

#### Deployment Requirements
**CRITICAL**: The edge function changes need to be deployed to Supabase:
```bash
cd E:/2025-car-audio-events/car-audio-events
npx supabase functions deploy process-email-queue
```

**Note**: Deployment requires Docker Desktop to be running. Current issue: Docker returning 500 Internal Server Error.

#### Database Functions Created/Updated
- `subscribe_to_newsletter(p_email text, p_source text)` - Handles newsletter signup
- `confirm_newsletter_subscription(p_confirmation_token uuid)` - Confirms subscription
- `unsubscribe_from_newsletter(p_unsubscribe_token uuid)` - Handles unsubscribe
- `get_cron_jobs()` - Returns cron job configuration
- `update_cron_schedule(schedule text)` - Updates cron schedule
- `toggle_cron_job(enabled boolean)` - Enables/disables cron job

#### Files Modified
- `/src/pages/AdminNewsletterManager.tsx` - Added CRUD operations, bulk actions
- `/src/components/admin-settings/EmailSettings.tsx` - Fixed to_email column, defaulted filter to pending
- `/src/components/admin-settings/CronSettings.tsx` - New component for cron configuration
- `/supabase/functions/process-email-queue/index.ts` - Updated to use html_body column
- `/src/components/Footer.tsx` - Newsletter signup form (unchanged, works correctly)

#### Compliance Notes
Newsletter system includes:
- Double opt-in (email confirmation required)
- Unsubscribe links in all emails
- Privacy policy links
- Physical address in footer (1600 South Jefferson, Perry, FL 32348 #31)
- GDPR/CAN-SPAM compliant

### 15. Newsletter System Complete Implementation (v1.26.2 - v1.26.15)

#### Major Issues Fixed

##### 1. Schema Cache Issues with Newsletter Functions
**Problem**: Supabase PostgREST schema cache not recognizing updated database functions
**Solution**: 
- Use `exec_sql` RPC function to bypass schema cache
- Added retry mechanism in AdminNewsletterManager for loading newsletters
- Fallback to exec_sql when regular operations fail

##### 2. Email Queue Column Mapping Issues
**Problem**: Email queue table uses different column names than expected
**Key Mappings**:
- Use `to_email` NOT `recipient`
- Use `html_content` NOT `html_body` for email queue
- Email templates table uses `html_body` column
- Newsletter campaigns uses `status` with specific allowed values

##### 3. Newsletter Campaign Status Constraints
**Problem**: "queued" is not a valid status for newsletter_campaigns
**Allowed Values**: draft, scheduled, sending, sent, cancelled
**Solution**: Changed status to "sending" when processing newsletters

##### 4. Newsletter Template HTML Issues
**Problem**: Newsletter emails not showing proper HTML template with logo/header
**Solution**: Created full HTML template with:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Email-safe CSS */
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    .container { width: 100%; max-width: 600px; margin: 0 auto; }
    /* More styles... */
  </style>
</head>
<body>
  <!-- Header with logo -->
  <div style="background-color: #1a1a2e; padding: 20px; text-align: center;">
    <img src="https://caraudioevents.com/assets/logos/CAE_Logo_V2-email-logo.png" 
         alt="Car Audio Events" style="max-width: 200px;">
  </div>
  <!-- Content -->
  <!-- Footer with unsubscribe link -->
</body>
</html>
```

##### 5. Scroll Position Issues on Navigation
**Problem**: Admin pages starting halfway down the page
**Solution**: Created ScrollToTop component that:
- Resets window scroll position on route changes
- Handles main content containers
- Resets all scrollable containers with overflow-y-auto/scroll

#### Key Implementation Details

##### Newsletter Terminology Change
- Changed all "campaign" references to "newsletter" in UI
- Database tables still use "campaign" naming for backward compatibility
- UI shows: "Create Newsletter", "Newsletter Manager", etc.

##### Newsletter Compose Workflow
1. Create newsletter with name, subject, content
2. Save as draft or Send Now
3. Send Now creates email_queue entries for all confirmed subscribers
4. Each email includes unsubscribe link with unique token

##### Edge Function Deployment
```bash
# Deploy edge function (AI agents must do this automatically)
npx supabase functions deploy process-email-queue
```

##### Newsletter Testing Rules
- **NEVER use example.com or fake emails**
- **ONLY use admin@caraudioevents.com for testing**
- Fake domains cause spam blacklisting

#### Database Schema Updates

##### Newsletter Tables
- `newsletter_subscribers` - Stores subscriber info
- `newsletter_campaigns` - Stores newsletter drafts/sent campaigns
- `email_queue` - Processes all system emails
- `email_templates` - HTML email templates

##### Key Functions
- `subscribe_to_newsletter(email, source)` - Handle signups
- `confirm_newsletter_subscription(token)` - Confirm subscription
- `unsubscribe_from_newsletter(token)` - Handle unsubscribes

#### Common Troubleshooting

##### Newsletter Not Showing After Save
**Cause**: Schema cache not updated
**Solution**: 
1. Wait a moment and refresh
2. Use fallback exec_sql method
3. Shows helpful message to user

##### Email Not Sending
**Cause**: Edge function not deployed or email queue column mismatch
**Solution**: Deploy edge function and ensure correct column mapping

##### Template Not Displaying
**Cause**: Wrong column name or missing HTML
**Solution**: Use html_body for templates, html_content for queue

### 16. Recent Bug Fixes (v1.26.2 - v1.26.15)

#### Security Warning Fixes
- Removed unused `notification_statistics` view causing SECURITY DEFINER warnings
- Fixed 5 function search_path warnings by adding proper search_path
- All database objects now properly secured

#### Newsletter System Stabilization
- Fixed resend confirmation using correct email_queue columns
- Fixed "Send Now" functionality with proper status values
- Added comprehensive error handling for schema cache issues
- Implemented retry mechanisms for database operations

#### UI/UX Improvements
- Fixed scroll position reset on navigation
- Updated success/error message colors in Footer newsletter signup
- Changed newsletter terminology from "campaign" throughout UI
- Added helpful user messages for schema cache delays

## AI Agent Workflow Reminders

### When Asked to Review PRs:
1. Check if changes are already committed with `git status`
2. Review uncommitted changes with `git diff`
3. Use `gh pr list` to see open pull requests
4. Use `gh pr view [number]` to review specific PRs
5. Use `gh pr create` to create new pull requests

### When Making Database Changes:
1. Always use exec_sql RPC or MCP tools
2. Never create SQL files for users to execute
3. Handle schema cache delays gracefully
4. Deploy edge functions yourself when needed

### When Implementing Features:
1. Use TodoWrite to track all subtasks
2. Mark tasks as in_progress before starting
3. Update task status immediately upon completion
4. Only mark completed when fully done (not partially)

## Development Best Practices

### Performance Optimization
- Use React.memo() for expensive components
- Implement lazy loading for routes
- Optimize database queries with proper indexes
- Use the memory manager for large data operations
- Clean up subscriptions in useEffect cleanup functions

### Database Conventions
- Always enable RLS on new tables
- Include created_at and updated_at timestamps
- Use UUIDs for primary keys
- Set proper search_path on functions
- Use the exec_sql RPC function when schema cache issues occur

### Error Handling
- Wrap async operations in try-catch blocks
- Provide user-friendly error messages via toast notifications
- Log errors to console for debugging
- Handle edge cases gracefully
- Use the notification system for user feedback

### Testing Approach
- Manual testing is primary approach (no test framework configured)
- Test all CRUD operations thoroughly
- Verify RLS policies work correctly
- Test edge functions with various inputs
- Always test on both desktop and mobile viewports

---
Last Updated: January 2025 (v1.26.15)
Context preserved for AI assistants working on this project.