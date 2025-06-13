-- Fix AdminMembership page database dependencies
-- Creates role_permissions and membership_plans tables if they don't exist

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name TEXT NOT NULL,
    permission TEXT NOT NULL,
    resource TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(role_name, permission, resource)
);

-- Create membership_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.membership_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('competitor', 'retailer', 'manufacturer', 'organization')),
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly', 'lifetime')) DEFAULT 'yearly',
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    permissions JSONB DEFAULT '[]'::jsonb,
    limits JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default role permissions based on the component's expectations
INSERT INTO public.role_permissions (role_name, permission, resource, description) VALUES
-- Competitor permissions
('competitor', 'view_events', 'events', 'Browse and view event listings'),
('competitor', 'register_events', 'events', 'Register and participate in events'),
('competitor', 'track_scores', 'competition', 'View and track competition scores'),
('competitor', 'create_profile', 'profile', 'Create and manage user profile'),
('competitor', 'join_teams', 'teams', 'Join and participate in teams'),

-- Premium competitor permissions
('premium_competitor', 'view_events', 'events', 'Browse and view event listings'),
('premium_competitor', 'register_events', 'events', 'Register and participate in events'),
('premium_competitor', 'track_scores', 'competition', 'View and track competition scores'),
('premium_competitor', 'create_profile', 'profile', 'Create and manage user profile'),
('premium_competitor', 'join_teams', 'teams', 'Join and participate in teams'),
('premium_competitor', 'advanced_analytics', 'analytics', 'Access detailed performance analytics'),
('premium_competitor', 'priority_registration', 'events', 'Early access to event registration'),
('premium_competitor', 'custom_showcase', 'profile', 'Create custom audio system showcases'),
('premium_competitor', 'export_history', 'data', 'Export competition data and history'),

-- Retailer permissions
('retailer', 'view_events', 'events', 'Browse and view event listings'),
('retailer', 'directory_listing', 'business', 'List business in directory'),
('retailer', 'create_events', 'events', 'Create and manage events'),
('retailer', 'customer_analytics', 'analytics', 'Access customer insights and analytics'),
('retailer', 'advertising', 'marketing', 'Access to advertising and promotion tools'),

-- Premium retailer permissions
('premium_retailer', 'view_events', 'events', 'Browse and view event listings'),
('premium_retailer', 'directory_listing', 'business', 'List business in directory'),
('premium_retailer', 'create_events', 'events', 'Create and manage events'),
('premium_retailer', 'customer_analytics', 'analytics', 'Access customer insights and analytics'),
('premium_retailer', 'advertising', 'marketing', 'Access to advertising and promotion tools'),
('premium_retailer', 'sponsorship_tools', 'marketing', 'Tools for event sponsorship management'),
('premium_retailer', 'api_access', 'integration', 'Access to platform APIs'),
('premium_retailer', 'priority_support', 'support', 'Priority customer support'),
('premium_retailer', 'bulk_operations', 'data', 'Perform bulk data operations'),

-- Manufacturer permissions
('manufacturer', 'view_events', 'events', 'Browse and view event listings'),
('manufacturer', 'directory_listing', 'business', 'List business in directory'),
('manufacturer', 'create_events', 'events', 'Create and manage events'),
('manufacturer', 'customer_analytics', 'analytics', 'Access customer insights and analytics'),
('manufacturer', 'advertising', 'marketing', 'Access to advertising and promotion tools'),
('manufacturer', 'sponsorship_tools', 'marketing', 'Tools for event sponsorship management'),

-- Premium manufacturer permissions
('premium_manufacturer', 'view_events', 'events', 'Browse and view event listings'),
('premium_manufacturer', 'directory_listing', 'business', 'List business in directory'),
('premium_manufacturer', 'create_events', 'events', 'Create and manage events'),
('premium_manufacturer', 'customer_analytics', 'analytics', 'Access customer insights and analytics'),
('premium_manufacturer', 'advertising', 'marketing', 'Access to advertising and promotion tools'),
('premium_manufacturer', 'sponsorship_tools', 'marketing', 'Tools for event sponsorship management'),
('premium_manufacturer', 'api_access', 'integration', 'Access to platform APIs'),
('premium_manufacturer', 'priority_support', 'support', 'Priority customer support'),
('premium_manufacturer', 'bulk_operations', 'data', 'Perform bulk data operations'),
('premium_manufacturer', 'white_label', 'branding', 'White label platform features'),

