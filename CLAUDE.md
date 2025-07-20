# Claude AI Context Guide - Car Audio Events Platform

## Quick Start for AI Assistant
When starting a new session, read this file to understand the project context and capabilities.

## Project Overview
- **Name**: Car Audio Events Competition Platform
- **Version**: 1.19.5
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

### 3. Recent Security & Performance Fixes Implemented

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

### 7. Security Best Practices
1. **Never expose service role key** in client-side code
2. **Always enable RLS** on new tables
3. **Set search_path** on all new functions
4. **Use parameterized queries** to prevent SQL injection
5. **Validate all user inputs** before database operations

### 8. Project Structure
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

### 9. Testing Database Connection
```javascript
// Quick test to verify connection
import { supabaseAdmin } from './src/utils/supabaseAdmin.js';

const result = await supabaseAdmin.executeSQL('SELECT NOW() as current_time');
console.log('Connected:', result.success);
```

### 10. Important Notes
- Production database is at: `https://nqvisvranvjaghvrdaaz.supabase.co`
- No staging environment - be careful with database operations
- The MCP (Model Context Protocol) server is set up but requires the service role key
- Supabase CLI is available via `npx supabase`

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
- **Bug Fixes (v1.18.1 - v1.19.5)**:
  - Fixed infinite loop in Directory component (useCallback)
  - Fixed TypeScript errors in AdminUsers (delete action)
  - Corrected admin directory navigation routes
  - Fixed image position display issue (v1.19.3) - falsy value handling
  - Fixed date timezone display issues (v1.19.4-v1.19.5) - dates no longer show one day earlier

### 11. Recently Fixed Issues (v1.19.3 - v1.19.5)

#### Event Flier Image Position Display (Fixed in v1.19.3)
**Issue**: Image position slider value was saving but not displaying correctly
**Root Cause**: JavaScript falsy value handling - position 0 was being treated as falsy and defaulting to 50
**Solution**: Changed from `event.imagePosition || 50` to proper null/undefined checks
**Status**: ✅ FIXED - Image positions now save and display correctly at all values (0-100)

#### Date Display Timezone Issue (Fixed in v1.19.4-v1.19.5)
**Issue**: Dates showing one day earlier (e.g., 07/26/2025 displaying as 07/25/2025)
**Root Cause**: JavaScript's `new Date()` interprets date-only strings as UTC midnight, causing timezone shifts
**Solution**: Created `parseLocalDate()` helper function to handle date-only strings as local dates
**Status**: ✅ FIXED - All dates now display correctly without timezone shifts

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
import { formatDateForInput, formatDateForDateInput } from './utils/dateHelpers';

// For datetime inputs
start_date: formatDateForInput(event.start_date),
// For date inputs
display_start_date: formatDateForDateInput(event.display_start_date),
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

---
Last Updated: January 2025
Context preserved for AI assistants working on this project.