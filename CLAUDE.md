# Claude AI Context Guide - Car Audio Events Platform

## Quick Start for AI Assistant
When starting a new session, read this file to understand the project context and capabilities.

## Project Overview
- **Name**: Car Audio Events Competition Platform
- **Version**: 1.16.2
- **Tech Stack**: React, TypeScript, Supabase, Tailwind CSS, Vite
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Netlify

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

### 3. Recent Security Fixes Implemented

#### RLS (Row Level Security)
- ✅ Enabled RLS on `refunds` and `payment_provider_configs` tables
- ✅ Created policies for user access control
- ✅ Admin users (membership_type = 'admin') have elevated privileges

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
- Created reusable database administration utility
- Set up secure environment variable handling
- Implemented comprehensive security policies

---
Last Updated: January 2025
Context preserved for AI assistants working on this project.