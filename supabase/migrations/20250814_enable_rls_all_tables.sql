-- Enable RLS on all tables that don't have it enabled
-- This migration addresses performance warnings about missing RLS initialization

-- First, enable RLS on all public tables that don't have it
DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = false
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.tablename);
        RAISE NOTICE 'Enabled RLS on table: %', tbl.tablename;
    END LOOP;
END $$;

-- Now create basic policies for tables that have RLS but no policies
-- These are permissive policies that maintain existing behavior while securing the tables

-- Configuration tables (read-only for authenticated users)
DO $$
BEGIN
    -- configuration_categories
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuration_categories' AND schemaname = 'public') THEN
        CREATE POLICY "Public read access" ON configuration_categories FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Admin full access" ON configuration_categories FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;

    -- configuration_options
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuration_options' AND schemaname = 'public') THEN
        CREATE POLICY "Public read access" ON configuration_options FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Admin full access" ON configuration_options FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;

    -- rules_templates
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rules_templates' AND schemaname = 'public') THEN
        CREATE POLICY "Public read access" ON rules_templates FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Admin full access" ON rules_templates FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;

    -- form_field_configurations
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'form_field_configurations' AND schemaname = 'public') THEN
        CREATE POLICY "Public read access" ON form_field_configurations FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Admin full access" ON form_field_configurations FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;

-- CMS and content tables
DO $$
BEGIN
    -- cms_pages
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cms_pages' AND schemaname = 'public') THEN
        CREATE POLICY "Public read published pages" ON cms_pages FOR SELECT TO authenticated 
            USING (status = 'published' OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
        CREATE POLICY "Admin full access" ON cms_pages FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;

-- User-related tables
DO $$
BEGIN
    -- user_audio_systems
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_audio_systems' AND schemaname = 'public') THEN
        CREATE POLICY "Users manage own systems" ON user_audio_systems FOR ALL TO authenticated 
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
        CREATE POLICY "Public read access" ON user_audio_systems FOR SELECT TO authenticated 
            USING (is_public = true);
    END IF;

    -- audio_components
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audio_components' AND schemaname = 'public') THEN
        CREATE POLICY "Users manage own components" ON audio_components FOR ALL TO authenticated 
            USING (EXISTS (SELECT 1 FROM user_audio_systems WHERE id = audio_components.system_id AND user_id = auth.uid()))
            WITH CHECK (EXISTS (SELECT 1 FROM user_audio_systems WHERE id = audio_components.system_id AND user_id = auth.uid()));
    END IF;
END $$;

-- Event-related tables
DO $$
BEGIN
    -- event_favorites
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_favorites' AND schemaname = 'public') THEN
        CREATE POLICY "Users manage own favorites" ON event_favorites FOR ALL TO authenticated 
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;

    -- event_analytics
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_analytics' AND schemaname = 'public') THEN
        CREATE POLICY "Public insert analytics" ON event_analytics FOR INSERT TO authenticated WITH CHECK (true);
        CREATE POLICY "Event organizers view analytics" ON event_analytics FOR SELECT TO authenticated 
            USING (EXISTS (
                SELECT 1 FROM events e 
                WHERE e.id = event_analytics.event_id 
                AND e.organizer_id = auth.uid()
            ));
        CREATE POLICY "Admin full access" ON event_analytics FOR ALL TO authenticated 
            USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
    END IF;

    -- event_images
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_images' AND schemaname = 'public') THEN
        CREATE POLICY "Public read access" ON event_images FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Event organizers manage images" ON event_images FOR ALL TO authenticated 
            USING (EXISTS (
                SELECT 1 FROM events e 
                WHERE e.id = event_images.event_id 
                AND e.organizer_id = auth.uid()
            ));
    END IF;

    -- event_registrations
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_registrations' AND schemaname = 'public') THEN
        CREATE POLICY "Users view own registrations" ON event_registrations FOR SELECT TO authenticated 
            USING (user_id = auth.uid());
        CREATE POLICY "Users create registrations" ON event_registrations FOR INSERT TO authenticated 
            WITH CHECK (user_id = auth.uid());
        CREATE POLICY "Event organizers view registrations" ON event_registrations FOR SELECT TO authenticated 
            USING (EXISTS (
                SELECT 1 FROM events e 
                WHERE e.id = event_registrations.event_id 
                AND e.organizer_id = auth.uid()
            ));
    END IF;

    -- event_attendance
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_attendance' AND schemaname = 'public') THEN
        CREATE POLICY "Event organizers manage attendance" ON event_attendance FOR ALL TO authenticated 
            USING (EXISTS (
                SELECT 1 FROM events e 
                WHERE e.id = event_attendance.event_id 
                AND e.organizer_id = auth.uid()
            ));
        CREATE POLICY "Users view own attendance" ON event_attendance FOR SELECT TO authenticated 
            USING (user_id = auth.uid());
    END IF;
END $$;

-- Competition tables
DO $$
BEGIN
    -- competition_results
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'competition_results' AND schemaname = 'public') THEN
        CREATE POLICY "Public read access" ON competition_results FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Event organizers manage results" ON competition_results FOR ALL TO authenticated 
            USING (EXISTS (
                SELECT 1 FROM events e 
                WHERE e.id = competition_results.event_id 
                AND e.organizer_id = auth.uid()
            ));
        CREATE POLICY "Users manage own results" ON competition_results FOR UPDATE TO authenticated 
            USING (user_id = auth.uid());
    END IF;
