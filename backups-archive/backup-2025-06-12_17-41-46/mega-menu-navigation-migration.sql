-- Mega Menu Navigation System Migration
-- Run this SQL on your remote database to enable full mega menu functionality
-- Date: 2025-06-12

-- First, ensure the cms_pages table has all the navigation fields
-- (This might already exist if you ran the previous migration)
ALTER TABLE cms_pages 
ADD COLUMN IF NOT EXISTS navigation_placement TEXT DEFAULT 'none' CHECK (navigation_placement IN ('none', 'top_nav', 'sub_nav', 'footer', 'main')),
ADD COLUMN IF NOT EXISTS parent_nav_item TEXT,
ADD COLUMN IF NOT EXISTS footer_section TEXT CHECK (footer_section IN ('company', 'quick_links', 'legal', 'support', 'social')),
ADD COLUMN IF NOT EXISTS nav_order INTEGER,
ADD COLUMN IF NOT EXISTS nav_title TEXT,
ADD COLUMN IF NOT EXISTS show_in_sitemap BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_mega_menu_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mega_menu_description TEXT,
ADD COLUMN IF NOT EXISTS navigation_icon TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cms_pages_navigation_placement ON cms_pages(navigation_placement);
CREATE INDEX IF NOT EXISTS idx_cms_pages_footer_section ON cms_pages(footer_section);
CREATE INDEX IF NOT EXISTS idx_cms_pages_nav_order ON cms_pages(nav_order);
CREATE INDEX IF NOT EXISTS idx_cms_pages_show_in_sitemap ON cms_pages(show_in_sitemap);
CREATE INDEX IF NOT EXISTS idx_cms_pages_parent_nav ON cms_pages(parent_nav_item);
CREATE INDEX IF NOT EXISTS idx_cms_pages_status_navigation ON cms_pages(status, navigation_placement);

-- Update existing pages to have default navigation settings
UPDATE cms_pages 
SET navigation_placement = 'none', 
    show_in_sitemap = true 
WHERE navigation_placement IS NULL;

-- Create a navigation_menu_items table for more complex menu structures
CREATE TABLE IF NOT EXISTS navigation_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    href TEXT,
    icon TEXT,
    nav_order INTEGER DEFAULT 0,
    parent_id UUID REFERENCES navigation_menu_items(id) ON DELETE CASCADE,
    target_blank BOOLEAN DEFAULT false,
    visibility_rules JSONB DEFAULT '{}', -- For user type restrictions
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    cms_page_id UUID REFERENCES cms_pages(id) ON DELETE SET NULL
);

-- Create indexes for navigation_menu_items
CREATE INDEX IF NOT EXISTS idx_nav_menu_items_order ON navigation_menu_items(nav_order);
CREATE INDEX IF NOT EXISTS idx_nav_menu_items_parent ON navigation_menu_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_nav_menu_items_active ON navigation_menu_items(is_active);
CREATE INDEX IF NOT EXISTS idx_nav_menu_items_cms_page ON navigation_menu_items(cms_page_id);

-- Insert default navigation structure
INSERT INTO navigation_menu_items (title, href, icon, nav_order, visibility_rules) VALUES
('Home', '/', 'Home', 10, '{"public": true}'),
('Events', '/events', 'Calendar', 20, '{"public": true}'),
('Directory', '/directory', 'MapPin', 30, '{"public": true}'),
('About', '#', 'Building2', 40, '{"public": true}'),
('Resources', '#', 'FileText', 50, '{"public": true}'),
('Business Tools', '#', 'Target', 60, '{"membershipTypes": ["retailer", "manufacturer", "organization", "admin"]}'),
('Admin', '#', 'Shield', 70, '{"membershipTypes": ["admin"]}')
ON CONFLICT DO NOTHING;

