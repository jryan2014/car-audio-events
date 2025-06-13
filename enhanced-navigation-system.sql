-- ENHANCED NAVIGATION SYSTEM WITH MEMBERSHIP CONTEXTS
-- This script enhances the existing navigation system to support membership-specific menus

-- =====================================================
-- PART 1: ENHANCE EXISTING NAVIGATION TABLE
-- =====================================================

-- Add new columns to existing navigation_menu_items table
ALTER TABLE navigation_menu_items 
ADD COLUMN IF NOT EXISTS membership_context TEXT DEFAULT 'base' CHECK (membership_context IN ('base', 'free_competitor', 'pro_competitor', 'retailer', 'manufacturer', 'organization', 'admin')),
ADD COLUMN IF NOT EXISTS inherits_from UUID REFERENCES navigation_menu_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_name TEXT,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS custom_css_class TEXT,
ADD COLUMN IF NOT EXISTS badge_text TEXT,
ADD COLUMN IF NOT EXISTS badge_color TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS requires_subscription BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_subscription_level TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nav_menu_membership_context ON navigation_menu_items(membership_context);
CREATE INDEX IF NOT EXISTS idx_nav_menu_inherits_from ON navigation_menu_items(inherits_from);
CREATE INDEX IF NOT EXISTS idx_nav_menu_template ON navigation_menu_items(is_template);
CREATE INDEX IF NOT EXISTS idx_nav_menu_priority ON navigation_menu_items(priority);

-- =====================================================
-- PART 2: NAVIGATION TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS navigation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    membership_context TEXT NOT NULL CHECK (membership_context IN ('base', 'free_competitor', 'pro_competitor', 'retailer', 'manufacturer', 'organization', 'admin')),
    template_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for navigation templates
CREATE INDEX IF NOT EXISTS idx_nav_templates_context ON navigation_templates(membership_context);
CREATE INDEX IF NOT EXISTS idx_nav_templates_active ON navigation_templates(is_active);

