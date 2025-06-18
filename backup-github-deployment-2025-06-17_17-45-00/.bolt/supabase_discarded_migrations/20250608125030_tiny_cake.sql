/*
  # Clean up existing admin user and reset for fresh start

  1. Remove existing admin users
  2. Reset user count to 0
  3. Clean up any related data
  4. Ensure fresh start for registration system
*/

-- Remove all existing users (this will cascade to related tables)
DELETE FROM auth.users;

-- Remove all user profiles
DELETE FROM public.users;

-- Remove all user roles
DELETE FROM public.user_roles;

-- Remove all user sessions
DELETE FROM public.user_sessions;

-- Remove all user activity logs
DELETE FROM public.user_activity_log;

-- Reset any sequences if they exist
-- This ensures clean IDs for new users

-- Add a comment to track this cleanup
INSERT INTO public.admin_audit_log (action, details) 
VALUES ('database_cleanup', '{"reason": "Reset for fresh admin registration", "timestamp": "' || now() || '"}');