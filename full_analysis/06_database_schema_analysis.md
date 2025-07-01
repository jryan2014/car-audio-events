# Full Analysis Report 6: Database Schema

This report provides an overview of the database schema, focusing on tables related to the systems analyzed (Captcha, Email, Session, Debug).

---

### 6.1. Executive Summary

The database schema, primarily viewed through the application's interaction with it, appears to be centered around two main tables: `users` and `admin_settings`. The `users` table holds core user profile information, while the `admin_settings` table acts as a generic key-value store for system-wide configuration. There is a notable **absence of tables** that would be required to support some of the more advanced (or incomplete) features seen in the UI, such as an email queue or dynamic email templates.

### 6.2. Key Tables & Columns

#### `users` table
This table stores essential information about registered users.
- **Purpose:** Manages user profiles, roles, and status.
- **Key Columns Inferred from Code:**
    - `id` (uuid, primary key, foreign key to `auth.users.id`)
    - `name` (text)
    - `email` (text, unique)
    - `membership_type` (text, likely an enum: 'competitor', 'admin', etc.)
    - `status` (text, e.g., 'pending', 'active')
    - `verification_status` (text, e.g., 'pending', 'verified')
    - `location` (text)
    - `phone` (text)
    - `website` (text)
    - `bio` (text)
    - `company_name` (text)
    - `subscription_plan` (text)
    - `last_login_at` (timestamp)
    - `login_count` (integer)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

#### `admin_settings` table
This table is a key-value store for all system-wide configuration that can be changed dynamically by an administrator.
- **Purpose:** To provide flexible, database-driven configuration for the application.
- **Schema Inferred from Code:**
    - `key` (text, primary key)
    - `value` (text)
    - `is_sensitive` (boolean)
    - `description` (text)
    - `updated_by` (uuid, foreign key to `users.id`)
    - `updated_at` (timestamp)
- **Relevant Keys Found:**
    - **Stripe:** `stripe_publishable_key`, `stripe_secret_key`, etc.
    - **Supabase:** `supabase_url`, `supabase_anon_key`, etc.
    - **Google/reCAPTCHA:** `recaptcha_site_key`, `recaptcha_secret_key`, `recaptcha_enabled`.
    - **Session:** `session_timeout_hours`, `session_inactivity_timeout_hours`, `session_remember_me_days`.
    - **Debug:** `login_debug_mode`.

### 6.3. Security & Row-Level Security (RLS)

- **RLS Policies:** The codebase does not provide visibility into the specific RLS policies implemented on these tables. However, based on common Supabase practice:
    - The `users` table likely has a policy allowing users to read their own data (`auth.uid() = id`) and possibly a broader read access for authenticated users. Write access would be restricted to the user themselves.
    - The `admin_settings` table should have a very strict RLS policy, allowing read/write access **only to users with an 'admin' role**. A failure in this policy could expose all API keys and secrets to any authenticated user.
- **Security Concerns:** The primary security concern from a schema perspective is the integrity of the RLS policy on the `admin_settings` table. If this policy is misconfigured, it would be a critical vulnerability.

### 6.4. Missing Tables for Observed Features

The analysis of the frontend code revealed several UI features that imply the existence of backend tables that are likely missing.

- **`email_queue`**: The `EmailQueueManager.tsx` component is built to manage an email queue, but there is no evidence this table exists.
- **`email_templates`**: The server-side `edge-email-service.ts` appears designed to pull dynamic email templates from the database, but there is no evidence of an `email_templates` table.
- **`notifications`**: The `NotificationCenter.tsx` component suggests a system for user-specific notifications, which would require a `notifications` table.

### 6.5. Necessary Database Queries (For Future Work)

To get a definitive picture of the schema and security, the following queries would need to be run directly against the database.

-   **Check RLS on `admin_settings`**:
    ```sql
    select
      polname as policy_name,
      qual as "using",
      with_check as "with_check"
    from pg_policy
    where relname = 'admin_settings';
    ```

-   **Check RLS on `users`**:
    ```sql
    select
      polname as policy_name,
      qual as "using",
      with_check as "with_check"
    from pg_policy
    where relname = 'users';
    ```

-   **Confirm absence of other tables**:
    ```sql
    -- This query lists all user-created tables in the public schema.
    -- We can use it to verify if tables like 'email_queue' are missing.
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    ``` 