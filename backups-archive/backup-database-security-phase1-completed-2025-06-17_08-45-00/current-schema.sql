

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."upsell_type_enum" AS ENUM (
    'none',
    'soft_paywall',
    'hard_paywall',
    'trial_offer',
    'feature_tease',
    'coming_soon',
    'contact_sales'
);


ALTER TYPE "public"."upsell_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_advertisement_roi"("ad_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    ad_spent DECIMAL;
    ad_clicks INTEGER;
    estimated_revenue DECIMAL;
    roi_value DECIMAL;
BEGIN
    SELECT spent, clicks INTO ad_spent, ad_clicks
    FROM advertisements 
    WHERE id = ad_id;
    
    IF ad_spent = 0 THEN
        RETURN 0;
    END IF;
    
    -- Estimate revenue based on average conversion value
    estimated_revenue := ad_clicks * 2.50; -- Assume $2.50 average value per click
    
    roi_value := ((estimated_revenue - ad_spent) / ad_spent) * 100;
    
    RETURN roi_value;
END;
$_$;


ALTER FUNCTION "public"."calculate_advertisement_roi"("ad_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_team_member"("manager_user_id" "uuid", "target_team_id" "uuid", "target_member_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  manager_role TEXT;
  manager_hierarchy INTEGER;
  target_hierarchy INTEGER;
BEGIN
  -- Get manager's role and hierarchy
  SELECT role, hierarchy_level INTO manager_role, manager_hierarchy
  FROM team_members 
  WHERE user_id = manager_user_id AND team_id = target_team_id AND is_active = true;
  
  -- If manager not found, return false
  IF manager_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get target role hierarchy
  target_hierarchy := CASE target_member_role
    WHEN 'owner' THEN 100
    WHEN 'president' THEN 90
    WHEN 'vice_president' THEN 80
    WHEN 'treasurer' THEN 70
    WHEN 'moderator' THEN 60
    WHEN 'member' THEN 50
    ELSE 50
  END;
  
  -- Manager can only manage members with lower hierarchy
  RETURN manager_hierarchy > target_hierarchy;
END;
$$;


ALTER FUNCTION "public"."can_manage_team_member"("manager_user_id" "uuid", "target_team_id" "uuid", "target_member_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."duplicate_navigation_context"("p_source_context" "text", "p_target_context" "text", "p_created_by" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    source_item RECORD;
    new_item_id UUID;
BEGIN
    -- Validate contexts
    IF p_source_context NOT IN ('base', 'free_competitor', 'pro_competitor', 'retailer', 'manufacturer', 'organization', 'admin') THEN
        RAISE EXCEPTION 'Invalid source context: %', p_source_context;
    END IF;
    
    IF p_target_context NOT IN ('base', 'free_competitor', 'pro_competitor', 'retailer', 'manufacturer', 'organization', 'admin') THEN
        RAISE EXCEPTION 'Invalid target context: %', p_target_context;
    END IF;
    
    -- Copy navigation items from source to target context
    FOR source_item IN 
        SELECT * FROM navigation_menu_items 
        WHERE membership_context = p_source_context 
        AND parent_id IS NULL
        ORDER BY nav_order
    LOOP
        INSERT INTO navigation_menu_items (
            title, href, icon, nav_order, parent_id, target_blank,
            visibility_rules, is_active, cms_page_id, membership_context,
            badge_text, badge_color, description
        ) VALUES (
            source_item.title, source_item.href, source_item.icon, 
            source_item.nav_order, NULL, source_item.target_blank,
            source_item.visibility_rules, source_item.is_active, 
            source_item.cms_page_id, p_target_context,
            source_item.badge_text, source_item.badge_color, 
            source_item.description
        ) RETURNING id INTO new_item_id;
        
        -- Copy any child items
        INSERT INTO navigation_menu_items (
            title, href, icon, nav_order, parent_id, target_blank,
            visibility_rules, is_active, cms_page_id, membership_context,
            badge_text, badge_color, description
        )
        SELECT 
            title, href, icon, nav_order, new_item_id, target_blank,
            visibility_rules, is_active, cms_page_id, p_target_context,
            badge_text, badge_color, description
        FROM navigation_menu_items 
        WHERE parent_id = source_item.id;
    END LOOP;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."duplicate_navigation_context"("p_source_context" "text", "p_target_context" "text", "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_setting"("setting_key" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    setting_value TEXT;
BEGIN
    SELECT key_value INTO setting_value
    FROM admin_settings
    WHERE key_name = setting_key;
    
    RETURN COALESCE(setting_value, '');
END;
$$;


ALTER FUNCTION "public"."get_admin_setting"("setting_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_advertisement_metrics"("ad_id" "uuid", "start_date" "date", "end_date" "date") RETURNS TABLE("total_clicks" bigint, "total_impressions" bigint, "total_cost" numeric, "avg_ctr" numeric, "avg_cpc" numeric, "avg_cpm" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(clicks)::BIGINT as total_clicks,
        SUM(impressions)::BIGINT as total_impressions,
        SUM(cost) as total_cost,
        CASE 
            WHEN SUM(impressions) > 0 THEN (SUM(clicks)::DECIMAL / SUM(impressions)) * 100
            ELSE 0
        END as avg_ctr,
        CASE 
            WHEN SUM(clicks) > 0 THEN SUM(cost) / SUM(clicks)
            ELSE 0
        END as avg_cpc,
        CASE 
            WHEN SUM(impressions) > 0 THEN (SUM(cost) / SUM(impressions)) * 1000
            ELSE 0
        END as avg_cpm
    FROM advertisement_analytics
    WHERE advertisement_id = ad_id
    AND date BETWEEN start_date AND end_date;
END;
$$;


ALTER FUNCTION "public"."get_advertisement_metrics"("ad_id" "uuid", "start_date" "date", "end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_directory_stats"() RETURNS TABLE("total_listings" bigint, "pending_listings" bigint, "approved_listings" bigint, "retailer_listings" bigint, "manufacturer_listings" bigint, "used_equipment_listings" bigint, "total_reviews" bigint, "average_rating" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_listings,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_listings,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_listings,
        COUNT(*) FILTER (WHERE listing_type = 'retailer') as retailer_listings,
        COUNT(*) FILTER (WHERE listing_type = 'manufacturer') as manufacturer_listings,
        COUNT(*) FILTER (WHERE listing_type = 'used_equipment') as used_equipment_listings,
        0::BIGINT as total_reviews, -- Default to 0 if no reviews table
        COALESCE(AVG(rating), 0)::DECIMAL(3,2) as average_rating
    FROM directory_listings;
END;
$$;


ALTER FUNCTION "public"."get_directory_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_directory_stats"() IS 'Returns aggregate statistics for the directory system';



CREATE OR REPLACE FUNCTION "public"."get_logo_settings"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_object_agg(setting_key, setting_value)
  INTO result
  FROM admin_settings
  WHERE setting_key LIKE '%logo%';
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_logo_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_navigation_analytics"("p_start_date" "date" DEFAULT (CURRENT_DATE - '30 days'::interval), "p_end_date" "date" DEFAULT CURRENT_DATE, "p_membership_type" "text" DEFAULT NULL::"text") RETURNS TABLE("menu_item_id" "uuid", "menu_title" "text", "total_clicks" bigint, "unique_users" bigint, "membership_breakdown" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id as menu_item_id,
        n.title as menu_title,
        COUNT(a.id) as total_clicks,
        COUNT(DISTINCT a.user_id) as unique_users,
        jsonb_object_agg(
            COALESCE(a.membership_type, 'anonymous'), 
            COUNT(a.id)
        ) as membership_breakdown
    FROM navigation_menu_items n
    LEFT JOIN navigation_analytics a ON n.id = a.menu_item_id
        AND a.created_at >= p_start_date
        AND a.created_at <= p_end_date + INTERVAL '1 day'
        AND (p_membership_type IS NULL OR a.membership_type = p_membership_type)
    WHERE n.is_active = true
    GROUP BY n.id, n.title
    ORDER BY total_clicks DESC;
END;
$$;


ALTER FUNCTION "public"."get_navigation_analytics"("p_start_date" "date", "p_end_date" "date", "p_membership_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_navigation_for_membership"("p_membership_type" "text" DEFAULT 'base'::"text", "p_subscription_level" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
            COALESCE(n.priority, 0) as priority
        FROM navigation_menu_items n
        WHERE n.is_active = true
        AND (
            n.membership_context = 'base' 
            OR n.membership_context = context_name
        )
        ORDER BY priority DESC, n.nav_order ASC
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
$$;


ALTER FUNCTION "public"."get_navigation_for_membership"("p_membership_type" "text", "p_subscription_level" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recent_activity"("limit_count" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "activity_type" character varying, "description" "text", "user_email" character varying, "user_name" character varying, "metadata" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.activity_type,
    al.description,
    al.user_email,
    al.user_name,
    al.metadata,
    al.created_at
  FROM activity_logs al
  ORDER BY al.created_at DESC
  LIMIT limit_count;
END;
$$;


ALTER FUNCTION "public"."get_recent_activity"("limit_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_recent_activity"("limit_count" integer) IS 'Retrieves recent activities for admin dashboard display';



CREATE OR REPLACE FUNCTION "public"."get_user_competition_stats"("user_uuid" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  stats JSON;
  total_comps INTEGER := 0;
  total_pts INTEGER := 0;
  avg_score NUMERIC := 0;
  best_place INTEGER := NULL;
  win_count INTEGER := 0;
  podium_count INTEGER := 0;
  category_count INTEGER := 0;
BEGIN
  -- Get basic stats from competition_results table
  SELECT 
    COALESCE(COUNT(*), 0),
    COALESCE(SUM(points_earned), 0),
    COALESCE(ROUND(AVG(overall_score), 2), 0),
    MIN(placement),
    COALESCE(COUNT(*) FILTER (WHERE placement = 1), 0),
    COALESCE(COUNT(*) FILTER (WHERE placement <= 3), 0),
    COALESCE(COUNT(DISTINCT category), 0)
  INTO 
    total_comps, total_pts, avg_score, best_place, win_count, podium_count, category_count
  FROM competition_results
  WHERE user_id = user_uuid;
  
  -- Build JSON response
  stats := json_build_object(
    'total_competitions', total_comps,
    'total_points', total_pts,
    'average_score', avg_score,
    'best_placement', COALESCE(best_place, 0),
    'wins', win_count,
    'podium_finishes', podium_count,
    'categories_competed', category_count
  );
  
  RETURN stats;
END;
$$;


ALTER FUNCTION "public"."get_user_competition_stats"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Insert into users table with correct field names
    INSERT INTO users (
        id, 
        email, 
        name, 
        membership_type, 
        status, 
        verification_status,
        login_count,
        failed_login_attempts
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN NEW.email = 'admin@caraudioevents.com' THEN 'admin'
            ELSE 'competitor'
        END,
        'active',  -- Use 'active' instead of 'verified'
        'verified',
        0,
        0
    );
    
    -- Also insert into profiles table
    INSERT INTO profiles (id, email, name, membership_type, status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN NEW.email = 'admin@caraudioevents.com' THEN 'admin'
            ELSE 'competitor'
        END,
        'active'
    );
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_activity"("p_activity_type" character varying, "p_description" "text", "p_metadata" "jsonb" DEFAULT NULL::"jsonb", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  activity_id UUID;
  current_user_data RECORD;
BEGIN
  -- Get current user data or use provided user_id
  IF p_user_id IS NULL THEN
    SELECT id, email, name INTO current_user_data
    FROM users WHERE id = auth.uid();
  ELSE
    SELECT id, email, name INTO current_user_data
    FROM users WHERE id = p_user_id;
  END IF;

  -- Insert activity log
  INSERT INTO activity_logs (
    user_id,
    user_email,
    user_name,
    activity_type,
    description,
    metadata
  ) VALUES (
    current_user_data.id,
    current_user_data.email,
    current_user_data.name,
    p_activity_type,
    p_description,
    p_metadata
  ) RETURNING id INTO activity_id;

  RETURN activity_id;
END;
$$;


ALTER FUNCTION "public"."log_activity"("p_activity_type" character varying, "p_description" "text", "p_metadata" "jsonb", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_activity"("p_activity_type" character varying, "p_description" "text", "p_metadata" "jsonb", "p_user_id" "uuid") IS 'Logs an activity event with user context and metadata';



CREATE OR REPLACE FUNCTION "public"."log_cms_page_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  creator_data RECORD;
  activity_desc TEXT;
BEGIN
  -- Get creator information
  SELECT email, name INTO creator_data
  FROM users WHERE id = COALESCE(NEW.created_by, OLD.created_by);

  IF TG_OP = 'INSERT' THEN
    activity_desc := 'New CMS page created: ' || NEW.title;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      activity_desc := 'CMS page status changed: ' || NEW.title || ' (' || OLD.status || ' → ' || NEW.status || ')';
    ELSE
      activity_desc := 'CMS page updated: ' || NEW.title;
    END IF;
  END IF;

  PERFORM log_activity(
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'cms_page_created'
      ELSE 'cms_page_updated'
    END,
    activity_desc,
    jsonb_build_object(
      'page_id', NEW.id,
      'page_title', NEW.title,
      'page_slug', NEW.slug,
      'status', NEW.status,
      'operation', TG_OP
    ),
    COALESCE(NEW.created_by, OLD.created_by)
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_cms_page_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_event_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  creator_data RECORD;
BEGIN
  -- Get creator information
  SELECT email, name INTO creator_data
  FROM users WHERE id = NEW.created_by;

  PERFORM log_activity(
    'event_created',
    'New event created: ' || NEW.title,
    jsonb_build_object(
      'event_id', NEW.id,
      'event_title', NEW.title,
      'event_date', NEW.date,
      'location', NEW.location,
      'status', NEW.status
    ),
    NEW.created_by
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_event_creation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_team_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO team_activity_log (team_id, user_id, action, details)
    VALUES (NEW.team_id, NEW.user_id, 'member_joined', 
            jsonb_build_object('role', NEW.role, 'custom_title', NEW.custom_title));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role != NEW.role OR OLD.custom_title != NEW.custom_title THEN
      INSERT INTO team_activity_log (team_id, user_id, action, details)
      VALUES (NEW.team_id, NEW.user_id, 'role_updated', 
              jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role, 
                               'old_title', OLD.custom_title, 'new_title', NEW.custom_title));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO team_activity_log (team_id, user_id, action, details)
    VALUES (OLD.team_id, OLD.user_id, 'member_left', 
            jsonb_build_object('role', OLD.role, 'custom_title', OLD.custom_title));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."log_team_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_user_registration"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM log_activity(
    'user_registration',
    CASE 
      WHEN NEW.membership_type = 'admin' THEN 'New admin user registered: ' || NEW.email
      WHEN NEW.membership_type = 'organization' THEN 'New organization member registered: ' || NEW.email
      WHEN NEW.membership_type = 'retailer' THEN 'New retailer registered: ' || NEW.email
      WHEN NEW.membership_type = 'manufacturer' THEN 'New manufacturer registered: ' || NEW.email
      ELSE 'New competitor registered: ' || NEW.email
    END,
    jsonb_build_object(
      'membership_type', NEW.membership_type,
      'user_id', NEW.id,
      'registration_source', 'website'
    ),
    NEW.id
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_user_registration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_listing_view"("p_listing_id" "uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text", "p_referrer" character varying DEFAULT NULL::character varying) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Insert view record
  INSERT INTO directory_listing_views (
    listing_id, user_id, ip_address, user_agent, referrer
  ) VALUES (
    p_listing_id, p_user_id, p_ip_address, p_user_agent, p_referrer
  );
  
  -- Update views count
  UPDATE directory_listings 
  SET views_count = views_count + 1 
  WHERE id = p_listing_id;
END;
$$;


ALTER FUNCTION "public"."record_listing_view"("p_listing_id" "uuid", "p_user_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text", "p_referrer" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."record_listing_view"("p_listing_id" "uuid", "p_user_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text", "p_referrer" character varying) IS 'Records a view event for analytics and updates view count';



CREATE OR REPLACE FUNCTION "public"."set_admin_setting"("setting_key" "text", "setting_value" "text", "is_sensitive_setting" boolean DEFAULT false, "setting_description" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND membership_type = 'admin'
    ) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;
    
    -- Upsert the setting
    INSERT INTO admin_settings (key_name, key_value, is_sensitive, description, updated_by)
    VALUES (setting_key, setting_value, is_sensitive_setting, setting_description, auth.uid())
    ON CONFLICT (key_name) 
    DO UPDATE SET 
        key_value = EXCLUDED.key_value,
        is_sensitive = EXCLUDED.is_sensitive,
        description = COALESCE(EXCLUDED.description, admin_settings.description),
        updated_by = auth.uid(),
        updated_at = NOW();
    
    -- Log the activity
    INSERT INTO admin_activity_log (admin_id, action, details)
    VALUES (
        auth.uid(),
        'update_setting',
        jsonb_build_object(
            'setting_key', setting_key,
            'old_value', (SELECT key_value FROM admin_settings WHERE key_name = setting_key),
            'new_value', setting_value
        )
    );
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."set_admin_setting"("setting_key" "text", "setting_value" "text", "is_sensitive_setting" boolean, "setting_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_user_trial"("p_user_id" "uuid", "p_feature_key" character varying, "p_trial_days" integer DEFAULT 7) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    existing_trial RECORD;
    result JSONB;
BEGIN
    -- Check if user already has a trial for this feature
    SELECT * INTO existing_trial
    FROM user_feature_permissions 
    WHERE user_id = p_user_id 
    AND feature_key = p_feature_key 
    AND permission_type = 'trial';
    
    IF FOUND THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'Trial already exists for this feature',
            'trial_ends_at', existing_trial.trial_ends_at
        );
    ELSE
        -- Create new trial
        INSERT INTO user_feature_permissions (
            user_id,
            feature_key,
            permission_type,
            trial_started_at,
            trial_ends_at
        ) VALUES (
            p_user_id,
            p_feature_key,
            'trial',
            NOW(),
            NOW() + INTERVAL '1 day' * p_trial_days
        );
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Trial started successfully',
            'trial_ends_at', NOW() + INTERVAL '1 day' * p_trial_days,
            'trial_days', p_trial_days
        );
    END IF;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."start_user_trial"("p_user_id" "uuid", "p_feature_key" character varying, "p_trial_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_navigation_click"("p_menu_item_id" "uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_membership_type" "text" DEFAULT NULL::"text", "p_action_type" "text" DEFAULT 'click'::"text", "p_session_id" "text" DEFAULT NULL::"text", "p_user_agent" "text" DEFAULT NULL::"text", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_referrer" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."track_navigation_click"("p_menu_item_id" "uuid", "p_user_id" "uuid", "p_membership_type" "text", "p_action_type" "text", "p_session_id" "text", "p_user_agent" "text", "p_ip_address" "inet", "p_referrer" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_upsell_interaction"("p_user_id" "uuid", "p_navigation_item_id" "uuid", "p_interaction_type" character varying, "p_user_membership" character varying DEFAULT NULL::character varying, "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    nav_item RECORD;
    interaction_id UUID;
BEGIN
    -- Get navigation item details
    SELECT * INTO nav_item
    FROM navigation_menu_items 
    WHERE id = p_navigation_item_id;
    
    -- Insert interaction record
    INSERT INTO upsell_interactions (
        user_id,
        navigation_item_id,
        interaction_type,
        upsell_type,
        target_membership,
        user_membership,
        metadata
    ) VALUES (
        p_user_id,
        p_navigation_item_id,
        p_interaction_type,
        nav_item.upsell_type,
        nav_item.upsell_target_membership,
        p_user_membership,
        p_metadata
    ) RETURNING id INTO interaction_id;
    
    RETURN interaction_id;
END;
$$;


ALTER FUNCTION "public"."track_upsell_interaction"("p_user_id" "uuid", "p_navigation_item_id" "uuid", "p_interaction_type" character varying, "p_user_membership" character varying, "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_listing_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_listing_rating(NEW.listing_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_listing_rating(OLD.listing_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."trigger_update_listing_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_admin_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_admin_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_advertisement_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update advertisement clicks and impressions from tracking tables
    UPDATE advertisements 
    SET 
        clicks = (
            SELECT COUNT(*) 
            FROM advertisement_clicks 
            WHERE advertisement_id = NEW.advertisement_id
        ),
        impressions = (
            SELECT COUNT(*) 
            FROM advertisement_impressions 
            WHERE advertisement_id = NEW.advertisement_id
        ),
        updated_at = NOW()
    WHERE id = NEW.advertisement_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_advertisement_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_listing_rating"("listing_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  review_count INTEGER;
BEGIN
  SELECT 
    COALESCE(AVG(rating), 0)::DECIMAL(3,2),
    COUNT(*)
  INTO avg_rating, review_count
  FROM directory_reviews 
  WHERE directory_reviews.listing_id = listing_id 
    AND status = 'approved';
  
  UPDATE directory_listings 
  SET 
    rating = avg_rating,
    review_count = review_count
  WHERE id = listing_id;
END;
$$;


ALTER FUNCTION "public"."update_listing_rating"("listing_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_listing_rating"("listing_id" "uuid") IS 'Updates the aggregate rating for a listing based on reviews';



CREATE OR REPLACE FUNCTION "public"."update_member_hierarchy_level"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.hierarchy_level := CASE NEW.role
    WHEN 'owner' THEN 100
    WHEN 'president' THEN 90
    WHEN 'vice_president' THEN 80
    WHEN 'treasurer' THEN 70
    WHEN 'moderator' THEN 60
    WHEN 'member' THEN 50
    WHEN 'admin' THEN 95
    ELSE 50
  END;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_member_hierarchy_level"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_navigation_menu_items_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_navigation_menu_items_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_feature_access"("p_user_id" "uuid", "p_feature_key" character varying, "p_user_membership" character varying DEFAULT NULL::character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    permission_record RECORD;
    result JSONB;
BEGIN
    -- Check for explicit permission
    SELECT * INTO permission_record
    FROM user_feature_permissions 
    WHERE user_id = p_user_id 
    AND feature_key = p_feature_key 
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF FOUND THEN
        -- Check if trial is active
        IF permission_record.permission_type = 'trial' THEN
            IF permission_record.trial_ends_at > NOW() THEN
                result := jsonb_build_object(
                    'has_access', true,
                    'access_type', 'trial',
                    'trial_ends_at', permission_record.trial_ends_at,
                    'days_remaining', EXTRACT(days FROM permission_record.trial_ends_at - NOW())
                );
            ELSE
                result := jsonb_build_object(
                    'has_access', false,
                    'access_type', 'trial_expired',
                    'trial_ended_at', permission_record.trial_ends_at
                );
            END IF;
        ELSE
            result := jsonb_build_object(
                'has_access', true,
                'access_type', permission_record.permission_type,
                'granted_at', permission_record.granted_at
            );
        END IF;
    ELSE
        result := jsonb_build_object(
            'has_access', false,
            'access_type', 'none'
        );
    END IF;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."user_has_feature_access"("p_user_id" "uuid", "p_feature_key" character varying, "p_user_membership" character varying) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "user_email" character varying(255),
    "user_name" character varying(255),
    "activity_type" character varying(50) NOT NULL,
    "description" "text" NOT NULL,
    "metadata" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."activity_logs" IS 'Stores all user and system activities for audit trail and admin dashboard';



CREATE TABLE IF NOT EXISTS "public"."ad_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "advertisement_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "user_id" "uuid",
    "user_agent" "text",
    "ip_address" "inet",
    "referrer" "text",
    "page_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "ad_analytics_event_type_check" CHECK (("event_type" = ANY (ARRAY['impression'::"text", 'click'::"text", 'conversion'::"text"])))
);


ALTER TABLE "public"."ad_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ad_placements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "placement_name" "text" NOT NULL,
    "description" "text",
    "max_ads" integer DEFAULT 3,
    "rotation_enabled" boolean DEFAULT true,
    "rotation_interval" integer DEFAULT 30,
    "dimensions" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."ad_placements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "action" "text" NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_activity_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_activity_log" IS 'Audit log for administrative actions';



CREATE TABLE IF NOT EXISTS "public"."admin_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_key" "text" NOT NULL,
    "setting_value" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advertisement_ab_tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "variant_a_id" "uuid" NOT NULL,
    "variant_b_id" "uuid" NOT NULL,
    "traffic_split" numeric(3,2) DEFAULT 0.50,
    "status" character varying(20) DEFAULT 'running'::character varying,
    "winner_variant" character varying(1),
    "confidence_level" numeric(5,2),
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "advertisement_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "advertisement_ab_tests_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['running'::character varying, 'paused'::character varying, 'completed'::character varying])::"text"[]))),
    CONSTRAINT "advertisement_ab_tests_traffic_split_check" CHECK ((("traffic_split" > (0)::numeric) AND ("traffic_split" < (1)::numeric))),
    CONSTRAINT "advertisement_ab_tests_winner_variant_check" CHECK ((("winner_variant")::"text" = ANY ((ARRAY['A'::character varying, 'B'::character varying])::"text"[])))
);


ALTER TABLE "public"."advertisement_ab_tests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advertisement_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "advertisement_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "hour" integer,
    "placement_type" character varying(50),
    "user_type" character varying(50),
    "device_type" character varying(20),
    "clicks" integer DEFAULT 0,
    "impressions" integer DEFAULT 0,
    "cost" numeric(8,2) DEFAULT 0,
    "conversions" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "advertisement_analytics_hour_check" CHECK ((("hour" >= 0) AND ("hour" <= 23)))
);


ALTER TABLE "public"."advertisement_analytics" OWNER TO "postgres";


COMMENT ON TABLE "public"."advertisement_analytics" IS 'Detailed analytics and performance tracking';



CREATE TABLE IF NOT EXISTS "public"."advertisement_billing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "advertisement_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "billing_period_start" "date" NOT NULL,
    "billing_period_end" "date" NOT NULL,
    "total_clicks" integer DEFAULT 0,
    "total_impressions" integer DEFAULT 0,
    "total_cost" numeric(10,2) DEFAULT 0,
    "payment_status" character varying(20) DEFAULT 'pending'::character varying,
    "stripe_invoice_id" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "advertisement_billing_payment_status_check" CHECK ((("payment_status")::"text" = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'overdue'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."advertisement_billing" OWNER TO "postgres";


COMMENT ON TABLE "public"."advertisement_billing" IS 'Billing and payment tracking for advertisements';



CREATE TABLE IF NOT EXISTS "public"."advertisement_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "total_budget" numeric(10,2) DEFAULT 0 NOT NULL,
    "spent_budget" numeric(10,2) DEFAULT 0,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "advertisement_campaigns_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'completed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."advertisement_campaigns" OWNER TO "postgres";


COMMENT ON TABLE "public"."advertisement_campaigns" IS 'Campaign management for grouping advertisements';



CREATE TABLE IF NOT EXISTS "public"."advertisement_clicks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "advertisement_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "session_id" character varying(255),
    "ip_address" "inet",
    "user_agent" "text",
    "page_url" "text",
    "click_url" "text",
    "placement_type" character varying(50),
    "device_type" character varying(20),
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."advertisement_clicks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advertisements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "click_url" "text" NOT NULL,
    "advertiser_name" "text" NOT NULL,
    "advertiser_email" "text" NOT NULL,
    "placement_type" "text" NOT NULL,
    "size" "text" NOT NULL,
    "target_pages" "jsonb" DEFAULT '[]'::"jsonb",
    "target_keywords" "jsonb" DEFAULT '[]'::"jsonb",
    "target_categories" "jsonb" DEFAULT '[]'::"jsonb",
    "budget" numeric(10,2) DEFAULT 0 NOT NULL,
    "cost_per_click" numeric(10,4) DEFAULT 0,
    "cost_per_impression" numeric(10,4) DEFAULT 0,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "clicks" integer DEFAULT 0,
    "impressions" integer DEFAULT 0,
    "spent" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "advertiser_user_id" "uuid",
    "target_user_types" "text"[] DEFAULT '{}'::"text"[],
    "priority" integer DEFAULT 1,
    "frequency_cap" integer DEFAULT 3,
    "geographic_targeting" "text"[] DEFAULT '{}'::"text"[],
    "device_targeting" "text"[] DEFAULT ARRAY['desktop'::"text", 'mobile'::"text"],
    "time_targeting" "jsonb" DEFAULT '{}'::"jsonb",
    "a_b_test_variant" character varying(50),
    "notes" "text",
    "conversion_rate" numeric(5,2) DEFAULT 0,
    "roi" numeric(8,2) DEFAULT 0,
    "campaign_id" "uuid",
    CONSTRAINT "advertisements_frequency_cap_check" CHECK ((("frequency_cap" >= 1) AND ("frequency_cap" <= 20))),
    CONSTRAINT "advertisements_placement_type_check" CHECK (("placement_type" = ANY (ARRAY['header'::"text", 'sidebar'::"text", 'event_page'::"text", 'mobile_banner'::"text", 'footer'::"text", 'directory_listing'::"text", 'search_results'::"text"]))),
    CONSTRAINT "advertisements_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 10))),
    CONSTRAINT "advertisements_size_check" CHECK (("size" = ANY (ARRAY['small'::"text", 'medium'::"text", 'large'::"text", 'banner'::"text", 'square'::"text", 'leaderboard'::"text", 'skyscraper'::"text"]))),
    CONSTRAINT "advertisements_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'active'::"text", 'paused'::"text", 'completed'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."advertisements" OWNER TO "postgres";


COMMENT ON TABLE "public"."advertisements" IS 'Enhanced advertisement system with user integration and advanced features';



CREATE OR REPLACE VIEW "public"."advertisement_dashboard" AS
 SELECT "a"."id",
    "a"."title",
    "a"."advertiser_name",
    "a"."placement_type",
    "a"."status",
    "a"."budget",
    "a"."spent",
    "a"."clicks",
    "a"."impressions",
    "a"."start_date",
    "a"."end_date",
        CASE
            WHEN ("a"."impressions" > 0) THEN ((("a"."clicks")::numeric / ("a"."impressions")::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END AS "ctr",
        CASE
            WHEN ("a"."clicks" > 0) THEN ("a"."spent" / ("a"."clicks")::numeric)
            ELSE (0)::numeric
        END AS "cpc",
    "public"."calculate_advertisement_roi"("a"."id") AS "roi",
    "a"."advertiser_email",
    "c"."name" AS "campaign_name"
   FROM ("public"."advertisements" "a"
     LEFT JOIN "public"."advertisement_campaigns" "c" ON (("a"."campaign_id" = "c"."id")));


ALTER TABLE "public"."advertisement_dashboard" OWNER TO "postgres";


COMMENT ON VIEW "public"."advertisement_dashboard" IS 'Comprehensive view for advertisement management dashboard';



CREATE TABLE IF NOT EXISTS "public"."advertisement_image_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "advertisement_id" "uuid" NOT NULL,
    "advertisement_image_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "hour" integer,
    "impressions" integer DEFAULT 0,
    "clicks" integer DEFAULT 0,
    "conversions" integer DEFAULT 0,
    "cost" numeric(8,2) DEFAULT 0,
    "placement_type" character varying(50),
    "device_type" character varying(20),
    "user_type" character varying(50),
    "geographic_location" character varying(100),
    "variant_shown" character varying(10),
    "ab_test_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "advertisement_image_analytics_hour_check" CHECK ((("hour" >= 0) AND ("hour" <= 23)))
);


ALTER TABLE "public"."advertisement_image_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advertisement_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "advertisement_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "image_title" character varying(255),
    "status" character varying(20) DEFAULT 'inactive'::character varying,
    "variant_type" character varying(10) DEFAULT 'single'::character varying,
    "ai_prompt" "text",
    "ai_provider" character varying(50),
    "ai_model" character varying(50),
    "ai_style" character varying(20),
    "ai_quality" character varying(20),
    "generation_cost" numeric(8,4) DEFAULT 0,
    "width" integer,
    "height" integer,
    "file_size" integer,
    "file_format" character varying(10),
    "impressions" integer DEFAULT 0,
    "clicks" integer DEFAULT 0,
    "click_through_rate" numeric(5,4) DEFAULT 0,
    "cost" numeric(10,2) DEFAULT 0,
    "ab_test_start_date" timestamp with time zone,
    "ab_test_end_date" timestamp with time zone,
    "ab_test_impressions" integer DEFAULT 0,
    "ab_test_clicks" integer DEFAULT 0,
    "ab_test_conversions" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "advertisement_images_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::"text"[]))),
    CONSTRAINT "advertisement_images_variant_type_check" CHECK ((("variant_type")::"text" = ANY ((ARRAY['single'::character varying, 'a'::character varying, 'b'::character varying])::"text"[]))),
    CONSTRAINT "valid_ab_test_dates" CHECK ((("ab_test_end_date" > "ab_test_start_date") OR ("ab_test_end_date" IS NULL))),
    CONSTRAINT "valid_metrics" CHECK ((("impressions" >= 0) AND ("clicks" >= 0) AND ("clicks" <= "impressions")))
);


ALTER TABLE "public"."advertisement_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advertisement_impressions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "advertisement_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "session_id" character varying(255),
    "ip_address" "inet",
    "user_agent" "text",
    "page_url" "text",
    "placement_type" character varying(50),
    "device_type" character varying(20),
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."advertisement_impressions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advertisement_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "category" character varying(100) NOT NULL,
    "placement_type" character varying(50) NOT NULL,
    "size" character varying(50) NOT NULL,
    "template_data" "jsonb" NOT NULL,
    "preview_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."advertisement_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."advertisement_templates" IS 'AI-generated advertisement templates';



CREATE TABLE IF NOT EXISTS "public"."audio_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "audio_system_id" "uuid",
    "category" "text" NOT NULL,
    "brand" "text" NOT NULL,
    "model" "text" NOT NULL,
    "description" "text",
    "power_watts" integer,
    "impedance_ohms" numeric(5,2),
    "frequency_response" "text",
    "price" numeric(10,2),
    "purchase_date" "date",
    "installation_notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "audio_components_category_check" CHECK (("category" = ANY (ARRAY['head_unit'::"text", 'amplifier'::"text", 'speakers'::"text", 'subwoofers'::"text", 'processor'::"text", 'crossover'::"text", 'capacitor'::"text", 'wiring'::"text", 'enclosure'::"text", 'damping'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."audio_components" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "color" character varying(7) DEFAULT '#3B82F6'::character varying,
    "icon" character varying(255),
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."categories_id_seq" OWNED BY "public"."categories"."id";



CREATE TABLE IF NOT EXISTS "public"."cms_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "slug" character varying(255) NOT NULL,
    "content" "text",
    "meta_title" character varying(255),
    "meta_description" "text",
    "meta_keywords" "text"[],
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "is_featured" boolean DEFAULT false,
    "author_id" "uuid",
    "published_at" timestamp without time zone,
    "navigation_placement" character varying(50),
    "parent_nav_item" character varying(255),
    "footer_section" character varying(50),
    "nav_order" integer DEFAULT 0,
    "nav_title" character varying(255),
    "show_in_sitemap" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."cms_pages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."cms_pages"."created_by" IS 'User who created the page (for activity tracking)';



CREATE TABLE IF NOT EXISTS "public"."competition_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_id" integer,
    "category" "text" NOT NULL,
    "class" "text",
    "overall_score" numeric(5,2),
    "placement" integer,
    "total_participants" integer,
    "points_earned" integer DEFAULT 0,
    "sound_quality_score" numeric(5,2),
    "spl_score" numeric(5,2),
    "installation_score" numeric(5,2),
    "presentation_score" numeric(5,2),
    "notes" "text",
    "judge_comments" "text",
    "system_used" "uuid",
    "competed_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."competition_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."configuration_categories" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."configuration_categories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."configuration_categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."configuration_categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."configuration_categories_id_seq" OWNED BY "public"."configuration_categories"."id";



CREATE TABLE IF NOT EXISTS "public"."configuration_options" (
    "id" integer NOT NULL,
    "category_id" integer,
    "name" character varying(255) NOT NULL,
    "value" character varying(255) NOT NULL,
    "description" "text",
    "data_type" character varying(50) DEFAULT 'string'::character varying,
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "key" character varying(255) NOT NULL,
    "label" character varying(255) NOT NULL,
    "sort_order" integer DEFAULT 0
);


ALTER TABLE "public"."configuration_options" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."configuration_options_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."configuration_options_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."configuration_options_id_seq" OWNED BY "public"."configuration_options"."id";



CREATE TABLE IF NOT EXISTS "public"."directory_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "slug" character varying(100) NOT NULL,
    "description" "text",
    "icon" character varying(50),
    "parent_id" "uuid",
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."directory_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."directory_categories" IS 'Product categories for directory listings';



CREATE TABLE IF NOT EXISTS "public"."directory_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."directory_favorites" OWNER TO "postgres";


COMMENT ON TABLE "public"."directory_favorites" IS 'User favorite listings';



CREATE TABLE IF NOT EXISTS "public"."directory_listing_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "ip_address" "inet",
    "user_agent" "text",
    "referrer" character varying(500),
    "viewed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."directory_listing_views" OWNER TO "postgres";


COMMENT ON TABLE "public"."directory_listing_views" IS 'Analytics tracking for listing views';



CREATE TABLE IF NOT EXISTS "public"."directory_listings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "business_name" character varying(255) NOT NULL,
    "listing_type" character varying(20) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "contact_name" character varying(255),
    "email" character varying(255),
    "phone" character varying(50),
    "website" character varying(500),
    "address_line1" character varying(255),
    "address_line2" character varying(255),
    "city" character varying(100) NOT NULL,
    "state" character varying(100) NOT NULL,
    "country" character varying(100) DEFAULT 'United States'::character varying NOT NULL,
    "postal_code" character varying(20),
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "description" "text",
    "established_year" integer,
    "employee_count" character varying(50),
    "business_hours" "jsonb",
    "services_offered" "text"[],
    "installation_services" boolean DEFAULT false,
    "custom_fabrication" boolean DEFAULT false,
    "sound_deadening" boolean DEFAULT false,
    "tuning_services" boolean DEFAULT false,
    "brands_carried" "text"[],
    "preferred_dealers" "text"[],
    "product_categories" "text"[],
    "warranty_info" "text",
    "item_title" character varying(255),
    "item_description" "text",
    "item_condition" character varying(20),
    "item_price" numeric(10,2),
    "item_category_id" "uuid",
    "is_negotiable" boolean DEFAULT true,
    "default_image_url" character varying(500),
    "additional_images" "jsonb",
    "featured" boolean DEFAULT false,
    "featured_until" timestamp with time zone,
    "views_count" integer DEFAULT 0,
    "rating" numeric(3,2) DEFAULT 0,
    "review_count" integer DEFAULT 0,
    "admin_notes" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    CONSTRAINT "directory_listings_listing_type_check" CHECK ((("listing_type")::"text" = ANY ((ARRAY['retailer'::character varying, 'manufacturer'::character varying, 'used_equipment'::character varying])::"text"[]))),
    CONSTRAINT "directory_listings_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'suspended'::character varying])::"text"[])))
);


ALTER TABLE "public"."directory_listings" OWNER TO "postgres";


COMMENT ON TABLE "public"."directory_listings" IS 'Directory listings for retailers, manufacturers, and used equipment';



CREATE TABLE IF NOT EXISTS "public"."directory_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "title" character varying(255),
    "comment" "text",
    "is_verified" boolean DEFAULT false,
    "helpful_count" integer DEFAULT 0,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "directory_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "directory_reviews_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::"text"[])))
);


ALTER TABLE "public"."directory_reviews" OWNER TO "postgres";


COMMENT ON TABLE "public"."directory_reviews" IS 'User reviews and ratings for directory listings';



CREATE TABLE IF NOT EXISTS "public"."event_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#0ea5e9'::"text",
    "icon" "text" DEFAULT 'calendar'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_id" integer NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "stripe_payment_intent_id" "text",
    "registered_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" integer NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "category" character varying(100) NOT NULL,
    "organization_id" integer,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "start_time" time without time zone,
    "end_time" time without time zone,
    "venue_name" character varying(255),
    "address" "text",
    "city" character varying(255),
    "state" character varying(100),
    "zip_code" character varying(20),
    "country" character varying(100) DEFAULT 'USA'::character varying,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "ticket_price" numeric(10,2),
    "max_participants" integer,
    "current_participants" integer DEFAULT 0,
    "status" character varying(50) DEFAULT 'draft'::character varying,
    "rules" "text",
    "image_url" "text",
    "contact_email" character varying(255),
    "contact_phone" character varying(50),
    "website_url" "text",
    "registration_deadline" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "category_id" "uuid",
    "organizer_id" "uuid",
    "approval_status" "text" DEFAULT 'pending'::"text",
    "rejection_reason" "text",
    "early_bird_deadline" timestamp with time zone,
    "early_bird_fee" numeric(10,2),
    "prizes" "jsonb" DEFAULT '[]'::"jsonb",
    "schedule" "jsonb" DEFAULT '[]'::"jsonb",
    "sponsors" "jsonb" DEFAULT '[]'::"jsonb",
    "is_public" boolean DEFAULT true,
    "registration_fee" numeric(10,2) DEFAULT 0,
    "sanction_body_id" "uuid",
    "season_year" integer DEFAULT EXTRACT(year FROM "now"()),
    "is_active" boolean DEFAULT true,
    "display_start_date" timestamp with time zone,
    "display_end_date" timestamp with time zone,
    "early_bird_name" "text" DEFAULT 'Early Bird Special'::"text",
    "event_name" "text",
    "website" "text",
    "event_director_first_name" "text",
    "event_director_last_name" "text",
    "event_director_email" "text",
    "event_director_phone" "text",
    "use_organizer_contact" boolean DEFAULT true,
    "shop_sponsors" "jsonb" DEFAULT '[]'::"jsonb",
    "first_place_trophy" boolean DEFAULT false,
    "second_place_trophy" boolean DEFAULT false,
    "third_place_trophy" boolean DEFAULT false,
    "fourth_place_trophy" boolean DEFAULT false,
    "fifth_place_trophy" boolean DEFAULT false,
    "has_raffle" boolean DEFAULT false,
    "member_giveaways" "jsonb" DEFAULT '[]'::"jsonb",
    "non_member_giveaways" "jsonb" DEFAULT '[]'::"jsonb",
    "seo_title" "text",
    "seo_description" "text",
    "seo_keywords" "jsonb" DEFAULT '[]'::"jsonb",
    "is_featured" boolean DEFAULT false,
    CONSTRAINT "events_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."events"."image_url" IS 'URL to the main image for this event';



COMMENT ON COLUMN "public"."events"."is_featured" IS 'Whether this event should be featured on the home page';



CREATE SEQUENCE IF NOT EXISTS "public"."events_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."events_id_seq" OWNED BY "public"."events"."id";



CREATE TABLE IF NOT EXISTS "public"."form_field_configurations" (
    "id" integer NOT NULL,
    "form_name" character varying(255) NOT NULL,
    "field_name" character varying(255) NOT NULL,
    "configuration_category_id" integer,
    "field_type" character varying(50) DEFAULT 'text'::character varying NOT NULL,
    "is_required" boolean DEFAULT false,
    "is_multiple" boolean DEFAULT false,
    "placeholder" character varying(255),
    "help_text" "text",
    "validation_rules" "jsonb" DEFAULT '{}'::"jsonb",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."form_field_configurations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."form_field_configurations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."form_field_configurations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."form_field_configurations_id_seq" OWNED BY "public"."form_field_configurations"."id";



CREATE TABLE IF NOT EXISTS "public"."membership_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "type" character varying(50) NOT NULL,
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "billing_period" character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    "description" "text",
    "features" "jsonb" DEFAULT '[]'::"jsonb",
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "limits" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "is_featured" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "hidden_on_frontend" boolean DEFAULT false,
    "auto_renewal_enabled" boolean DEFAULT true,
    "trial_period_days" integer DEFAULT 0,
    "stripe_price_id_monthly" character varying(255),
    "stripe_price_id_yearly" character varying(255),
    "billing_cycle" character varying(20) DEFAULT 'yearly'::character varying
);


ALTER TABLE "public"."membership_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."navigation_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "menu_item_id" "uuid",
    "user_id" "uuid",
    "membership_type" "text",
    "action_type" "text" NOT NULL,
    "session_id" "text",
    "user_agent" "text",
    "ip_address" "inet",
    "referrer" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "navigation_analytics_action_type_check" CHECK (("action_type" = ANY (ARRAY['view'::"text", 'click'::"text", 'hover'::"text"])))
);


ALTER TABLE "public"."navigation_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."navigation_backup_20250613" (
    "id" "uuid",
    "title" character varying(255),
    "href" "text",
    "icon" character varying(50),
    "nav_order" integer,
    "parent_id" "uuid",
    "target_blank" boolean,
    "visibility_rules" "jsonb",
    "is_active" boolean,
    "cms_page_id" "uuid",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "membership_context" "text",
    "inherits_from" "uuid",
    "is_template" boolean,
    "template_name" "text",
    "priority" integer,
    "custom_css_class" "text",
    "badge_text" "text",
    "badge_color" "text",
    "description" "text",
    "requires_subscription" boolean,
    "min_subscription_level" "text"
);


ALTER TABLE "public"."navigation_backup_20250613" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."navigation_menu_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "href" "text",
    "icon" character varying(50),
    "nav_order" integer DEFAULT 0 NOT NULL,
    "parent_id" "uuid",
    "target_blank" boolean DEFAULT false,
    "visibility_rules" "jsonb" DEFAULT '{"public": true}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "cms_page_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "membership_context" "text" DEFAULT 'base'::"text",
    "inherits_from" "uuid",
    "is_template" boolean DEFAULT false,
    "template_name" "text",
    "priority" integer DEFAULT 0,
    "custom_css_class" "text",
    "badge_text" "text",
    "badge_color" "text",
    "description" "text",
    "requires_subscription" boolean DEFAULT false,
    "min_subscription_level" "text",
    "upsell_type" character varying(50) DEFAULT 'none'::character varying,
    "upsell_target_membership" character varying(50),
    "upsell_message" "text",
    "upsell_cta_text" character varying(100),
    "upsell_cta_url" character varying(255),
    "requires_premium" boolean DEFAULT false,
    "trial_allowed" boolean DEFAULT false,
    "trial_duration_days" integer DEFAULT 0,
    "feature_gate_type" character varying(50) DEFAULT 'none'::character varying,
    "membership_contexts" "text"[],
    CONSTRAINT "navigation_menu_items_membership_context_check" CHECK (("membership_context" = ANY (ARRAY['base'::"text", 'free_competitor'::"text", 'pro_competitor'::"text", 'retailer'::"text", 'manufacturer'::"text", 'organization'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."navigation_menu_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."navigation_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "membership_context" "text" NOT NULL,
    "template_data" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "navigation_templates_membership_context_check" CHECK (("membership_context" = ANY (ARRAY['base'::"text", 'free_competitor'::"text", 'pro_competitor'::"text", 'retailer'::"text", 'manufacturer'::"text", 'organization'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."navigation_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "logo_url" "text",
    "small_logo_url" "text",
    "description" "text",
    "website" "text",
    "contact_email" character varying(255),
    "contact_phone" character varying(50),
    "organization_type" character varying(50) DEFAULT 'competition'::character varying,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "competition_classes" "jsonb" DEFAULT '[]'::"jsonb",
    "default_rules_template_id" integer,
    "address" "text",
    "city" character varying(255),
    "state" character varying(255),
    "zip_code" character varying(20),
    "country" character varying(255) DEFAULT 'USA'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "type" "text",
    "system_config" "jsonb"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."organizations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."organizations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."organizations_id_seq" OWNED BY "public"."organizations"."id";



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stripe_payment_intent_id" "text" NOT NULL,
    "user_id" "uuid",
    "amount" integer NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text",
    "status" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" character varying(255),
    "name" character varying(100),
    "membership_type" character varying(50) DEFAULT 'competitor'::character varying,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "name" character varying(100),
    "membership_type" character varying(50) DEFAULT 'competitor'::character varying,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "verification_status" character varying(20) DEFAULT 'pending'::character varying,
    "location" character varying(100),
    "phone" character varying(20),
    "website" character varying(255),
    "bio" "text",
    "company_name" character varying(100),
    "subscription_plan" character varying(50) DEFAULT 'basic'::character varying,
    "profile_image" character varying(255),
    "requires_password_change" boolean DEFAULT false,
    "password_changed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "login_count" integer DEFAULT 0,
    "failed_login_attempts" integer DEFAULT 0,
    "last_login_at" timestamp with time zone,
    CONSTRAINT "users_membership_type_check" CHECK ((("membership_type")::"text" = ANY ((ARRAY['competitor'::character varying, 'manufacturer'::character varying, 'retailer'::character varying, 'organization'::character varying, 'admin'::character varying])::"text"[]))),
    CONSTRAINT "users_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying, 'pending'::character varying, 'banned'::character varying])::"text"[]))),
    CONSTRAINT "users_verification_status_check" CHECK ((("verification_status")::"text" = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'rejected'::character varying])::"text"[])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."recent_admin_activity" AS
 SELECT "aal"."id",
    "aal"."action",
    "aal"."details",
    "aal"."created_at",
    "u"."name" AS "admin_name",
    "u"."email" AS "admin_email"
   FROM ("public"."admin_activity_log" "aal"
     LEFT JOIN "public"."users" "u" ON (("aal"."admin_id" = "u"."id")))
  ORDER BY "aal"."created_at" DESC
 LIMIT 100;


ALTER TABLE "public"."recent_admin_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_name" "text" NOT NULL,
    "permission" "text" NOT NULL,
    "resource" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rules_templates" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "organization_id" integer,
    "content" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "rules_content" "text",
    "organization_name" character varying(255),
    "description" "text",
    "version" character varying(50) DEFAULT '1.0'::character varying
);


ALTER TABLE "public"."rules_templates" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."rules_templates_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."rules_templates_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."rules_templates_id_seq" OWNED BY "public"."rules_templates"."id";



CREATE TABLE IF NOT EXISTS "public"."team_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" character varying(50) NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."team_activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "invited_user_id" "uuid" NOT NULL,
    "invited_by_user_id" "uuid" NOT NULL,
    "message" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "team_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."team_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "points_contributed" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "custom_title" "text",
    "permissions" "text"[] DEFAULT '{}'::"text"[],
    "hierarchy_level" integer DEFAULT 50,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "team_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'president'::"text", 'vice_president'::"text", 'treasurer'::"text", 'moderator'::"text", 'member'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "permissions" "text"[] DEFAULT '{}'::"text"[],
    "color" character varying(20) DEFAULT 'gray'::character varying,
    "hierarchy_level" integer DEFAULT 50,
    "is_custom" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."team_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "team_type" "text" DEFAULT 'competitive'::"text",
    "location" "text",
    "website" "text",
    "logo_url" "text",
    "is_public" boolean DEFAULT true,
    "requires_approval" boolean DEFAULT true,
    "max_members" integer DEFAULT 50,
    "total_points" integer DEFAULT 0,
    "competitions_won" integer DEFAULT 0,
    "owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_premium" boolean DEFAULT false,
    "premium_expires_at" timestamp with time zone,
    "custom_titles_enabled" boolean DEFAULT false,
    "max_custom_roles" integer DEFAULT 0,
    "current_members" integer DEFAULT 1,
    CONSTRAINT "teams_team_type_check" CHECK (("team_type" = ANY (ARRAY['competitive'::"text", 'social'::"text", 'professional'::"text", 'club'::"text"])))
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."upsell_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "navigation_item_id" "uuid",
    "interaction_type" character varying(50) NOT NULL,
    "upsell_type" character varying(50) NOT NULL,
    "target_membership" character varying(50),
    "user_membership" character varying(50),
    "converted" boolean DEFAULT false,
    "conversion_value" numeric(10,2),
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."upsell_interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_advertisement_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "show_ads" boolean DEFAULT true,
    "preferred_ad_types" "text"[] DEFAULT '{}'::"text"[],
    "blocked_advertisers" "text"[] DEFAULT '{}'::"text"[],
    "frequency_preference" character varying(20) DEFAULT 'normal'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_advertisement_preferences_frequency_preference_check" CHECK ((("frequency_preference")::"text" = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_advertisement_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_advertisement_preferences" IS 'User preferences for advertisement display';



CREATE TABLE IF NOT EXISTS "public"."user_audio_systems" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" DEFAULT 'My Audio System'::"text" NOT NULL,
    "description" "text",
    "vehicle_year" integer,
    "vehicle_make" "text",
    "vehicle_model" "text",
    "vehicle_color" "text",
    "system_type" "text" DEFAULT 'sound_quality'::"text",
    "total_power_watts" integer,
    "estimated_cost" numeric(10,2),
    "installation_date" "date",
    "is_primary" boolean DEFAULT false,
    "is_public" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_audio_systems_system_type_check" CHECK (("system_type" = ANY (ARRAY['sound_quality'::"text", 'spl'::"text", 'hybrid'::"text", 'show'::"text"])))
);


ALTER TABLE "public"."user_audio_systems" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_feature_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "feature_key" character varying(100) NOT NULL,
    "permission_type" character varying(50) NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "trial_started_at" timestamp with time zone,
    "trial_ends_at" timestamp with time zone,
    "granted_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_feature_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "plan_id" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "stripe_payment_intent_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_subscriptions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."configuration_categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."configuration_categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."configuration_options" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."configuration_options_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."form_field_configurations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."form_field_configurations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."organizations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."organizations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."rules_templates" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."rules_templates_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ad_analytics"
    ADD CONSTRAINT "ad_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ad_placements"
    ADD CONSTRAINT "ad_placements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ad_placements"
    ADD CONSTRAINT "ad_placements_placement_name_key" UNIQUE ("placement_name");



ALTER TABLE ONLY "public"."admin_activity_log"
    ADD CONSTRAINT "admin_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_setting_key_key" UNIQUE ("setting_key");



ALTER TABLE ONLY "public"."advertisement_ab_tests"
    ADD CONSTRAINT "advertisement_ab_tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisement_analytics"
    ADD CONSTRAINT "advertisement_analytics_advertisement_id_date_hour_placemen_key" UNIQUE ("advertisement_id", "date", "hour", "placement_type", "user_type", "device_type");



ALTER TABLE ONLY "public"."advertisement_analytics"
    ADD CONSTRAINT "advertisement_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisement_billing"
    ADD CONSTRAINT "advertisement_billing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisement_campaigns"
    ADD CONSTRAINT "advertisement_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisement_clicks"
    ADD CONSTRAINT "advertisement_clicks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisement_image_analytics"
    ADD CONSTRAINT "advertisement_image_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisement_images"
    ADD CONSTRAINT "advertisement_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisement_impressions"
    ADD CONSTRAINT "advertisement_impressions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisement_templates"
    ADD CONSTRAINT "advertisement_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisements"
    ADD CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audio_components"
    ADD CONSTRAINT "audio_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cms_pages"
    ADD CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cms_pages"
    ADD CONSTRAINT "cms_pages_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."competition_results"
    ADD CONSTRAINT "competition_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."competition_results"
    ADD CONSTRAINT "competition_results_user_id_event_id_category_key" UNIQUE ("user_id", "event_id", "category");



ALTER TABLE ONLY "public"."configuration_categories"
    ADD CONSTRAINT "configuration_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."configuration_categories"
    ADD CONSTRAINT "configuration_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configuration_options"
    ADD CONSTRAINT "configuration_options_category_id_name_key" UNIQUE ("category_id", "name");



ALTER TABLE ONLY "public"."configuration_options"
    ADD CONSTRAINT "configuration_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."directory_categories"
    ADD CONSTRAINT "directory_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."directory_categories"
    ADD CONSTRAINT "directory_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."directory_favorites"
    ADD CONSTRAINT "directory_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."directory_favorites"
    ADD CONSTRAINT "directory_favorites_user_id_listing_id_key" UNIQUE ("user_id", "listing_id");



ALTER TABLE ONLY "public"."directory_listing_views"
    ADD CONSTRAINT "directory_listing_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."directory_listings"
    ADD CONSTRAINT "directory_listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."directory_reviews"
    ADD CONSTRAINT "directory_reviews_listing_id_reviewer_id_key" UNIQUE ("listing_id", "reviewer_id");



ALTER TABLE ONLY "public"."directory_reviews"
    ADD CONSTRAINT "directory_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_categories"
    ADD CONSTRAINT "event_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."event_categories"
    ADD CONSTRAINT "event_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_user_id_event_id_key" UNIQUE ("user_id", "event_id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_field_configurations"
    ADD CONSTRAINT "form_field_configurations_form_name_field_name_key" UNIQUE ("form_name", "field_name");



ALTER TABLE ONLY "public"."form_field_configurations"
    ADD CONSTRAINT "form_field_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_plans"
    ADD CONSTRAINT "membership_plans_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."membership_plans"
    ADD CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."navigation_analytics"
    ADD CONSTRAINT "navigation_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."navigation_menu_items"
    ADD CONSTRAINT "navigation_menu_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."navigation_templates"
    ADD CONSTRAINT "navigation_templates_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."navigation_templates"
    ADD CONSTRAINT "navigation_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_name_permission_resource_key" UNIQUE ("role_name", "permission", "resource");



ALTER TABLE ONLY "public"."rules_templates"
    ADD CONSTRAINT "rules_templates_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."rules_templates"
    ADD CONSTRAINT "rules_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_activity_log"
    ADD CONSTRAINT "team_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_team_id_invited_user_id_status_key" UNIQUE ("team_id", "invited_user_id", "status") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."team_roles"
    ADD CONSTRAINT "team_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_roles"
    ADD CONSTRAINT "team_roles_team_id_name_key" UNIQUE ("team_id", "name");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."upsell_interactions"
    ADD CONSTRAINT "upsell_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_advertisement_preferences"
    ADD CONSTRAINT "user_advertisement_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_advertisement_preferences"
    ADD CONSTRAINT "user_advertisement_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_audio_systems"
    ADD CONSTRAINT "user_audio_systems_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_feature_permissions"
    ADD CONSTRAINT "user_feature_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_user_id_plan_id_key" UNIQUE ("user_id", "plan_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activity_logs_created_at" ON "public"."activity_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_logs_type" ON "public"."activity_logs" USING "btree" ("activity_type");



CREATE INDEX "idx_activity_logs_user_created" ON "public"."activity_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_activity_logs_user_id" ON "public"."activity_logs" USING "btree" ("user_id");



CREATE INDEX "idx_ad_analytics_ad_id" ON "public"."ad_analytics" USING "btree" ("advertisement_id");



CREATE INDEX "idx_ad_analytics_created_at" ON "public"."ad_analytics" USING "btree" ("created_at");



CREATE INDEX "idx_ad_analytics_event_type" ON "public"."ad_analytics" USING "btree" ("event_type");



CREATE INDEX "idx_admin_activity_log_action" ON "public"."admin_activity_log" USING "btree" ("action");



CREATE INDEX "idx_admin_activity_log_admin_id" ON "public"."admin_activity_log" USING "btree" ("admin_id");



CREATE INDEX "idx_admin_activity_log_created_at" ON "public"."admin_activity_log" USING "btree" ("created_at");



CREATE INDEX "idx_admin_settings_key" ON "public"."admin_settings" USING "btree" ("setting_key");



CREATE INDEX "idx_advertisement_analytics_date" ON "public"."advertisement_analytics" USING "btree" ("date");



CREATE INDEX "idx_advertisement_billing_period" ON "public"."advertisement_billing" USING "btree" ("billing_period_start", "billing_period_end");



CREATE INDEX "idx_advertisement_billing_user" ON "public"."advertisement_billing" USING "btree" ("user_id");



CREATE INDEX "idx_advertisement_clicks_ad_id" ON "public"."advertisement_clicks" USING "btree" ("advertisement_id");



CREATE INDEX "idx_advertisement_clicks_ad_timestamp" ON "public"."advertisement_clicks" USING "btree" ("advertisement_id", "timestamp");



CREATE INDEX "idx_advertisement_clicks_user_timestamp" ON "public"."advertisement_clicks" USING "btree" ("user_id", "timestamp");



CREATE INDEX "idx_advertisement_impressions_ad_id" ON "public"."advertisement_impressions" USING "btree" ("advertisement_id");



CREATE INDEX "idx_advertisement_impressions_ad_timestamp" ON "public"."advertisement_impressions" USING "btree" ("advertisement_id", "timestamp");



CREATE INDEX "idx_advertisement_impressions_user_timestamp" ON "public"."advertisement_impressions" USING "btree" ("user_id", "timestamp");



CREATE INDEX "idx_advertisements_advertiser" ON "public"."advertisements" USING "btree" ("advertiser_email");



CREATE INDEX "idx_advertisements_created_at" ON "public"."advertisements" USING "btree" ("created_at");



CREATE INDEX "idx_advertisements_dates" ON "public"."advertisements" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_advertisements_placement" ON "public"."advertisements" USING "btree" ("placement_type");



CREATE INDEX "idx_advertisements_placement_type" ON "public"."advertisements" USING "btree" ("placement_type");



CREATE INDEX "idx_advertisements_status" ON "public"."advertisements" USING "btree" ("status");



CREATE INDEX "idx_advertisements_user_id" ON "public"."advertisements" USING "btree" ("advertiser_user_id");



CREATE INDEX "idx_audio_components_system_id" ON "public"."audio_components" USING "btree" ("audio_system_id");



CREATE INDEX "idx_cms_pages_created_by" ON "public"."cms_pages" USING "btree" ("created_by");



CREATE INDEX "idx_competition_results_event_id" ON "public"."competition_results" USING "btree" ("event_id");



CREATE INDEX "idx_competition_results_user_id" ON "public"."competition_results" USING "btree" ("user_id");



CREATE INDEX "idx_directory_favorites_user" ON "public"."directory_favorites" USING "btree" ("user_id");



CREATE INDEX "idx_directory_listing_views_listing" ON "public"."directory_listing_views" USING "btree" ("listing_id");



CREATE INDEX "idx_directory_listings_created" ON "public"."directory_listings" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_directory_listings_featured" ON "public"."directory_listings" USING "btree" ("featured", "featured_until");



CREATE INDEX "idx_directory_listings_location" ON "public"."directory_listings" USING "btree" ("city", "state", "country");



CREATE INDEX "idx_directory_listings_status" ON "public"."directory_listings" USING "btree" ("status");



CREATE INDEX "idx_directory_listings_type" ON "public"."directory_listings" USING "btree" ("listing_type");



CREATE INDEX "idx_directory_listings_user" ON "public"."directory_listings" USING "btree" ("user_id");



CREATE INDEX "idx_directory_reviews_listing" ON "public"."directory_reviews" USING "btree" ("listing_id");



CREATE INDEX "idx_directory_reviews_rating" ON "public"."directory_reviews" USING "btree" ("rating");



CREATE INDEX "idx_event_registrations_event_id" ON "public"."event_registrations" USING "btree" ("event_id");



CREATE INDEX "idx_event_registrations_user_id" ON "public"."event_registrations" USING "btree" ("user_id");



CREATE INDEX "idx_events_featured_published" ON "public"."events" USING "btree" ("is_featured", "status") WHERE (("is_featured" = true) AND (("status")::"text" = 'published'::"text"));



CREATE INDEX "idx_events_is_featured" ON "public"."events" USING "btree" ("is_featured") WHERE ("is_featured" = true);



CREATE INDEX "idx_membership_plans_active" ON "public"."membership_plans" USING "btree" ("is_active");



CREATE INDEX "idx_membership_plans_display_order" ON "public"."membership_plans" USING "btree" ("display_order");



CREATE INDEX "idx_membership_plans_type" ON "public"."membership_plans" USING "btree" ("type");



CREATE INDEX "idx_nav_analytics_created_at" ON "public"."navigation_analytics" USING "btree" ("created_at");



CREATE INDEX "idx_nav_analytics_membership" ON "public"."navigation_analytics" USING "btree" ("membership_type");



CREATE INDEX "idx_nav_analytics_menu_item" ON "public"."navigation_analytics" USING "btree" ("menu_item_id");



CREATE INDEX "idx_nav_analytics_user" ON "public"."navigation_analytics" USING "btree" ("user_id");



CREATE INDEX "idx_nav_menu_inherits_from" ON "public"."navigation_menu_items" USING "btree" ("inherits_from");



CREATE INDEX "idx_nav_menu_membership_context" ON "public"."navigation_menu_items" USING "btree" ("membership_context");



CREATE INDEX "idx_nav_menu_priority" ON "public"."navigation_menu_items" USING "btree" ("priority");



CREATE INDEX "idx_nav_menu_template" ON "public"."navigation_menu_items" USING "btree" ("is_template");



CREATE INDEX "idx_nav_templates_active" ON "public"."navigation_templates" USING "btree" ("is_active");



CREATE INDEX "idx_nav_templates_context" ON "public"."navigation_templates" USING "btree" ("membership_context");



CREATE INDEX "idx_navigation_menu_items_cms_page_id" ON "public"."navigation_menu_items" USING "btree" ("cms_page_id");



CREATE INDEX "idx_navigation_menu_items_is_active" ON "public"."navigation_menu_items" USING "btree" ("is_active");



CREATE INDEX "idx_navigation_menu_items_nav_order" ON "public"."navigation_menu_items" USING "btree" ("nav_order");



CREATE INDEX "idx_navigation_menu_items_parent_id" ON "public"."navigation_menu_items" USING "btree" ("parent_id");



CREATE INDEX "idx_navigation_requires_premium" ON "public"."navigation_menu_items" USING "btree" ("requires_premium");



CREATE INDEX "idx_navigation_upsell_type" ON "public"."navigation_menu_items" USING "btree" ("upsell_type");



CREATE INDEX "idx_payments_stripe_id" ON "public"."payments" USING "btree" ("stripe_payment_intent_id");



CREATE INDEX "idx_payments_user_id" ON "public"."payments" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_role_permissions_permission" ON "public"."role_permissions" USING "btree" ("permission");



CREATE INDEX "idx_role_permissions_resource" ON "public"."role_permissions" USING "btree" ("resource");



CREATE INDEX "idx_role_permissions_role_name" ON "public"."role_permissions" USING "btree" ("role_name");



CREATE INDEX "idx_rules_templates_active" ON "public"."rules_templates" USING "btree" ("is_active");



CREATE INDEX "idx_rules_templates_name" ON "public"."rules_templates" USING "btree" ("name");



CREATE INDEX "idx_rules_templates_org" ON "public"."rules_templates" USING "btree" ("organization_name");



CREATE INDEX "idx_team_activity_log_created_at" ON "public"."team_activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_team_activity_log_team_date" ON "public"."team_activity_log" USING "btree" ("team_id", "created_at" DESC);



CREATE INDEX "idx_team_activity_log_team_id" ON "public"."team_activity_log" USING "btree" ("team_id");



CREATE INDEX "idx_team_activity_log_user_id" ON "public"."team_activity_log" USING "btree" ("user_id");



CREATE INDEX "idx_team_invitations_status" ON "public"."team_invitations" USING "btree" ("team_id", "status");



CREATE INDEX "idx_team_members_active" ON "public"."team_members" USING "btree" ("team_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_team_members_hierarchy" ON "public"."team_members" USING "btree" ("team_id", "hierarchy_level" DESC);



CREATE INDEX "idx_team_members_team_id" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_team_role" ON "public"."team_members" USING "btree" ("team_id", "role");



CREATE INDEX "idx_team_members_user_id" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "idx_teams_owner_id" ON "public"."teams" USING "btree" ("owner_id");



CREATE INDEX "idx_teams_public" ON "public"."teams" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_upsell_interactions_converted" ON "public"."upsell_interactions" USING "btree" ("converted");



CREATE INDEX "idx_upsell_interactions_nav_item" ON "public"."upsell_interactions" USING "btree" ("navigation_item_id");



CREATE INDEX "idx_upsell_interactions_type" ON "public"."upsell_interactions" USING "btree" ("interaction_type");



CREATE INDEX "idx_upsell_interactions_user_id" ON "public"."upsell_interactions" USING "btree" ("user_id");



CREATE INDEX "idx_user_audio_systems_primary" ON "public"."user_audio_systems" USING "btree" ("user_id", "is_primary") WHERE ("is_primary" = true);



CREATE INDEX "idx_user_audio_systems_user_id" ON "public"."user_audio_systems" USING "btree" ("user_id");



CREATE INDEX "idx_user_feature_permissions_feature_key" ON "public"."user_feature_permissions" USING "btree" ("feature_key");



CREATE INDEX "idx_user_feature_permissions_type" ON "public"."user_feature_permissions" USING "btree" ("permission_type");



CREATE INDEX "idx_user_feature_permissions_user_id" ON "public"."user_feature_permissions" USING "btree" ("user_id");



CREATE INDEX "idx_user_subscriptions_user_id" ON "public"."user_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_membership_type" ON "public"."users" USING "btree" ("membership_type");



CREATE INDEX "idx_users_status" ON "public"."users" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "log_team_member_activity_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."team_members" FOR EACH ROW EXECUTE FUNCTION "public"."log_team_activity"();

ALTER TABLE "public"."team_members" DISABLE TRIGGER "log_team_member_activity_trigger";



CREATE OR REPLACE TRIGGER "trigger_directory_review_rating_update" AFTER INSERT OR DELETE OR UPDATE ON "public"."directory_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_listing_rating"();



CREATE OR REPLACE TRIGGER "trigger_log_cms_page_activity" AFTER INSERT OR UPDATE ON "public"."cms_pages" FOR EACH ROW EXECUTE FUNCTION "public"."log_cms_page_activity"();



CREATE OR REPLACE TRIGGER "trigger_log_event_creation" AFTER INSERT ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."log_event_creation"();



CREATE OR REPLACE TRIGGER "trigger_log_user_registration" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."log_user_registration"();



CREATE OR REPLACE TRIGGER "trigger_navigation_menu_items_updated_at" BEFORE UPDATE ON "public"."navigation_menu_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_navigation_menu_items_updated_at"();



CREATE OR REPLACE TRIGGER "update_ad_placements_updated_at" BEFORE UPDATE ON "public"."ad_placements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ad_stats_on_click" AFTER INSERT ON "public"."advertisement_clicks" FOR EACH ROW EXECUTE FUNCTION "public"."update_advertisement_stats"();



CREATE OR REPLACE TRIGGER "update_ad_stats_on_impression" AFTER INSERT ON "public"."advertisement_impressions" FOR EACH ROW EXECUTE FUNCTION "public"."update_advertisement_stats"();



CREATE OR REPLACE TRIGGER "update_advertisements_updated_at" BEFORE UPDATE ON "public"."advertisements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_directory_listings_updated_at" BEFORE UPDATE ON "public"."directory_listings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_directory_reviews_updated_at" BEFORE UPDATE ON "public"."directory_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_member_hierarchy_trigger" BEFORE INSERT OR UPDATE ON "public"."team_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_member_hierarchy_level"();



CREATE OR REPLACE TRIGGER "update_membership_plans_updated_at" BEFORE UPDATE ON "public"."membership_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_role_permissions_updated_at" BEFORE UPDATE ON "public"."role_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_subscriptions_updated_at" BEFORE UPDATE ON "public"."user_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ad_analytics"
    ADD CONSTRAINT "ad_analytics_advertisement_id_fkey" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ad_analytics"
    ADD CONSTRAINT "ad_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."admin_activity_log"
    ADD CONSTRAINT "admin_activity_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."admin_settings"
    ADD CONSTRAINT "admin_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."advertisement_ab_tests"
    ADD CONSTRAINT "advertisement_ab_tests_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."advertisement_campaigns"("id");



ALTER TABLE ONLY "public"."advertisement_ab_tests"
    ADD CONSTRAINT "advertisement_ab_tests_variant_a_id_fkey" FOREIGN KEY ("variant_a_id") REFERENCES "public"."advertisements"("id");



ALTER TABLE ONLY "public"."advertisement_ab_tests"
    ADD CONSTRAINT "advertisement_ab_tests_variant_b_id_fkey" FOREIGN KEY ("variant_b_id") REFERENCES "public"."advertisements"("id");



ALTER TABLE ONLY "public"."advertisement_analytics"
    ADD CONSTRAINT "advertisement_analytics_advertisement_id_fkey" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."advertisement_billing"
    ADD CONSTRAINT "advertisement_billing_advertisement_id_fkey" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."advertisement_billing"
    ADD CONSTRAINT "advertisement_billing_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."advertisement_campaigns"
    ADD CONSTRAINT "advertisement_campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."advertisement_clicks"
    ADD CONSTRAINT "advertisement_clicks_advertisement_id_fkey" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."advertisement_clicks"
    ADD CONSTRAINT "advertisement_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."advertisement_image_analytics"
    ADD CONSTRAINT "advertisement_image_analytics_advertisement_image_id_fkey" FOREIGN KEY ("advertisement_image_id") REFERENCES "public"."advertisement_images"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."advertisement_images"
    ADD CONSTRAINT "advertisement_images_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."advertisement_impressions"
    ADD CONSTRAINT "advertisement_impressions_advertisement_id_fkey" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."advertisement_impressions"
    ADD CONSTRAINT "advertisement_impressions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."advertisements"
    ADD CONSTRAINT "advertisements_advertiser_user_id_fkey" FOREIGN KEY ("advertiser_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."advertisements"
    ADD CONSTRAINT "advertisements_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."advertisement_campaigns"("id");



ALTER TABLE ONLY "public"."audio_components"
    ADD CONSTRAINT "audio_components_audio_system_id_fkey" FOREIGN KEY ("audio_system_id") REFERENCES "public"."user_audio_systems"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cms_pages"
    ADD CONSTRAINT "cms_pages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."competition_results"
    ADD CONSTRAINT "competition_results_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competition_results"
    ADD CONSTRAINT "competition_results_system_used_fkey" FOREIGN KEY ("system_used") REFERENCES "public"."user_audio_systems"("id");



ALTER TABLE ONLY "public"."competition_results"
    ADD CONSTRAINT "competition_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."configuration_options"
    ADD CONSTRAINT "configuration_options_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."configuration_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."directory_categories"
    ADD CONSTRAINT "directory_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."directory_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."directory_favorites"
    ADD CONSTRAINT "directory_favorites_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."directory_listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."directory_favorites"
    ADD CONSTRAINT "directory_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."directory_listing_views"
    ADD CONSTRAINT "directory_listing_views_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."directory_listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."directory_listing_views"
    ADD CONSTRAINT "directory_listing_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."directory_listings"
    ADD CONSTRAINT "directory_listings_item_category_id_fkey" FOREIGN KEY ("item_category_id") REFERENCES "public"."directory_categories"("id");



ALTER TABLE ONLY "public"."directory_listings"
    ADD CONSTRAINT "directory_listings_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."directory_listings"
    ADD CONSTRAINT "directory_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."directory_reviews"
    ADD CONSTRAINT "directory_reviews_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."directory_listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."directory_reviews"
    ADD CONSTRAINT "directory_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_stripe_payment_intent_id_fkey" FOREIGN KEY ("stripe_payment_intent_id") REFERENCES "public"."payments"("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."event_categories"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."form_field_configurations"
    ADD CONSTRAINT "form_field_configurations_configuration_category_id_fkey" FOREIGN KEY ("configuration_category_id") REFERENCES "public"."configuration_categories"("id");



ALTER TABLE ONLY "public"."navigation_analytics"
    ADD CONSTRAINT "navigation_analytics_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "public"."navigation_menu_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."navigation_analytics"
    ADD CONSTRAINT "navigation_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."navigation_menu_items"
    ADD CONSTRAINT "navigation_menu_items_inherits_from_fkey" FOREIGN KEY ("inherits_from") REFERENCES "public"."navigation_menu_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."navigation_menu_items"
    ADD CONSTRAINT "navigation_menu_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."navigation_menu_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."navigation_templates"
    ADD CONSTRAINT "navigation_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rules_templates"
    ADD CONSTRAINT "rules_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."team_activity_log"
    ADD CONSTRAINT "team_activity_log_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_activity_log"
    ADD CONSTRAINT "team_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_roles"
    ADD CONSTRAINT "team_roles_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."upsell_interactions"
    ADD CONSTRAINT "upsell_interactions_navigation_item_id_fkey" FOREIGN KEY ("navigation_item_id") REFERENCES "public"."navigation_menu_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."upsell_interactions"
    ADD CONSTRAINT "upsell_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_advertisement_preferences"
    ADD CONSTRAINT "user_advertisement_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_audio_systems"
    ADD CONSTRAINT "user_audio_systems_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_feature_permissions"
    ADD CONSTRAINT "user_feature_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_feature_permissions"
    ADD CONSTRAINT "user_feature_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_stripe_payment_intent_id_fkey" FOREIGN KEY ("stripe_payment_intent_id") REFERENCES "public"."payments"("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Active advertisement images are viewable by everyone" ON "public"."advertisement_images" FOR SELECT USING ((("status")::"text" = 'active'::"text"));



CREATE POLICY "Admin can manage organizations" ON "public"."organizations" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin can manage settings" ON "public"."admin_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = 'admin'::"text")))));



CREATE POLICY "Admin can view activity log" ON "public"."admin_activity_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = 'admin'::"text")))));



CREATE POLICY "Admin full access" ON "public"."categories" TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admin full access" ON "public"."cms_pages" TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admin full access" ON "public"."configuration_categories" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin full access" ON "public"."configuration_options" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin full access" ON "public"."form_field_configurations" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin full access" ON "public"."rules_templates" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin users can manage admin settings" ON "public"."admin_settings" USING ((("auth"."email"() = 'admin@caraudioevents.com'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = 'admin'::"text"))))));



CREATE POLICY "Admins can insert activity log" ON "public"."admin_activity_log" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can manage all reviews" ON "public"."directory_reviews" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can manage categories" ON "public"."directory_categories" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can manage organizations" ON "public"."organizations" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admins can read activity log" ON "public"."admin_activity_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can read all activity logs" ON "public"."activity_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can read all listings" ON "public"."directory_listings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can read all views" ON "public"."directory_listing_views" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can update all listings" ON "public"."directory_listings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = 'admin'::"text")))));



CREATE POLICY "Allow admin users to manage navigation items" ON "public"."navigation_menu_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_user_meta_data" ->> 'membershipType'::"text") = 'admin'::"text")))));



CREATE POLICY "Allow anonymous click tracking" ON "public"."advertisement_clicks" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow anonymous impression count updates" ON "public"."advertisements" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow anonymous impression tracking" ON "public"."advertisement_impressions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow authenticated users to delete rules templates" ON "public"."rules_templates" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to insert rules templates" ON "public"."rules_templates" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to read rules templates" ON "public"."rules_templates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update rules templates" ON "public"."rules_templates" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Anyone can insert views" ON "public"."directory_listing_views" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can read active categories" ON "public"."directory_categories" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can read approved listings" ON "public"."directory_listings" FOR SELECT USING ((("status")::"text" = 'approved'::"text"));



CREATE POLICY "Anyone can read approved reviews" ON "public"."directory_reviews" FOR SELECT USING ((("status")::"text" = 'approved'::"text"));



CREATE POLICY "Anyone can view published approved events" ON "public"."events" FOR SELECT USING (((("status")::"text" = 'published'::"text") AND ("approval_status" = 'approved'::"text")));



CREATE POLICY "Authenticated users can create reviews" ON "public"."directory_reviews" FOR INSERT WITH CHECK (("reviewer_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can delete events" ON "public"."events" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can insert events" ON "public"."events" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can manage advertisement A/B tests" ON "public"."advertisement_ab_tests" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can manage advertisement images" ON "public"."advertisement_images" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can manage event categories" ON "public"."event_categories" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can manage membership plans" ON "public"."membership_plans" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can update events" ON "public"."events" FOR UPDATE USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can view advertisement image analytics" ON "public"."advertisement_image_analytics" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all events" ON "public"."events" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can view click data" ON "public"."advertisement_clicks" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can view impression data" ON "public"."advertisement_impressions" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Eligible users can create listings" ON "public"."directory_listings" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = ANY ((ARRAY['retailer'::character varying, 'manufacturer'::character varying, 'organization'::character varying, 'competitor'::character varying, 'admin'::character varying])::"text"[])))))));



CREATE POLICY "Enable read access for all users" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."cms_pages" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."event_registrations" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."organizations" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."payments" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."user_subscriptions" FOR SELECT USING (true);



CREATE POLICY "Event categories are viewable by everyone" ON "public"."event_categories" FOR SELECT USING (true);



CREATE POLICY "Public audio systems are viewable" ON "public"."user_audio_systems" FOR SELECT USING (("is_public" = true));



CREATE POLICY "Public read access" ON "public"."categories" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "Public read access" ON "public"."cms_pages" FOR SELECT TO "authenticated", "anon" USING ((("status")::"text" = 'published'::"text"));



CREATE POLICY "Public read access" ON "public"."configuration_categories" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read access" ON "public"."configuration_options" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read access" ON "public"."events" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read access" ON "public"."form_field_configurations" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read access" ON "public"."rules_templates" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read access for event_categories" ON "public"."event_categories" FOR SELECT USING (true);



CREATE POLICY "Public read access to active plans" ON "public"."membership_plans" FOR SELECT TO "authenticated", "anon" USING ((("is_active" = true) AND ("hidden_on_frontend" = false)));



CREATE POLICY "System can insert activity log" ON "public"."admin_activity_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "Team invitations are viewable by involved users" ON "public"."team_invitations" FOR SELECT USING ((("invited_user_id" = "auth"."uid"()) OR ("invited_by_user_id" = "auth"."uid"()) OR ("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'president'::"text", 'vice_president'::"text"])) AND ("team_members"."is_active" = true))))));



