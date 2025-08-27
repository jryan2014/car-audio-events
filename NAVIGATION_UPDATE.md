# Navigation Menu Update - January 27, 2025

## Change: Unified Member Directory

### What was changed:
- Removed "Public Directory" link from the Community dropdown menu in navigation
- Unified all member directory functionality into a single `/members` route

### Database Migration Applied:
```sql
-- Remove Public Directory link from navigation menu
DELETE FROM navigation_menu_items 
WHERE title = 'Public Directory' 
   OR href = '/public-directory'
   OR href LIKE '%public-directory%';

-- Update any parent references if needed
UPDATE navigation_menu_items 
SET href = '/members'
WHERE href = '/public-directory';
```

### How it works now:
- Single `/members` page shows different content based on authentication:
  - **Non-authenticated users**: See only public profiles
  - **Authenticated users**: See both public and members-only profiles
  - **Private profiles**: Never shown in directory

This migration has been applied to the production database.