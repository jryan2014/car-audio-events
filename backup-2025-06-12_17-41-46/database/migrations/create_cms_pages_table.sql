-- Create CMS Pages table
-- This should be run before add_cms_navigation_fields.sql

-- Create the cms_pages table
CREATE TABLE IF NOT EXISTS cms_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT,
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_featured BOOLEAN DEFAULT false,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages(status);
CREATE INDEX IF NOT EXISTS idx_cms_pages_author ON cms_pages(author_id);
CREATE INDEX IF NOT EXISTS idx_cms_pages_published_at ON cms_pages(published_at);
CREATE INDEX IF NOT EXISTS idx_cms_pages_created_at ON cms_pages(created_at);
CREATE INDEX IF NOT EXISTS idx_cms_pages_is_featured ON cms_pages(is_featured);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cms_pages_updated_at 
    BEFORE UPDATE ON cms_pages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow admins to do everything
CREATE POLICY "Admins can manage all pages" ON cms_pages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- Allow everyone to read published pages
CREATE POLICY "Everyone can read published pages" ON cms_pages
    FOR SELECT USING (status = 'published');

-- Allow authors to manage their own pages
CREATE POLICY "Authors can manage own pages" ON cms_pages
    FOR ALL USING (author_id = auth.uid());

-- Add comments for documentation
COMMENT ON TABLE cms_pages IS 'Content Management System pages for dynamic website content';
COMMENT ON COLUMN cms_pages.title IS 'Page title displayed to users';
COMMENT ON COLUMN cms_pages.slug IS 'URL-friendly identifier for the page';
COMMENT ON COLUMN cms_pages.content IS 'HTML content of the page';
COMMENT ON COLUMN cms_pages.meta_title IS 'SEO title for search engines';
COMMENT ON COLUMN cms_pages.meta_description IS 'SEO description for search engines';
COMMENT ON COLUMN cms_pages.meta_keywords IS 'SEO keywords as JSON array';
COMMENT ON COLUMN cms_pages.status IS 'Page status: draft, published, or archived';
COMMENT ON COLUMN cms_pages.is_featured IS 'Whether this page is featured/highlighted';
COMMENT ON COLUMN cms_pages.author_id IS 'User who created the page';
COMMENT ON COLUMN cms_pages.published_at IS 'When the page was published';

-- Create a sample privacy policy page
INSERT INTO cms_pages (title, slug, content, meta_title, meta_description, status, is_featured, author_id)
SELECT 
    'Privacy Policy',
    'privacy-policy',
    '<h1>Privacy Policy</h1><p>This is a sample privacy policy page. Edit this content to match your organization''s privacy policy.</p>',
    'Privacy Policy - Car Audio Events',
    'Learn about how we collect, use, and protect your personal information.',
    'draft',
    false,
    id
FROM users WHERE membership_type = 'admin' LIMIT 1;

-- Create a sample terms of service page
INSERT INTO cms_pages (title, slug, content, meta_title, meta_description, status, is_featured, author_id)
SELECT 
    'Terms of Service',
    'terms-of-service',
    '<h1>Terms of Service</h1><p>This is a sample terms of service page. Edit this content to match your organization''s terms and conditions.</p>',
    'Terms of Service - Car Audio Events',
    'Read our terms and conditions for using our platform.',
    'draft',
    false,
    id
FROM users WHERE membership_type = 'admin' LIMIT 1; 