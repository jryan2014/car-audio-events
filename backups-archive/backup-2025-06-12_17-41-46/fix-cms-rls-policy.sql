-- Fix RLS Policies for CMS Pages
-- Run this in Supabase SQL Editor

-- First, let's see what policies exist
-- SELECT * FROM pg_policies WHERE tablename = 'cms_pages';

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "cms_pages_select_policy" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_insert_policy" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_update_policy" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_delete_policy" ON cms_pages;

-- Create new policies that allow authenticated users to perform all operations
-- This allows any authenticated user to read all CMS pages
CREATE POLICY "cms_pages_select_policy" ON cms_pages
  FOR SELECT
  USING (true);

-- This allows authenticated users to insert new CMS pages
CREATE POLICY "cms_pages_insert_policy" ON cms_pages
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- This allows authenticated users to update CMS pages
CREATE POLICY "cms_pages_update_policy" ON cms_pages
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- This allows authenticated users to delete CMS pages
CREATE POLICY "cms_pages_delete_policy" ON cms_pages
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Alternatively, if you want to be more restrictive and only allow admin users:
-- You would need to join with a users table to check membership type
-- But since we don't have that table structure, we'll use the simpler approach above

-- Verify RLS is enabled (should return true)
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'cms_pages';

-- Check the new policies
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'cms_pages'; 