-- =====================================================
-- PART 3: NAVIGATION ANALYTICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS navigation_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES navigation_menu_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    membership_type TEXT,
    action_type TEXT NOT NULL CHECK (action_type IN ('view', 'click', 'hover')),
    session_id TEXT,
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_nav_analytics_menu_item ON navigation_analytics(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_nav_analytics_user ON navigation_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_nav_analytics_membership ON navigation_analytics(membership_type);
CREATE INDEX IF NOT EXISTS idx_nav_analytics_created_at ON navigation_analytics(created_at);

-- =====================================================
-- PART 4: ENHANCED VISIBILITY RULES
-- =====================================================

-- Update visibility_rules to support more complex logic
COMMENT ON COLUMN navigation_menu_items.visibility_rules IS 'Enhanced visibility rules supporting: {"public": true, "membershipTypes": ["competitor", "retailer"], "subscriptionLevels": ["pro"], "customRules": {"requiresPayment": true, "minEventCount": 5}}';

-- =====================================================
-- PART 5: BASE NAVIGATION STRUCTURE
-- =====================================================

-- Clear existing navigation and create comprehensive base structure
DELETE FROM navigation_menu_items WHERE membership_context = 'base' OR membership_context IS NULL;

-- Insert base navigation structure (visible to all)
INSERT INTO navigation_menu_items (title, href, icon, nav_order, membership_context, visibility_rules, is_active, description) VALUES
('Home', '/', 'Home', 10, 'base', '{"public": true}', true, 'Main homepage'),
('Events', '/events', 'Calendar', 20, 'base', '{"public": true}', true, 'Browse car audio events'),
('Directory', '/directory', 'MapPin', 30, 'base', '{"public": true}', true, 'Find retailers and services'),
('About', '/about', 'Building2', 40, 'base', '{"public": true}', true, 'Learn about our platform'),
('Resources', '/resources', 'FileText', 50, 'base', '{"public": true}', true, 'Helpful resources and guides');

-- =====================================================
-- PART 6: MEMBERSHIP-SPECIFIC NAVIGATION CONTEXTS
-- =====================================================

-- FREE COMPETITOR NAVIGATION
INSERT INTO navigation_menu_items (title, href, icon, nav_order, membership_context, visibility_rules, is_active, description, badge_text, badge_color) VALUES
('My Dashboard', '/dashboard', 'Home', 15, 'free_competitor', '{"membershipTypes": ["competitor"]}', true, 'Personal dashboard', 'FREE', 'green'),
('Join Events', '/events', 'Calendar', 25, 'free_competitor', '{"membershipTypes": ["competitor"]}', true, 'Register for events', 'LIMITED', 'yellow'),
('My Profile', '/profile', 'Users', 35, 'free_competitor', '{"membershipTypes": ["competitor"]}', true, 'Manage your profile'),
('Upgrade', '/pricing', 'Star', 60, 'free_competitor', '{"membershipTypes": ["competitor"]}', true, 'Upgrade to Pro', 'UPGRADE', 'blue');

-- PRO COMPETITOR NAVIGATION  
INSERT INTO navigation_menu_items (title, href, icon, nav_order, membership_context, visibility_rules, is_active, description, badge_text, badge_color) VALUES
('Pro Dashboard', '/dashboard', 'Home', 15, 'pro_competitor', '{"membershipTypes": ["competitor"], "subscriptionLevels": ["pro"]}', true, 'Advanced dashboard', 'PRO', 'purple'),
('All Events', '/events', 'Calendar', 25, 'pro_competitor', '{"membershipTypes": ["competitor"], "subscriptionLevels": ["pro"]}', true, 'Unlimited event access'),
('Analytics', '/analytics', 'BarChart3', 35, 'pro_competitor', '{"membershipTypes": ["competitor"], "subscriptionLevels": ["pro"]}', true, 'Competition analytics', 'PRO', 'purple'),
('Team Management', '/teams', 'Users', 45, 'pro_competitor', '{"membershipTypes": ["competitor"], "subscriptionLevels": ["pro"]}', true, 'Manage your teams'),
('System Showcase', '/showcase', 'Target', 55, 'pro_competitor', '{"membershipTypes": ["competitor"], "subscriptionLevels": ["pro"]}', true, 'Showcase your system');

-- RETAILER NAVIGATION
INSERT INTO navigation_menu_items (title, href, icon, nav_order, membership_context, visibility_rules, is_active, description, badge_text, badge_color) VALUES
('Business Dashboard', '/dashboard', 'Building2', 15, 'retailer', '{"membershipTypes": ["retailer"]}', true, 'Business management hub', 'BUSINESS', 'orange'),
('Create Events', '/events/create', 'Plus', 25, 'retailer', '{"membershipTypes": ["retailer"]}', true, 'Host your own events'),
('Customer Analytics', '/customers', 'BarChart3', 35, 'retailer', '{"membershipTypes": ["retailer"]}', true, 'Track customer engagement'),
('Directory Listing', '/directory/manage', 'MapPin', 45, 'retailer', '{"membershipTypes": ["retailer"]}', true, 'Manage your business listing'),
('Advertising', '/advertising', 'Target', 55, 'retailer', '{"membershipTypes": ["retailer"]}', true, 'Promote your business'),
('Inventory', '/inventory', 'Package', 65, 'retailer', '{"membershipTypes": ["retailer"]}', true, 'Manage your inventory');

-- MANUFACTURER NAVIGATION
INSERT INTO navigation_menu_items (title, href, icon, nav_order, membership_context, visibility_rules, is_active, description, badge_text, badge_color) VALUES
('Enterprise Dashboard', '/dashboard', 'Crown', 15, 'manufacturer', '{"membershipTypes": ["manufacturer"]}', true, 'Enterprise control center', 'ENTERPRISE', 'red'),
('Product Catalog', '/products', 'Package', 25, 'manufacturer', '{"membershipTypes": ["manufacturer"]}', true, 'Manage your product line'),
('Dealer Network', '/dealers', 'Building2', 35, 'manufacturer', '{"membershipTypes": ["manufacturer"]}', true, 'Manage dealer relationships'),
('Brand Showcase', '/brand', 'Star', 45, 'manufacturer', '{"membershipTypes": ["manufacturer"]}', true, 'Showcase your brand'),
('Event Sponsorship', '/sponsorship', 'Target', 55, 'manufacturer', '{"membershipTypes": ["manufacturer"]}', true, 'Sponsor events'),
('API Access', '/api', 'Settings', 65, 'manufacturer', '{"membershipTypes": ["manufacturer"]}', true, 'API integration tools');

-- ORGANIZATION NAVIGATION
INSERT INTO navigation_menu_items (title, href, icon, nav_order, membership_context, visibility_rules, is_active, description, badge_text, badge_color) VALUES
('Organization Hub', '/dashboard', 'Users', 15, 'organization', '{"membershipTypes": ["organization"]}', true, 'Organization management', 'ORG', 'indigo'),
('Member Management', '/members', 'Users', 25, 'organization', '{"membershipTypes": ["organization"]}', true, 'Manage organization members'),
('Event Hosting', '/events/host', 'Calendar', 35, 'organization', '{"membershipTypes": ["organization"]}', true, 'Host organization events'),
('Community Tools', '/community', 'MessageCircle', 45, 'organization', '{"membershipTypes": ["organization"]}', true, 'Build your community'),
('Custom Branding', '/branding', 'Palette', 55, 'organization', '{"membershipTypes": ["organization"]}', true, 'Customize your presence'),
('Organization Analytics', '/org-analytics', 'BarChart3', 65, 'organization', '{"membershipTypes": ["organization"]}', true, 'Track organization metrics');

-- ADMIN NAVIGATION
INSERT INTO navigation_menu_items (title, href, icon, nav_order, membership_context, visibility_rules, is_active, description, badge_text, badge_color) VALUES
('Admin Dashboard', '/admin/dashboard', 'Shield', 15, 'admin', '{"membershipTypes": ["admin"]}', true, 'System administration', 'ADMIN', 'red'),
('User Management', '/admin/users', 'Users', 25, 'admin', '{"membershipTypes": ["admin"]}', true, 'Manage all users'),
('Event Management', '/admin/events', 'Calendar', 35, 'admin', '{"membershipTypes": ["admin"]}', true, 'Oversee all events'),
('System Settings', '/admin/settings', 'Settings', 45, 'admin', '{"membershipTypes": ["admin"]}', true, 'Configure system settings'),
('Analytics', '/admin/analytics', 'BarChart3', 55, 'admin', '{"membershipTypes": ["admin"]}', true, 'System-wide analytics'),
('Navigation Manager', '/admin/navigation', 'Menu', 65, 'admin', '{"membershipTypes": ["admin"]}', true, 'Manage navigation menus');

-- =====================================================
-- PART 7: NAVIGATION FUNCTIONS
-- =====================================================

-- Function to get navigation for specific membership context
CREATE OR REPLACE FUNCTION get_navigation_for_membership(
    p_membership_type TEXT DEFAULT 'base',
    p_subscription_level TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    navigation_data JSONB;
    context_name TEXT;
BEGIN
    -- Determine context based on membership type and subscription level
    context_name := CASE 
        WHEN p_membership_type = 'admin' THEN 'admin'
        WHEN p_membership_type = 'organization' THEN 'organization'
        WHEN p_membership_type = 'manufacturer' THEN 'manufacturer'
        WHEN p_membership_type = 'retailer' THEN 'retailer'
        WHEN p_membership_type = 'competitor' AND p_subscription_level = 'pro' THEN 'pro_competitor'
        WHEN p_membership_type = 'competitor' THEN 'free_competitor'
        ELSE 'base'
    END;
    
    -- Get navigation items for the context
    WITH navigation_hierarchy AS (
        SELECT 
            n.id,
            n.title,
            n.href,
            n.icon,
            n.nav_order,
            n.parent_id,
            n.target_blank,
            n.visibility_rules,
            n.is_active,
            n.badge_text,
            n.badge_color,
            n.description,
            n.membership_context,
            n.priority
        FROM navigation_menu_items n
        WHERE n.is_active = true
        AND (
            n.membership_context = 'base' 
            OR n.membership_context = context_name
        )
        ORDER BY n.priority DESC, n.nav_order ASC
    ),
    navigation_with_children AS (
        SELECT 
            n.id,
            n.title,
            n.href,
            n.icon,
            n.nav_order,
            n.target_blank,
            n.badge_text,
            n.badge_color,
            n.description,
            n.membership_context,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', child.id,
                        'title', child.title,
                        'href', child.href,
                        'icon', child.icon,
                        'nav_order', child.nav_order,
                        'badge_text', child.badge_text,
                        'badge_color', child.badge_color,
                        'description', child.description
                    ) ORDER BY child.nav_order
                ) FILTER (WHERE child.id IS NOT NULL),
                '[]'::json
            ) as children
        FROM navigation_hierarchy n
        LEFT JOIN navigation_hierarchy child ON child.parent_id = n.id
        WHERE n.parent_id IS NULL
        GROUP BY n.id, n.title, n.href, n.icon, n.nav_order, n.target_blank, n.badge_text, n.badge_color, n.description, n.membership_context
        ORDER BY n.nav_order
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'title', title,
            'href', href,
            'icon', icon,
            'nav_order', nav_order,
            'target_blank', target_blank,
            'badge_text', badge_text,
            'badge_color', badge_color,
            'description', description,
            'membership_context', membership_context,
            'children', children
        )
    ) INTO navigation_data
    FROM navigation_with_children;
    
    RETURN COALESCE(navigation_data, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track navigation analytics
CREATE OR REPLACE FUNCTION track_navigation_click(
    p_menu_item_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_membership_type TEXT DEFAULT NULL,
    p_action_type TEXT DEFAULT 'click',
    p_session_id TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_referrer TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO navigation_analytics (
        menu_item_id,
        user_id,
        membership_type,
        action_type,
        session_id,
        user_agent,
        ip_address,
        referrer
    ) VALUES (
        p_menu_item_id,
        p_user_id,
        p_membership_type,
        p_action_type,
        p_session_id,
        p_user_agent,
        p_ip_address,
        p_referrer
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 8: ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE navigation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_analytics ENABLE ROW LEVEL SECURITY;

-- Navigation templates policies
CREATE POLICY "navigation_templates_read_all" ON navigation_templates
    FOR SELECT USING (true);

CREATE POLICY "navigation_templates_admin_full" ON navigation_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'admin'
        )
    );

-- Navigation analytics policies
CREATE POLICY "navigation_analytics_read_own" ON navigation_analytics
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'admin'
        )
    );