-- Organization permissions
('organization', 'view_events', 'events', 'Browse and view event listings'),
('organization', 'member_management', 'organization', 'Manage organization members'),
('organization', 'event_hosting', 'events', 'Host and organize events'),
('organization', 'community_building', 'community', 'Access community building tools'),
('organization', 'custom_branding', 'branding', 'Custom branding and themes')

ON CONFLICT (role_name, permission, resource) DO NOTHING;

-- Insert default membership plans if none exist
INSERT INTO public.membership_plans (name, type, price, billing_period, description, features, permissions, limits, is_active, is_featured, display_order) 
SELECT 
    'Free Competitor',
    'competitor',
    0,
    'yearly',
    'Basic competitor access with essential features',
    '["Event browsing", "Basic profile", "Score tracking", "Community access"]'::jsonb,
    '["view_events", "register_events", "track_scores", "create_profile"]'::jsonb,
    '{"max_events_per_month": 3, "max_team_members": 1, "max_listings": 0}'::jsonb,
    true,
    false,
    1
WHERE NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE type = 'competitor' AND price = 0);

INSERT INTO public.membership_plans (name, type, price, billing_period, description, features, permissions, limits, is_active, is_featured, display_order) 
SELECT 
    'Pro Competitor',
    'competitor',
    99.99,
    'yearly',
    'Enhanced competitor features with advanced analytics',
    '["Unlimited events", "Advanced analytics", "Priority registration", "Custom showcase", "Export tools"]'::jsonb,
    '["view_events", "register_events", "track_scores", "create_profile", "join_teams", "advanced_analytics", "priority_registration", "custom_showcase", "export_history"]'::jsonb,
    '{"max_events_per_month": -1, "max_team_members": 5, "max_listings": 0}'::jsonb,
    true,
    true,
    2
WHERE NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE type = 'competitor' AND price > 0);

INSERT INTO public.membership_plans (name, type, price, billing_period, description, features, permissions, limits, is_active, is_featured, display_order) 
SELECT 
    'Business Retailer',
    'retailer',
    299.99,
    'yearly',
    'Full retailer access with directory listing and analytics',
    '["Directory listing", "Event creation", "Customer analytics", "Advertising tools", "Business tools"]'::jsonb,
    '["view_events", "directory_listing", "create_events", "customer_analytics", "advertising", "priority_support"]'::jsonb,
    '{"max_events_per_month": 10, "max_team_members": 10, "max_listings": 3}'::jsonb,
    true,
    false,
    3
WHERE NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE type = 'retailer');

INSERT INTO public.membership_plans (name, type, price, billing_period, description, features, permissions, limits, is_active, is_featured, display_order) 
SELECT 
    'Enterprise Organization',
    'organization',
    999.99,
    'yearly',
    'Complete organization management with custom branding',
    '["Member management", "Event hosting", "Community tools", "Custom branding", "Full analytics"]'::jsonb,
    '["view_events", "member_management", "event_hosting", "community_building", "custom_branding", "api_access", "priority_support"]'::jsonb,
    '{"max_events_per_month": -1, "max_team_members": -1, "max_listings": -1}'::jsonb,
    true,
    true,
    4
WHERE NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE type = 'organization');

-- Add RLS policies for role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_read_all" ON public.role_permissions
    FOR SELECT USING (true);

CREATE POLICY "role_permissions_admin_write" ON public.role_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'admin'
        )
    );

-- Add RLS policies for membership_plans
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membership_plans_read_all" ON public.membership_plans
    FOR SELECT USING (true);

CREATE POLICY "membership_plans_admin_write" ON public.membership_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'admin'
        )
    );

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_name ON public.role_permissions(role_name);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission);
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource ON public.role_permissions(resource);
CREATE INDEX IF NOT EXISTS idx_membership_plans_type ON public.membership_plans(type);
CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON public.membership_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_membership_plans_display_order ON public.membership_plans(display_order);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER update_role_permissions_updated_at
    BEFORE UPDATE ON public.role_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_membership_plans_updated_at ON public.membership_plans;
CREATE TRIGGER update_membership_plans_updated_at
    BEFORE UPDATE ON public.membership_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'AdminMembership tables and permissions setup completed successfully!' as result; 