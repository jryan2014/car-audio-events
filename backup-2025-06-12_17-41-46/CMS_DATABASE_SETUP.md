# CMS Database Setup Guide

## Overview
The CMS (Content Management System) requires specific database tables and migrations to be run in the correct order. This guide walks you through setting up the complete CMS system.

## Required Migrations (In Order)

### 1. **Create CMS Pages Table** (Required First)
Run this migration first to create the base `cms_pages` table:

```sql
-- Copy and paste this entire file into Supabase SQL Editor:
-- database/migrations/create_cms_pages_table.sql
```

**What this creates:**
- `cms_pages` table with basic fields
- Indexes for performance
- Row Level Security policies
- Auto-updating timestamps
- Sample Privacy Policy and Terms pages

### 2. **Add Navigation Fields** (Optional Enhancement)
After the base table is created, optionally add navigation features:

```sql
-- Copy and paste this entire file into Supabase SQL Editor:
-- database/migrations/add_cms_navigation_fields.sql
```

**What this adds:**
- Navigation placement options
- Footer section organization
- Navigation ordering and custom titles
- SEO sitemap integration

## Step-by-Step Setup

### Step 1: Access Supabase
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New Query"**

### Step 2: Create Base CMS Table
1. Copy the entire contents of `database/migrations/create_cms_pages_table.sql`
2. Paste into the SQL Editor
3. Click **"Run"** button
4. Verify success - you should see "Success. No rows returned"

### Step 3: Add Navigation Features (Optional)
1. Copy the entire contents of `database/migrations/add_cms_navigation_fields.sql`
2. Paste into the SQL Editor
3. Click **"Run"** button
4. Verify success

### Step 4: Verify Installation
After running the migrations, verify the table exists:

```sql
-- Run this query to check the table structure:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cms_pages' 
ORDER BY ordinal_position;
```

You should see columns like: `id`, `title`, `slug`, `content`, `meta_title`, etc.

## Troubleshooting

### Error: "relation cms_pages does not exist"
- **Cause**: Base table hasn't been created yet
- **Solution**: Run Step 2 (create_cms_pages_table.sql) first

### Error: "column navigation_placement does not exist"
- **Cause**: Navigation fields haven't been added yet
- **Solution**: Run Step 3 (add_cms_navigation_fields.sql)
- **Alternative**: The system works without navigation fields

### Error: "permission denied for table cms_pages"
- **Cause**: Row Level Security policy issue
- **Solution**: Make sure you're logged in as an admin user
- **Check**: Verify your user has `membership_type = 'admin'` in the users table

### Sample Pages Not Created
- **Cause**: No admin users exist yet
- **Solution**: Create an admin user first, then re-run the migration

## Database Schema Overview

### Base Fields (Always Available)
```sql
id UUID PRIMARY KEY                    -- Unique identifier
title TEXT NOT NULL                   -- Page title
slug TEXT UNIQUE NOT NULL             -- URL slug (e.g., "privacy-policy")
content TEXT                          -- HTML content
meta_title TEXT                       -- SEO title
meta_description TEXT                 -- SEO description
meta_keywords JSONB                   -- SEO keywords array
status TEXT DEFAULT 'draft'          -- draft|published|archived
is_featured BOOLEAN DEFAULT false    -- Featured page flag
author_id UUID                        -- User who created the page
published_at TIMESTAMPTZ             -- Publication date
created_at TIMESTAMPTZ               -- Creation date
updated_at TIMESTAMPTZ               -- Last update date
```

### Navigation Fields (After Enhancement Migration)
```sql
navigation_placement TEXT DEFAULT 'none'     -- none|top_nav|sub_nav|footer
parent_nav_item TEXT                          -- Parent menu for sub navigation
footer_section TEXT                           -- Footer section placement
nav_order INTEGER                             -- Navigation order
nav_title TEXT                                -- Custom navigation title
show_in_sitemap BOOLEAN DEFAULT true         -- Include in sitemap
```

## Security Notes

### Row Level Security Policies
The table has these security policies:
- **Admins**: Full access to all pages
- **Authors**: Can manage their own pages
- **Public**: Can read published pages only

### Best Practices
1. **Always backup** before running migrations
2. **Test migrations** on a development database first
3. **Run migrations in order** as specified
4. **Verify results** after each migration

## Sample Content

After setup, you'll have these sample pages:
- **Privacy Policy** (draft) - `/privacy-policy`
- **Terms of Service** (draft) - `/terms-of-service`

Edit these in the CMS admin interface or create new pages as needed.

## Next Steps

1. **Access CMS**: Go to Admin → CMS Pages in your application
2. **Edit Sample Pages**: Customize the privacy policy and terms
3. **Create New Pages**: Add about, contact, help pages, etc.
4. **Set Navigation**: Configure where pages appear on your site
5. **Publish Pages**: Change status from "draft" to "published"

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify you're logged in as an admin user
3. Confirm all migrations ran successfully
4. Check Supabase logs for detailed error information 