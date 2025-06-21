-- 13-new-user-trigger.sql
-- This script creates a trigger to send a welcome email after a user confirms their email address.

-- 1. Define the function to be called by the trigger
CREATE OR REPLACE FUNCTION public.handle_user_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Check if the email was just confirmed
  IF old.email_confirmed_at IS NULL AND new.email_confirmed_at IS NOT NULL THEN
    -- Asynchronously invoke the send-welcome-email Edge Function
    PERFORM net.http_post(
      url:='https://nqvisvranvjaghvrdaaz.supabase.co/functions/v1/send-welcome-email',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '"}'::jsonb,
      body:=jsonb_build_object('record', new)
    );
  END IF;
  RETURN new;
END;
$$;

-- 2. Create the trigger on the auth.users table
-- Drop trigger if it exists to avoid errors on re-running
DROP TRIGGER IF EXISTS on_user_confirmed ON auth.users;
CREATE TRIGGER on_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_confirm(); 