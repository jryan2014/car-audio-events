-- ============================================================================
-- DATABASE SECURITY PHASE 4 - IMPLEMENTATION
-- ============================================================================
-- Enable RLS on remaining high-risk tables with proper policies
-- Tables to process: ad_analytics, advertisement_templates, upsell_interactions, user_feature_permissions
-- Risk Level: MEDIUM - Test carefully after implementation
-- ============================================================================

-- Step 1: user_feature_permissions - HIGH PRIORITY (user-specific data)
-- Users can only see their own feature permissions
-- Admins can see all permissions

CREATE POLICY "Users can view their own feature permissions" ON user_feature_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own feature permissions" ON user_feature_permissions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all feature permissions" ON user_feature_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.membership_type = 'admin'
      AND users.status = 'active'
    )
  );

-- Enable RLS on user_feature_permissions
ALTER TABLE user_feature_permissions ENABLE ROW LEVEL SECURITY;

-- Step 2: upsell_interactions - MEDIUM PRIORITY (user interaction data)
-- Users can only see their own upsell interactions
-- Admins can see all interactions for analytics

CREATE POLICY "Users can view their own upsell interactions" ON upsell_interactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own upsell interactions" ON upsell_interactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all upsell interactions" ON upsell_interactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.membership_type = 'admin'
      AND users.status = 'active'
    )
  );

-- Enable RLS on upsell_interactions
ALTER TABLE upsell_interactions ENABLE ROW LEVEL SECURITY;

-- Step 3: advertisement_templates - LOW PRIORITY (admin-managed templates)
-- Only admins can manage advertisement templates
-- Public can view active templates for display

CREATE POLICY "Admins can manage all advertisement templates" ON advertisement_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.membership_type = 'admin'
      AND users.status = 'active'
    )
  );

CREATE POLICY "Public can view all advertisement templates" ON advertisement_templates
  FOR SELECT TO public
  USING (true);

-- Enable RLS on advertisement_templates
ALTER TABLE advertisement_templates ENABLE ROW LEVEL SECURITY;

-- Step 4: ad_analytics - LOW PRIORITY (analytics data)
-- Admins can view all analytics data
-- Advertisers can view analytics for their own ads (if user_id exists)

CREATE POLICY "Admins can view all ad analytics" ON ad_analytics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.membership_type = 'admin'
      AND users.status = 'active'
    )
  );

-- If ad_analytics has a user_id column, allow users to see their own analytics
-- Note: Uncomment if ad_analytics table has user_id column
-- CREATE POLICY "Users can view their own ad analytics" ON ad_analytics
--   FOR SELECT TO authenticated
--   USING (user_id = auth.uid());

-- Enable RLS on ad_analytics
ALTER TABLE ad_analytics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables now have RLS enabled
SELECT 
    'Verification - All tables should now have RLS enabled:' as check_type,
    t.table_name,
    CASE 
        WHEN c.relrowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as rls_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t.table_name)
        THEN 'HAS POLICIES'
        ELSE 'NO POLICIES'
    END as policy_status
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
AND t.table_name IN ('ad_analytics', 'advertisement_templates', 'upsell_interactions', 'user_feature_permissions')
ORDER BY t.table_name;

-- Count total policies created
SELECT 
    'Total policies created for Phase 4 tables:' as summary_type,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('ad_analytics', 'advertisement_templates', 'upsell_interactions', 'user_feature_permissions');

-- ============================================================================
-- PHASE 4 COMPLETION SUCCESS
-- ============================================================================ 