CREATE POLICY "Team invitations can be created by leaders" ON "public"."team_invitations" FOR INSERT WITH CHECK ((("invited_by_user_id" = "auth"."uid"()) AND ("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'president'::"text", 'vice_president'::"text", 'moderator'::"text"])) AND ("team_members"."is_active" = true))))));



CREATE POLICY "Team invitations can be created by team leaders" ON "public"."team_invitations" FOR INSERT WITH CHECK ((("invited_by_user_id" = "auth"."uid"()) AND ("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'president'::"text", 'vice_president'::"text", 'moderator'::"text"])) AND ("team_members"."is_active" = true))))));



CREATE POLICY "Team invitations can be updated by involved users" ON "public"."team_invitations" FOR UPDATE USING ((("invited_user_id" = "auth"."uid"()) OR ("invited_by_user_id" = "auth"."uid"()) OR ("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'president'::"text", 'vice_president'::"text"])) AND ("team_members"."is_active" = true))))));



CREATE POLICY "Team members are viewable" ON "public"."team_members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Team members can be managed by leaders" ON "public"."team_members" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Team owners can manage invitations" ON "public"."team_invitations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_invitations"."team_id") AND ("teams"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_invitations"."team_id") AND ("teams"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Team roles are viewable by team members" ON "public"."team_roles" FOR SELECT USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."is_active" = true)))));



CREATE POLICY "Team roles can be managed by team leaders" ON "public"."team_roles" USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'president'::"text", 'vice_president'::"text"])) AND ("team_members"."is_active" = true)))));



CREATE POLICY "Teams are viewable by everyone" ON "public"."teams" FOR SELECT USING (true);



CREATE POLICY "Teams can be created by authenticated users" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Teams can be updated by owners and leaders" ON "public"."teams" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Users can insert their own activity logs" ON "public"."activity_logs" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own payments" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage components of their systems" ON "public"."audio_components" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_audio_systems"
  WHERE (("user_audio_systems"."id" = "audio_components"."audio_system_id") AND ("user_audio_systems"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_audio_systems"
  WHERE (("user_audio_systems"."id" = "audio_components"."audio_system_id") AND ("user_audio_systems"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage own ad preferences" ON "public"."user_advertisement_preferences" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own campaigns" ON "public"."advertisement_campaigns" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage their own audio systems" ON "public"."user_audio_systems" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own competition results" ON "public"."competition_results" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own favorites" ON "public"."directory_favorites" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage their own registrations" ON "public"."event_registrations" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own subscriptions" ON "public"."user_subscriptions" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own listings" ON "public"."directory_listings" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read their own reviews" ON "public"."directory_reviews" FOR SELECT USING (("reviewer_id" = "auth"."uid"()));



CREATE POLICY "Users can read their own view history" ON "public"."directory_listing_views" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own listings" ON "public"."directory_listings" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own reviews" ON "public"."directory_reviews" FOR UPDATE USING (("reviewer_id" = "auth"."uid"()));



CREATE POLICY "Users can view own billing" ON "public"."advertisement_billing" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own invitations" ON "public"."team_invitations" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "invited_user_id") OR ("auth"."uid"() = "invited_by_user_id")));



CREATE POLICY "Users can view their own payments" ON "public"."payments" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own registrations" ON "public"."event_registrations" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own subscriptions" ON "public"."user_subscriptions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ad_placements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ad_placements_admin_write" ON "public"."ad_placements" USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_user_meta_data" ->> 'membershipType'::"text") = 'admin'::"text")))));



CREATE POLICY "ad_placements_read_all" ON "public"."ad_placements" FOR SELECT USING (("is_active" = true));



ALTER TABLE "public"."admin_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advertisement_ab_tests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advertisement_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advertisement_billing" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advertisement_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advertisement_clicks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advertisement_image_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advertisement_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advertisement_impressions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "advertisements_admin_all" ON "public"."advertisements" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."membership_type")::"text" = 'admin'::"text")))));



