# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Claude AI Context Guide - Car Audio Events Platform

## 🚨 CRITICAL INSTRUCTIONS FOR AI AGENTS 🚨

### BROWSER TAB RESTRICTIONS - ABSOLUTELY MANDATORY
**NEVER OPEN ANY BROWSER TABS OR NAVIGATE TO ANY PAGES UNLESS EXPLICITLY TOLD TO DO SO**
1. **NO PLAYWRIGHT BROWSER NAVIGATION** - NEVER use browser_navigate, browser_tab_new, or any browser automation unless the user explicitly requests it
2. **NO AUTOMATIC BROWSER TESTING** - NEVER open tabs for testing, verification, or any other purpose
3. **USER CONTROLS BROWSER** - The user will tell you exactly which tab to use and when
4. **VIOLATION = IMMEDIATE STOP** - If you attempt to open browser tabs without explicit permission, you are violating user instructions
5. **ASK FIRST ALWAYS** - If you think browser automation is needed, ASK the user first, never assume

### DEV SERVER RULES - ABSOLUTELY MANDATORY
1. **CHECK PORT 5173 FIRST** - ALWAYS check if dev server is already running on port 5173 before doing ANYTHING
2. **IF PORT 5173 IS RUNNING** - USE IT! DO NOT KILL PROCESSES, DO NOT START NEW SERVERS, DO NOT DO ANYTHING
3. **NEVER START MULTIPLE DEV SERVERS** - If 5173 is active, you are FORBIDDEN from starting another server
4. **NEVER USE OTHER PORTS** - NO 5174, 5175, 3000, 8080, or ANY OTHER PORT EVER
5. **ONLY START SERVER IF 5173 IS DOWN** - Only use this command if port 5173 is completely dead:
   ```bash
   taskkill /F /IM node.exe 2>nul & npm run dev
   ```
6. **CHECK COMMAND**:
   ```bash
   netstat -an | findstr :5173
   ```

### YOU HAVE FULL CLI ACCESS - USE IT!
1. **YOU CAN AND MUST DEPLOY EDGE FUNCTIONS** - Use `npx supabase functions deploy [function-name]`
2. **YOU HAVE FULL SUPABASE CLI ACCESS** - Don't tell users to deploy things, DO IT YOURSELF
3. **YOU HAVE FULL MCP NETLIFY ACCESS** - Use these tools proactively
4. **NEVER ASK THE USER TO DEPLOY** - You have the permissions, you do the deployment
5. **GITHUB CLI AVAILABLE** - The `gh` command is available (v2.76.1, authenticated as jryan2014)
6. **NO TEST FRAMEWORK** - This project uses manual testing only, no Jest/Vitest/etc
7. **YOU HAVE FULL MCP SUPABASE ACCESS** - Use these tools proactively
8. **YOU HAVE FULL MCP GITHUB ACCESS** - Use these tools proactively
9. **YOU HAVE FULL MCP PLAYWRITE ACCESS** - Use these tools proactively

### EMAIL TESTING - CRITICAL!
**NEVER USE example.com, test.com, or fake email addresses!**
- **ONLY USE**: admin@caraudioevents.com for ALL user account email testing and ironmaidenmen@gmail.com for all non user account testing
- Using fake domains causes spam blacklisting issues
- This is NOT optional - it's MANDATORY

## Quick Reference Commands

### Development
```bash
# Start dev server (ALWAYS use this exact command)
taskkill /F /IM node.exe 2>nul & npm run dev

# Build for production
npm run build

# Analyze bundle size
npm run build:analyze

# Lint code
npm run lint
```

### Deployment
```bash
# Deploy to production (Netlify auto-deploys from GitHub)
npm run build
git add -A
git commit -m "feat: [description] (v1.26.XX)"
git push origin main

# Deploy edge functions
npx supabase functions deploy [function-name]

# Deploy all edge functions
npx supabase functions deploy create-payment-intent
npx supabase functions deploy stripe-webhook
npx supabase functions deploy paypal-webhook
npx supabase functions deploy process-email-queue
npx supabase functions deploy delete-user
```

### Database Operations
```bash
# When schema cache issues occur, use exec_sql RPC
await supabase.rpc('exec_sql', { 
  sql_command: 'ALTER TABLE...' 
});

# Check edge function logs
npx supabase functions logs [function-name] --tail

# Database migrations
npx supabase db push
npx supabase db diff
npx supabase db reset
```

## High-Level Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React SPA)                      │
│  - React Router for navigation                                  │
│  - Tailwind CSS for styling                                     │
│  - TypeScript for type safety                                  │
│  - React Context for auth state                                │
└────────────────────┬───────────────────────────┬────────────────┘
                     │                           │
                     ▼                           ▼