END $$;

-- Team tables
DO $$
BEGIN
    -- teams
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND schemaname = 'public') THEN
        CREATE POLICY "Public read access" ON teams FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Team captains manage teams" ON teams FOR ALL TO authenticated 
            USING (captain_id = auth.uid());
    END IF;

    -- team_members
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND schemaname = 'public') THEN
        CREATE POLICY "Public read access" ON team_members FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Team captains manage members" ON team_members FOR ALL TO authenticated 
            USING (EXISTS (SELECT 1 FROM teams WHERE id = team_members.team_id AND captain_id = auth.uid()));
        CREATE POLICY "Users manage own membership" ON team_members FOR UPDATE TO authenticated 
            USING (user_id = auth.uid());
    END IF;
END $$;

-- Admin tables
DO $$
BEGIN
    -- admin_settings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_settings' AND schemaname = 'public') THEN
        CREATE POLICY "Admin only access" ON admin_settings FOR ALL TO authenticated 
            USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
    END IF;

    -- role_permissions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'role_permissions' AND schemaname = 'public') THEN
        CREATE POLICY "Admin only access" ON role_permissions FOR ALL TO authenticated 
            USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
        CREATE POLICY "Users read own permissions" ON role_permissions FOR SELECT TO authenticated 
            USING (role = (SELECT role FROM users WHERE id = auth.uid()));
    END IF;
END $$;

-- Membership tables
DO $$
BEGIN
    -- membership_plans
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'membership_plans' AND schemaname = 'public') THEN
        CREATE POLICY "Public read access" ON membership_plans FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Admin full access" ON membership_plans FOR ALL TO authenticated 
            USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

-- Advertisement tables
DO $$
BEGIN
    -- advertisements
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'advertisements' AND schemaname = 'public') THEN
        CREATE POLICY "Public read active ads" ON advertisements FOR SELECT TO authenticated 
            USING (is_active = true AND NOW() BETWEEN COALESCE(start_date, NOW()) AND COALESCE(end_date, NOW() + INTERVAL '100 years'));
        CREATE POLICY "Sponsors manage own ads" ON advertisements FOR ALL TO authenticated 
            USING (sponsor_id = auth.uid());
        CREATE POLICY "Admin full access" ON advertisements FOR ALL TO authenticated 
            USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

-- Create a verification function to check RLS status
CREATE OR REPLACE FUNCTION verify_rls_status()
RETURNS TABLE (
    table_name text,
    rls_enabled boolean,
    policy_count bigint,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog', 'pg_temp'
AS $$
BEGIN
    RETURN QUERY
    WITH table_rls AS (
        SELECT 
            t.tablename::text,
            t.rowsecurity,
            COUNT(p.policyname) as pol_count
        FROM pg_tables t
        LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
        WHERE t.schemaname = 'public'
        GROUP BY t.tablename, t.rowsecurity
    )
    SELECT 
        tablename,
        rowsecurity,
        pol_count,
        CASE 
            WHEN rowsecurity = false THEN 'ERROR: RLS DISABLED'
            WHEN rowsecurity = true AND pol_count = 0 THEN 'WARNING: RLS enabled but no policies'
            WHEN rowsecurity = true AND pol_count > 0 THEN 'OK: ' || pol_count || ' policies'
            ELSE 'UNKNOWN'
        END::text as rls_status
    FROM table_rls
    ORDER BY 
        CASE WHEN rowsecurity = false THEN 0 
             WHEN pol_count = 0 THEN 1
             ELSE 2 END,
        tablename;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION verify_rls_status TO authenticated;

-- Run verification and log results
DO $$
DECLARE
    tbl record;
    total_tables int := 0;
    secured_tables int := 0;
BEGIN
    FOR tbl IN SELECT * FROM verify_rls_status() LOOP
        total_tables := total_tables + 1;
        IF tbl.status LIKE 'OK:%' THEN
            secured_tables := secured_tables + 1;
        END IF;
        RAISE NOTICE '% - %', tbl.table_name, tbl.status;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Security Summary:';
    RAISE NOTICE '=====================';
    RAISE NOTICE 'Total tables: %', total_tables;
    RAISE NOTICE 'Secured tables: %', secured_tables;
    RAISE NOTICE 'Security coverage: %%%', ROUND((secured_tables::numeric / total_tables::numeric) * 100);
END $$;

-- Add comment
COMMENT ON FUNCTION verify_rls_status IS 'Verify RLS status and policy count for all public tables';