CREATE POLICY "advertisements_advertiser_own" ON "public"."advertisements" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."email")::"text" = "advertisements"."advertiser_email")))));



CREATE POLICY "advertisements_fallback_auth" ON "public"."advertisements" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "advertisements_read_auth" ON "public"."advertisements" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."audio_components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cms_pages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cms_pages_delete_policy" ON "public"."cms_pages" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "cms_pages_insert_policy" ON "public"."cms_pages" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "cms_pages_select_policy" ON "public"."cms_pages" FOR SELECT USING (true);



CREATE POLICY "cms_pages_update_policy" ON "public"."cms_pages" FOR UPDATE USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."competition_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."configuration_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."configuration_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."directory_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."directory_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."directory_listing_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."directory_listings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."directory_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_categories_admin_all" ON "public"."event_categories" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = 'admin'::"text")))));



CREATE POLICY "event_categories_public_read" ON "public"."event_categories" FOR SELECT USING (true);



ALTER TABLE "public"."event_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."form_field_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."membership_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "membership_plans_admin_write" ON "public"."membership_plans" USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_user_meta_data" ->> 'membershipType'::"text") = 'admin'::"text")))));



CREATE POLICY "membership_plans_read_all" ON "public"."membership_plans" FOR SELECT USING (true);



ALTER TABLE "public"."navigation_analytics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "navigation_analytics_insert_all" ON "public"."navigation_analytics" FOR INSERT WITH CHECK (true);



