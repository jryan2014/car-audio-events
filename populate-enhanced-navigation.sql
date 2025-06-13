-- POPULATE ENHANCED NAVIGATION SYSTEM
-- This script populates the enhanced navigation with membership-specific menus

-- =====================================================
-- PART 1: CLEAR EXISTING DATA (SAFELY)
-- =====================================================

-- Backup existing navigation items before clearing
CREATE TABLE IF NOT EXISTS navigation_backup_$(date +%Y%m%d) AS 
SELECT * FROM navigation_menu_items;

-- Clear existing navigation (keep any custom items by checking created_by)
DELETE FROM navigation_menu_items 
WHERE created_by IS NULL OR title IN ('Home', 'Events', 'Directory', 'About', 'Resources', 'Business Tools', 'Admin');

-- =====================================================
-- PART 2: BASE NAVIGATION STRUCTURE (VISIBLE TO ALL)
-- =====================================================

INSERT INTO navigation_menu_items (title, href, icon, nav_order, membership_context, visibility_rules, is_active, description) VALUES
('Home', '/', 'Home', 10, 'base', '{"public": true}', true, 'Main homepage'),
('Events', '/events', 'Calendar', 20, 'base', '{"public": true}', true, 'Browse car audio events'),
('Directory', '/directory', 'MapPin', 30, 'base', '{"public": true}', true, 'Find retailers and services'),
('About', '/about', 'Building2', 40, 'base', '{"public": true}', true, 'Learn about our platform'),
('Resources', '/resources', 'FileText', 50, 'base', '{"public": true}', true, 'Helpful resources and guides');

-- =====================================================
-- PART 3: FREE COMPETITOR NAVIGATION
-- =====================================================

INSERT INTO navigation_menu_items (title, href, icon, nav_order, membership_context, visibility_rules, is_active, description, badge_text, badge_color) VALUES
('My Dashboard', '/dashboard', 'Home', 15, 'free_competitor', '{"membershipTypes": ["competitor"]}', true, 'Personal dashboard', 'FREE', 'green'),
('Join Events', '/events', 'Calendar', 25, 'free_competitor', '{"membershipTypes": ["competitor"]}', true, 'Register for events', 'LIMITED', 'yellow'),
('My Profile', '/profile', 'Users', 35, 'free_competitor', '{"membershipTypes": ["competitor"]}', true, 'Manage your profile'),
('Upgrade', '/pricing', 'Star', 60, 'free_competitor', '{"membershipTypes": ["competitor"]}', true, 'Upgrade to Pro', 'UPGRADE', 'blue');

-- =====================================================
-- PART 4: PRO COMPETITOR NAVIGATION
-- =====================================================

INSERT INTO navigation_menu_items (title, href, icon, nav_order, membership_context, visibility_rules, is_active, description, badge_text, badge_color) VALUES
('Pro Dashboard', '/dashboard', 'Home', 15, 'pro_competitor', '{"membershipTypes": ["competitor"], "subscriptionLevels": ["pro"]}', true, 'Advanced dashboard', 'PRO', 'purple'),
('All Events', '/events', 'Calendar', 25, 'pro_competitor', '{"membershipTypes": ["competitor"], "subscriptionLevels": ["pro"]}', true, 'Unlimited event access'),
('Analytics', '/analytics', 'BarChart3', 35, 'pro_competitor', '{"membershipTypes": ["competitor"], "subscriptionLevels": ["pro"]}', true, 'Competition analytics', 'PRO', 'purple'),
('Team Management', '/teams', 'Users', 45, 'pro_competitor', '{"membershipTypes": ["competitor"], "subscriptionLevels": ["pro"]}', true, 'Manage your teams'),
('System Showcase', '/showcase', 'Target', 55, 'pro_competitor', '{"membershipTypes": ["competitor"], "subscriptionLevels": ["pro"]}', true, 'Showcase your system');

-- =====================================================
-- PART 5: RETAILER NAVIGATION
-- =====================================================

INSERT INTO navigation_menu_items (title, href, icon, nav_order, membership_context, visibility_rules, is_active, description, badge_text, badge_color) VALUES
('Business Dashboard', '/dashboard', 'Building2', 15, 'retailer', '{"membershipTypes": ["retailer"]}', true, 'Business management hub', 'BUSINESS', 'orange'),
('Create Events', '/events/create', 'Plus', 25, 'retailer', '{"membershipTypes": ["retailer"]}', true, 'Host your own events'),
('Customer Analytics', '/customers', 'BarChart3', 35, 'retailer', '{"membershipTypes": ["retailer"]}', true, 'Track customer engagement'),
('Directory Listing', '/directory/manage', 'MapPin', 45, 'retailer', '{"membershipTypes": ["retailer"]}', true, 'Manage your business listing'),
('Advertising', '/advertising', 'Target', 55, 'retailer', '{"membershipTypes": ["retailer"]}', true, 'Promote your business'),
('Inventory', '/inventory', 'Package', 65, 'retailer', '{"membershipTypes": ["retailer"]}', true, 'Manage your inventory');

-- =====================================================
-- PART 6: MANUFACTURER NAVIGATION
-- =====================================================