CREATE POLICY "navigation_analytics_insert_all" ON navigation_analytics
    FOR INSERT WITH CHECK (true);

-- Update existing navigation_menu_items policies for new columns
DROP POLICY IF EXISTS "navigation_menu_items_read_all" ON navigation_menu_items;
CREATE POLICY "navigation_menu_items_read_all" ON navigation_menu_items
    FOR SELECT USING (is_active = true);

-- =====================================================
-- PART 9: SAMPLE NAVIGATION TEMPLATES
-- =====================================================

-- Insert sample navigation templates
INSERT INTO navigation_templates (name, description, membership_context, template_data) VALUES
('Default Base Navigation', 'Standard navigation for all users', 'base', 
'[
    {"title": "Home", "href": "/", "icon": "Home", "nav_order": 10},
    {"title": "Events", "href": "/events", "icon": "Calendar", "nav_order": 20},
    {"title": "Directory", "href": "/directory", "icon": "MapPin", "nav_order": 30}
]'::jsonb),

('Competitor Pro Template', 'Enhanced navigation for Pro competitors', 'pro_competitor',
'[
    {"title": "Pro Dashboard", "href": "/dashboard", "icon": "Home", "nav_order": 10, "badge_text": "PRO", "badge_color": "purple"},
    {"title": "Analytics", "href": "/analytics", "icon": "BarChart3", "nav_order": 20},
    {"title": "Team Management", "href": "/teams", "icon": "Users", "nav_order": 30}
]'::jsonb),

('Business Navigation Template', 'Navigation template for business users', 'retailer',
'[
    {"title": "Business Dashboard", "href": "/dashboard", "icon": "Building2", "nav_order": 10, "badge_text": "BUSINESS", "badge_color": "orange"},
    {"title": "Customer Analytics", "href": "/customers", "icon": "BarChart3", "nav_order": 20},
    {"title": "Advertising", "href": "/advertising", "icon": "Target", "nav_order": 30}
]'::jsonb);

-- Success message
SELECT 'Enhanced navigation system database structure created successfully!' as result; 