-- Create mega menu sections table for organizing dropdown content
CREATE TABLE IF NOT EXISTS mega_menu_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_menu_id UUID REFERENCES navigation_menu_items(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    section_order INTEGER DEFAULT 0,
    column_span INTEGER DEFAULT 1, -- For multi-column layouts
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for mega menu sections
CREATE INDEX IF NOT EXISTS idx_mega_menu_sections_parent ON mega_menu_sections(parent_menu_id);
CREATE INDEX IF NOT EXISTS idx_mega_menu_sections_order ON mega_menu_sections(section_order);
CREATE INDEX IF NOT EXISTS idx_mega_menu_sections_active ON mega_menu_sections(is_active);

-- Create navigation cache table for performance
CREATE TABLE IF NOT EXISTS navigation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT UNIQUE NOT NULL,
    user_type TEXT,
    navigation_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for navigation cache
CREATE INDEX IF NOT EXISTS idx_navigation_cache_key ON navigation_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_navigation_cache_expires ON navigation_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_navigation_cache_user_type ON navigation_cache(user_type);

-- Function to clear navigation cache when content changes
CREATE OR REPLACE FUNCTION clear_navigation_cache()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM navigation_cache;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to clear cache when navigation-related data changes
DROP TRIGGER IF EXISTS clear_cache_on_cms_pages_change ON cms_pages;
CREATE TRIGGER clear_cache_on_cms_pages_change
    AFTER INSERT OR UPDATE OR DELETE ON cms_pages
    FOR EACH STATEMENT
    EXECUTE FUNCTION clear_navigation_cache();

DROP TRIGGER IF EXISTS clear_cache_on_nav_items_change ON navigation_menu_items;
CREATE TRIGGER clear_cache_on_nav_items_change
    AFTER INSERT OR UPDATE OR DELETE ON navigation_menu_items
    FOR EACH STATEMENT
    EXECUTE FUNCTION clear_navigation_cache();

-- Create a view for easy navigation querying
CREATE OR REPLACE VIEW navigation_structure AS
WITH RECURSIVE nav_tree AS (
    -- Base case: top-level menu items
    SELECT 
        id,
        title,
        href,
        icon,
        nav_order,
        parent_id,
        visibility_rules,
        is_active,
        cms_page_id,
        0 as depth,
        ARRAY[nav_order] as path
    FROM navigation_menu_items 
    WHERE parent_id IS NULL AND is_active = true
    
    UNION ALL
    
    -- Recursive case: child menu items
    SELECT 
        n.id,
        n.title,
        n.href,
        n.icon,
        n.nav_order,
        n.parent_id,
        n.visibility_rules,
        n.is_active,
        n.cms_page_id,
        nt.depth + 1,
        nt.path || n.nav_order
    FROM navigation_menu_items n
    INNER JOIN nav_tree nt ON n.parent_id = nt.id
    WHERE n.is_active = true
)
SELECT 
    nt.*,
    cp.title as page_title,
    cp.slug as page_slug,
    cp.status as page_status
FROM nav_tree nt
LEFT JOIN cms_pages cp ON nt.cms_page_id = cp.id
ORDER BY path;

-- Insert sample CMS pages for testing the mega menu
INSERT INTO cms_pages (
    title, 
    slug, 
    content, 
    meta_title, 
    meta_description, 
    status, 
    navigation_placement, 
    parent_nav_item, 
    nav_order,
    nav_title,
    author_id
) VALUES
('About Us', 'about-us', '<h1>About Car Audio Events</h1><p>Learn about our mission and vision.</p>', 'About Us - Car Audio Events', 'Learn about Car Audio Events platform', 'published', 'sub_nav', 'about', 10, 'About Us', (SELECT id FROM auth.users WHERE email = 'admin@caraudioevents.com' LIMIT 1)),
('Event Rules', 'event-rules', '<h1>Competition Rules</h1><p>Official rules and regulations for competitions.</p>', 'Event Rules - Car Audio Events', 'Official competition rules and regulations', 'published', 'sub_nav', 'events', 20, 'Rules & Regulations', (SELECT id FROM auth.users WHERE email = 'admin@caraudioevents.com' LIMIT 1)),
('Privacy Policy', 'privacy-policy', '<h1>Privacy Policy</h1><p>Our commitment to protecting your privacy.</p>', 'Privacy Policy - Car Audio Events', 'Privacy policy and data protection information', 'published', 'footer', NULL, 10, NULL, (SELECT id FROM auth.users WHERE email = 'admin@caraudioevents.com' LIMIT 1)),
('Terms of Service', 'terms-of-service', '<h1>Terms of Service</h1><p>Terms and conditions for using our platform.</p>', 'Terms of Service - Car Audio Events', 'Terms and conditions for platform usage', 'published', 'footer', NULL, 20, NULL, (SELECT id FROM auth.users WHERE email = 'admin@caraudioevents.com' LIMIT 1)),
('Contact Us', 'contact-us', '<h1>Contact Us</h1><p>Get in touch with our team.</p>', 'Contact Us - Car Audio Events', 'Contact information and support', 'published', 'sub_nav', 'about', 30, 'Contact', (SELECT id FROM auth.users WHERE email = 'admin@caraudioevents.com' LIMIT 1)),
('Sponsor Information', 'sponsor-info', '<h1>Become a Sponsor</h1><p>Partnership opportunities with Car Audio Events.</p>', 'Sponsor Information - Car Audio Events', 'Sponsorship and partnership opportunities', 'published', 'sub_nav', 'resources', 10, 'Sponsorship', (SELECT id FROM auth.users WHERE email = 'admin@caraudioevents.com' LIMIT 1))
ON CONFLICT (slug) DO NOTHING;

-- Update footer_section for footer pages
UPDATE cms_pages 
SET footer_section = CASE 
    WHEN slug = 'privacy-policy' THEN 'legal'
    WHEN slug = 'terms-of-service' THEN 'legal'
    WHEN slug = 'contact-us' THEN 'support'
    ELSE footer_section
END
WHERE slug IN ('privacy-policy', 'terms-of-service', 'contact-us');

-- Add comments for documentation
COMMENT ON TABLE navigation_menu_items IS 'Stores hierarchical navigation menu structure';
COMMENT ON TABLE mega_menu_sections IS 'Organizes content within mega menu dropdowns';
COMMENT ON TABLE navigation_cache IS 'Caches navigation data for performance';
COMMENT ON VIEW navigation_structure IS 'Recursive view of complete navigation hierarchy';

COMMENT ON COLUMN cms_pages.navigation_placement IS 'Where the page appears in site navigation: none, top_nav, sub_nav, footer, or main';
COMMENT ON COLUMN cms_pages.parent_nav_item IS 'Parent navigation item for sub_nav placement';
COMMENT ON COLUMN cms_pages.footer_section IS 'Footer section for footer placement: company, quick_links, legal, support, or social';
COMMENT ON COLUMN cms_pages.nav_order IS 'Order in navigation (lower numbers appear first)';
COMMENT ON COLUMN cms_pages.nav_title IS 'Title to display in navigation (defaults to page title if null)';
COMMENT ON COLUMN cms_pages.show_in_sitemap IS 'Whether to include page in XML sitemap for SEO';
COMMENT ON COLUMN cms_pages.is_mega_menu_featured IS 'Whether to feature this page prominently in mega menus';
COMMENT ON COLUMN cms_pages.mega_menu_description IS 'Short description for mega menu display';
COMMENT ON COLUMN cms_pages.navigation_icon IS 'Icon identifier for navigation display';

-- Grant necessary permissions (adjust based on your RLS policies)
-- These are examples - modify based on your security requirements

-- Allow authenticated users to read navigation data
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read navigation items" ON navigation_menu_items
    FOR SELECT USING (auth.role() = 'authenticated' OR is_active = true);

CREATE POLICY IF NOT EXISTS "Allow authenticated users to read mega menu sections" ON mega_menu_sections
    FOR SELECT USING (auth.role() = 'authenticated' OR is_active = true);

-- Allow admins to manage navigation
CREATE POLICY IF NOT EXISTS "Allow admins to manage navigation items" ON navigation_menu_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

CREATE POLICY IF NOT EXISTS "Allow admins to manage mega menu sections" ON mega_menu_sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- Enable RLS
ALTER TABLE navigation_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mega_menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_cache ENABLE ROW LEVEL SECURITY;

-- Cleanup old cache entries periodically
CREATE OR REPLACE FUNCTION cleanup_expired_navigation_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM navigation_cache 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a function to generate navigation JSON for API responses
CREATE OR REPLACE FUNCTION get_navigation_for_user(user_membership_type TEXT DEFAULT 'public')
RETURNS JSONB AS $$
DECLARE
    navigation_data JSONB;
    cache_key TEXT;
BEGIN
    cache_key := 'nav_' || COALESCE(user_membership_type, 'public');
    
    -- Check cache first
    SELECT navigation_data INTO navigation_data
    FROM navigation_cache 
    WHERE cache_key = cache_key 
    AND (expires_at IS NULL OR expires_at > NOW());
    
    IF navigation_data IS NOT NULL THEN
        RETURN navigation_data;
    END IF;
    
    -- Generate navigation data
    WITH navigation_with_children AS (
        SELECT 
            n.id,
            n.title,
            n.href,
            n.icon,
            n.nav_order,
            n.visibility_rules,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', child.id,
                        'title', child.title,
                        'href', child.href,
                        'icon', child.icon,
                        'nav_order', child.nav_order
                    ) ORDER BY child.nav_order
                ) FILTER (WHERE child.id IS NOT NULL),
                '[]'::json
            ) as children
        FROM navigation_menu_items n
        LEFT JOIN navigation_menu_items child ON child.parent_id = n.id AND child.is_active = true
        WHERE n.parent_id IS NULL 
        AND n.is_active = true
        AND (
            (n.visibility_rules->>'public')::boolean = true
            OR user_membership_type = ANY(
                SELECT jsonb_array_elements_text(n.visibility_rules->'membershipTypes')
            )
        )
        GROUP BY n.id, n.title, n.href, n.icon, n.nav_order, n.visibility_rules
        ORDER BY n.nav_order
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'title', title,
            'href', href,
            'icon', icon,
            'nav_order', nav_order,
            'children', children
        )
    ) INTO navigation_data
    FROM navigation_with_children;
    
    -- Cache the result for 1 hour
    INSERT INTO navigation_cache (cache_key, user_type, navigation_data, expires_at)
    VALUES (cache_key, user_membership_type, navigation_data, NOW() + INTERVAL '1 hour')
    ON CONFLICT (cache_key) DO UPDATE SET
        navigation_data = EXCLUDED.navigation_data,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();
    
    RETURN navigation_data;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Mega Menu Navigation System migration completed successfully!';
    RAISE NOTICE 'Features enabled:';
    RAISE NOTICE '  - Enhanced CMS navigation fields';
    RAISE NOTICE '  - Hierarchical navigation menu items';
    RAISE NOTICE '  - Mega menu sections for organized dropdowns';
    RAISE NOTICE '  - Navigation caching for performance';
    RAISE NOTICE '  - Sample content for testing';
    RAISE NOTICE '  - User-type based visibility controls';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Test the mega menu in your application';
    RAISE NOTICE '  2. Configure additional navigation items in admin panel';
    RAISE NOTICE '  3. Customize mega menu sections as needed';
    RAISE NOTICE '  4. Add more CMS pages with navigation placement';
END $$; 