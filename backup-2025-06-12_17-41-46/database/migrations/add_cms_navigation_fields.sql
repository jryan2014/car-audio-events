-- Add navigation placement fields to cms_pages table
-- Run this migration to add navigation and placement functionality to CMS pages

-- Add navigation placement columns
ALTER TABLE cms_pages 
ADD COLUMN IF NOT EXISTS navigation_placement TEXT DEFAULT 'none' CHECK (navigation_placement IN ('none', 'top_nav', 'sub_nav', 'footer')),
ADD COLUMN IF NOT EXISTS parent_nav_item TEXT,
ADD COLUMN IF NOT EXISTS footer_section TEXT CHECK (footer_section IN ('company', 'quick_links', 'legal', 'support', 'social')),
ADD COLUMN IF NOT EXISTS nav_order INTEGER,
ADD COLUMN IF NOT EXISTS nav_title TEXT,
ADD COLUMN IF NOT EXISTS show_in_sitemap BOOLEAN DEFAULT true;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cms_pages_navigation_placement ON cms_pages(navigation_placement);
CREATE INDEX IF NOT EXISTS idx_cms_pages_footer_section ON cms_pages(footer_section);
CREATE INDEX IF NOT EXISTS idx_cms_pages_nav_order ON cms_pages(nav_order);
CREATE INDEX IF NOT EXISTS idx_cms_pages_show_in_sitemap ON cms_pages(show_in_sitemap);

-- Update existing pages to have default navigation settings
UPDATE cms_pages 
SET navigation_placement = 'none', 
    show_in_sitemap = true 
WHERE navigation_placement IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN cms_pages.navigation_placement IS 'Where the page appears in site navigation: none, top_nav, sub_nav, or footer';
COMMENT ON COLUMN cms_pages.parent_nav_item IS 'Parent navigation item for sub_nav placement';
COMMENT ON COLUMN cms_pages.footer_section IS 'Footer section for footer placement: company, quick_links, legal, support, or social';
COMMENT ON COLUMN cms_pages.nav_order IS 'Order in navigation (lower numbers appear first)';
COMMENT ON COLUMN cms_pages.nav_title IS 'Title to display in navigation (defaults to page title if null)';
COMMENT ON COLUMN cms_pages.show_in_sitemap IS 'Whether to include page in XML sitemap for SEO'; 