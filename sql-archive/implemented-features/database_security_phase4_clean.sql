-- DATABASE SECURITY PHASE 4 - CLEAN IMPLEMENTATION
-- Enable RLS on remaining 4 tables: ad_analytics, advertisement_templates, upsell_interactions, user_feature_permissions

-- Step 1: user_feature_permissions
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

ALTER TABLE user_feature_permissions ENABLE ROW LEVEL SECURITY;

-- Step 2: upsell_interactions
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

ALTER TABLE upsell_interactions ENABLE ROW LEVEL SECURITY;

-- Step 3: advertisement_templates
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

ALTER TABLE advertisement_templates ENABLE ROW LEVEL SECURITY;

-- Step 4: ad_analytics
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

ALTER TABLE ad_analytics ENABLE ROW LEVEL SECURITY;

-- Verification: Check all tables now have RLS enabled
SELECT 
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