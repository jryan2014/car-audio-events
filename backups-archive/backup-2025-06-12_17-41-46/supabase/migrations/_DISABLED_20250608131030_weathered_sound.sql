/*
  # Database Cleanup - Remove Existing Users and Reset Platform

  This migration safely removes all existing users and related data to reset the platform
  for fresh admin registration. It handles foreign key constraints properly by deleting
  in the correct order.

  ## Changes Made:
  1. Delete all dependent records first (audit logs, activity logs, sessions, roles)
  2. Delete user profiles from public.users
  3. Delete auth users last
  4. Reset any sequences
  5. Log the cleanup action

  ## Security:
  - Maintains referential integrity during deletion
  - Logs the cleanup action for audit purposes
  - Preserves table structure and constraints
*/

-- Step 1: Delete all audit logs and activity logs first (they reference users)
DELETE FROM public.admin_audit_log;
DELETE FROM public.user_activity_log;

-- Step 2: Delete all user sessions
DELETE FROM public.user_sessions;

-- Step 3: Delete all user roles
DELETE FROM public.user_roles;

-- Step 4: Delete all role permissions (if any exist)
DELETE FROM public.role_permissions;

-- Step 5: Delete all subscription and payment related data
DELETE FROM public.user_subscriptions;
DELETE FROM public.event_registrations;
DELETE FROM public.payments;

-- Step 6: Delete all admin settings (if any exist)
DELETE FROM public.admin_settings;

-- Step 7: Now safely delete user profiles
DELETE FROM public.users;

-- Step 8: Finally delete auth users (this should now work without constraint violations)
DELETE FROM auth.users;

-- Step 9: Reset any sequences to start fresh
-- Note: Supabase handles UUID generation, so no sequences to reset for user IDs

-- Step 10: Log this cleanup action (now that we have a clean slate)
INSERT INTO public.admin_audit_log (action, details, created_at) 
VALUES (
  'database_cleanup_reset', 
  jsonb_build_object(
    'reason', 'Reset platform for fresh admin registration',
    'timestamp', now(),
    'performed_by', 'system_migration',
    'tables_cleared', array[
      'auth.users',
      'public.users', 
      'public.user_roles',
      'public.user_sessions',
      'public.user_activity_log',
      'public.admin_audit_log',
      'public.user_subscriptions',
      'public.event_registrations',
      'public.payments',
      'public.admin_settings',
      'public.role_permissions'
    ]
  ),
  now()
);