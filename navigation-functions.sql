-- NAVIGATION SYSTEM FUNCTIONS
-- Advanced functions for the enhanced navigation system

-- =====================================================
-- FUNCTION 1: GET NAVIGATION FOR MEMBERSHIP CONTEXT
-- =====================================================

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

-- =====================================================
-- FUNCTION 2: TRACK NAVIGATION ANALYTICS
-- =====================================================

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
-- FUNCTION 3: GET NAVIGATION ANALYTICS
-- =====================================================

CREATE OR REPLACE FUNCTION get_navigation_analytics(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_membership_type TEXT DEFAULT NULL
) RETURNS TABLE (
    menu_item_id UUID,
    menu_title TEXT,
    total_clicks BIGINT,
    unique_users BIGINT,
    membership_breakdown JSONB
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION 4: DUPLICATE NAVIGATION CONTEXT
-- =====================================================

CREATE OR REPLACE FUNCTION duplicate_navigation_context(
    p_source_context TEXT,
    p_target_context TEXT,
    p_created_by UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
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
            badge_text, badge_color, description, created_by
        ) VALUES (
            source_item.title, source_item.href, source_item.icon, 
            source_item.nav_order, NULL, source_item.target_blank,
            source_item.visibility_rules, source_item.is_active, 
            source_item.cms_page_id, p_target_context,
            source_item.badge_text, source_item.badge_color, 
            source_item.description, p_created_by
        ) RETURNING id INTO new_item_id;
        
        -- Copy any child items
        INSERT INTO navigation_menu_items (
            title, href, icon, nav_order, parent_id, target_blank,
            visibility_rules, is_active, cms_page_id, membership_context,
            badge_text, badge_color, description, created_by
        )
        SELECT 
            title, href, icon, nav_order, new_item_id, target_blank,
            visibility_rules, is_active, cms_page_id, p_target_context,
            badge_text, badge_color, description, p_created_by
        FROM navigation_menu_items 
        WHERE parent_id = source_item.id;
    END LOOP;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION 5: APPLY NAVIGATION TEMPLATE
-- =====================================================

CREATE OR REPLACE FUNCTION apply_navigation_template(
    p_template_id UUID,
    p_target_context TEXT,
    p_created_by UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    template_record RECORD;
    template_item JSONB;
BEGIN
    -- Get the template
    SELECT * INTO template_record 
    FROM navigation_templates 
    WHERE id = p_template_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found or inactive: %', p_template_id;
    END IF;
    
    -- Clear existing items in target context
    DELETE FROM navigation_menu_items 
    WHERE membership_context = p_target_context;
    
    -- Apply template items
    FOR template_item IN SELECT * FROM jsonb_array_elements(template_record.template_data)
    LOOP
        INSERT INTO navigation_menu_items (
            title, href, icon, nav_order, membership_context,
            visibility_rules, is_active, badge_text, badge_color,
            description, created_by
        ) VALUES (
            template_item->>'title',
            template_item->>'href',
            template_item->>'icon',
            (template_item->>'nav_order')::INTEGER,
            p_target_context,
            COALESCE((template_item->>'visibility_rules')::JSONB, '{"public": true}'::JSONB),
            COALESCE((template_item->>'is_active')::BOOLEAN, true),
            template_item->>'badge_text',
            template_item->>'badge_color',
            template_item->>'description',
            p_created_by
        );
    END LOOP;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Navigation system functions created successfully! ⚡' as result; 