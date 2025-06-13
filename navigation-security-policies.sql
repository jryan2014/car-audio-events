-- NAVIGATION SYSTEM SECURITY POLICIES
-- Row Level Security policies for the enhanced navigation system

-- =====================================================
-- PART 1: ENABLE RLS ON NEW TABLES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE navigation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_analytics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: NAVIGATION TEMPLATES POLICIES
-- =====================================================

-- Allow everyone to read active navigation templates
CREATE POLICY "navigation_templates_read_all" ON navigation_templates
    FOR SELECT USING (is_active = true);

-- Allow admins full access to navigation templates
CREATE POLICY "navigation_templates_admin_full" ON navigation_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'admin'
        )
    );

-- Allow users to create templates for their own membership context
CREATE POLICY "navigation_templates_create_own_context" ON navigation_templates
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            -- Admin can create any template
            EXISTS (
                SELECT 1 FROM auth.users 
                WHERE auth.users.id = auth.uid() 
                AND auth.users.raw_user_meta_data->>'membershipType' = 'admin'
            )
            OR
            -- Users can create templates for their membership type
            membership_context = CASE 
                WHEN (SELECT raw_user_meta_data->>'membershipType' FROM auth.users WHERE id = auth.uid()) = 'organization' THEN 'organization'
                WHEN (SELECT raw_user_meta_data->>'membershipType' FROM auth.users WHERE id = auth.uid()) = 'manufacturer' THEN 'manufacturer'
                WHEN (SELECT raw_user_meta_data->>'membershipType' FROM auth.users WHERE id = auth.uid()) = 'retailer' THEN 'retailer'
                WHEN (SELECT raw_user_meta_data->>'membershipType' FROM auth.users WHERE id = auth.uid()) = 'competitor' THEN 'pro_competitor'
                ELSE 'base'
            END
        )
    );

-- =====================================================
-- PART 3: NAVIGATION ANALYTICS POLICIES
-- =====================================================

-- Allow users to read their own analytics data
CREATE POLICY "navigation_analytics_read_own" ON navigation_analytics
    FOR SELECT USING (
        user_id = auth.uid() OR
        -- Admins can read all analytics
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'admin'
        )
    );

-- Allow anyone to insert analytics data (for tracking)
CREATE POLICY "navigation_analytics_insert_all" ON navigation_analytics
    FOR INSERT WITH CHECK (true);

-- Prevent users from updating or deleting analytics data
CREATE POLICY "navigation_analytics_no_update" ON navigation_analytics
    FOR UPDATE USING (false);

CREATE POLICY "navigation_analytics_no_delete" ON navigation_analytics
    FOR DELETE USING (
        -- Only admins can delete analytics data
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'admin'
        )
    );

-- =====================================================
-- PART 4: ENHANCED NAVIGATION MENU ITEMS POLICIES
-- =====================================================

-- Drop existing policies to recreate with enhanced features
DROP POLICY IF EXISTS "navigation_menu_items_read_all" ON navigation_menu_items;
DROP POLICY IF EXISTS "navigation_menu_items_admin_full" ON navigation_menu_items;

-- Allow everyone to read active navigation items
CREATE POLICY "navigation_menu_items_read_active" ON navigation_menu_items
    FOR SELECT USING (is_active = true);

-- Allow admins full access to navigation menu items
CREATE POLICY "navigation_menu_items_admin_full" ON navigation_menu_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'admin'
        )
    );

-- Allow organization admins to manage their own navigation context
CREATE POLICY "navigation_menu_items_org_manage" ON navigation_menu_items
    FOR ALL USING (
        membership_context = 'organization' AND
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'organization'
        )
    );

-- Allow manufacturers to manage their navigation context
CREATE POLICY "navigation_menu_items_manufacturer_manage" ON navigation_menu_items
    FOR ALL USING (
        membership_context = 'manufacturer' AND
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'manufacturer'
        )
    );

-- Allow retailers to manage their navigation context
CREATE POLICY "navigation_menu_items_retailer_manage" ON navigation_menu_items
    FOR ALL USING (
        membership_context = 'retailer' AND
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'retailer'
        )
    );

-- Prevent non-admins from modifying base navigation
CREATE POLICY "navigation_menu_items_base_admin_only" ON navigation_menu_items
    FOR INSERT WITH CHECK (
        membership_context != 'base' OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'admin'
        )
    );

CREATE POLICY "navigation_menu_items_base_update_admin_only" ON navigation_menu_items
    FOR UPDATE USING (
        membership_context != 'base' OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'admin'
        )
    );

CREATE POLICY "navigation_menu_items_base_delete_admin_only" ON navigation_menu_items
    FOR DELETE USING (
        membership_context != 'base' OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'membershipType' = 'admin'
        )
    );

-- =====================================================
-- PART 5: FUNCTION SECURITY
-- =====================================================

-- Grant execute permissions on navigation functions
GRANT EXECUTE ON FUNCTION get_navigation_for_membership(TEXT, TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION track_navigation_click(UUID, UUID, TEXT, TEXT, TEXT, TEXT, INET, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_navigation_analytics(DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION duplicate_navigation_context(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_navigation_template(UUID, TEXT, UUID) TO authenticated;

-- =====================================================
-- PART 6: ADDITIONAL SECURITY CONSTRAINTS
-- =====================================================

-- Add constraint to ensure membership_context values are valid
ALTER TABLE navigation_menu_items 
DROP CONSTRAINT IF EXISTS navigation_menu_items_membership_context_check;

ALTER TABLE navigation_menu_items 
ADD CONSTRAINT navigation_menu_items_membership_context_check 
CHECK (membership_context IN ('base', 'free_competitor', 'pro_competitor', 'retailer', 'manufacturer', 'organization', 'admin'));

-- Add constraint to ensure template membership_context values are valid
ALTER TABLE navigation_templates 
DROP CONSTRAINT IF EXISTS navigation_templates_membership_context_check;

ALTER TABLE navigation_templates 
ADD CONSTRAINT navigation_templates_membership_context_check 
CHECK (membership_context IN ('base', 'free_competitor', 'pro_competitor', 'retailer', 'manufacturer', 'organization', 'admin'));

-- Add constraint to ensure analytics action_type values are valid
ALTER TABLE navigation_analytics 
DROP CONSTRAINT IF EXISTS navigation_analytics_action_type_check;

ALTER TABLE navigation_analytics 
ADD CONSTRAINT navigation_analytics_action_type_check 
CHECK (action_type IN ('view', 'click', 'hover'));

-- Success message
SELECT 'Navigation system security policies created successfully! 🔒' as result; 