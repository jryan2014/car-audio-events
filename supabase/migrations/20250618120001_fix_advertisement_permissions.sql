-- Fix advertisement table permissions
-- Addresses permission denied errors in AdDisplay component

-- Enable RLS on advertisements table if not already enabled
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Anyone can view active advertisements" ON public.advertisements;
DROP POLICY IF EXISTS "Users can view advertisements" ON public.advertisements;
DROP POLICY IF EXISTS "Authenticated users can view advertisements" ON public.advertisements;
DROP POLICY IF EXISTS "Public read access" ON public.advertisements;

-- Create comprehensive policies for advertisements
CREATE POLICY "Anyone can view active advertisements" ON public.advertisements
    FOR SELECT
    USING (
        is_active = true 
        AND start_date <= NOW()::date 
        AND end_date >= NOW()::date
    );

-- Allow authenticated users to view their own advertisements
CREATE POLICY "Users can view their own advertisements" ON public.advertisements
    FOR SELECT
    USING ((SELECT auth.uid()) = created_by);

-- Allow authenticated users to insert their own advertisements
CREATE POLICY "Users can insert their own advertisements" ON public.advertisements
    FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = created_by);

-- Allow authenticated users to update their own advertisements
CREATE POLICY "Users can update their own advertisements" ON public.advertisements
    FOR UPDATE
    USING ((SELECT auth.uid()) = created_by)
    WITH CHECK ((SELECT auth.uid()) = created_by);

-- Admin policies for advertisements
CREATE POLICY "Admins can view all advertisements" ON public.advertisements
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = (SELECT auth.uid()) 
            AND users.membership_type = 'admin'
        )
    );

CREATE POLICY "Admins can update all advertisements" ON public.advertisements
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = (SELECT auth.uid()) 
            AND users.membership_type = 'admin'
        )
    );

CREATE POLICY "Admins can delete advertisements" ON public.advertisements
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = (SELECT auth.uid()) 
            AND users.membership_type = 'admin'
        )
    );

-- Grant necessary permissions
GRANT SELECT ON public.advertisements TO anon, authenticated;
GRANT INSERT, UPDATE ON public.advertisements TO authenticated; 