CREATE POLICY "navigation_analytics_no_delete" ON "public"."navigation_analytics" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = 'admin'::"text")))));



CREATE POLICY "navigation_analytics_no_update" ON "public"."navigation_analytics" FOR UPDATE USING (false);



CREATE POLICY "navigation_analytics_read_own" ON "public"."navigation_analytics" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = 'admin'::"text"))))));



CREATE POLICY "navigation_authenticated_full_access" ON "public"."navigation_menu_items" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."navigation_menu_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "navigation_read_all" ON "public"."navigation_menu_items" FOR SELECT USING (true);



ALTER TABLE "public"."navigation_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "navigation_templates_admin_full" ON "public"."navigation_templates" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."membership_type")::"text" = 'admin'::"text")))));



CREATE POLICY "navigation_templates_read_all" ON "public"."navigation_templates" FOR SELECT USING (("is_active" = true));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_policy" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_policy" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "profiles_update_policy" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_permissions_admin_write" ON "public"."role_permissions" USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_user_meta_data" ->> 'membershipType'::"text") = 'admin'::"text")))));



CREATE POLICY "role_permissions_read_all" ON "public"."role_permissions" FOR SELECT USING (true);



ALTER TABLE "public"."rules_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "simple_activity_log_delete" ON "public"."team_activity_log" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "simple_activity_log_insert" ON "public"."team_activity_log" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "simple_activity_log_select" ON "public"."team_activity_log" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "simple_activity_log_update" ON "public"."team_activity_log" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "simple_team_delete" ON "public"."teams" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "simple_team_insert" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "simple_team_member_delete" ON "public"."team_members" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "simple_team_member_insert" ON "public"."team_members" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "simple_team_member_select" ON "public"."team_members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "simple_team_member_update" ON "public"."team_members" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "simple_team_select" ON "public"."teams" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "simple_team_update" ON "public"."teams" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "owner_id")) WITH CHECK (("auth"."uid"() = "owner_id"));



