-- Navigation Manager Database Setup
-- This creates the necessary tables and functions for the Navigation Manager

-- 1. Create navigation_menu_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS navigation_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    href TEXT,
    icon TEXT,
    nav_order INTEGER DEFAULT 0,
    parent_id UUID REFERENCES navigation_menu_items(id) ON DELETE CASCADE,
    target_blank BOOLEAN DEFAULT false,
    visibility_rules JSONB DEFAULT '{"public": true}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    cms_page_id UUID REFERENCES cms_pages(id) ON DELETE SET NULL
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nav_menu_items_order ON navigation_menu_items(nav_order);
CREATE INDEX IF NOT EXISTS idx_nav_menu_items_parent ON navigation_menu_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_nav_menu_items_active ON navigation_menu_items(is_active);
CREATE INDEX IF NOT EXISTS idx_nav_menu_items_cms_page ON navigation_menu_items(cms_page_id);

-- 3. Create RLS policies
ALTER TABLE navigation_menu_items ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active navigation items
DROP POLICY IF EXISTS "Public can view active navigation items" ON navigation_menu_items;
CREATE POLICY "Public can view active navigation items" 
ON navigation_menu_items 
FOR SELECT 
TO public 
USING (is_active = true);

-- Allow authenticated users to view all navigation items
DROP POLICY IF EXISTS "Authenticated users can view all navigation items" ON navigation_menu_items;
CREATE POLICY "Authenticated users can view all navigation items" 
ON navigation_menu_items 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow admins to manage navigation items
DROP POLICY IF EXISTS "Admins can manage navigation items" ON navigation_menu_items;
CREATE POLICY "Admins can manage navigation items" 
ON navigation_menu_items 
FOR ALL 
TO authenticated 
USING (
    auth.uid() IN (
        SELECT users.id FROM users 
        WHERE users.membership_type = 'admin'
    )
) 
WITH CHECK (
    auth.uid() IN (
        SELECT users.id FROM users 
        WHERE users.membership_type = 'admin'
    )
);

-- 4. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_navigation_menu_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Create trigger for updated_at
DROP TRIGGER IF EXISTS update_navigation_menu_items_updated_at ON navigation_menu_items;
CREATE TRIGGER update_navigation_menu_items_updated_at
    BEFORE UPDATE ON navigation_menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_navigation_menu_items_updated_at();

-- 6. Insert default navigation structure (only if table is empty)
INSERT INTO navigation_menu_items (title, href, icon, nav_order, visibility_rules) 
SELECT * FROM (VALUES
    ('Home', '/', 'Home', 10, '{"public": true}'),
    ('Events', '/events', 'Calendar', 20, '{"public": true}'),
    ('Directory', '/directory', 'MapPin', 30, '{"public": true}'),
    ('About', '#', 'Building2', 40, '{"public": true}'),
    ('Resources', '#', 'FileText', 50, '{"public": true}')
) AS v(title, href, icon, nav_order, visibility_rules)
WHERE NOT EXISTS (SELECT 1 FROM navigation_menu_items);

