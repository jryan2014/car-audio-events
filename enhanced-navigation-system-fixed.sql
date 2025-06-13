-- ENHANCED NAVIGATION SYSTEM WITH MEMBERSHIP CONTEXTS (FIXED)
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

-- Success message
SELECT 'Enhanced navigation system database structure created successfully!' as result; 