ALTER TABLE "public"."team_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_advertisement_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_audio_systems" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert_registration" ON "public"."users" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "users_read_own" ON "public"."users" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE USING (("id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."calculate_advertisement_roi"("ad_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_advertisement_roi"("ad_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_advertisement_roi"("ad_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_team_member"("manager_user_id" "uuid", "target_team_id" "uuid", "target_member_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_team_member"("manager_user_id" "uuid", "target_team_id" "uuid", "target_member_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_team_member"("manager_user_id" "uuid", "target_team_id" "uuid", "target_member_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."duplicate_navigation_context"("p_source_context" "text", "p_target_context" "text", "p_created_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."duplicate_navigation_context"("p_source_context" "text", "p_target_context" "text", "p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."duplicate_navigation_context"("p_source_context" "text", "p_target_context" "text", "p_created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_setting"("setting_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_setting"("setting_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_setting"("setting_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_advertisement_metrics"("ad_id" "uuid", "start_date" "date", "end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_advertisement_metrics"("ad_id" "uuid", "start_date" "date", "end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_advertisement_metrics"("ad_id" "uuid", "start_date" "date", "end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_directory_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_directory_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_directory_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_logo_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_logo_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_logo_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_navigation_analytics"("p_start_date" "date", "p_end_date" "date", "p_membership_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_navigation_analytics"("p_start_date" "date", "p_end_date" "date", "p_membership_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_navigation_analytics"("p_start_date" "date", "p_end_date" "date", "p_membership_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_navigation_for_membership"("p_membership_type" "text", "p_subscription_level" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_navigation_for_membership"("p_membership_type" "text", "p_subscription_level" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_navigation_for_membership"("p_membership_type" "text", "p_subscription_level" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_activity"("limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_activity"("limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_activity"("limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_competition_stats"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_competition_stats"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_competition_stats"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_activity"("p_activity_type" character varying, "p_description" "text", "p_metadata" "jsonb", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."log_activity"("p_activity_type" character varying, "p_description" "text", "p_metadata" "jsonb", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_activity"("p_activity_type" character varying, "p_description" "text", "p_metadata" "jsonb", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_cms_page_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_cms_page_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_cms_page_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_event_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_event_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_event_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_team_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_team_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_team_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_user_registration"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_user_registration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_user_registration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_listing_view"("p_listing_id" "uuid", "p_user_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text", "p_referrer" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."record_listing_view"("p_listing_id" "uuid", "p_user_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text", "p_referrer" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_listing_view"("p_listing_id" "uuid", "p_user_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text", "p_referrer" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_admin_setting"("setting_key" "text", "setting_value" "text", "is_sensitive_setting" boolean, "setting_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_admin_setting"("setting_key" "text", "setting_value" "text", "is_sensitive_setting" boolean, "setting_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_admin_setting"("setting_key" "text", "setting_value" "text", "is_sensitive_setting" boolean, "setting_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."start_user_trial"("p_user_id" "uuid", "p_feature_key" character varying, "p_trial_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."start_user_trial"("p_user_id" "uuid", "p_feature_key" character varying, "p_trial_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_user_trial"("p_user_id" "uuid", "p_feature_key" character varying, "p_trial_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."track_navigation_click"("p_menu_item_id" "uuid", "p_user_id" "uuid", "p_membership_type" "text", "p_action_type" "text", "p_session_id" "text", "p_user_agent" "text", "p_ip_address" "inet", "p_referrer" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."track_navigation_click"("p_menu_item_id" "uuid", "p_user_id" "uuid", "p_membership_type" "text", "p_action_type" "text", "p_session_id" "text", "p_user_agent" "text", "p_ip_address" "inet", "p_referrer" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_navigation_click"("p_menu_item_id" "uuid", "p_user_id" "uuid", "p_membership_type" "text", "p_action_type" "text", "p_session_id" "text", "p_user_agent" "text", "p_ip_address" "inet", "p_referrer" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."track_upsell_interaction"("p_user_id" "uuid", "p_navigation_item_id" "uuid", "p_interaction_type" character varying, "p_user_membership" character varying, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."track_upsell_interaction"("p_user_id" "uuid", "p_navigation_item_id" "uuid", "p_interaction_type" character varying, "p_user_membership" character varying, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_upsell_interaction"("p_user_id" "uuid", "p_navigation_item_id" "uuid", "p_interaction_type" character varying, "p_user_membership" character varying, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_listing_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_listing_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_listing_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_admin_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_admin_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_admin_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_advertisement_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_advertisement_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_advertisement_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_listing_rating"("listing_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_listing_rating"("listing_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_listing_rating"("listing_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_member_hierarchy_level"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_member_hierarchy_level"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_member_hierarchy_level"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_navigation_menu_items_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_navigation_menu_items_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_navigation_menu_items_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_feature_access"("p_user_id" "uuid", "p_feature_key" character varying, "p_user_membership" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_feature_access"("p_user_id" "uuid", "p_feature_key" character varying, "p_user_membership" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_feature_access"("p_user_id" "uuid", "p_feature_key" character varying, "p_user_membership" character varying) TO "service_role";


















GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."ad_analytics" TO "anon";
GRANT ALL ON TABLE "public"."ad_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."ad_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."ad_placements" TO "anon";
GRANT ALL ON TABLE "public"."ad_placements" TO "authenticated";
GRANT ALL ON TABLE "public"."ad_placements" TO "service_role";



GRANT ALL ON TABLE "public"."admin_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."admin_settings" TO "anon";
GRANT ALL ON TABLE "public"."admin_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_settings" TO "service_role";



GRANT ALL ON TABLE "public"."advertisement_ab_tests" TO "anon";
GRANT ALL ON TABLE "public"."advertisement_ab_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisement_ab_tests" TO "service_role";



GRANT ALL ON TABLE "public"."advertisement_analytics" TO "anon";
GRANT ALL ON TABLE "public"."advertisement_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisement_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."advertisement_billing" TO "anon";
GRANT ALL ON TABLE "public"."advertisement_billing" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisement_billing" TO "service_role";



GRANT ALL ON TABLE "public"."advertisement_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."advertisement_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisement_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."advertisement_clicks" TO "anon";
GRANT ALL ON TABLE "public"."advertisement_clicks" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisement_clicks" TO "service_role";



GRANT ALL ON TABLE "public"."advertisements" TO "anon";
GRANT ALL ON TABLE "public"."advertisements" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisements" TO "service_role";



GRANT ALL ON TABLE "public"."advertisement_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."advertisement_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisement_dashboard" TO "service_role";



GRANT ALL ON TABLE "public"."advertisement_image_analytics" TO "anon";
GRANT ALL ON TABLE "public"."advertisement_image_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisement_image_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."advertisement_images" TO "anon";
GRANT ALL ON TABLE "public"."advertisement_images" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisement_images" TO "service_role";



GRANT ALL ON TABLE "public"."advertisement_impressions" TO "anon";
GRANT ALL ON TABLE "public"."advertisement_impressions" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisement_impressions" TO "service_role";



GRANT ALL ON TABLE "public"."advertisement_templates" TO "anon";
GRANT ALL ON TABLE "public"."advertisement_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisement_templates" TO "service_role";



GRANT ALL ON TABLE "public"."audio_components" TO "anon";
GRANT ALL ON TABLE "public"."audio_components" TO "authenticated";
GRANT ALL ON TABLE "public"."audio_components" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cms_pages" TO "anon";
GRANT ALL ON TABLE "public"."cms_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."cms_pages" TO "service_role";



GRANT ALL ON TABLE "public"."competition_results" TO "anon";
GRANT ALL ON TABLE "public"."competition_results" TO "authenticated";
GRANT ALL ON TABLE "public"."competition_results" TO "service_role";



GRANT ALL ON TABLE "public"."configuration_categories" TO "anon";
GRANT ALL ON TABLE "public"."configuration_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."configuration_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."configuration_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."configuration_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."configuration_categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."configuration_options" TO "anon";
GRANT ALL ON TABLE "public"."configuration_options" TO "authenticated";
GRANT ALL ON TABLE "public"."configuration_options" TO "service_role";



GRANT ALL ON SEQUENCE "public"."configuration_options_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."configuration_options_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."configuration_options_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."directory_categories" TO "anon";
GRANT ALL ON TABLE "public"."directory_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."directory_categories" TO "service_role";



GRANT ALL ON TABLE "public"."directory_favorites" TO "anon";
GRANT ALL ON TABLE "public"."directory_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."directory_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."directory_listing_views" TO "anon";
GRANT ALL ON TABLE "public"."directory_listing_views" TO "authenticated";
GRANT ALL ON TABLE "public"."directory_listing_views" TO "service_role";



GRANT ALL ON TABLE "public"."directory_listings" TO "anon";
GRANT ALL ON TABLE "public"."directory_listings" TO "authenticated";
GRANT ALL ON TABLE "public"."directory_listings" TO "service_role";



GRANT ALL ON TABLE "public"."directory_reviews" TO "anon";
GRANT ALL ON TABLE "public"."directory_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."directory_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."event_categories" TO "anon";
GRANT ALL ON TABLE "public"."event_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."event_categories" TO "service_role";



GRANT ALL ON TABLE "public"."event_registrations" TO "anon";
GRANT ALL ON TABLE "public"."event_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."event_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."form_field_configurations" TO "anon";
GRANT ALL ON TABLE "public"."form_field_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."form_field_configurations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."form_field_configurations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."form_field_configurations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."form_field_configurations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."membership_plans" TO "anon";
GRANT ALL ON TABLE "public"."membership_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_plans" TO "service_role";



GRANT ALL ON TABLE "public"."navigation_analytics" TO "anon";
GRANT ALL ON TABLE "public"."navigation_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."navigation_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."navigation_backup_20250613" TO "anon";
GRANT ALL ON TABLE "public"."navigation_backup_20250613" TO "authenticated";
GRANT ALL ON TABLE "public"."navigation_backup_20250613" TO "service_role";



GRANT ALL ON TABLE "public"."navigation_menu_items" TO "anon";
GRANT ALL ON TABLE "public"."navigation_menu_items" TO "authenticated";
GRANT ALL ON TABLE "public"."navigation_menu_items" TO "service_role";



GRANT ALL ON TABLE "public"."navigation_templates" TO "anon";
GRANT ALL ON TABLE "public"."navigation_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."navigation_templates" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."organizations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."organizations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."organizations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."recent_admin_activity" TO "anon";
GRANT ALL ON TABLE "public"."recent_admin_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."recent_admin_activity" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."rules_templates" TO "anon";
GRANT ALL ON TABLE "public"."rules_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."rules_templates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."rules_templates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rules_templates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rules_templates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."team_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."team_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."team_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."team_invitations" TO "anon";
GRANT ALL ON TABLE "public"."team_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."team_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."team_roles" TO "anon";
GRANT ALL ON TABLE "public"."team_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."team_roles" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."upsell_interactions" TO "anon";
GRANT ALL ON TABLE "public"."upsell_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."upsell_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_advertisement_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_advertisement_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_advertisement_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_audio_systems" TO "anon";
GRANT ALL ON TABLE "public"."user_audio_systems" TO "authenticated";
GRANT ALL ON TABLE "public"."user_audio_systems" TO "service_role";



GRANT ALL ON TABLE "public"."user_feature_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_feature_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_feature_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