INSERT INTO navigation_menu_items (title, href, icon, nav_order, membership_context, visibility_rules, is_active, description, badge_text, badge_color) VALUES
('Enterprise Dashboard', '/dashboard', 'Crown', 15, 'manufacturer', '{"membershipTypes": ["manufacturer"]}', true, 'Enterprise control center', 'ENTERPRISE', 'red'),
('Product Catalog', '/products', 'Package', 25, 'manufacturer', '{"membershipTypes": ["manufacturer"]}', true, 'Manage your product line'),
('Dealer Network', '/dealers', 'Building2', 35, 'manufacturer', '{"membershipTypes": ["manufacturer"]}', true, 'Manage dealer relationships'),
('Brand Showcase', '/brand', 'Star', 45, 'manufacturer', '{"membershipTypes": ["manufacturer"]}', true, 'Showcase your brand'),
('Event Sponsorship', '/sponsorship', 'Target', 55, 'manufacturer', '{"membershipTypes": ["manufacturer"]}', true, 'Sponsor events'),
('API Access', '/api', 'Settings', 65, 'manufacturer', '{"membershipTypes": ["manufacturer"]}', true, 'API integration tools');

-- =====================================================
-- PART 7: ORGANIZATION NAVIGATION
-- =====================================================

INSERT INTO navigation_menu_items (title, href, icon, nav_order, membership_context, visibility_rules, is_active, description, badge_text, badge_color) VALUES
('Organization Hub', '/dashboard', 'Users', 15, 'organization', '{"membershipTypes": ["organization"]}', true, 'Organization management', 'ORG', 'indigo'),
('Member Management', '/members', 'Users', 25, 'organization', '{"membershipTypes": ["organization"]}', true, 'Manage organization members'),
('Event Hosting', '/events/host', 'Calendar', 35, 'organization', '{"membershipTypes": ["organization"]}', true, 'Host organization events'),
('Community Tools', '/community', 'MessageCircle', 45, 'organization', '{"membershipTypes": ["organization"]}', true, 'Build your community'),
('Custom Branding', '/branding', 'Palette', 55, 'organization', '{"membershipTypes": ["organization"]}', true, 'Customize your presence'),
('Organization Analytics', '/org-analytics', 'BarChart3', 65, 'organization', '{"membershipTypes": ["organization"]}', true, 'Track organization metrics');

-- =====================================================
-- PART 8: ADMIN NAVIGATION
-- =====================================================

INSERT INTO navigation_menu_items (title, href, icon, nav_order, membership_context, visibility_rules, is_active, description, badge_text, badge_color) VALUES
('Admin Dashboard', '/admin/dashboard', 'Shield', 15, 'admin', '{"membershipTypes": ["admin"]}', true, 'System administration', 'ADMIN', 'red'),
('User Management', '/admin/users', 'Users', 25, 'admin', '{"membershipTypes": ["admin"]}', true, 'Manage all users'),
('Event Management', '/admin/events', 'Calendar', 35, 'admin', '{"membershipTypes": ["admin"]}', true, 'Oversee all events'),
('System Settings', '/admin/settings', 'Settings', 45, 'admin', '{"membershipTypes": ["admin"]}', true, 'Configure system settings'),
('Analytics', '/admin/analytics', 'BarChart3', 55, 'admin', '{"membershipTypes": ["admin"]}', true, 'System-wide analytics'),
('Navigation Manager', '/admin/navigation', 'Menu', 65, 'admin', '{"membershipTypes": ["admin"]}', true, 'Manage navigation menus');

-- =====================================================
-- PART 9: NAVIGATION TEMPLATES
-- =====================================================

INSERT INTO navigation_templates (name, description, membership_context, template_data) VALUES
('Default Base Navigation', 'Standard navigation for all users', 'base', 
'[
    {"title": "Home", "href": "/", "icon": "Home", "nav_order": 10},
    {"title": "Events", "href": "/events", "icon": "Calendar", "nav_order": 20},
    {"title": "Directory", "href": "/directory", "icon": "MapPin", "nav_order": 30}
]'::jsonb),

('Competitor Pro Template', 'Enhanced navigation for Pro competitors', 'pro_competitor',
'[
    {"title": "Pro Dashboard", "href": "/dashboard", "icon": "Home", "nav_order": 10, "badge_text": "PRO", "badge_color": "purple"},
    {"title": "Analytics", "href": "/analytics", "icon": "BarChart3", "nav_order": 20},
    {"title": "Team Management", "href": "/teams", "icon": "Users", "nav_order": 30}
]'::jsonb),

('Business Navigation Template', 'Navigation template for business users', 'retailer',
'[
    {"title": "Business Dashboard", "href": "/dashboard", "icon": "Building2", "nav_order": 10, "badge_text": "BUSINESS", "badge_color": "orange"},
    {"title": "Customer Analytics", "href": "/customers", "icon": "BarChart3", "nav_order": 20},
    {"title": "Advertising", "href": "/advertising", "icon": "Target", "nav_order": 30}
]'::jsonb);

-- Success message
SELECT 'Enhanced navigation data populated successfully! 🎯' as result; 