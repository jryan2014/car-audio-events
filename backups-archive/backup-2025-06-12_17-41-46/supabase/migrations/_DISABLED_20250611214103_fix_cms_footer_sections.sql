-- Fix CMS Pages Footer Sections
-- This migration updates existing CMS pages to have proper footer_section assignments

-- Update Privacy Policy to be in Legal section
UPDATE cms_pages 
SET footer_section = 'legal'
WHERE slug = 'privacy' AND navigation_placement = 'footer';

-- Update Terms of Service to be in Legal section  
UPDATE cms_pages 
SET footer_section = 'legal'
WHERE slug = 'terms' AND navigation_placement = 'footer';

-- Update Contact page to be in Support section
UPDATE cms_pages 
SET footer_section = 'support'
WHERE slug = 'contact' AND navigation_placement = 'footer';

-- Insert Help Center page if it doesn't exist
INSERT INTO cms_pages (
    title, 
    slug, 
    content, 
    meta_title, 
    meta_description, 
    status, 
    navigation_placement, 
    footer_section, 
    nav_order,
    show_in_sitemap
) VALUES (
    'Help Center', 
    'help', 
    '<h1>Help Center</h1><p>Find answers to frequently asked questions and get support.</p><h2>Getting Started</h2><p>New to our platform? Here''s how to get started with Car Audio Events.</p><h2>Account Management</h2><p>Learn how to manage your account settings and profile.</p><h2>Event Registration</h2><p>Step-by-step guide to register for competitions and events.</p>', 
    'Help Center - Car Audio Events', 
    'Get help and support for the Car Audio Events platform', 
    'published', 
    'footer', 
    'support', 
    1,
    true
) ON CONFLICT (slug) DO UPDATE SET
    footer_section = EXCLUDED.footer_section,
    navigation_placement = EXCLUDED.navigation_placement;