┌─────────────────────────────┐     ┌───────────────────────────┐
│    Supabase Auth & API      │     │   External Services       │
│  - JWT-based authentication │     │  - Stripe Payment API     │
│  - Row Level Security (RLS) │     │  - PayPal Payment API     │
│  - Real-time subscriptions  │     │  - Google Maps API        │
│  - Storage for images       │     │  - OpenAI (DALL-E)        │
└─────────────┬───────────────┘     │  - Stability AI           │
              │                      └───────────────────────────┘
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                           │
│  - Users & roles (admin, organizer, competitor, sponsor)        │
│  - Events & registrations                                       │
│  - Payments & transactions                                      │
│  - Email queue & templates                                      │
│  - Advertisements & notifications                               │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Edge Functions (Deno)                         │
│  - Payment processing (Stripe/PayPal)                           │
│  - Webhook handling                                             │
│  - Email queue processing                                       │
│  - User deletion                                               │
│  - Complex business logic                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Database-First Security**: All access control is enforced at the database level using RLS policies. Never trust client-side validation alone.

2. **Edge Functions for Sensitive Operations**: Payment processing, webhook handling, and email sending are handled in Edge Functions to keep secrets secure.

3. **Environment Variable Strategy**: 
   - Client-side: Only public keys (prefixed with VITE_)
   - Edge Functions: Secret keys stored in Supabase dashboard
   - Never store secrets in the database

4. **Real-time Updates**: Uses Supabase real-time subscriptions for live data (notifications, events, etc.)

5. **Queue-Based Email System**: Emails are queued in the database and processed by a cron job to ensure reliability

## Critical Security Infrastructure

### Payment Security
- **CSRF Protection**: Double-submit cookie pattern (`src/utils/csrfProtection.ts`)
- **Rate Limiting**: Database-backed rate limiting (`supabase/functions/_shared/rate-limiter.ts`)
- **Input Validation**: Comprehensive validation (`src/utils/paymentValidation.ts`)
- **Audit Logging**: All payment actions logged (`supabase/functions/_shared/audit-logger.ts`)
- **Secure Logging**: Automatic redaction of sensitive data (`src/utils/secureLogging.ts`)

### Database Security
- **RLS Enabled**: Every table has Row Level Security enabled
- **Function Security**: All functions have `SET search_path = 'public', 'pg_catalog', 'pg_temp'`
- **Service Role Key**: Only used in Edge Functions and admin utilities, never exposed to client

## Common Gotchas & Solutions

### Schema Cache Issues
When Supabase PostgREST doesn't recognize new functions/tables:
```javascript
// Use exec_sql RPC instead of direct queries
await supabase.rpc('exec_sql', { 
  sql_command: 'YOUR SQL HERE'  // Note: parameter is sql_command, not sql
});
```

### Email Queue Column Names
```javascript
// Email queue uses these columns:
- to_email (NOT recipient)
- html_content (NOT html_body) 
- Email templates use html_body column
```

### Newsletter System
- Newsletter UI says "newsletter" but database tables use "campaign"
- Status values: draft, scheduled, sending, sent, cancelled (NOT "queued")
- Always test with admin@caraudioevents.com, never fake emails

### Date Handling
```javascript
// Use parseLocalDate() to avoid timezone issues
import { parseLocalDate } from './utils/dateHelpers';
const displayDate = parseLocalDate(event.start_date).toLocaleDateString();
```

## Recent Security Enhancements (v1.26.32)

### Completed Security Work
1. ✅ **Environment Variable Security**: All payment keys moved to env vars
2. ✅ **CSRF Protection**: Implemented for all state-changing operations
3. ✅ **Rate Limiting**: Database-backed limiting for all payment endpoints
4. ✅ **Payment Validation**: Comprehensive input validation and sanitization
5. ✅ **Audit Logging**: Full audit trail for payment operations
6. ✅ **Webhook Security**: Signature validation and IP-based rate limiting

### Security Best Practices
1. **Input Validation**: Always validate on the server, never trust client
2. **Secret Storage**: Use environment variables, never database or code
3. **Audit Everything**: Log all payment and security-sensitive operations
4. **Defense in Depth**: Multiple layers of security for critical operations

## Future Features Tracking
See `FUTURE_FEATURES_TODO.md` for planned enhancements that are not part of current priorities.

## AI Agent System

The Car Audio Events platform uses specialized AI agents to provide domain expertise:
- **Support Desk Specialist**: Support system optimization
- **Event Platform Architect**: Event management features  
- **Payment Integration Specialist**: Payment security and compliance
- Plus 20+ general purpose agents from Contains Studio

See `.claude/agents/CAR_AUDIO_EVENTS_AGENTS.md` for full documentation.

---
Last Updated: January 2025 (v1.26.32)
Context preserved for AI assistants working on this project.