-- Create membership plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly',
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  permissions JSONB DEFAULT '{}'::jsonb,
  limits JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to active plans
DROP POLICY IF EXISTS "Public read access" ON membership_plans;
CREATE POLICY "Public read access" ON membership_plans
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Clear existing data and insert fresh membership plans
DELETE FROM membership_plans;

-- Insert membership plans
INSERT INTO membership_plans (
  name, 
  type, 
  price, 
  billing_period, 
  description, 
  features, 
  permissions, 
  limits, 
  is_active, 
  is_featured, 
  display_order
) VALUES 
(
  'Competitor',
  'competitor',
  0.00,
  'free',
  'Perfect for getting started in car audio competitions',
  '[
    "Browse all events",
    "Basic profile creation", 
    "Score tracking",
    "Community access",
    "Mobile app access",
    "Basic event registration"
  ]'::jsonb,
  '{
    "can_view_events": true,
    "can_register_events": true,
    "can_create_profile": true,
    "can_access_community": true
  }'::jsonb,
  '{
    "max_event_registrations": 10,
    "profile_features": "basic"
  }'::jsonb,
  true,
  false,
  1
),
(
  'Pro Competitor',
  'competitor',
  29.00,
  'yearly',
  'Advanced features for serious competitors',
  '[
    "Everything in Competitor",
    "Advanced analytics",
    "Team management", 
    "Priority event registration",
    "Custom system showcase",
    "Competition history export",
    "Early access to new features",
    "Enhanced profile customization"
  ]'::jsonb,
  '{
    "can_view_events": true,
    "can_register_events": true,
    "can_create_profile": true,
    "can_access_community": true,
    "can_access_analytics": true,
    "can_manage_teams": true,
    "priority_registration": true
  }'::jsonb,
  '{
    "max_event_registrations": -1,
    "profile_features": "advanced",
    "analytics_retention": "1_year"
  }'::jsonb,
  true,
  true,
  2
),
(
  'Retailer',
  'retailer',
  99.00,
  'yearly',
  'For car audio retailers and installers',
  '[
    "Everything in Pro Competitor",
    "Business directory listing",
    "Customer management tools",
    "Inventory tracking",
    "Sales analytics",
    "Customer reviews system",
    "Advertising opportunities",
    "Lead generation tools"
  ]'::jsonb,
  '{
    "can_view_events": true,
    "can_register_events": true,
    "can_create_profile": true,
    "can_access_community": true,
    "can_access_analytics": true,
    "can_create_directory_listing": true,
    "can_manage_customers": true,
    "can_advertise": true
  }'::jsonb,
  '{
    "max_event_registrations": -1,
    "profile_features": "business",
    "directory_listings": 1,
    "max_customers": 1000,
    "analytics_retention": "2_years"
  }'::jsonb,
  true,
  false,
  3
),
(
  'Manufacturer',
  'manufacturer',
  199.00,
  'yearly',
  'For car audio manufacturers and distributors',
  '[
    "Everything in Retailer",
    "Product catalog management",
    "Dealer network tools",
    "Brand showcase features",
    "Product launch announcements",
    "Technical support portal",
    "Warranty management",
    "API access for integrations"
  ]'::jsonb,
  '{
    "can_view_events": true,
    "can_register_events": true,
    "can_create_profile": true,
    "can_access_community": true,
    "can_access_analytics": true,
    "can_create_directory_listing": true,
    "can_manage_products": true,
    "can_manage_dealers": true,
    "can_access_api": true,
    "can_sponsor_events": true
  }'::jsonb,
  '{
    "max_event_registrations": -1,
    "profile_features": "enterprise",
    "directory_listings": 5,
    "max_products": -1,
    "max_dealers": -1,
    "analytics_retention": "unlimited",
    "api_rate_limit": 10000
  }'::jsonb,
  true,
  false,
  4
),
(
  'Organization',
  'organization',
  299.00,
  'yearly',
  'For event organizers and car audio organizations',
  '[
    "Everything in Manufacturer",
    "Event creation & management",
    "Registration management",
    "Sponsorship coordination",
    "Multi-event oversight",
    "Advanced reporting",
    "Custom branding options",
    "Priority support"
  ]'::jsonb,
  '{
    "can_view_events": true,
    "can_register_events": true,
    "can_create_profile": true,
    "can_access_community": true,
    "can_access_analytics": true,
    "can_create_directory_listing": true,
    "can_create_events": true,
    "can_manage_registrations": true,
    "can_coordinate_sponsorships": true,
    "can_access_advanced_analytics": true,
    "priority_support": true
  }'::jsonb,
  '{
    "max_event_registrations": -1,
    "profile_features": "organization",
    "directory_listings": 10,
    "max_events_created": -1,
    "max_participants_per_event": -1,
    "analytics_retention": "unlimited",
    "custom_branding": true
  }'::jsonb,
  true,
  false,
  5
);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_membership_plans_updated_at ON membership_plans;
CREATE TRIGGER update_membership_plans_updated_at
    BEFORE UPDATE ON membership_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT ON membership_plans TO anon;
GRANT SELECT ON membership_plans TO authenticated;
GRANT ALL ON membership_plans TO service_role;

-- Verify the data was inserted
SELECT 
  name,
  type,
  price,
  billing_period,
  is_active,
  is_featured,
  display_order
FROM membership_plans 
ORDER BY display_order; 