-- Fix membership plans table and add subscription features
-- This ensures the table has the correct data and supports auto-renewal

-- Add missing columns to membership_plans table
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS hidden_on_frontend BOOLEAN DEFAULT false;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS auto_renewal_enabled BOOLEAN DEFAULT true;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS trial_period_days INTEGER DEFAULT 0;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS stripe_price_id_monthly VARCHAR(255);
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS stripe_price_id_yearly VARCHAR(255);

-- Create user_subscriptions table for managing subscriptions (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_plan_id INTEGER REFERENCES membership_plans(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active', -- active, canceled, past_due, unpaid, incomplete
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  auto_renewal BOOLEAN DEFAULT true,
  billing_cycle VARCHAR(20) DEFAULT 'yearly', -- monthly, yearly
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, membership_plan_id)
);

-- Enable RLS on user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for user_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Admin full access to subscriptions" ON user_subscriptions;

CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subscriptions" ON user_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin full access to subscriptions" ON user_subscriptions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  );

-- Clear existing data and insert fresh membership plans
DELETE FROM membership_plans;

-- Insert membership plans with correct data structure matching existing schema
INSERT INTO membership_plans (
  name, 
  description, 
  price, 
  billing_cycle, 
  features, 
  max_events, 
  max_participants, 
  is_active, 
  is_featured,
  display_order,
  hidden_on_frontend,
  auto_renewal_enabled,
  trial_period_days
) VALUES 
(
  'Competitor',
  'Perfect for getting started in car audio competitions',
  0.00,
  'lifetime',
  '[
    "Browse all events",
    "Basic profile creation", 
    "Score tracking",
    "Community access",
    "Mobile app access",
    "Basic event registration"
  ]'::jsonb,
  10,
  1,
  true,
  false,
  1,
  false,
  false,
  0
),
(
  'Pro Competitor',
  'Advanced features for serious competitors',
  29.00,
  'yearly',
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
  -1,
  -1,
  true,
  true,
  2,
  false,
  true,
  7
),
(
  'Retailer',
  'For car audio retailers and installers',
  99.00,
  'yearly',
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
  -1,
  1000,
  true,
  false,
  3,
  false,
  true,
  14
),
(
  'Organization',
  'For event organizers and car audio organizations',
  299.00,
  'yearly',
  '[
    "Everything in Retailer",
    "Event creation & management",
    "Registration management",
    "Sponsorship coordination",
    "Multi-event oversight",
    "Advanced reporting",
    "Custom branding options",
    "Priority support"
  ]'::jsonb,
  -1,
  -1,
  true,
  false,
  4,
  false,
  true,
  30
);

-- Enable RLS if not already enabled
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Public read access to active plans" ON membership_plans;
DROP POLICY IF EXISTS "Public read access" ON membership_plans;
DROP POLICY IF EXISTS "Admin full access to membership plans" ON membership_plans;

-- Create policy for public read access to active, non-hidden plans
CREATE POLICY "Public read access to active plans" ON membership_plans
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND hidden_on_frontend = false);

-- Create policy for admin full access
CREATE POLICY "Admin full access to membership plans" ON membership_plans
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  );

-- Grant necessary permissions
GRANT SELECT ON membership_plans TO anon;
GRANT SELECT ON membership_plans TO authenticated;
GRANT ALL ON membership_plans TO service_role;
GRANT ALL ON user_subscriptions TO service_role; 