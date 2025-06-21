-- 12-email-templates-schema.sql
-- This script creates the email_templates table and seeds it with initial data.

-- Create the function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the function to check if a user is an admin
-- This function checks for a 'admin' role in the user_profiles table.
CREATE OR REPLACE FUNCTION public.is_admin(user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_id = user_id_param AND membership_type = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL UNIQUE,
  email_type TEXT NOT NULL,
  membership_level TEXT, -- e.g., 'free', 'pro', 'admin'. NULL for default.
  subject TEXT NOT NULL,
  html_body TEXT,
  text_body TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  from_name TEXT, -- Per-template from name override
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for clarity
COMMENT ON COLUMN public.email_templates.template_name IS 'A human-readable name for the template, e.g., "Welcome - Pro Tier".';
COMMENT ON COLUMN public.email_templates.email_type IS 'The type of email, corresponds to application logic, e.g., "welcome", "password_reset".';
COMMENT ON COLUMN public.email_templates.membership_level IS 'The membership level this template applies to. If NULL, it is the default for the email_type.';
COMMENT ON COLUMN public.email_templates.is_active IS 'Allows disabling a template without deleting it.';
COMMENT ON COLUMN public.email_templates.from_name IS 'An override for the "From" name for this specific template.';

-- Create the update trigger
-- Drop trigger if it exists to avoid errors on re-running
DROP TRIGGER IF EXISTS set_timestamp ON public.email_templates;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Enable Row Level Security
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist to prevent errors on re-running
DROP POLICY IF EXISTS "Allow full access to admins" ON public.email_templates;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.email_templates;

-- Create RLS policies
CREATE POLICY "Allow full access to admins"
  ON public.email_templates
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Allow read access for authenticated users"
  ON public.email_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Seed initial data for the templates
INSERT INTO public.email_templates (template_name, email_type, membership_level, subject, html_body, text_body, from_name)
VALUES
  (
    'Default Welcome Email',
    'welcome',
    NULL, -- Default for all users
    '🎉 Welcome to Car Audio Events, {{firstName}}!',
    '<!DOCTYPE html><html><head><title>Welcome to Car Audio Events</title></head><body><h1>Welcome, {{firstName}}!</h1><p>Thanks for joining Car Audio Events. To get started, please confirm your email address by clicking the link below:</p><a href="{{confirmation_link}}">Confirm Your Email</a><p>Once confirmed, you can log in and visit your dashboard: <a href="https://caraudioevents.com/dashboard">Go to Dashboard</a></p></body></html>',
    'Welcome, {{firstName}}!\n\nThanks for joining Car Audio Events. To get started, please confirm your email address by visiting this link: {{confirmation_link}}\n\nOnce confirmed, you can log in and visit your dashboard: https://caraudioevents.com/dashboard',
    'Car Audio Events Accounts'
  ),
  (
    'Default Password Reset',
    'password_reset',
    NULL, -- Default for all users
    'Your Password Reset Request',
    '<!DOCTYPE html><html><head><title>Password Reset</title></head><body><h1>Password Reset Request</h1><p>We received a request to reset your password. Click the link below to proceed:</p><a href="{{reset_link}}">Reset Your Password</a><p>If you did not request this, please ignore this email.</p></body></html>',
    'Password Reset Request\n\nWe received a request to reset your password. Please visit the following link to proceed: {{reset_link}}\n\nIf you did not request this, please ignore this email.',
    'Car Audio Events Support'
  )
ON CONFLICT (template_name) DO UPDATE 
SET 
  email_type = EXCLUDED.email_type,
  membership_level = EXCLUDED.membership_level,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  from_name = EXCLUDED.from_name; 