# RLS Policy Fix for Public Member Profiles - January 27, 2025

## Issue
Public member profiles (including admin profiles set to "public") were not visible to non-authenticated users despite the visibility setting.

## Root Cause
Missing Row Level Security (RLS) policies for anonymous access to:
1. `member_profiles` table - only had policies for authenticated users
2. `member_gallery_images` table - only allowed authenticated access

## Fix Applied

### Migration 1: Public Member Profiles Access
```sql
-- Allow anonymous users to view public member profiles
CREATE POLICY "Public profiles visible to all"
ON member_profiles
FOR SELECT
TO anon, authenticated
USING (
    visibility = 'public' 
    AND is_banned = false
);

-- Update authenticated users policy
CREATE POLICY "Authenticated users view profiles"
ON member_profiles
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()  -- Own profile
    OR visibility IN ('public', 'members_only')  -- Public and members_only profiles
);
```

### Migration 2: Public Gallery Images Access
```sql
-- Allow anonymous users to view public gallery images
CREATE POLICY "Public gallery images visible to all"
ON member_gallery_images
FOR SELECT
TO anon, authenticated
USING (
    visibility = 'public' 
    AND is_banned = false
);

-- Authenticated users can see more
CREATE POLICY "Authenticated users view gallery images"
ON member_gallery_images
FOR SELECT
TO authenticated
USING (
    profile_id IN (SELECT id FROM member_profiles WHERE user_id = auth.uid())
    OR (visibility IN ('public', 'members_only') AND is_banned = false)
);
```

## Result
- Non-authenticated users can now see profiles marked as "public"
- This includes admin profiles set to public visibility
- Gallery images with public visibility are also visible
- The unified `/members` directory now works correctly for all users

## Testing
Verified that public profiles are accessible with query showing 1 public profile exists and is queryable.