-- 7. Create mega menu sections table for organizing dropdown content
CREATE TABLE IF NOT EXISTS mega_menu_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    navigation_item_id UUID REFERENCES navigation_menu_items(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    section_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create indexes for mega menu sections
CREATE INDEX IF NOT EXISTS idx_mega_menu_sections_nav_item ON mega_menu_sections(navigation_item_id);
CREATE INDEX IF NOT EXISTS idx_mega_menu_sections_order ON mega_menu_sections(section_order);

-- 9. Enable RLS for mega menu sections
ALTER TABLE mega_menu_sections ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active sections
DROP POLICY IF EXISTS "Public can view active mega menu sections" ON mega_menu_sections;
CREATE POLICY "Public can view active mega menu sections" 
ON mega_menu_sections 
FOR SELECT 
TO public 
USING (is_active = true);

-- Allow admins to manage sections
DROP POLICY IF EXISTS "Admins can manage mega menu sections" ON mega_menu_sections;
CREATE POLICY "Admins can manage mega menu sections" 
ON mega_menu_sections 
FOR ALL 
TO authenticated 
USING (
    auth.uid() IN (
        SELECT users.id FROM users 
        WHERE users.membership_type = 'admin'
    )
) 
WITH CHECK (
    auth.uid() IN (
        SELECT users.id FROM users 
        WHERE users.membership_type = 'admin'
    )
);

-- 10. Create navigation cache table for performance
CREATE TABLE IF NOT EXISTS navigation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT UNIQUE NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_navigation_cache_key ON navigation_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_navigation_cache_expires ON navigation_cache(expires_at);

-- 11. Create function to invalidate navigation cache
CREATE OR REPLACE FUNCTION invalidate_navigation_cache()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM navigation_cache WHERE cache_key LIKE 'navigation_%';
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- 12. Create triggers to invalidate cache when navigation changes
DROP TRIGGER IF EXISTS invalidate_nav_cache_on_menu_items ON navigation_menu_items;
CREATE TRIGGER invalidate_nav_cache_on_menu_items
    AFTER INSERT OR UPDATE OR DELETE ON navigation_menu_items
    FOR EACH ROW
    EXECUTE FUNCTION invalidate_navigation_cache();

DROP TRIGGER IF EXISTS invalidate_nav_cache_on_cms_pages ON cms_pages;
CREATE TRIGGER invalidate_nav_cache_on_cms_pages
    AFTER UPDATE OF navigation_placement, parent_nav_item, nav_order ON cms_pages
    FOR EACH ROW
    EXECUTE FUNCTION invalidate_navigation_cache();

-- 13. Create function to get hierarchical navigation
CREATE OR REPLACE FUNCTION get_navigation_hierarchy(
    user_membership_type TEXT DEFAULT NULL,
    is_authenticated BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    href TEXT,
    icon TEXT,
    nav_order INTEGER,
    parent_id UUID,
    target_blank BOOLEAN,
    visibility_rules JSONB,
    is_active BOOLEAN,
    level INTEGER,
    path TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE nav_tree AS (
        -- Base case: root items
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
            0 as level,
            ARRAY[n.id] as path
        FROM navigation_menu_items n
        WHERE n.parent_id IS NULL
        AND n.is_active = true
        AND (
            n.visibility_rules->>'public' = 'true'
            OR (is_authenticated AND n.visibility_rules ? 'membershipTypes' AND user_membership_type = ANY(
                SELECT jsonb_array_elements_text(n.visibility_rules->'membershipTypes')
            ))
        )
        
        UNION ALL
        
        -- Recursive case: child items
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
            nt.level + 1,
            nt.path || n.id
        FROM navigation_menu_items n
        INNER JOIN nav_tree nt ON n.parent_id = nt.id
        WHERE n.is_active = true
        AND (
            n.visibility_rules->>'public' = 'true'
            OR (is_authenticated AND n.visibility_rules ? 'membershipTypes' AND user_membership_type = ANY(
                SELECT jsonb_array_elements_text(n.visibility_rules->'membershipTypes')
            ))
        )
        AND NOT n.id = ANY(nt.path) -- Prevent infinite loops
    )
    SELECT * FROM nav_tree
    ORDER BY level, nav_order;
END;
$$ language 'plpgsql';

-- 14. Add some sample sub-menu items for demonstration
DO $$
DECLARE
    events_id UUID;
    directory_id UUID;
    about_id UUID;
    resources_id UUID;
BEGIN
    -- Get parent IDs for sub-menu items
    SELECT id INTO events_id FROM navigation_menu_items WHERE title = 'Events' LIMIT 1;
    SELECT id INTO directory_id FROM navigation_menu_items WHERE title = 'Directory' LIMIT 1;
    SELECT id INTO about_id FROM navigation_menu_items WHERE title = 'About' LIMIT 1;
    SELECT id INTO resources_id FROM navigation_menu_items WHERE title = 'Resources' LIMIT 1;
    
    -- Add Events sub-menu items
    IF events_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM navigation_menu_items WHERE parent_id = events_id
    ) THEN
        INSERT INTO navigation_menu_items (title, href, parent_id, nav_order, visibility_rules) VALUES
        ('Browse Events', '/events', events_id, 10, '{"public": true}'),
        ('Create Event', '/create-event', events_id, 20, '{"membershipTypes": ["competitor", "manufacturer", "retailer", "organization", "admin"]}');
    END IF;
    
    -- Add Directory sub-menu items
    IF directory_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM navigation_menu_items WHERE parent_id = directory_id
    ) THEN
        INSERT INTO navigation_menu_items (title, href, parent_id, nav_order, visibility_rules) VALUES
        ('Browse Members', '/directory', directory_id, 10, '{"public": true}'),
        ('Join Directory', '/register', directory_id, 20, '{"public": true}');
    END IF;
    
    -- Add Resources sub-menu items
    IF resources_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM navigation_menu_items WHERE parent_id = resources_id
    ) THEN
        INSERT INTO navigation_menu_items (title, href, parent_id, nav_order, visibility_rules) VALUES
        ('Help Center', '/pages/help', resources_id, 10, '{"public": true}'),
        ('Contact', '/pages/contact', resources_id, 20, '{"public": true}');
    END IF;
END $$;

-- 15. Create a view for easy navigation management
CREATE OR REPLACE VIEW navigation_structure AS
WITH RECURSIVE nav_hierarchy AS (
    -- Root level items
    SELECT 
        id,
        title,
        href,
        icon,
        nav_order,
        parent_id,
        target_blank,
        visibility_rules,
        is_active,
        0 as level,
        ARRAY[nav_order] as sort_path,
        title as path_title
    FROM navigation_menu_items
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- Child items
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
        nh.level + 1,
        nh.sort_path || n.nav_order,
        nh.path_title || ' > ' || n.title
    FROM navigation_menu_items n
    INNER JOIN nav_hierarchy nh ON n.parent_id = nh.id
)
SELECT 
    *,
    REPEAT('  ', level) || title as indented_title
FROM nav_hierarchy
ORDER BY sort_path;

-- 16. Verification query
SELECT 
    'Navigation Manager Setup Complete' as status,
    (SELECT COUNT(*) FROM navigation_menu_items) as menu_items_count,
    (SELECT COUNT(*) FROM mega_menu_sections) as menu_sections_count,
    (SELECT COUNT(*) FROM cms_pages WHERE navigation_placement IS NOT NULL) as cms_navigation_pages
; 